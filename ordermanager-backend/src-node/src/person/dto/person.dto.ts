import { IsEmail, IsString, IsNotEmpty, IsNotNull } from 'class-validator';
import { PersonType } from '../entities/person-type.enum';
import { IsNotEmptyObject, IsOptional, IsString } from 'class-validator';

export class PersonAddressFormModelDto {
  id?: number;
  @IsString() city!: string;
  @IsString() street!: string;
  @IsString() zipCode!: string;
  postBoxCode?: string;
}

export class BankAccountFormModelDto {
  id?: number;
  accountNumber?: string;
  @IsString() iban!: string;
  @IsString() bicSwift!: string;
  @IsString() bankName!: string;
}

export class PersonFormModelDto {
  id?: number;
  personLastName?: string;
  personFirstName?: string;
  companyName?: string;
  @IsNotNull() personType!: PersonType;
  taxNumber?: string;
  @IsEmail() email!: string;
  @IsNotEmptyObject() personAddressFormModel!: PersonAddressFormModelDto;
  @IsOptional() bankAccountFormModel?: BankAccountFormModelDto;
}
