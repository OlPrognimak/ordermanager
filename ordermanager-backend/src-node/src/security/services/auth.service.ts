import { Injectable } from '@nestjs/common';
import { LoginResultResponseDto } from '../dto/login-result.dto';
import { JwtTokenService } from './jwt.service';
import { UserService } from './user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async loginWithHeader(loginCredential: string): Promise<LoginResultResponseDto> {
    if (!loginCredential) {
      return new LoginResultResponseDto(false, null);
    }

    const decoded = Buffer.from(loginCredential, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) {
      return new LoginResultResponseDto(false, null);
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    if (!username) {
      return new LoginResultResponseDto(false, null);
    }

    const user = await this.userService.validatePassword(username, password);
    if (!user) {
      return new LoginResultResponseDto(false, null);
    }

    const token = this.jwtTokenService.signToken(user);
    return new LoginResultResponseDto(true, token);
  }
}
