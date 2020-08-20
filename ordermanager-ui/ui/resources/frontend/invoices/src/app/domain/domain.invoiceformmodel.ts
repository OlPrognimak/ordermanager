export interface InvoiceFormModelInterface {
  personSurname: string;
  personFirstName: string;
  personType: string;
  invoiceNumber: string;
  creationDate: Date;
  invoiceDate: Date;
  rateType: string;
  invoiceItems: InvoiceItemModelInterface[];
}

export interface InvoiceItemModelInterface {
  description: string;
  numberItems: number;
  itemPrice: number;
  vat: number;
}


export class InvoiceFormModel implements InvoiceFormModelInterface{
  creationDate: Date;
  invoiceDate: Date;
  invoiceItems: InvoiceItemModel[] = [];
  invoiceNumber: string;
  personFirstName: string;
  personSurname: string;
  personType: string;
  rateType: string;
}

export class InvoiceItemModel implements InvoiceItemModelInterface{
  description: string;
  itemPrice: number;
  numberItems: number;
  vat: number;
}

