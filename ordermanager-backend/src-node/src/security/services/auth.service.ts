import { Injectable, Logger } from '@nestjs/common';
import { LoginResultResponseDto } from '../dto/login-result.dto';
import { JwtTokenService } from './jwt.service';
import { UserService } from './user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async loginWithHeader(loginCredential: string | undefined): Promise<LoginResultResponseDto> {
    this.logger.debug(`Login header present: ${Boolean(loginCredential)}`);
    if (!loginCredential) {
      return new LoginResultResponseDto(false, null);
    }

    const decoded = this.decodeLoginCredential(loginCredential);
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex <= 0) {
      return new LoginResultResponseDto(false, null);
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    this.logger.debug(`Login username decoded: ${username || '<empty>'}`);
    if (!username || !password) {
      return new LoginResultResponseDto(false, null);
    }

    try {
      const user = await this.userService.validatePassword(username, password);
      if (!user) {
        return new LoginResultResponseDto(false, null);
      }

      const token = this.jwtTokenService.signToken(user);
      return new LoginResultResponseDto(true, token);
    } catch {
      return new LoginResultResponseDto(false, null);
    }
  }

  private decodeLoginCredential(loginCredential: string): string {
    if (loginCredential.includes(':')) {
      return loginCredential;
    }

    try {
      const base64Decoded = Buffer.from(loginCredential, 'base64').toString('utf-8');
      return base64Decoded.includes(':') ? base64Decoded : loginCredential;
    } catch {
      return loginCredential;
    }
  }
}
