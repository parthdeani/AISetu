import { Controller, Get, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, Message, Product, ProductImage, SearchHistory, Conversation } from '../database/entities';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Workspace / Dashboard')
@Controller('workspace')
export class WorkspacesController {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private imageRepository: Repository<ProductImage>,
    @InjectRepository(SearchHistory)
    private searchRepository: Repository<SearchHistory>,
  ) {}

  @Get('dashboard-metrics')
  @ApiOperation({ summary: 'Get workspace analytics KPI counters' })
  async getMetrics(@Req() req: any) {
    const workspaceId = req.user.workspaceId;

    const totalCustomers = await this.customerRepository.count({ where: { workspaceId } });
    const totalProducts = await this.productRepository.count({ where: { workspaceId } });
    
    // Resolve total images in workspace
    const products = await this.productRepository.find({ where: { workspaceId } });
    const productIds = products.map((p) => p.id);
    let totalImages = 0;
    if (productIds.length > 0) {
      totalImages = await this.imageRepository.count({
        where: { productId: { $in: productIds } as any },
      });
    }

    const totalSearches = await this.searchRepository.count({ where: { workspaceId } });

    // Resolve messages in workspace
    const conversations = await this.customerRepository.manager.getRepository(Conversation).find({
      where: { workspaceId },
    });
    const convoIds = conversations.map((c) => c.id);
    let totalMessages = 0;
    if (convoIds.length > 0) {
      totalMessages = await this.messageRepository.count({
        where: { conversationId: { $in: convoIds } as any },
      });
    }

    return {
      totalCustomers,
      totalMessages,
      totalSearches,
      totalProducts,
      totalImages,
      searchAccuracy: 92.4, // Mocked overall accuracy
      responseTimeMs: 380, // Mocked API response latency
      charts: {
        dailySearches: [
          { date: 'Mon', count: 120 },
          { date: 'Tue', count: 150 },
          { date: 'Wed', count: 180 },
          { date: 'Thu', count: 220 },
          { date: 'Fri', count: 310 },
          { date: 'Sat', count: 420 },
          { date: 'Sun', count: 380 },
        ],
        whatsappUsage: [
          { type: 'Text', count: 2400 },
          { type: 'Image', count: 1400 },
          { type: 'Interactive', count: 900 },
        ],
        productTrends: [
          { name: 'Lace Border', searches: 450 },
          { name: 'Embroidery Patta', searches: 380 },
          { name: 'Ribbons', searches: 210 },
          { name: 'Garment Accessories', searches: 180 },
        ],
      },
    };
  }

  @Get('search-history')
  @ApiOperation({ summary: 'Retrieve visual search history logs' })
  async getSearchHistory(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('phone') phone?: string,
  ) {
    const workspaceId = req.user.workspaceId;

    let customerIds: string[] = [];
    if (phone) {
      const customers = await this.customerRepository.find({
        where: { workspaceId, phone_number: { $regex: phone, $options: 'i' } as any },
      });
      customerIds = customers.map((c) => c.id);
    }

    const whereClause: any = { workspaceId };
    if (phone) {
      if (customerIds.length === 0) {
        return { items: [], total: 0, page: Number(page), limit: Number(limit) };
      }
      whereClause.customerId = { $in: customerIds } as any;
    }

    const [items, total] = await this.searchRepository.findAndCount({
      where: whereClause,
      order: { created_at: 'DESC' } as any,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    // Populate customer and product details manually
    for (const item of items) {
      if (item.customerId) {
        (item as any).customer = await this.customerRepository.findOne({ where: { id: item.customerId } });
      }
      if (item.selectedProductId) {
        (item as any).selectedProduct = await this.productRepository.findOne({ where: { id: item.selectedProductId } });
      }
    }

    return { items, total, page: Number(page), limit: Number(limit) };
  }
}
