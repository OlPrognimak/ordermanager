import {Injectable, Input} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {DropdownDataType, InvoiceItemModel, ItemCatalogModel} from '../domain/domain.invoiceformmodel';
import {environment} from "../../environments/environment";


/**
 * The service for table which contains items of invoice
 */
@Injectable({
  providedIn: 'root',
})
export class InvoiceItemsTableService {
  /** the url to the server */
  backendUrl: string;
  /** contains items schot description for dropdown list */
  public catalogItems: DropdownDataType[];

  basicAuthKey = 'basicAuthKey';
  /**
   * The constructor of service
   * @param httpClient http client
   */
  constructor(private httpClient: HttpClient) {
    this.backendUrl = environment.baseUrl;
  }

  /* downloads items from catalog items */
  downloadCatalogItemsDropdownList = (callback) =>{
    const headers = new HttpHeaders({
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'invoice/itemscatalogdropdown', {headers})
     .subscribe( {
       next(response) {
         return callback(response)
       },
       error(err) {
         console.log("Can not load item list for invoice. " + JSON.stringify(err))
       }
    })
  };

  /**
   * Load catalog item from server and update the invoice table model
   * @param invoiceitem the item which belong to table row in item table model
   * @param idItemCatalog id catalog item
   */
  loadCatalogItemDetails = (invoiceitem: InvoiceItemModel, idItemCatalog: any, callback): void =>{
    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    invoiceitem.catalogItemId = Number(idItemCatalog);
    this.httpClient.get<ItemCatalogModel>((this.backendUrl + 'invoice/itemcatalog/' + invoiceitem.catalogItemId),
      {headers})
      .subscribe( {
        next(response){
          invoiceitem.amountItems = 0
          invoiceitem.sumNetto = 0
          invoiceitem.sumBrutto = 0
          invoiceitem.itemPrice = response.itemPrice
          invoiceitem.vat = response.vat

          return callback(invoiceitem)
        },
        error(err) {
          this.printToJson(err);
        }
      });
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
