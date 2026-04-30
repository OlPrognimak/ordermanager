import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceUserEntity } from '../../security/entities/invoice-user.entity';

@Injectable()
export class InvoiceRepository {
  constructor(@InjectRepository(InvoiceEntity) private readonly repo: Repository<InvoiceEntity>) {}

  findById(id: number): Promise<InvoiceEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByInvoiceNumber(invoiceNumber: string): Promise<InvoiceEntity | null> {
    return this.repo.findOne({ where: { invoiceNumber } });
  }

  findByInvoiceUser(invoiceUser: InvoiceUserEntity): Promise<InvoiceEntity[]> {
    return this.repo.find({ where: { invoiceUser } });
  }

  findByInvoiceUserAndCreationDateBetween(invoiceUser: InvoiceUserEntity, start: Date, end: Date): Promise<InvoiceEntity[]> {
    return this.repo.find({ where: { invoiceUser, creationDate: Between(start, end) } });
  }

  save(invoice: InvoiceEntity): Promise<InvoiceEntity> {
    return this.repo.save(invoice);
  }

  delete(invoice: InvoiceEntity): Promise<InvoiceEntity> {
    return this.repo.remove(invoice);
  }

  findInvoiceByInvoiceUserUsernameAndInvoiceNumber(username: string, invoiceNumber: string): Promise<InvoiceEntity | null> {
    return this.repo.findOne({ where: { invoiceUser: { username }, invoiceNumber } });
  }
}
