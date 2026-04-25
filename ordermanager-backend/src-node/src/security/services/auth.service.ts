import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../exception/error-code.enum';
import { OrderManagerException } from '../../exception/order-manager.exception';
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
    const decoded = Buffer.from(loginCredential, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    if (!username || !password) {
      throw new OrderManagerException(ErrorCode.CODE_20101, 'Wrong password.');
    }

    const user = await this.userService.validatePassword(username, password);
    if (!user) {
      return new LoginResultResponseDto(false, null);
    }

    const token = this.jwtTokenService.signToken(user);
    return new LoginResultResponseDto(true, token);
  }
}
