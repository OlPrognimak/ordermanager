import * as _moment from 'moment';

export interface InvoiceFormModelInterface {
  personSupplierId: number;
  personRecipientId: number;
  invoiceNumber: string;
  creationDate: Date;
  invoiceDate: Date;
  rateType: string;
  invoiceItems: InvoiceItemModelInterface[];
  tottalSumNetto: number;
  tottalSumBrutto: number;
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
  personRecipientId: number;
  personSupplierId: number;
  rateType: string;
  tottalSumNetto: number;
  tottalSumBrutto: number;

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
  itemPrice: number = 0;
  numberItems: number = 0;
  vat: number = 0;
  sumNetto: number;
  sumBrutto: number;
}

