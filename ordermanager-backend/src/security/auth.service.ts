import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { OrderManagerException } from '../common/exceptions/order-manager.exception';
import { SecurityJwtService } from './jwt.service';
import { GrantedRoleEntity } from './entities/granted-role.entity';
import { InvoiceUserEntity } from './entities/invoice-user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(InvoiceUserEntity) private readonly userRepository: Repository<InvoiceUserEntity>,
    @InjectRepository(GrantedRoleEntity) private readonly roleRepository: Repository<GrantedRoleEntity>,
    private readonly securityJwtService: SecurityJwtService,
  ) {}

  async validatePasswordAndReturnToken(loginCredential: string): Promise<{ logged: boolean; token: string | null }> {
    const [username, password] = Buffer.from(loginCredential, 'base64').toString('utf-8').split(':');
    const user = await this.getUserOrException(username);

    if (!(await bcrypt.compare(password, user.password))) {
      return { logged: false, token: null };
    }

    return { logged: true, token: this.securityJwtService.signToken(user) };
  }

  async createUserLogin(userName: string, password: string): Promise<InvoiceUserEntity> {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const encrypted = await bcrypt.hash(password, rounds);
    const user = this.userRepository.create({
      username: userName,
      password: encrypted,
      accountNonExpired: true,
      accountNonLocked: true,
      credentialsNonExpired: true,
      enabled: true,
    });

    const role = await this.roleRepository.findOne({ where: { authority: 'ROLE_USER' } });
    user.authorities = role ? [role] : [];
    return this.userRepository.save(user);
  }

  async getUserOrException(userName: string): Promise<InvoiceUserEntity> {
    const user = await this.userRepository.findOne({ where: { username: userName } });
    if (!user) {
      throw new OrderManagerException(ErrorCode.CODE_0007, `Can not find user with user name: ${userName}`);
    }
    return user;
  }

  async validateJwtUser(username: string): Promise<InvoiceUserEntity> {
    return this.getUserOrException(username);
  }
}
