import {Component, OnInit, ViewChild} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {InvoiceFormModel} from '../domain/domain.invoiceformmodel';
import {AgGridAngular} from 'ag-grid-angular';
import {TableCellRendererComponent} from '../table-cell-renderer/table-cell-renderer.component';

/**
 * The component which contains table with invoices for printing in PDF format
 */
@Component({
  selector: 'app-printinvoice',
  templateUrl: './printinvoice.component.html',
  styleUrls: ['./printinvoice.component.css']
})
export class PrintinvoiceComponent implements OnInit {
  invoicesFormModel: any;
  backendUrl: string;
  private gridApi;
  private gridColumnApi;
  frameworkComponents;

  /**
   * the column definition for table
   */
  @ViewChild('agGrid', { static: false, }) agGrid: AgGridAngular;
  columnDefs = [
    {headerName: 'print', field: 'invoiceNumber', cellRenderer: 'tableCellRenderer'},
    {headerName: 'Invoice Number', field: 'invoiceNumber', sortable: true, filter: true, checkboxSelection: true, editable: true},
    {headerName: 'Description', field: 'invoiceDescription', sortable: true, filter: true, editable: true},
    {headerName: 'Invoice creator', field: 'supplierFullName', sortable: true, filter: true, editable: true},
    {headerName: 'Invoice recipient', field: 'recipientFullName', sortable: true, filter: true, editable: true},
    {headerName: 'Rate type', field: 'rateType', sortable: true, filter: true, editable: true},
    {headerName: 'Creation date', field: 'creationDate', sortable: true, filter: true, editable: true},
    {headerName: 'Invoice date', field: 'invoiceDate', sortable: true, filter: true, editable: true},
    {headerName: 'Netto price', field: 'totalSumNetto', sortable: true, filter: true, editable: true},
    {headerName: 'Brutto price', field: 'totalSumBrutto', sortable: true, filter: true, editable: true}

  ];



  constructor(private httpClient: HttpClient) {
  }

  ngOnInit(): void {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl');

    this.frameworkComponents = {
      tableCellRenderer: TableCellRendererComponent
    };
  }

  /**
   * Load Invoice from server and set to table model for printing of invoices
   */
  loadInvoices(): void {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    this.httpClient.get<InvoiceFormModel[]>(this.backendUrl + 'invoicesList', {headers})
      .subscribe((data => {
            this.invoicesFormModel = data;
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
    this.loadInvoices();
  }

  onRowValueChanged(event: any): any{
    console.log('onRowValueChanged: ' + event);
  }

  cellChanged(event: any): any{
    console.log('cellChanged: ' + event);
  }

}
