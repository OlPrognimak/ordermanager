import {Directive, EventEmitter, Injectable, Output} from '@angular/core';
import {CalculatorParameters, InvoiceItemModel} from '../domain/domain.invoiceformmodel';
import {of} from 'rxjs';
import {map} from 'rxjs/operators';
import {ItemsTableComponent} from "./components.itemstable";

/**
 * The service class which calculate  netto and  brutto for one item  and summerized total
 * netto and brutto for all items in all invoice.
 *
 */
@Injectable({
  providedIn: 'root'
})
export class ComponentsSumCalculatorService{

   totalNettoSum: number;
   totalBruttoSum: number;

  constructor(){
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
    const nettoSumOperator = map((itemsModel: CalculatorParameters) => this.calculateNettoSum(itemsModel));
    const observableNettoParams = nettoSumOperator(nettoSumParamsObservable);
    const numberPromise = observableNettoParams.toPromise()
      .then((data) => {
        return this.calculateBruttoSum(data);
      }).then((data) => {
        return this.calculateTottalNettoSum(data);
      }).then((data) => {
        return this.calculateTottalBruttoSum(data);
      }).then(() => {
          return 0;
        }
      );
    await numberPromise;

  }
  /*Calculate the total netto price for whole report*/
  private calculateTottalNettoSum(params: CalculatorParameters): CalculatorParameters{
    this.totalNettoSum = 0;
    params.invoiceItemsTableModel.forEach(item => this.calculateNettoTottal(item));
    return params;
  }

  /*Calculate the total brutto price for whole report*/
  private calculateTottalBruttoSum(params: CalculatorParameters): CalculatorParameters{
    this.totalBruttoSum = 0;
    params.invoiceItemsTableModel.forEach(item => this.calculateBruttoTottal(item));
    return params;
  }


  /*
   * Calculate netto price for single item in report
   * @param params
   */
  private calculateNettoSum(params: CalculatorParameters): CalculatorParameters{
    params.invoiceItemEvent.sumNetto = Number((
    params.invoiceItemEvent.numberItems * params.invoiceItemEvent.itemPrice).toFixed(2));
    console.log('Calculated sum netto ' + params.invoiceItemEvent.sumNetto);
    return params;
  }

  /*
   * calculate brutto price for single item in invoice report
   * @param params
   */
  private calculateBruttoSum(params: CalculatorParameters): CalculatorParameters{
      params.invoiceItemEvent.sumBrutto = Number((
      params.invoiceItemEvent.sumNetto + (params.invoiceItemEvent.sumNetto / 100)
        * params.invoiceItemEvent.vat).toFixed(2));
      console.log('Calculated sum brutto ' + params.invoiceItemEvent.sumBrutto);
      return params;
  }

  /*Summarize the netto price from one item to total netto price of whole invoice */
  private calculateNettoTottal( item: InvoiceItemModel): void{
    this.printToJson(item);
    this.totalNettoSum =
      Number((this.totalNettoSum + item.sumNetto));
    console.log('Calculated Total Netto sum: ' + this.totalNettoSum);
  }
  /*Summarize the brutto price from one item to total brutto price of whole invoice */
  private calculateBruttoTottal( item: InvoiceItemModel): void{
    this.printToJson(item);
    this.totalBruttoSum =
      Number((this.totalBruttoSum + item.sumBrutto).toFixed(2));
    console.log('Calculated Total Brutto sum: ' + this.totalBruttoSum);
  }

  printToJson(data: any): void {
    console.log(JSON.stringify(data));
  }
}
