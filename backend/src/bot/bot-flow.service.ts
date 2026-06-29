import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatbotFlow,
  Customer,
  Conversation,
  Message,
  Product,
  ProductImage,
  SearchHistory,
} from '../database/entities';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SearchService } from '../search/search.service';
import Redis from 'ioredis';

@Injectable()
export class BotFlowService {
  private readonly logger = new Logger(BotFlowService.name);
  private redis: Redis;

  constructor(
    @InjectRepository(ChatbotFlow)
    private flowRepository: Repository<ChatbotFlow>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    @InjectRepository(SearchHistory)
    private searchHistoryRepository: Repository<SearchHistory>,
    private whatsappService: WhatsAppService,
    private searchService: SearchService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => 1000000,
    });
    this.redis.on('error', (err) => {
      this.isRedisOffline = true;
    });
    this.redis.connect().catch(() => {
      this.isRedisOffline = true;
    });
  }

  private isRedisOffline = false;
  private localSessions = new Map<string, string>();

  async getSession(key: string): Promise<string | null> {
    if (this.isRedisOffline) {
      return this.localSessions.get(key) || null;
    }
    try {
      return await this.redis.get(key);
    } catch {
      this.isRedisOffline = true;
      return this.localSessions.get(key) || null;
    }
  }

  async setSession(key: string, value: string): Promise<void> {
    if (this.isRedisOffline) {
      this.localSessions.set(key, value);
      return;
    }
    try {
      await this.redis.set(key, value, 'EX', 3600);
    } catch {
      this.isRedisOffline = true;
      this.localSessions.set(key, value);
    }
  }

  async delSession(key: string): Promise<void> {
    if (this.isRedisOffline) {
      this.localSessions.delete(key);
      return;
    }
    try {
      await this.redis.del(key);
    } catch {
      this.isRedisOffline = true;
      this.localSessions.delete(key);
    }
  }

  async handleWebhookPayload(payload: any) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const metadata = value?.metadata;
    const contact = value?.contacts?.[0];
    const messageData = value?.messages?.[0];

    if (!messageData || !metadata) {
      return { success: false, reason: 'No message data' };
    }

    const phoneId = metadata.phone_number_id;
    const customerPhone = messageData.from;
    const customerName = contact?.profile?.name || 'Customer';

    // Find WhatsApp Account corresponding to the phoneId
    const account = await this.whatsappService.getAccountByPhoneId(phoneId);
    if (!account) {
      this.logger.warn(`No registered WhatsApp account found for Phone Number ID: ${phoneId}`);
      return { success: false, reason: 'Account not found' };
    }

    const workspaceId = account.workspaceId;

    // 1. Get or Create Customer
    let customer = await this.customerRepository.findOne({
      where: { workspaceId, phone_number: customerPhone },
    });
    if (!customer) {
      customer = this.customerRepository.create({
        workspaceId,
        phone_number: customerPhone,
        name: customerName,
      });
      customer = await this.customerRepository.save(customer);
    }

    // 2. Get or Create Conversation
    let conversation = await this.conversationRepository.findOne({
      where: { workspaceId, customerId: customer.id, status: 'BOT' },
    });
    if (!conversation) {
      conversation = await this.conversationRepository.findOne({
        where: { workspaceId, customerId: customer.id, status: 'HUMAN' },
      });
    }
    if (!conversation) {
      conversation = this.conversationRepository.create({
        workspaceId,
        customerId: customer.id,
        status: 'BOT',
      });
      conversation = await this.conversationRepository.save(conversation);
    }

    // If conversation is marked HUMAN, we do not respond automatically
    if (conversation.status === 'HUMAN') {
      this.logger.log(`Conversation for ${customerPhone} is in HUMAN agent mode. Skipping automation.`);
      // Just save the message
      await this.saveIncomingMessage(conversation.id, messageData, workspaceId);
      return { success: true, mode: 'HUMAN' };
    }

    // 3. Save incoming message
    const savedMsg = await this.saveIncomingMessage(conversation.id, messageData, workspaceId);

    // 4. Run Chatbot Flow Runner
    await this.runFlowRunner(workspaceId, customer, conversation, savedMsg);

    return { success: true };
  }

  private async saveIncomingMessage(conversationId: string, msgData: any, workspaceId: string): Promise<Message> {
    let messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'BUTTON_RESPONSE' = 'TEXT';
    let body = '';
    let mediaUrl = '';

    if (msgData.type === 'text') {
      messageType = 'TEXT';
      body = msgData.text?.body || '';
    } else if (msgData.type === 'image') {
      messageType = 'IMAGE';
      const mediaId = msgData.image?.id;
      // Download media synchronously for processing
      mediaUrl = await this.whatsappService.downloadMedia(workspaceId, mediaId, `${mediaId}.jpg`);
      body = msgData.image?.caption || '';
    } else if (msgData.type === 'document') {
      messageType = 'DOCUMENT';
      const mediaId = msgData.document?.id;
      mediaUrl = await this.whatsappService.downloadMedia(workspaceId, mediaId, msgData.document?.filename || 'doc');
      body = msgData.document?.caption || '';
    } else if (msgData.type === 'interactive') {
      messageType = 'BUTTON_RESPONSE';
      body = msgData.interactive?.button_reply?.title || '';
    }

    const message = this.messageRepository.create({
      conversationId,
      sender: 'CUSTOMER',
      message_type: messageType,
      body,
      media_url: mediaUrl,
      meta_payload: msgData,
    });
    return this.messageRepository.save(message);
  }

  private async runFlowRunner(workspaceId: string, customer: Customer, conversation: Conversation, msg: Message) {
    const sessionKey = `bot_session:${workspaceId}:${customer.phone_number}`;
    let currentNodeId = await this.getSession(sessionKey);

    const activeFlow = await this.flowRepository.findOne({
      where: { workspaceId, is_active: true },
    });

    if (!activeFlow) {
      // Direct visual search fallback if no flow builder is active
      if (msg.message_type === 'IMAGE') {
        await this.executeVisualSearchAction(workspaceId, customer, conversation, msg.media_url);
      } else {
        await this.whatsappService.sendTextMessage(
          workspaceId,
          customer.phone_number,
          'Hello! Please send a product image to search in our catalog.',
        );
      }
      return;
    }

    const flowDef = activeFlow.definition;
    const nodes = flowDef.nodes || [];
    const edges = flowDef.edges || [];

    let node = nodes.find((n) => n.id === currentNodeId);
    if (!node) {
      // Find starting node (node with no incoming connections or labeled trigger)
      node = nodes.find((n) => n.type === 'trigger' || n.id === 'start') || nodes[0];
    }

    if (!node) {
      this.logger.error('No nodes defined in the active flow.');
      return;
    }

    await this.executeNode(workspaceId, customer, conversation, msg, node, nodes, edges, sessionKey);
  }

  private async executeNode(
    workspaceId: string,
    customer: Customer,
    conversation: Conversation,
    msg: Message,
    node: any,
    nodes: any[],
    edges: any[],
    sessionKey: string,
  ) {
    this.logger.log(`Executing node: ${node.id} (${node.type})`);

    // Save current location in session
    await this.setSession(sessionKey, node.id);

    switch (node.type) {
      case 'sendMessage': {
        const text = node.data?.message || 'Hello';
        await this.whatsappService.sendTextMessage(workspaceId, customer.phone_number, text);
        await this.transitionToNext(workspaceId, customer, conversation, msg, node, nodes, edges, sessionKey);
        break;
      }
      case 'askQuestion': {
        // Send the question and pause
        const text = node.data?.question || 'Please upload an image';
        await this.whatsappService.sendTextMessage(workspaceId, customer.phone_number, text);
        // Do not transition. Wait for customer response in next webhook trigger
        break;
      }
      case 'buttons': {
        const text = node.data?.text || 'Select an option:';
        const buttons = node.data?.buttons || [{ id: 'opt1', title: 'Option 1' }];
        await this.whatsappService.sendInteractiveButtons(workspaceId, customer.phone_number, text, buttons);
        break;
      }
      case 'imageSearch': {
        if (msg.message_type !== 'IMAGE') {
          await this.whatsappService.sendTextMessage(
            workspaceId,
            customer.phone_number,
            'Please send a valid product image to run the search.',
          );
        } else {
          await this.executeVisualSearchAction(workspaceId, customer, conversation, msg.media_url);
        }
        break;
      }
      case 'humanTransfer': {
        conversation.status = 'HUMAN';
        await this.conversationRepository.save(conversation);
        await this.whatsappService.sendTextMessage(
          workspaceId,
          customer.phone_number,
          'Connecting you to a human agent. Please wait...',
        );
        await this.delSession(sessionKey);
        break;
      }
      default: {
        // Fallback transition
        await this.transitionToNext(workspaceId, customer, conversation, msg, node, nodes, edges, sessionKey);
      }
    }
  }

  private async transitionToNext(
    workspaceId: string,
    customer: Customer,
    conversation: Conversation,
    msg: Message,
    currentNode: any,
    nodes: any[],
    edges: any[],
    sessionKey: string,
  ) {
    const outgoingEdge = edges.find((e) => e.source === currentNode.id);
    if (outgoingEdge) {
      const nextNode = nodes.find((n) => n.id === outgoingEdge.target);
      if (nextNode) {
        await this.executeNode(workspaceId, customer, conversation, msg, nextNode, nodes, edges, sessionKey);
      }
    }
  }

  // Visual Search Core Engine Logic
  async executeVisualSearchAction(
    workspaceId: string,
    customer: Customer,
    conversation: Conversation,
    imageUrl: string,
  ) {
    // 1. Run Search Qdrant
    const matches = await this.searchService.searchSimilarImages(imageUrl, workspaceId, 5);

    // 2. Load Product details from Postgres
    const searchHistoryResults: any[] = [];
    const formattedProducts: any[] = [];

    for (const match of matches) {
      const product = await this.productRepository.findOne({
        where: { id: match.productId },
      });

      if (product) {
        const images = await this.productImageRepository.find({
          where: { productId: product.id },
        });
        const normalized = Math.max(0, (match.score - 0.75) / 0.25);
        const item = {
          productId: product.id,
          code: product.product_code,
          name: product.name,
          price: product.price,
          similarity: Math.round(normalized * 100),
          imageUrl: images?.[0]?.image_url || '',
        };
        formattedProducts.push(item);
        searchHistoryResults.push(item);
      }
    }

    // 3. Save Search History log
    const log = this.searchHistoryRepository.create({
      workspaceId,
      customerId: customer.id,
      uploaded_image_url: imageUrl,
      search_results: searchHistoryResults,
      threshold_applied: 70.0,
    });
    await this.searchHistoryRepository.save(log);

    if (formattedProducts.length === 0) {
      // Rule 3: No results found -> Transfer to human agent
      await this.whatsappService.sendTextMessage(
        workspaceId,
        customer.phone_number,
        'No matching product designs found. Let me transfer you to a human manager.',
      );
      conversation.status = 'HUMAN';
      await this.conversationRepository.save(conversation);
      return;
    }

    const topProduct = formattedProducts[0];

    // Rule 1: High similarity >= 90%
    if (topProduct.similarity >= 90) {
      await this.whatsappService.sendTextMessage(
        workspaceId,
        customer.phone_number,
        `🎉 Match Found! (${topProduct.similarity}% match)\n\nName: ${topProduct.name}\nCode: ${topProduct.code}\nPrice: $${topProduct.price}\nStock: Available`,
      );
      // Send product image confirmation
      if (topProduct.imageUrl) {
        await this.whatsappService.sendMessage(workspaceId, customer.phone_number, {
          type: 'image',
          image: { url: topProduct.imageUrl },
        });
      }
    }
    // Rule 2: Low similarity < 90%
    else {
      await this.whatsappService.sendTextMessage(
        workspaceId,
        customer.phone_number,
        '⚠️ The image is a bit unclear. Could you please send a clearer product photo so I can search again?',
      );
    }
  }
}
