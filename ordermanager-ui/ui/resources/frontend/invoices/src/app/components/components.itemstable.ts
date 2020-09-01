import {Component, Input, Output, EventEmitter, OnInit, HostListener} from '@angular/core';
import { InvoiceItemModel} from '../domain/domain.invoiceformmodel';
import {HttpClient} from '@angular/common/http';
import {ComponentsItemtableService} from './components.itemtable.service';



@Component({

  styles: [`
    :host ::ng-deep .p-cell-editing {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
     /*height: 50pt !important;*/
      width: 100% !important;
    }
  `],
  selector: 'app-items-table',
  templateUrl: './components.itemstable.html'
})
export class ItemsTableComponent implements OnInit{
  @Input() invoiceItems: InvoiceItemModel[];
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();
  totalNettoSum: number;
  toltalBruttoSum: number;

  backendUrl: string;
   idxItem: number;

  constructor(private itemtableService: ComponentsItemtableService) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    this.idxItem = 0;
    this.totalNettoSum = 0;
  }

  ngOnInit(): void {

  }

  /**
   *
   * @param invoiceitem the item which belong to table row
   * @param event id catalog item
   */
  catalogItemSlected(invoiceitem: InvoiceItemModel, event: any): void{
    return this.itemtableService.loadCatalogItemDetails(invoiceitem, event);
   }

  /**
   * Adds new Item to table of items
   */
  addNewItem(): void{
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
  deleteItem(idxItem: any): void{
    this.invoiceItems = this.invoiceItems.filter(val => val.idxItem !== idxItem);
    this.changeItemEvent.emit(this.invoiceItems);
  }


  getCatalogDescription(idItemCatalog: string): any{
    if (idItemCatalog !== undefined) {
      // tslint:disable-next-line:triple-equals
       const rez = this.itemtableService.getDropdownCatalogItems().filter(
         val => Number(val.value) === Number(idItemCatalog));
       return rez[0].label;
    }else{
      return '[Please select item]';
    }
  }

  /**
   *
   * @param modelItem
   */
  public calculateNettoSum( modelItem: InvoiceItemModel): any{
      modelItem.sumNetto = Number((
      modelItem.numberItems * modelItem.itemPrice).toFixed(2));
      setTimeout( () => {
          this.calculateTottalNettoSum();
        }, 1
       );
      return modelItem.sumNetto;
  }

  private calculateTottalNettoSum(): void{
    this.totalNettoSum = 0;
    this.invoiceItems.forEach(item => this.calculateNettoTottal(item));
  }

  private calculateTottalBruttoSum(): void{
    this.toltalBruttoSum = 0;
    this.invoiceItems.forEach(item => this.calculateBruttoTottal(item));
  }

  private calculateBruttoTottal( item: InvoiceItemModel): void{
    this.toltalBruttoSum =
      Number((this.toltalBruttoSum + item.sumBrutto).toFixed(2));
  }

  private calculateNettoTottal( item: InvoiceItemModel): void{
    this.totalNettoSum =
      Number((this.totalNettoSum + item.sumNetto).toFixed(2));
  }

  /**
   *
   * @param modelItem
   */
  public calculateBruttoSum( modelItem: InvoiceItemModel): any{
    const nettoSum = this.calculateNettoSum(modelItem);
    modelItem.sumBrutto = Number((
      nettoSum + (nettoSum / 100) * modelItem.vat).toFixed(2));
    setTimeout( () => {
      this.calculateTottalBruttoSum();
      }, 1
    );
    return modelItem.sumBrutto;
  }

  /**
   *
   * @param value element refernce
   */
  // @HostListener('input', ['$event.target'])
  inputElement(target): any {
    if (target.value === ','){
      target.value = '.';
    }

  }

  printToJson(data: any): void {
    console.log(JSON.stringify(data));
  }


}
