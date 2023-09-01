import {Component, OnInit} from '@angular/core';
import {ICellRendererAngularComp} from 'ag-grid-angular';
import {ICellRendererParams} from 'ag-grid-community';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {MessagesPrinter} from "../../common-services/common-services.app.http.service";
import {Observable, of} from "rxjs";
import {map} from "rxjs/operators";
import {remoteBackendUrl} from "../../user/user-login/app-security.service";

/**
 * Cell renderer for ng-Grid. This rendered renders button which call PDF report from server
 */
@Component({
  selector: 'app-table-cell-renderer',
  templateUrl: './table-cell-renderer.component.html',
  styleUrls: ['./table-cell-renderer.component.css'],
  providers: [HttpClient, MessagesPrinter]
})
export class TableCellRendererComponent implements OnInit, ICellRendererAngularComp {
  private cellVale: any;
  //private backendUrl: string;
  private basicAuthKey = 'basicAuthKey';
  constructor(private httpClient: HttpClient, private messagePrinter: MessagesPrinter) { }
  parentTableComponent: any;
  public params: ICellRendererParams;
  private msgObservable = of(this.messagePrinter);

  /**
   * @inheritDoc
   */
  ngOnInit(): void {
    //this.backendUrl = environment.baseUrl
    this.parentTableComponent = this.params.context.componentParent;
  }


  /**
   * @inheritDoc
   */
  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.cellVale = params.value;
  }

  /**
   * @inheritDoc
   */
  refresh(params: any): boolean {
    this.cellVale = params.value;
    return true;
  }

  loadPdfReport(event: any): any {
    return this.load(event, this.msgObservable, this.params);
  }

  /**
   * Loads pdf report from server
   */
  load(event: any, msgObservable: Observable<MessagesPrinter>, params: any ): any {
   // window.open(this.backendUrl + 'invoice/report/' + this.cellVale);
    this.params.context.componentParent.isProcessRunned(true);
    const rheaders = new HttpHeaders({
      'Access-Control-Allow-Origin': '*',
      Accept : '*/*',
      'Content-Type':  'application/json',
    } );
    const httpParams =  new HttpParams();
    httpParams.set('invoiceNumber', this.cellVale);
    const options = {
      headers : rheaders,
      responseType: 'blob' as 'json'
    };

    const blobObserver = this.httpClient.post<Blob>(remoteBackendUrl() + 'invoice/printreport', {invoiceNumber: this.cellVale}, options)
        .pipe(
           map(
             (response: Blob) => {
                     const pdfBlob = new Blob([response], { type: 'application/pdf' })
                     const fileURL = URL.createObjectURL(pdfBlob)
                     window.open(fileURL)
                     this.params.context.componentParent.isProcessRunned(false)
             }
           )
        )
        blobObserver
          .subscribe({
          error(err) {
            params.context.componentParent.isProcessRunned(false);
            msgObservable.subscribe(m => m.printUnsuccessefulMessage('pdf Invoice ', err))
          }
        });
  }

}
