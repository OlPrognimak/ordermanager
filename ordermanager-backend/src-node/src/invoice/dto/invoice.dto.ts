import { IsArray, IsNotEmpty, IsNotNull, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class InvoiceItemModelDto {
  @IsNotNull() id!: number;
  catalogItemId?: number;
  description?: string;
  @IsNumber() @IsPositive() amountItems!: number;
  @IsNumber() @IsPositive() itemPrice!: number;
  vat?: number;
  sumNetto?: number;
  sumBrutto?: number;
}

export class ItemCatalogModelDto {
  id?: number;
  @IsString() @IsNotEmpty() description!: string;
  shortDescription?: string;
  @IsNumber() @IsPositive() itemPrice!: number;
  @IsNumber() @IsPositive() vat!: number;
}

export class InvoiceFormModelDto {
  id?: number;
  @IsString() @IsNotEmpty() invoiceNumber!: string;
  invoiceDescription?: string;
  @IsNotNull() personSupplierId!: number;
  @IsNotNull() personRecipientId!: number;
  supplierFullName?: string;
  recipientFullName?: string;
  totalSumNetto?: number;
  totalSumBrutto?: number;
  @IsNotNull() creationDate!: string;
  @IsNotNull() invoiceDate!: string;
  @IsString() @IsNotEmpty() rateType!: string;
  @IsArray() invoiceItems!: InvoiceItemModelDto[];
}
