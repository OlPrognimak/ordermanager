import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceUserEntity } from '../entities/invoice-user.entity';

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(InvoiceUserEntity) private readonly repo: Repository<InvoiceUserEntity>) {}

  findByUsername(username: string): Promise<InvoiceUserEntity | null> {
    return this.repo.findOne({ where: { username }, relations: { authorities: true } });
  }

  save(user: InvoiceUserEntity): Promise<InvoiceUserEntity> {
    return this.repo.save(user);
  }
}
