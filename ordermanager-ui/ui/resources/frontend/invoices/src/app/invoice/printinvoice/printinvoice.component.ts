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
import {HttpClient} from '@angular/common/http';
import {InvoiceFormModel} from '../../domain/domain.invoiceformmodel';
import {AgGridAngular} from 'ag-grid-angular';
import {TableCellRendererComponent} from '../table-cell-renderer/table-cell-renderer.component';
import * as _moment from 'moment';
import {AppSecurityService} from '../../user/user-login/app-security.service';
import {GridOptions} from 'ag-grid-community';
import {MessagesPrinter} from "../../common-services/common-services.app.http.service";
import {DateperiodFinderComponent} from "../../common-components/dateperiod-finder/dateperiod-finder.component";
import {isAuthenticated, numberCellRenderer} from "../../common-services/common-services-util.service";
import {CommonServicesPipesNumber} from "../../common-services/common-services.pipes.number";

/**
 * The component which contains table with invoices for printing in PDF format
 */
@Component({
  selector: 'app-printinvoice',
  templateUrl: './printinvoice.component.html',
  styleUrls: ['./printinvoice.component.css'],
  providers: [MessagesPrinter, AppSecurityService, HttpClient, CommonServicesPipesNumber]
})
export class PrintinvoiceComponent implements OnInit {

  // nvoicesFormModel: any;
  //backendUrl: string;
  private gridApi;
  private gridColumnApi;
  invoicesFormModel: InvoiceFormModel[];
  frameworkComponents;
  @ViewChild('agGrid', { static: false }) agGrid: AgGridAngular;
  @ViewChild('dataFinder', {static: false}) dataFinder: DateperiodFinderComponent
  private readonly columnDefs:any;
  basicAuthKey = 'basicAuthKey';
  gridOptions: any;


  /**
   * the column definition for table
   */
  creationDateCell: any = (invoiceDate)=>{ return _moment(invoiceDate).format('MM.DD.yyyy')};
  invoiceDateCell: any = (invoiceDate)=>{ return _moment(invoiceDate).format('MM.DD.yyyy')};
  processRuns: boolean;


  checkType = function getClassName(obj: any): string {
    if (obj && obj.constructor) {
      return obj.constructor.name;
    } else {
      return "Unknown";
    }
  }

  constructor( public securityService: AppSecurityService) {
    this.gridOptions = ({
      context: {
        componentParent: this
      }
    } as GridOptions);

    this.columnDefs = [
      { headerName: 'Pdf report', flex: 2, resizable: true, field: 'invoiceNumber', cellRenderer: TableCellRendererComponent },
      {headerName: 'Invoice Number',  resizable: true, field: 'invoiceNumber',
        sortable: true, filter: true,  editable: true},
      {headerName: 'Description', resizable: true, field: 'invoiceDescription', sortable: true, filter: true, editable: true},
      {headerName: 'Invoice creator', resizable: true, field: 'supplierFullName', sortable: true, filter: true, editable: true},
      {headerName: 'Invoice recipient', resizable: true, field: 'recipientFullName', sortable: true, filter: true, editable: true},
      {headerName: 'Rate type',  field: 'rateType', sortable: true, filter: true, editable: true},
      {headerName: 'Creation date', resizable: true, field: 'creationDate',
        cellRenderer: this.creationDateCell, sortable: true, filter: true, editable: true},
      {headerName: 'Invoice date',  resizable: true, field: 'invoiceDate',
        cellRenderer: this.invoiceDateCell, sortable: true, filter: true, editable: true},
      {headerName: 'Netto price', cellRenderer: numberCellRenderer ,resizable: true, field: 'totalSumNetto', sortable: true, filter: true, editable: true},
      {headerName: 'Brutto price', cellRenderer: numberCellRenderer, resizable: true, field: 'totalSumBrutto', sortable: true, filter: true, editable: true}
    ];
    this.gridOptions.columnDefs = this.columnDefs;
  }

  /**
   *
   * @param isRun
   */
  public isProcessRunned(isRun: boolean): void {
      this.processRuns = isRun;
  }

  ngOnInit(): void {
    //this.backendUrl = environment.baseUrl;
    this.frameworkComponents = {
      tableCellRenderer: TableCellRendererComponent
    };
  }

  /**
   * Load Invoice from server and set to table model for printing of invoices
   */
  loadInvoices() {
    this.dataFinder.loadData()
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

  protected readonly isAuthenticated = isAuthenticated;


}
