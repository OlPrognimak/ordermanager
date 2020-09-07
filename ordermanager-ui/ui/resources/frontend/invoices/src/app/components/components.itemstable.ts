import {Component, EventEmitter, Injectable, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {InvoiceItemModel} from '../domain/domain.invoiceformmodel';
import {ComponentsItemtableService} from './components.itemtable.service';
import {ComponentsSumCalculatorService} from "./components.sum.calculator.service";
import {Observable, Subscription} from "rxjs";

@Injectable()
@Component({
  styles: [`
    :host ::ng-deep .p-cell-editing {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      /*height: 50pt !important;*/
      height: 25pt !important;
      width: 100% !important;
    }
  `],
  selector: 'app-items-table',
  templateUrl: './components.itemstable.html',
  providers:  [ComponentsSumCalculatorService]
})
export class ItemsTableComponent implements OnInit, OnDestroy {
  @Input() invoiceItems: InvoiceItemModel[];
  @Input() modelChangedEvent: Observable<void>;
  private modelChangedSubscription: Subscription;
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();
  @Output() totalNettoSumEvent = new EventEmitter<number>();
  @Output() totalBruttoSumEvent = new EventEmitter<number>();
  backendUrl: string;
  idxItem: number;

  constructor(private itemtableService: ComponentsItemtableService,
              private calculatorService: ComponentsSumCalculatorService) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl');
    this.idxItem = 0;
  }

  public getTotalNettoSum(): any {
    return this.calculatorService.totalNettoSum;
  }

  public getToltalBruttoSum(): any {
    return this.calculatorService.totalBruttoSum;
  }

  ngOnInit(): void {
    this.modelChangedSubscription = this.modelChangedEvent.subscribe(() => {
      this.resetTotalValues();
    });
  }

  ngOnDestroy(): void {
    this.modelChangedSubscription.unsubscribe();
  }

  private resetTotalValues(): void{
    this.calculatorService.totalNettoSum = 0;
    this.calculatorService.totalBruttoSum = 0;
  }

  /**
   *
   * @param invoiceitem the item which belong to table row
   * @param event id catalog item
   */
  catalogItemSlected(invoiceitem: InvoiceItemModel, event: any): void {
    return this.itemtableService.loadCatalogItemDetails(invoiceitem, event);
  }

  /**
   * Adds new Item to table of items
   */
  addNewItem(): void {
    const newItem = new InvoiceItemModel();
    this.idxItem = ++this.idxItem;
    newItem.idxItem = this.idxItem;
    this.invoiceItems.push(newItem);
    this.changeItemEvent.emit(this.invoiceItems);
  }

  /**
   * Deletes item from list of items
   * @param idxItem index of item in list items
   */
  deleteItem(idxItem: any): void {
    this.invoiceItems = this.invoiceItems.filter(val => val.idxItem !== idxItem);
    this.changeItemEvent.emit(this.invoiceItems);
    this.inputBoxChanged(new InvoiceItemModel(), 0);
  }

  /**
   * Retrieve the label of item in dropdown to set in editable set component
   * @param idItemCatalog
   */
  getCatalogDescription(idItemCatalog: string): any {
    if (idItemCatalog !== undefined) {
      // tslint:disable-next-line:triple-equals
      const rez = this.itemtableService.getDropdownCatalogItems().filter(
        val => Number(val.value) === Number(idItemCatalog));
      return rez[0].label;
    } else {
      return '[Please select item]';
    }
  }

  /**
   * @param value element refernce
   */
  // @HostListener('change', ['$event.target'])
  inputBoxChanged(model: InvoiceItemModel, event: any): any {
    const promise = this.calculatorService.calculateAllSum(this.invoiceItems, model);
    promise.then(() => {
        this.emitTotalChanged();
      }
    ).catch(error => {
      this.printToJson(JSON.stringify(error));
    });
  }

  private emitTotalChanged(): void{
    this.totalNettoSumEvent.emit(this.calculatorService.totalNettoSum);
    this.totalBruttoSumEvent.emit(this.calculatorService.totalBruttoSum);
  }

  printToJson(data: any): void {
    console.log(JSON.stringify(data));
  }




}
