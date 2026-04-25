import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvoiceUserEntity } from '../entities/invoice-user.entity';

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signToken(user: InvoiceUserEntity): string {
    const authorities = (user.authorities ?? []).map((authority) => authority.authority);
    return this.jwtService.sign({
      sub: user.id,
      userId: user.id,
      username: user.username,
      authorities,
    });
  }

  verifyToken(token: string) {
    return this.jwtService.verify(token);
  }
}
