import { Component, OnInit } from '@angular/core';
import {ICellRendererAngularComp} from 'ag-grid-angular';
import {ICellRendererParams} from 'ag-grid-community';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {InvoiceFormModel} from '../domain/domain.invoiceformmodel';

/**
 * Cell renderer for ng-Grid. This rendered renders button which call PDF report from server
 */
@Component({
  selector: 'app-table-cell-renderer',
  templateUrl: './table-cell-renderer.component.html',
  styleUrls: ['./table-cell-renderer.component.css']
})
export class TableCellRendererComponent implements OnInit, ICellRendererAngularComp {
  private cellVale: any;
  private backendUrl: string;
  private basicAuthKey = 'basicAuthKey';
  constructor(private httpClient: HttpClient) { }

  /**
   * @inheritDoc
   */
  ngOnInit(): void {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl');
  }


  /**
   * @inheritDoc
   */
  agInit(params: ICellRendererParams): void {
    this.cellVale = params.value;
  }

  /**
   * @inheritDoc
   */
  refresh(params: any): boolean {
    this.cellVale = params.value;
    return true;
  }

  /**
   * Loads pdf report from server
   */
  loadPdfReport(event: any): any {
   // window.open(this.backendUrl + 'invoice/report/' + this.cellVale);
    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      Accept : '*/*',
      'Content-Type':  'application/json',
    } );
    const httpParams =  new HttpParams();
    httpParams.set('invoiceNumber', this.cellVale);

    this.httpClient.post<any>(this.backendUrl + 'invoice/report/', {invoiceNumber: this.cellVale},
      {headers, responseType: 'blob' as 'json'})
      .subscribe(((data) => {
            console.log('PDF Data Loaded');
            const pdfBlob = new Blob([data], { type: 'application/pdf' });
            console.log('report loaded');
            const fileURL = URL.createObjectURL(pdfBlob);
            window.open(fileURL);
          }
        )
      );
  }

}
