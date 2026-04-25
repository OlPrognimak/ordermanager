import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvoiceUserEntity } from '../entities/invoice-user.entity';

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signToken(user: InvoiceUserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      iss: user.username,
      role: (user.authorities ?? []).map((r) => r.authority).join(','),
    });
  }

  verifyToken(token: string) {
    return this.jwtService.verify(token);
  }
}
