import { Controller, Get, Post, Body, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { BotFlowService } from '../bot/bot-flow.service';
import { Public } from '../common/auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private whatsappService: WhatsAppService,
    private botFlowService: BotFlowService,
  ) {}

  @Post('connect')
  @ApiOperation({ summary: 'Connect Meta WhatsApp Business Account' })
  async connectAccount(
    @Req() req: any,
    @Body()
    dto: {
      phone_number_id: string;
      waba_id: string;
      access_token: string;
      webhook_verify_token: string;
    },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.whatsappService.connectAccount(workspaceId, dto);
  }

  @Get('account')
  @ApiOperation({ summary: 'Get connected WhatsApp Business Account details' })
  async getAccount(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.whatsappService.getAccount(workspaceId);
  }

  @Public()
  @Get('webhook')
  @ApiOperation({ summary: 'Verify Meta WhatsApp webhook' })
  async verifyWebhook(@Query() query: any) {
    return this.whatsappService.verifyWebhook(query);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive incoming Meta WhatsApp notifications/messages' })
  async receiveWebhook(@Body() payload: any) {
    return this.botFlowService.handleWebhookPayload(payload);
  }
}
