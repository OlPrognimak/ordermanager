import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub?: number;
  userId?: number;
  username?: string;
  iss?: string;
  authorities?: string[];
  role?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'auth-key',
    });
  }

  async validate(payload: JwtPayload) {
    const authorities = payload.authorities ?? (payload.role ? payload.role.split(',') : []);
    return {
      userId: payload.userId ?? payload.sub,
      username: payload.username ?? payload.iss,
      authorities,
    };
  }
}
