import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DropdownDataType, InvoiceItemModel, ItemCatalogModel } from '../../domain/domain.invoiceformmodel';
import { printToJson } from "../../common-services/common-services-util.service";
import { remoteBackendUrl } from "../../common-auth/app-security.service";
import { Subject, takeUntil } from "rxjs";

/**
 * The service for table which contains items of invoice
 */
@Injectable({
  providedIn: 'root',
})
export class InvoiceItemsTableService implements OnDestroy {
  /** the url to the server */
  //backendUrl: string;
  /** contains items schot description for dropdown list */
  public catalogItems: DropdownDataType[];

  basicAuthKey = 'basicAuthKey';
  notifier = new Subject()

  /**
   * The constructor of service
   * @param httpClient http client
   */
  constructor(private httpClient: HttpClient) {
  }

  /* downloads items from catalog items */
  downloadCatalogItemsDropdownList = (callback) => {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: '*/*'
    });
    this.httpClient.get<DropdownDataType[]>(remoteBackendUrl() + 'invoice/itemscatalogdropdown', {headers}).pipe(takeUntil(this.notifier),)
      .subscribe({
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
   * @param callback result call back object
   */
  loadCatalogItemDetails = (invoiceitem: InvoiceItemModel, idItemCatalog: any, callback): void => {
    const headers = new HttpHeaders({
      Authorization: localStorage.getItem(this.basicAuthKey) as string,
      'Content-Type': 'application/json',
      Accept: '*/*'
    });
    invoiceitem.catalogItemId = Number(idItemCatalog);
    this.httpClient.get<ItemCatalogModel>((remoteBackendUrl() + 'invoice/itemcatalog/' + invoiceitem.catalogItemId),
      {headers}).pipe(takeUntil(this.notifier),)
      .subscribe({
        next(response) {
          invoiceitem.amountItems = 0
          invoiceitem.sumNetto = 0
          invoiceitem.sumBrutto = 0
          invoiceitem.itemPrice = response.itemPrice
          invoiceitem.vat = response.vat

          return callback(invoiceitem)
        },
        error(err) {
          printToJson(err);
        }
      });
  }

  ngOnDestroy(): void {
    this.notifier.next('')
    this.notifier.complete()
  }
}
