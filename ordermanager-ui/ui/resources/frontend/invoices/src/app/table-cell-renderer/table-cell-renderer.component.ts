import { Component, OnInit } from '@angular/core';
import {ICellRendererAngularComp} from 'ag-grid-angular';
import {ICellRendererParams} from 'ag-grid-community';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {InvoiceFormModel} from '../domain/domain.invoiceformmodel';

@Component({
  selector: 'app-table-cell-renderer',
  templateUrl: './table-cell-renderer.component.html',
  styleUrls: ['./table-cell-renderer.component.css']
})
export class TableCellRendererComponent implements OnInit, ICellRendererAngularComp {
  private cellVale: any;
  private backendUrl: string;
  constructor(private httpClient: HttpClient) { }

  ngOnInit(): void {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl');
  }



  agInit(params: ICellRendererParams): void {
    this.cellVale = params.value;
  }

  refresh(params: any): boolean {
    this.cellVale = params.value;
    return true;
  }

  /**
   * Loads pdf report from server
   */
  loadPdfReport(event: any): any {
    window.open(this.backendUrl + 'invoice/report/' + this.cellVale);
    // const headers = new HttpHeaders();
    // //headers.set("Accept","application/pdf");
    //
    // this.httpClient.get<any>(this.backendUrl + 'invoice/report/' + this.cellVale, {headers})
    //   .subscribe(((data) => {
    //         console.log('relort loaded');
    //       }
    //     )
    //   );
  }

}
