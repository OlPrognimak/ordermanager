import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNotNull, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PersonAddressFormDto {
  id?: number;
  city!: string;
  street!: string;
  zipCode!: string;
  postBoxCode?: string;
}

export class BankAccountFormDto {
  id?: number;
  accountNumber?: string;
  iban!: string;
  bicSwift!: string;
  bankName!: string;
}

export class PersonFormDto {
  id?: number;
  personLastName?: string;
  personFirstName?: string;
  companyName?: string;
  @IsNotNull()
  personType!: string;
  taxNumber?: string;
  @IsEmail()
  email!: string;
  @ValidateNested()
  @Type(() => PersonAddressFormDto)
  personAddressFormModel!: PersonAddressFormDto;
  @ValidateNested()
  @Type(() => BankAccountFormDto)
  bankAccountFormModel?: BankAccountFormDto;
}
