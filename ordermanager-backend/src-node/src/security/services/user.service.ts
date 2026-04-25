import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ErrorCode } from '../../exception/error-code.enum';
import { OrderManagerException } from '../../exception/order-manager.exception';
import { InvoiceUserEntity } from '../entities/invoice-user.entity';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async getUserOrException(username: string): Promise<InvoiceUserEntity> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new OrderManagerException(ErrorCode.CODE_0007, `Can not find user with user name: ${username}`);
    }
    return user;
  }

  async validatePassword(username: string, password: string): Promise<InvoiceUserEntity | null> {
    const user = await this.getUserOrException(username);
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async createUserLogin(username: string, rawPassword: string): Promise<InvoiceUserEntity> {
    const exists = await this.userRepository.findByUsername(username);
    if (exists) {
      throw new OrderManagerException(ErrorCode.CODE_0008, `The user with name: [${username}] already exists`);
    }

    const role = (await this.roleRepository.findByAuthority('ROLE_USER'))
      ?? (await this.roleRepository.save({ authority: 'ROLE_USER' } as any));

    const user = {
      username,
      password: await bcrypt.hash(rawPassword, 10),
      accountNonExpired: true,
      accountNonLocked: true,
      credentialsNonExpired: true,
      enabled: true,
      authorities: [role],
      roles: 'ROLE_USER',
    } as InvoiceUserEntity;

    return this.userRepository.save(user);
  }
}
