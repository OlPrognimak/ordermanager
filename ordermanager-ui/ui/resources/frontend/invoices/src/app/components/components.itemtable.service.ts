import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {DropdownDataType, InvoiceItemModel, ItemCatalogModel} from '../domain/domain.invoiceformmodel';


/**
 * The service for table which contains items of invoice
 */
@Injectable({
  providedIn: 'root',
})
export class ComponentsItemtableService {
  /** the url to the server */
  backendUrl: string;
  /** contains items schot description for dropdown list */
  catalogItems: DropdownDataType[];
  basicAuthKey = 'basicAuthKey';
  /**
   * The constructor of service
   * @param httpClient http client
   */
  constructor(private httpClient: HttpClient) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    this.downloadCatalogItemsDropdownList();
  }

  /* downloads items from catalog items */
  private downloadCatalogItemsDropdownList(): void{
    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'invoice/itemscatalogdropdown', {headers})
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
    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    invoiceitem.catalogItemId = Number(idItemCatalog);
    this.httpClient.get<ItemCatalogModel>((this.backendUrl + 'invoice/itemcatalog/' + invoiceitem.catalogItemId),
      {headers})
      .toPromise()
      .then(data => {
          invoiceitem.itemPrice = data.itemPrice;
          invoiceitem.vat = data.vat;
        }
      ).catch(error => {
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
