
export class InvoiceItemModelDto {
  id!: number;
  catalogItemId!: number;
  description?: string;
  amountItems!: number;
  itemPrice!: number;
  vat?: number;
  sumNetto?: number;
  sumBrutto?: number;
}

export class ItemCatalogModelDto {
  id?: number;
  description!: string;
  shortDescription?: string;
  itemPrice!: number;
  vat!: number;
}

export class InvoiceFormModelDto {
  id?: number;
  invoiceNumber!: string;
  invoiceDescription?: string;
  personSupplierId!: number;
  personRecipientId!: number;
  supplierFullName?: string;
  recipientFullName?: string;
  totalSumNetto?: number;
  totalSumBrutto?: number;
  creationDate!: string;
  invoiceDate!: string;
  rateType!: string;
  invoiceItems!: InvoiceItemModelDto[];
}
