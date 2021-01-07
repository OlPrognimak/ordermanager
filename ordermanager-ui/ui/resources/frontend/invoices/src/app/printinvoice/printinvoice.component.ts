/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import {Component, OnInit, ViewChild} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {InvoiceFormModel} from '../domain/domain.invoiceformmodel';
import {AgGridAngular} from 'ag-grid-angular';
import {TableCellRendererComponent} from '../table-cell-renderer/table-cell-renderer.component';
import * as _moment from 'moment';
import {AppSecurityService} from '../user-login/app-security.service';
import {GridOptions} from 'ag-grid-community';
import {DialogModule} from 'primeng/dialog';
import {environment} from "../../environments/environment";

/**
 * The component which contains table with invoices for printing in PDF format
 */
@Component({
  selector: 'app-printinvoice',
  templateUrl: './printinvoice.component.html',
  styleUrls: ['./printinvoice.component.css'],
  providers: []
})
export class PrintinvoiceComponent implements OnInit {

  // nvoicesFormModel: any;
  backendUrl: string;
  private gridApi;
  private gridColumnApi;
  private gridOprionsApi;
  invoicesFormModel: InvoiceFormModel[];
  frameworkComponents;
  @ViewChild('agGrid', { static: false }) agGrid: AgGridAngular;
  private readonly columnDefs = [];
  basicAuthKey = 'basicAuthKey';
  gridOptions: any;
  /**
   * the column definition for table
   */
  creationDateCell: any;
  invoiceDateCell: any;
  processRuns: boolean;
  displayProcessDialog = false;


  constructor(private httpClient: HttpClient, public securityService: AppSecurityService) {
    this.gridOptions = ({
      context: {
        componentParent: this
      }
    } as GridOptions);

    this.columnDefs = [
      {headerName: 'print', flex: 2, resizable: true, field: 'invoiceNumber', cellRenderer: 'tableCellRenderer'},
      {headerName: 'Invoice Number',  resizable: true, field: 'invoiceNumber',
        sortable: true, filter: true, checkboxSelection: true, editable: true},
      {headerName: 'Description', resizable: true, field: 'invoiceDescription', sortable: true, filter: true, editable: true},
      {headerName: 'Invoice creator', resizable: true, field: 'supplierFullName', sortable: true, filter: true, editable: true},
      {headerName: 'Invoice recipient', resizable: true, field: 'recipientFullName', sortable: true, filter: true, editable: true},
      {headerName: 'Rate type',  field: 'rateType', sortable: true, filter: true, editable: true},
      {headerName: 'Creation date', resizable: true, field: 'creationDate',
        cellRenderer: this.creationDateCell, sortable: true, filter: true, editable: true},
      {headerName: 'Invoice date',  resizable: true, field: 'invoiceDate',
        cellRenderer: this.invoiceDateCell, sortable: true, filter: true, editable: true},
      {headerName: 'Netto price',  resizable: true, field: 'totalSumNetto', sortable: true, filter: true, editable: true},
      {headerName: 'Brutto price',  resizable: true, field: 'totalSumBrutto', sortable: true, filter: true, editable: true}
    ];
    this.gridOptions.columnDefs = this.columnDefs;
  }

  /**
   *
   * @param isRun
   */
  public isProcessRunned(isRun: boolean): void{
      this.displayProcessDialog = isRun;
      this.processRuns = isRun;
  }

  ngOnInit(): void {
    this.backendUrl = environment.baseUrl;

    this.frameworkComponents = {
      tableCellRenderer: TableCellRendererComponent
    };

    this.creationDateCell =  (data) => {
      return _moment(data.creationDate).format('DD.MM.YYYY');
    };

    this.invoiceDateCell =  (data) => {
      return _moment(data.creationDate).format('DD.MM.YYYY');
    };

  }

  /**
   * Load Invoice from server and set to table model for printing of invoices
   */
  loadInvoices(): void {
    this.isProcessRunned(true);

    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    this.httpClient.get<InvoiceFormModel[]>(this.backendUrl + 'invoice/invoicesList', {headers})
      .subscribe((data => {
            this.invoicesFormModel = data;
            this.isProcessRunned(false);
          }

        )
      );
  }

  /**
   * sets to components the api objects from
   * @param params the event from grid
   */
  onGridReady(params): any{
    this.gridApi = params.api;
    this.gridColumnApi = params.gridColumnApi;
    params.api.sizeColumnsToFit();
    this.loadInvoices();
  }

  onRowValueChanged(event: any): any{
    console.log('onRowValueChanged: ' + event);
  }

  cellChanged(event: any): any{
    console.log('cellChanged: ' + event);
  }

}
