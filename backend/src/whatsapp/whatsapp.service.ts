import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppAccount, Customer, Conversation, Message } from '../database/entities';
import axios from 'axios';
import { StorageService } from '../common/storage.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectRepository(WhatsAppAccount)
    private waRepository: Repository<WhatsAppAccount>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private storageService: StorageService,
  ) {}

  async connectAccount(
    workspaceId: string,
    data: {
      phone_number_id: string;
      waba_id: string;
      access_token: string;
      webhook_verify_token: string;
    },
  ) {
    let account = await this.waRepository.findOne({ where: { workspaceId } });
    if (!account) {
      account = this.waRepository.create({
        workspaceId,
        ...data,
        status: 'CONNECTED',
      });
    } else {
      Object.assign(account, { ...data, status: 'CONNECTED' });
    }
    return this.waRepository.save(account);
  }

  async getAccount(workspaceId: string) {
    return this.waRepository.findOne({ where: { workspaceId } });
  }

  async getAccountByPhoneId(phone_number_id: string) {
    return this.waRepository.findOne({ where: { phone_number_id } });
  }

  async verifyWebhook(query: any): Promise<string> {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe') {
        // Find if this token matches any registered whatsapp account
        const account = await this.waRepository.findOne({
          where: { webhook_verify_token: token },
        });

        // Or fallback to default global token
        const globalToken = process.env.WHATSAPP_VERIFY_TOKEN || 'vwc_verify_token_secure';
        if (account || token === globalToken) {
          this.logger.log('Webhook verified successfully.');
          return challenge;
        }
      }
    }
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  async sendMessage(
    workspaceId: string,
    to: string,
    messagePayload: any,
  ) {
    const account = await this.waRepository.findOne({ where: { workspaceId } });
    if (!account) {
      throw new HttpException('WhatsApp Account not configured', HttpStatus.BAD_REQUEST);
    }

    const url = `https://graph.facebook.com/v18.0/${account.phone_number_id}/messages`;
    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          ...messagePayload,
        },
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (err) {
      this.logger.error(`Failed to send WhatsApp message: ${err.response?.data?.error?.message || err.message}`);
      throw new HttpException(
        err.response?.data?.error?.message || 'Failed to send WhatsApp message',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async sendTextMessage(workspaceId: string, to: string, text: string) {
    return this.sendMessage(workspaceId, to, {
      type: 'text',
      text: { body: text },
    });
  }

  async sendInteractiveButtons(
    workspaceId: string,
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>,
  ) {
    return this.sendMessage(workspaceId, to, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
  }

  async downloadMedia(workspaceId: string, mediaId: string, filename: string): Promise<string> {
    const account = await this.waRepository.findOne({ where: { workspaceId } });
    if (!account) {
      throw new Error('WhatsApp Account not found');
    }

    // 1. Get media URL
    const url = `https://graph.facebook.com/v18.0/${mediaId}`;
    const mediaResponse = await axios.get(url, {
      headers: { Authorization: `Bearer ${account.access_token}` },
    });
    const downloadUrl = mediaResponse.data.url;
    const mimeType = mediaResponse.data.mime_type;

    // 2. Download raw buffer
    const response = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${account.access_token}` },
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);

    // 3. Upload to S3-compatible storage
    const storedUrl = await this.storageService.uploadFile(buffer, filename, mimeType);
    return storedUrl;
  }
}
