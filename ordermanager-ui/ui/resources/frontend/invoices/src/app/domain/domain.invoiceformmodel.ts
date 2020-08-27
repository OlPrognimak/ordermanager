import * as _moment from 'moment';

export interface InvoiceFormModelInterface {
  personSupplierId: number;
  personRecipientId: number;
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

  public toJSON(): InvoiceFormModelInterface {
    return Object.assign({}, this, {

      creationDate: _moment(this.creationDate).format( 'YYYY-MM-DDTHH:mm:ss.SSSZZ'),
      invoiceDate: _moment(this.invoiceDate).format('YYYY-MM-DDTHH:mm:ss.SSSZZ' )
    });
  }
}


export class InvoiceItemModel implements InvoiceItemModelInterface{
  description = 'Geleistete Tagen  im Juni 2020 gemäß ' +
    'beigefügten abgezeichneten ' +
    'Leistungsnachweisen';
  itemPrice: number;
  numberItems: number;
  vat: number;
}

