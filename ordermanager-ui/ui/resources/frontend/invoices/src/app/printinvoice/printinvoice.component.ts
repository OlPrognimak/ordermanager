import {Component, OnInit, ViewChild} from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {InvoiceFormModel} from "../domain/domain.invoiceformmodel";
import {AgGridAngular} from "ag-grid-angular";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-printinvoice',
  templateUrl: './printinvoice.component.html',
  styleUrls: ['./printinvoice.component.css']
})
export class PrintinvoiceComponent implements OnInit {

  //invoicesFormModel: InvoiceFormModel[];
  invoicesFormModel: any;
  backendUrl: string;


  @ViewChild('agGrid', { static: false, }) agGrid: AgGridAngular;
  columnDefs = [
    {headerName: 'Invoice Number', field: 'invoiceNumber', sortable: true, filter: true, checkboxSelection: true, editable: true},
    {headerName: 'Description', field: 'invoiceDescription', sortable: true, filter: true, editable: true},
    {headerName: 'Invoice creator', field: 'supplierFullName', sortable: true, filter: true, editable: true},
    {headerName: 'Invoice recipient', field: 'recipientFullName', sortable: true, filter: true, editable: true},
    {headerName: 'Rate type', field: 'rateType', sortable: true, filter: true, editable: true},
    {headerName: 'Creation date', field: 'creationDate', sortable: true, filter: true, editable: true},
    {headerName: 'Invoice date', field: 'invoiceDate', sortable: true, filter: true, editable: true},
    {headerName: 'Netto price', field: 'totalSumNetto', sortable: true, filter: true, editable: true},
    {headerName: 'Brutto price', field: 'totalSumBrutto', sortable: true, filter: true, editable: true},
    {headerName: 'Button', field: `<button mat-raised-button color="primary" (click)="getRecord(element.name)">`}

  ];


  constructor(private httpClient: HttpClient) {
  }

  ngOnInit(): void {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl');
    this.loadInvoices();
  }


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


  onRowValueChanged(event: any): any{
    console.log('onRowValueChanged: ' + event);
  }

  cellChanged(event: any): any{
    console.log('cellChanged: ' + event);
  }

}
