import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { OrderManagerException } from '../common/exceptions/order-manager.exception';
import { AuthService } from '../security/auth.service';
import { PersonFormDto } from './dto/person.dto';
import { PersonEntity } from './entities/person.entity';
import { PersonType } from './entities/person-type.enum';

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(PersonEntity) private readonly personRepository: Repository<PersonEntity>,
    private readonly authService: AuthService,
  ) {}

  async savePerson(personModel: PersonFormDto, userName: string): Promise<PersonEntity> {
    this.validatePerson(personModel);
    const user = await this.authService.getUserOrException(userName);
    const person = this.mapModelToEntity(personModel);
    person.invoiceUser = user;
    return this.personRepository.save(person);
  }

  async updatePersons(personModels: PersonFormDto[]): Promise<void> {
    for (const model of personModels) {
      if (!model.id) continue;
      const entity = await this.personRepository.findOne({ where: { id: String(model.id) } });
      if (!entity) continue;
      Object.assign(entity, this.mapModelToEntity(model));
      await this.personRepository.save(entity);
    }
  }

  async getAllUserPersons(userName: string): Promise<PersonEntity[]> {
    return this.personRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.personAddress', 'addr')
      .leftJoinAndSelect('p.bankAccount', 'bank')
      .leftJoin('p.invoiceUser', 'u')
      .where('u.username = :userName', { userName })
      .getMany();
  }

  async getAllUserPersonsByPeriod(userName: string, startDate: string, endDate?: string): Promise<PersonEntity[]> {
    return this.personRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.personAddress', 'addr')
      .leftJoinAndSelect('p.bankAccount', 'bank')
      .leftJoin('p.invoiceUser', 'u')
      .where('u.username = :userName', { userName })
      .andWhere('p.created between :startDate and :endDate', {
        startDate,
        endDate: endDate ?? new Date().toISOString(),
      })
      .getMany();
  }

  async deletePerson(personId: number): Promise<void> {
    const usageRows = await this.personRepository
      .createQueryBuilder('p')
      .leftJoin('p.invoiceRecipient', 'recipientInv')
      .leftJoin('p.invoiceSuppliers', 'supplierInv')
      .where('p.id = :personId', { personId })
      .select(['recipientInv.id', 'supplierInv.id'])
      .getRawMany();

    if (usageRows.length > 0) {
      throw new OrderManagerException(ErrorCode.CODE_0000, 'The person can not be deleted.');
    }

    await this.personRepository.delete(String(personId));
  }

  mapModelToEntity(source: PersonFormDto): PersonEntity {
    return this.personRepository.create({
      id: source.id ? String(source.id) : undefined,
      personFirstName: source.personFirstName,
      personLastName: source.personLastName,
      personType: source.personType as PersonType,
      companyName: source.companyName,
      email: source.email,
      taxNumber: source.taxNumber,
      bankAccount: source.bankAccountFormModel ? [source.bankAccountFormModel as never] : [],
      personAddress: [source.personAddressFormModel as never],
    });
  }

  mapEntityToModel(source: PersonEntity): PersonFormDto {
    return {
      id: Number(source.id),
      personFirstName: source.personFirstName,
      personLastName: source.personLastName,
      personType: source.personType,
      companyName: source.companyName,
      email: source.email,
      taxNumber: source.taxNumber,
      bankAccountFormModel: source.bankAccount?.[0] as never,
      personAddressFormModel: source.personAddress?.[0] as never,
    };
  }

  validatePerson(person: PersonFormDto): void {
    if (person.personType === PersonType.PRIVATE) {
      if (!person.personFirstName?.trim()) throw new OrderManagerException(ErrorCode.CODE_20021, 'Validation error. Person.personFirstName can not be blank.');
      if (!person.personLastName?.trim()) throw new OrderManagerException(ErrorCode.CODE_20022, 'Validation error. Person.personLastName can not be blank.');
      if (!person.taxNumber?.trim()) throw new OrderManagerException(ErrorCode.CODE_20022, 'Validation error. Person.personLastName can not be blank.');
    }

    if (person.personType === PersonType.ORGANISATION && !person.companyName?.trim()) {
      throw new OrderManagerException(ErrorCode.CODE_20023, 'Validation error. Person.companyName can not be blank.');
    }
  }
}
