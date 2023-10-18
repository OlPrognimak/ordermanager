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
import { Injectable } from '@angular/core';
import { CalculatorParameters, InvoiceItemModel } from '../../domain/domain.invoiceformmodel';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * The service class which calculate  netto and  brutto for one item  and summerized total
 * netto and brutto for all items in all invoice.
 *
 */
@Injectable({
  providedIn: 'root'
})
export class InvoiceItemsTableCalculatorService {

  totalNettoSum: number;
  totalBruttoSum: number;

  constructor() {
    this.totalNettoSum = 0;
    this.totalBruttoSum = 0;
  }


  /**
   * This method calculates netto and brutto for one item of report and tottal neto and brutto for whole report.
   * @param invoiceItems the items of invoice
   * @param modelItem the item from currently selected row where was changed the item price, amount of items or vat.
   */
  public async calculateAllSum(invoiceItems: InvoiceItemModel[], modelItem: InvoiceItemModel): Promise<void> {
    const params = new CalculatorParameters();

    params.invoiceItemEvent = modelItem;
    params.invoiceItemsTableModel = invoiceItems;

    const nettoSumParamsObservable = of(params);
    const nettoSumOperator = map((itemsModel: CalculatorParameters) =>
      this.calculateNettoSum(itemsModel));
    const observableNettoParams = nettoSumOperator(nettoSumParamsObservable);
    const numberPromise = observableNettoParams.pipe(
      map(data => {
        return this.calculateBruttoSum(data);
      })
    ).pipe(
      map(data => {
        return this.calculateTottalNettoSum(data)
      })
    ).pipe(
      map(data => {
        return this.calculateTottalBruttoSum(data)
      })
    )
    numberPromise.subscribe();

    await numberPromise;
  }

  printToJson(data: any): void {
    console.log(JSON.stringify(data));
  }

  /*Calculate the total netto price for whole report*/
  private calculateTottalNettoSum(params: CalculatorParameters): CalculatorParameters {
    this.totalNettoSum = 0;
    params.invoiceItemsTableModel.forEach(item => this.calculateNettoTottal(item));
    return params;
  }

  /*Calculate the total brutto price for whole report*/
  private calculateTottalBruttoSum(params: CalculatorParameters): CalculatorParameters {
    this.totalBruttoSum = 0;
    params.invoiceItemsTableModel.forEach(item => this.calculateBruttoTottal(item));
    return params;
  }

  /*
   * Calculate netto price for single item in report
   * @param params
   */
  private calculateNettoSum(params: CalculatorParameters): CalculatorParameters {
    params.invoiceItemEvent.sumNetto = Number((
      params.invoiceItemEvent.amountItems * params.invoiceItemEvent.itemPrice).toFixed(2));
    console.log('Calculated sum netto ' + params.invoiceItemEvent.sumNetto);
    return params;
  }

  /*
   * calculate brutto price for single item in invoice report
   * @param params
   */
  private calculateBruttoSum(params: CalculatorParameters): CalculatorParameters {
    params.invoiceItemEvent.sumBrutto = Number((
      params.invoiceItemEvent.sumNetto + (params.invoiceItemEvent.sumNetto / 100)
      * params.invoiceItemEvent.vat).toFixed(2));
    console.log('Calculated sum brutto ' + params.invoiceItemEvent.sumBrutto);
    return params;
  }

  /*Summarize the netto price from one item to total netto price of whole invoice */
  private calculateNettoTottal(item: InvoiceItemModel): void {
    this.printToJson(item);
    this.totalNettoSum =
      Number((this.totalNettoSum + item.sumNetto));
    console.log('Calculated Total Netto sum: ' + this.totalNettoSum);
  }

  /*Summarize the brutto price from one item to total brutto price of whole invoice */
  private calculateBruttoTottal(item: InvoiceItemModel): void {
    this.printToJson(item);
    this.totalBruttoSum =
      Number((this.totalBruttoSum + item.sumBrutto).toFixed(2));
    console.log('Calculated Total Brutto sum: ' + this.totalBruttoSum);
  }
}
