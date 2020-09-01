import {Component, Input, Output, EventEmitter, OnInit, HostListener} from "@angular/core";
import {DropdownDataType, InvoiceItemModel, ItemCatalogModel} from "../domain/domain.invoiceformmodel";
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";



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



  /**
   *
   * @param value element refernce
   */
  //@HostListener('input', ['$event.target'])
  inputElement(target): any {
    if (target.value === ','){
      target.value = '.';
    };

  }

  changeNumberItems(ev: any): any{
    console.log(ev);
  }

  ngOnInit(): void {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'itemscatalogdropdown', {headers})
      .subscribe(
        data => {
          this.catalogItems = data;
        },
        error => {
          alert('Error :' + JSON.stringify(error));
        }
      );
  }

  /**
   *
   * @param invoiceitem the item which belong to table row
   * @param event id catalog item
   */
  catalogItemSlected(invoiceitem: InvoiceItemModel, event: any): void{
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    invoiceitem.catalogItemId = Number(event);
    this.httpClient.get<ItemCatalogModel>((this.backendUrl + 'itemcatalog/' + invoiceitem.catalogItemId),
      {headers})
      .toPromise()
          .then(data => {
            invoiceitem.itemPrice = data.itemPrice;
            invoiceitem.vat = data.vat;
            }
          ).then(error => {
              this.printToJson(error);
            }
          );
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
       const rez = this.catalogItems.filter(
         val => Number(val.value) === Number(idItemCatalog));
       return rez[0].label;
    }else{
      return '[Please select item]';
    }
  }

  printToJson(data: any): void {
    console.log(JSON.stringify(data));
  }


}
