import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { InvoiceUserEntity } from './entities/invoice-user.entity';
import { GrantedRoleEntity } from './entities/granted-role.entity';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { AuthService } from './services/auth.service';
import { JwtTokenService } from './services/jwt.service';
import { UserService } from './services/user.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceUserEntity, GrantedRoleEntity]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'auth-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1800s' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    UserService,
    UserRepository,
    RoleRepository,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [UserService, AuthService],
})
export class SecurityModule {}
