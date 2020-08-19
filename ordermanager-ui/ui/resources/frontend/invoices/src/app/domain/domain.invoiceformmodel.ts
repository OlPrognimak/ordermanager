export interface InvoiceFormModel {
  personSurname: string;
  personFirstName: string;
  personType: string;
  invoiceNumber: string;
  creationDate: Date;
  invoiceDate: Date;
  rateType: string;
  invoiceItems: InvoiceItemModel[];
}

export interface InvoiceItemModel {
  description: string;
  numberItems: number;
  itemPrice: number;
  vat: number;
}
