import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'auth-key',
      issuer: undefined,
      passReqToCallback: false,
    });
  }

  async validate(payload: { iss: string; role: string }) {
    const user = await this.authService.validateJwtUser(payload.iss);
    return {
      userId: user.id,
      username: user.username,
      roles: (payload.role ?? '').split(',').filter(Boolean),
      permissions: [],
    };
  }
}
