/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as _moment from 'moment';

export interface InvoiceFormModelInterface {
  id: number;
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

export interface RequestPeriodDateInterface {
  startDate: Date;
  endDate: Date;
}

export interface InvoiceItemModelInterface {
  id: number;
  idxItem: number;
  catalogItemId: number;
  description: string;
  amountItems: number;
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
  id: number;
  creationDate: Date;
  invoiceDate: Date;
  invoiceItems: InvoiceItemModel[] = [];
  invoiceNumber: string;
  supplierFullName: string;
  recipientFullName: string ;
  invoiceDescription = 'N/A';
  personRecipientId: number;
  personSupplierId: number;
  rateType: string;
  totalSumNetto: number;
  totalSumBrutto: number;

  public toJSON(): InvoiceFormModel {
    const withDateTransform = Object.assign({}, this, {

      creationDate: _moment(this.creationDate).format( 'yyyy-MM-DDTHH:mm:ss.SSSZZ'),
      invoiceDate: _moment(this.invoiceDate).format('yyyy-MM-DDTHH:mm:ss.SSSZZ' )
    });
    console.log("INVOICE FORM TRANSFORMED MODEL :"+JSON.stringify(withDateTransform))
    return withDateTransform;
  }
}


export class RequestDatePriod implements RequestPeriodDateInterface {
  startDate: Date = _moment().startOf('year').toDate();
  endDate: Date = new Date();
  public toJSON(): RequestPeriodDateInterface {
    return Object.assign({}, this, {
      startDate: _moment(this.startDate).format( 'YYYY-MM-DDTHH:mm:ss.SSSZZ'),
      endDate: _moment(this.endDate).format('YYYY-MM-DDTHH:mm:ss.SSSZZ' )
    });
  }
}

export class InvoiceItemModel implements InvoiceItemModelInterface{
  id: number;
  idxItem: number;
  catalogItemId: number;
  description = '';
  itemPrice = 0;
  amountItems = 0;
  vat = 0;
  sumNetto = 0;
  sumBrutto = 0;
}


export class CalculatorParameters{
  invoiceItemsTableModel: InvoiceItemModel[];
  invoiceItemEvent: InvoiceItemModel;
  nettoSum = 0;
}

/**
 * Object for checking login
 */
export class LoggingCheck{
  logged = false;
}

export class CreatedResponse {
 createdId: number;
}

/**
 * The object for registration of new user in the system
 */
export class NewUser{
  userName: string;
  userPassword: string;
  userPasswordRepeat: string;
}

