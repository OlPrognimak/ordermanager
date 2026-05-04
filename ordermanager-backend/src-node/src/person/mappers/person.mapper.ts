import { DropdownDataTypeDto } from '../../common/dto/common.dto';
import { BankAccountEntity } from '../entities/bank-account.entity';
import { PersonAddressEntity } from '../entities/person-address.entity';
import { PersonEntity } from '../entities/person.entity';
import { PersonFormModelDto } from '../dto/person.dto';

const emptyOrValue = (value?: string | null) => (value ?? '');

export class PersonMapper {
  static fromDto(dto: PersonFormModelDto): PersonEntity {
    return {
      id: dto.id!,
      personFirstName: dto.personFirstName,
      personLastName: dto.personLastName,
      companyName: dto.companyName,
      email: dto.email,
      taxNumber: dto.taxNumber,
      personType: dto.personType,
      personAddress: [dto.personAddressFormModel as PersonAddressEntity],
      bankAccount: dto.bankAccountFormModel ? [dto.bankAccountFormModel as BankAccountEntity] : [],
    } as PersonEntity;
  }

  static toDto(entity: PersonEntity): PersonFormModelDto {
    return {
      id: entity.id,
      personFirstName: entity.personFirstName,
      personLastName: entity.personLastName,
      companyName: entity.companyName,
      email: entity.email,
      taxNumber: entity.taxNumber,
      personType: entity.personType,
      personAddressFormModel: entity.personAddress?.[0] as any,
      bankAccountFormModel: entity.bankAccount?.[0] as any,
    };
  }

  static toDropdown(source: PersonEntity[]): DropdownDataTypeDto[] {
    return source.map(
      (p) =>
        new DropdownDataTypeDto(
          `${emptyOrValue(p.personFirstName)} ${emptyOrValue(p.personLastName)} ${emptyOrValue(p.companyName)}`.trim(),
          String(p.id),
        ),
    );
  }
}
