import {Component, Input, Output, EventEmitter, OnInit} from "@angular/core";
import {DropdownDataType, InvoiceItemModel} from "../domain/domain.invoiceformmodel";
import {HttpClient, HttpHeaders} from "@angular/common/http";

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
export class ItemsTableComponent implements OnInit{
  @Input() invoiceItems: InvoiceItemModel[];
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();
  backendUrl: string;
  catalogItems: DropdownDataType[];
  idxItem: number;

  constructor(private httpClient: HttpClient) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    this.idxItem = 0;
  }

  ngOnInit(): void {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'itemscatalogdropdown', {headers})
      .subscribe(
        data => {
          this.catalogItems = data;
          //alert("Items: "+JSON.stringify(this.catalogItems));
        },
        error => {
          alert('Error :' + JSON.stringify(error));
        }
      );
  }

  addNewItem(): void{
    const newItem = new InvoiceItemModel();
    this.idxItem = ++this.idxItem;
    newItem.idxItem = this.idxItem;
    this.invoiceItems.push(newItem);
    this.changeItemEvent.emit(this.invoiceItems);
  }

  /**
   * Deletes item from table of item
   * @param invoiceitem
   */
  deleteItem(idxItem: any): void{
    this.invoiceItems = this.invoiceItems.filter(val => val.idxItem !== idxItem);
    //invoiceitem = {};
    this.changeItemEvent.emit(this.invoiceItems);
  }


  getCatalogDescription(idItemCatalog: any): any{
    if (idItemCatalog !== undefined) {
       const rez = this.catalogItems.filter(val => val.value === idItemCatalog)[0].label;
       return rez;
    }else{
      return '';
    }
  }

  printToJson(data: any): void {
    alert(JSON.stringify(data));
  }


}
