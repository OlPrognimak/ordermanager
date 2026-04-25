import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GrantedRoleEntity } from './entities/granted-role.entity';
import { InvoiceUserEntity } from './entities/invoice-user.entity';
import { SecurityJwtService } from './jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'auth-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1800s', algorithm: 'HS256' },
    }),
    TypeOrmModule.forFeature([InvoiceUserEntity, GrantedRoleEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthService, SecurityJwtService, JwtStrategy],
  exports: [AuthService, SecurityJwtService, TypeOrmModule],
})
export class AuthModule {}
