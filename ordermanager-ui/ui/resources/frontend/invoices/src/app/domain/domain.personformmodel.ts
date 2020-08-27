export class PersonFormModel {
  id: number;
  personLastName: string;
  personFirstName: string;
  companyName: string ;
  personType: string ;
  taxNumber: string;
  personAddressFormModel: PersonAddressFormModel = new PersonAddressFormModel();
  bankAccountFormModel: BankAccountFormModel = new BankAccountFormModel();

}

export class  PersonAddressFormModel {
  id: number;
  city: string;
  street: string;
  zipCode: string;
  postBoxCode: string ;
}

export class BankAccountFormModel {
  id: number;
  accountNumber: string;
  iban: string;
  bicSwift: string ;
  bankName; string ;
}
