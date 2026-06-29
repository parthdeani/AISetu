import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotFlow } from '../database/entities';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Bot Flow')
@Controller('bot-flows')
export class BotFlowController {
  constructor(
    @InjectRepository(ChatbotFlow)
    private flowRepository: Repository<ChatbotFlow>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all chatbot flows in workspace' })
  async listFlows(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.flowRepository.find({ where: { workspaceId } });
  }

  @Post()
  @ApiOperation({ summary: 'Create new chatbot flow config' })
  async createFlow(@Req() req: any, @Body() data: { name: string; definition: any }) {
    const workspaceId = req.user.workspaceId;
    const flow = this.flowRepository.create({
      workspaceId,
      name: data.name,
      definition: data.definition || { nodes: [], edges: [] },
      is_active: false,
    });
    return this.flowRepository.save(flow);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update chatbot flow definition' })
  async updateFlow(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { name?: string; definition?: any; is_active?: boolean },
  ) {
    const workspaceId = req.user.workspaceId;
    const flow = await this.flowRepository.findOne({ where: { id, workspaceId } });
    if (!flow) {
      throw new Error('Flow not found');
    }

    if (data.is_active === true) {
      // Deactivate all other flows first
      await this.flowRepository.update({ workspaceId }, { is_active: false });
    }

    Object.assign(flow, data);
    return this.flowRepository.save(flow);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete chatbot flow' })
  async deleteFlow(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    await this.flowRepository.delete({ id, workspaceId });
    return { success: true };
  }
}
