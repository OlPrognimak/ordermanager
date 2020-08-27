import {Component, OnInit} from '@angular/core';
import {PrInvoiceFormDirective} from './invoiceform.service';


import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface, InvoiceItemModel,
  InvoiceItemModelInterface
} from '../domain/domain.invoiceformmodel';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';


function handleResult(result: string): void {
  console.log('Result: ' + JSON.stringify(result));
}


function handleError(err: any): void {
   console.log('Error: ' + JSON.stringify(err));
}


@Component({
  selector:    'app-invoice',
  templateUrl: './invoiceform.component.html',
  providers:  [ PrInvoiceFormDirective ]
})

export class InvoiceFormComponent implements OnInit{

  backendUrl: string;
  responseResult: string;
  invoiceFormData: InvoiceFormModelInterface;
  invoiceItem: InvoiceItemModelInterface ;
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  /** Model invoice recipient for dropdown component */
  personInvoiceRecipient: DropdownDataType[];

  constructor( private dataGridService: PrInvoiceFormDirective, private httpClient: HttpClient) {
     this.backendUrl =
       document.getElementById('appConfigId')
         .getAttribute('data-backendUrl') + 'invoice';
     this.invoiceFormData = new InvoiceFormModel();
     this.invoiceItem = new InvoiceItemModel();
     this.invoiceFormData.invoiceItems.push(this.invoiceItem) ;


   }

  ngOnInit(): void {
    this.personInvoiceSupplier = [
      {label: '[Select person type]', value: null},
      {label: 'Private person', value: 'PRIVATE'},
      {label: 'Organisation', value: 'ORGANISATION'}
    ];

    this.personInvoiceRecipient = [
      {label: '[Select rate type]', value: null},
      {label: 'Tagessatz', value: 'DAILY'},
      {label: 'Stundensatz', value: 'HOURLY'}
    ];

  }

  handleClick(event: any): void{
    this.handleClickHttp().subscribe(

      {
        next(response): void{
          handleResult(response);
        },
        error(err): void {
          handleError(err);
        }
      }

    );
  }

  handleClickHttp(): Observable<string>{
    const params = new HttpParams();
    return this.httpClient.put<string>(this.backendUrl, this.invoiceFormData, { params } );
  }


}
