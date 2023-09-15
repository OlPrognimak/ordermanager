import {Directive, Input} from "@angular/core";
import {ItemCatalogModel} from "../domain/domain.invoiceformmodel";
import {MessagesPrinter} from "./common-services.app.http.service";
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {remoteBackendUrl} from "../user/user-login/app-security.service";


const SELECTION_COLOR  ="blue"
const DE_SELECTION_COLOR = '#495057'
@Directive()
export class CommonServicesEditService<T> {

  /**
   * Contains original objects instead changed objects in model list
   */
  changesList: T[] = []
  /**
   * The model of  html template
   */
  @Input() modelList: T[] = []

  loadingDataError: string

  endPointUrl: String

  httpClient: HttpClient

  constructor(httpClient: HttpClient,  loadingDataError: string, endPointUrl: String) {
    this.httpClient = httpClient
    this.loadingDataError = loadingDataError
    this.endPointUrl = endPointUrl

  }

  /**
   * Rollback changed object
   *
   * @param id id of object to be rolled back
   */
  public rollbackChanges(id: number) {
    //step 1: search item in the changes list
    const originItem = this.changesList.filter(i =>i['id'] === id )?.at(0)
    //step 2: if item exists in changes list
    if (originItem !== undefined) {
      //step 3: removes item from changes list
      this.changesList = this.changesList.filter(i =>i['id']!== id )
      //step 4: sets original item back
      this.modelList.filter((i, idx) => {
        if (i['id'] === id) {
          this.modelList[idx] = originItem
          return
        }
      })
    }
  }

  /**
   *
   * @param selectedObj the select object in the table of objects
   *
   * @return the color of selection if selectd
   */
  isEditObjectChanged(selectedObj: T) {
    let obj = this.changesList?.filter(v =>selectedObj['id'] === v['id'])
    if( obj!==undefined && obj.length > 0){
      return SELECTION_COLOR
    } else {
      return DE_SELECTION_COLOR
    }
  }

  loadData = (criteria: string, invoiceItemsPar: T[], messagePrinterPar: MessagesPrinter, callback) => {

    const rsHeaders = new HttpHeaders({
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    let requestCriteria: string = ''
    if (criteria !== null && criteria !== undefined) {
      requestCriteria = criteria
    }
    let httpParams = new HttpParams().set('criteria', requestCriteria)

    const options = {
      headers: rsHeaders,
      params: httpParams,
    }
    this.httpClient.get<T[]>(remoteBackendUrl()+this.endPointUrl,options).subscribe(
      {
        next(response) {
          return callback(response)
        },
        error (err) {
          messagePrinterPar.printUnsuccessefulMessage(
            this.loadingDataError+': '+criteria, err)
        }
      }
    )
  }
}

