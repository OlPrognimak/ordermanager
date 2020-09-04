import * as _moment from 'moment';

export interface InvoiceFormModelInterface {
  personSupplierId: number;
  personRecipientId: number;
  invoiceNumber: string;
  invoiceDescription: string;
  supplierFullName: string;
  recipientFullName: string ;
  creationDate: Date;
  invoiceDate: Date;
  rateType: string;
  invoiceItems: InvoiceItemModelInterface[];
  totalSumNetto: number;
  totalSumBrutto: number;
}

export interface InvoiceItemModelInterface {
  idxItem: number;
  catalogItemId: number;
  description: string;
  numberItems: number;
  itemPrice: number;
  vat: number;
  sumNetto: number;
  sumBrutto: number;
}


export class ItemCatalogModel {
    id: number;
    description: string;
    shortDescription: string;
    itemPrice: number ;
    vat: number;

}


export interface DropdownDataType{
  label: string;
  value: string;
}

export class InvoiceFormModel implements InvoiceFormModelInterface{
  creationDate: Date;
  invoiceDate: Date;
  invoiceItems: InvoiceItemModelInterface[] = [];
  invoiceNumber: string;
  supplierFullName: string;
  recipientFullName: string ;
  invoiceDescription = 'N/A';
  personRecipientId: number;
  personSupplierId: number;
  rateType: string;
  totalSumNetto: number;
  totalSumBrutto: number;

  public toJSON(): InvoiceFormModelInterface {
    return Object.assign({}, this, {

      creationDate: _moment(this.creationDate).format( 'YYYY-MM-DDTHH:mm:ss.SSSZZ'),
      invoiceDate: _moment(this.invoiceDate).format('YYYY-MM-DDTHH:mm:ss.SSSZZ' )
    });
  }
}


export class InvoiceItemModel implements InvoiceItemModelInterface{
  idxItem: number;
  catalogItemId: number;
  description = '';
  itemPrice = 0;
  numberItems = 0;
  vat = 0;
  sumNetto = 0;
  sumBrutto = 0;
}


export class CalculatorParameters{
  invoiceItemsTableModel: InvoiceItemModel[];
  invoiceItemEvent: InvoiceItemModel;
  nettoSum = 0;
}

