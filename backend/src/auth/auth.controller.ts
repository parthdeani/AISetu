import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new workspace owner user & company tenant' })
  async register(
    @Body()
    dto: {
      email: string;
      password_hash: string;
      first_name?: string;
      last_name?: string;
      workspace_name: string;
    },
  ) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user and return authentication token' })
  async login(
    @Body()
    dto: {
      email: string;
      password_hash: string;
    },
  ) {
    return this.authService.login(dto.email, dto.password_hash);
  }
}
