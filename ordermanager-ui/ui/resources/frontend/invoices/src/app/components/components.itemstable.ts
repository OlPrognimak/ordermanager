import {Component, Input, Output, EventEmitter} from "@angular/core";
import {InvoiceItemModel} from "../domain/domain.invoiceformmodel";

@Component({

  styles: [`
    :host ::ng-deep .p-cell-editing {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      height: 50pt !important;
      width: 100% !important;
    }
  `],
  selector: 'app-items-table',
  templateUrl: './components.itemstable.html'
})
export class ItemsTableComponent {
  @Input() invoiceItems: InvoiceItemModel[];
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();

  constructor() {
  }

  deleteItem(invoiceitem): void{
    this.invoiceItems = this.invoiceItems.filter(val => val.description !== invoiceitem.description);
    invoiceitem = {};
    this.changeItemEvent.emit(this.invoiceItems);
    this.printToJson(this.invoiceItems);
  }

  printToJson(data: any): void {
    alert(JSON.stringify(data));
  }
}
