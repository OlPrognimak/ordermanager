import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PersonEntity } from '../entities/person.entity';

@Injectable()
export class PersonRepository {
  constructor(@InjectRepository(PersonEntity) private readonly repo: Repository<PersonEntity>) {}

  save(person: PersonEntity): Promise<PersonEntity> {
    return this.repo.save(person);
  }

  findById(id: number): Promise<PersonEntity | null> {
    return this.repo.findOne({ where: { id }, relations: { bankAccount: true, personAddress: true } });
  }

  findAllByUserName(userName: string): Promise<PersonEntity[]> {
    return this.repo.find({ where: { invoiceUser: { username: userName } }, relations: { bankAccount: true, personAddress: true } });
  }

  findAllByUserNameAndCreatedBetween(userName: string, startDate: Date, endDate: Date): Promise<PersonEntity[]> {
    return this.repo.find({
      where: {
        invoiceUser: { username: userName },
        created: Between(startDate, endDate),
      },
      relations: { bankAccount: true, personAddress: true },
    });
  }

  async deleteByPersonId(personId: number): Promise<void> {
    await this.repo.delete({ id: personId });
  }

  async findPersonUsageInInvoices(personId: number): Promise<number[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .leftJoin('invoice', 'i', 'i.invoice_recipient = :personId OR i.invoice_supplier = :personId', { personId })
      .select('i.id', 'id')
      .where('p.id = :personId', { personId })
      .getRawMany<{ id: number }>();
    return rows.filter((r) => r.id).map((r) => r.id);
  }
}
