import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GrantedRoleEntity } from '../entities/granted-role.entity';

@Injectable()
export class RoleRepository {
  constructor(@InjectRepository(GrantedRoleEntity) private readonly repo: Repository<GrantedRoleEntity>) {}

  findByAuthority(authority: string): Promise<GrantedRoleEntity | null> {
    return this.repo.findOne({ where: { authority } });
  }

  save(role: GrantedRoleEntity): Promise<GrantedRoleEntity> {
    return this.repo.save(role);
  }
}
