import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {DropdownDataType, InvoiceItemModel, ItemCatalogModel} from '../domain/domain.invoiceformmodel';

@Injectable({
  providedIn: 'root',
})
export class ComponentsItemtableService {

  backendUrl: string;
  catalogItems: DropdownDataType[];

  constructor(private httpClient: HttpClient) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    this.downloadCatalogItemsDropdownList();
  }

  /* */
  private downloadCatalogItemsDropdownList(): void{
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'itemscatalogdropdown', {headers})
      .subscribe(
        data => {
          this.catalogItems = data;
        },
        error => {
          console.log(JSON.stringify(error));
        }
      );
  }

  /**
   * Load catalog item from server and update the invoice table model
   * @param invoiceitem the item which belong to table row in item table model
   * @param idItemCatalog id catalog item
   */
  loadCatalogItemDetails(invoiceitem: InvoiceItemModel, idItemCatalog: any): void{
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    invoiceitem.catalogItemId = Number(idItemCatalog);
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
   * retrieve loaded list of catalog items for dropdown list
   */
  getDropdownCatalogItems(): DropdownDataType[]{
    return this.catalogItems;
  }

  printToJson(data: any): void {
    console.log(JSON.stringify(data));
  }

}
