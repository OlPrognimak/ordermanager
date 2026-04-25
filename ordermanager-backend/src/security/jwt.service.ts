import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvoiceUserEntity } from './entities/invoice-user.entity';

@Injectable()
export class SecurityJwtService {
  constructor(private readonly jwtService: JwtService) {}

  signToken(user: InvoiceUserEntity): string {
    const roles = user.authorities?.map((a) => a.authority).join(',') ?? user.roles ?? '';
    return this.jwtService.sign({ role: roles }, { issuer: user.username });
  }

  verifyToken(token: string): { issuer: string; role: string } {
    return this.jwtService.verify(token) as { issuer: string; role: string };
  }
}
