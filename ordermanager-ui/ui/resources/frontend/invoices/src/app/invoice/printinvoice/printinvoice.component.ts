import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InvoiceFormModel } from '../../domain/domain.invoiceformmodel';
import { AgGridAngular } from 'ag-grid-angular';
import { TableCellRendererComponent } from '../table-cell-renderer/table-cell-renderer.component';
import moment from 'moment';
import { AppSecurityService } from '../../common-auth/app-security.service';
import { GridOptions } from 'ag-grid-community';
import { MessagesPrinter } from "../../common-services/common-services.app.http.service";
import { DateperiodFinderComponent } from "../../common-components/dateperiod-finder/dateperiod-finder.component";
import { isAuthenticated, numberCellRenderer } from "../../common-services/common-services-util.service";
import { CommonServicesPipesNumber } from "../../common-pipes/common-services.pipes.number";
import { TranslocoService } from "@jsverse/transloco";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: 'app-printinvoice',
  templateUrl: './printinvoice.component.html',
  styleUrls: ['./printinvoice.component.css'],
  providers: [MessagesPrinter, AppSecurityService, HttpClient, CommonServicesPipesNumber]
})
export class PrintinvoiceComponent implements OnInit, OnDestroy {
  invoicesFormModel: InvoiceFormModel[];
  frameworkComponents;
  @ViewChild('agGrid', { static: false }) agGrid: AgGridAngular;
  @ViewChild('dataFinder', { static: false }) dataFinder: DateperiodFinderComponent;

  basicAuthKey = 'basicAuthKey';
  gridOptions: GridOptions;
  processRuns: boolean;
  protected readonly isAuthenticated = isAuthenticated;

  private gridApi;
  private gridColumnApi;
  columnDefs: any[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    public securityService: AppSecurityService,
    private translocoService: TranslocoService
  ) {
    this.gridOptions = {
      context: {
        componentParent: this
      }
    };
  }

  ngOnInit(): void {
    this.frameworkComponents = {
      tableCellRenderer: TableCellRendererComponent
    };

    this.buildColumns();

    this.translocoService.langChanges$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.buildColumns();

        if (this.gridApi) {
          this.gridApi.setColumnDefs(this.columnDefs);
          this.gridApi.refreshHeader();
          this.gridApi.refreshCells({ force: true });
          this.gridApi.sizeColumnsToFit();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildColumns(): void {
    this.columnDefs = [
      {
        colId: 'pdfReport',
        headerName:this.translocoService.translate('invoice.pdf_report'),
        flex: 2,
        resizable: true,
        field: 'invoiceNumber',
        cellRenderer: TableCellRendererComponent
      },
      {
        colId: 'invoiceNumber',
        headerName:this.translocoService.translate('invoice.number'),
        resizable: true,
        field: 'invoiceNumber',
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'invoiceDescription',
        headerName:this.translocoService.translate('invoice.description'),
        resizable: true,
        field: 'invoiceDescription',
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'supplierFullName',
        headerName: this.translocoService.translate('invoice.person_creator'),
        resizable: true,
        field: 'supplierFullName',
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'recipientFullName',
        headerName: this.translocoService.translate('invoice.person_recipient'),
        resizable: true,
        field: 'recipientFullName',
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'rateType',
        headerName: this.translocoService.translate('invoice.rate_type'),
        field: 'rateType',
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'creationDate',
        headerName: this.translocoService.translate('invoice.creation_date'),
        resizable: true,
        field: 'creationDate',
        cellRenderer: this.creationDateCell,
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'invoiceDate',
        headerName: this.translocoService.translate('invoice.invoice_date'),
        resizable: true,
        field: 'invoiceDate',
        cellRenderer: this.invoiceDateCell,
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'totalSumNetto',
        headerName: this.translocoService.translate('invoice.total_netto'),
        cellRenderer: numberCellRenderer,
        resizable: true,
        field: 'totalSumNetto',
        sortable: true,
        filter: true,
        editable: true
      },
      {
        colId: 'totalSumBrutto',
        headerName: this.translocoService.translate('invoice.total_brutto'),
        cellRenderer: numberCellRenderer,
        resizable: true,
        field: 'totalSumBrutto',
        sortable: true,
        filter: true,
        editable: true
      }
    ];
  }

  creationDateCell = (params) => {
    return moment(params.data.creationDate).format('MM.DD.yyyy');
  };

  invoiceDateCell = (params) => {
    return moment(params.data.invoiceDate).format('MM.yyyy');
  };

  onGridReady(params): void {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    params.api.sizeColumnsToFit();
    this.loadInvoices();
  }

  loadInvoices() {
    this.dataFinder.loadData();
  }

  onRowValueChanged(event: any): any {
    console.log('onRowValueChanged: ' + event);
  }

  cellChanged(event: any): any {
    console.log('cellChanged: ' + event);
  }


  setDataModel(model: InvoiceFormModel[]) {
    this.invoicesFormModel = model;
  }
}
