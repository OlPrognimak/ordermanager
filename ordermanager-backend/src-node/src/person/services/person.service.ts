import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../exception/error-code.enum';
import { OrderManagerException } from '../../exception/order-manager.exception';
import { UserService } from '../../security/services/user.service';
import { PersonFormModelDto } from '../dto/person.dto';
import { PersonEntity } from '../entities/person.entity';
import { PersonMapper } from '../mappers/person.mapper';
import { PersonRepository } from '../repositories/person.repository';

@Injectable()
export class PersonService {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly userService: UserService,
  ) {}

  async savePerson(person: PersonEntity, userName: string): Promise<void> {
    const user = await this.userService.getUserOrException(userName);
    person.invoiceUser = user;
    await this.personRepository.save(person);
  }

  async updatePersons(persons: PersonFormModelDto[]): Promise<void> {
    for (const dto of persons) {
      const entity = await this.personRepository.findById(dto.id!);
      if (!entity) continue;
      entity.personFirstName = dto.personFirstName;
      entity.personLastName = dto.personLastName;
      entity.companyName = dto.companyName;
      entity.email = dto.email;
      entity.taxNumber = dto.taxNumber;
      entity.personType = dto.personType;
      if (entity.bankAccount?.[0] && dto.bankAccountFormModel) Object.assign(entity.bankAccount[0], dto.bankAccountFormModel);
      if (entity.personAddress?.[0]) Object.assign(entity.personAddress[0], dto.personAddressFormModel);
      await this.personRepository.save(entity);
    }
  }

  async getAllUserPersons(userName: string): Promise<PersonEntity[]> {
    try {
      return await this.personRepository.findAllByUserName(userName);
    } catch {
      return [];
    }
  }

  async getAllUserPersonsByPeriod(userName: string, startDate: string, endDate: string): Promise<PersonEntity[]> {
    try {
      return await this.personRepository.findAllByUserNameAndCreatedBetween(userName, new Date(startDate), new Date(endDate));
    } catch {
      return [];
    }
  }

  async deletePerson(personId: number): Promise<void> {
    const used = await this.personRepository.findPersonUsageInInvoices(personId);
    if (used.length > 0) {
      throw new OrderManagerException(ErrorCode.CODE_0000, 'The person can not be deleted.');
    }
    await this.personRepository.deleteByPersonId(personId);
  }

  validatePersonDto(dto: PersonFormModelDto): void {
    if (dto.personType === 'PRIVATE' as any) {
      if (!dto.personFirstName) throw new OrderManagerException(ErrorCode.CODE_20021);
      if (!dto.personLastName) throw new OrderManagerException(ErrorCode.CODE_20022);
      if (!dto.taxNumber) throw new OrderManagerException(ErrorCode.CODE_20022);
      return;
    }
    if (dto.personType === 'ORGANISATION' as any && !dto.companyName) {
      throw new OrderManagerException(ErrorCode.CODE_20023);
    }
  }

  toDto = PersonMapper.toDto;
  toDropdown = PersonMapper.toDropdown;
  fromDto = PersonMapper.fromDto;
}
