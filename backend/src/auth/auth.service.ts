import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Workspace, Subscription } from '../database/entities';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private jwtService: JwtService,
  ) {}

  async register(dto: {
    email: string;
    password_hash: string;
    first_name?: string;
    last_name?: string;
    workspace_name: string;
  }) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Create Workspace
    const slug = dto.workspace_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const workspace = this.workspaceRepository.create({
      name: dto.workspace_name,
      slug,
    });
    const savedWorkspace = await this.workspaceRepository.save(workspace);

    // Create User
    const hashedPassword = await bcrypt.hash(dto.password_hash, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password_hash: hashedPassword,
      first_name: dto.first_name,
      last_name: dto.last_name,
      role: 'WORKSPACE_OWNER',
      workspace_id: savedWorkspace.id,
    });
    const savedUser = await this.userRepository.save(user);

    // Create trial subscription
    const subscription = this.subscriptionRepository.create({
      workspaceId: savedWorkspace.id,
      plan_name: 'PRO_TRIAL',
      status: 'ACTIVE',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });
    await this.subscriptionRepository.save(subscription);

    return this.generateTokens(savedUser);
  }

  async login(email: string, password_hash: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password_hash, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspace_id || null,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        workspaceId: user.workspace_id || null,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };
  }
}
