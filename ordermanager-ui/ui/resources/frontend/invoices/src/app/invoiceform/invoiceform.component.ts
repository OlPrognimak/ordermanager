import {Component, OnInit} from '@angular/core';
import {PrInvoiceFormDirective} from './invoiceform.service';


import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface, InvoiceItemModel,
  InvoiceItemModelInterface
} from '../domain/domain.invoiceformmodel';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from "rxjs/operators";


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
  invoiceRate: DropdownDataType[];
  invoiceFormData: InvoiceFormModelInterface;
  invoiceItem: InvoiceItemModelInterface ;
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  /** Model invoice recipient for dropdown component */
  personInvoiceRecipient: DropdownDataType[];

  constructor( private dataGridService: PrInvoiceFormDirective, private httpClient: HttpClient) {
     this.backendUrl =
       document.getElementById('appConfigId')
         .getAttribute('data-backendUrl') ;
     this.invoiceFormData = new InvoiceFormModel();
     this.invoiceItem = new InvoiceItemModel();
     this.invoiceFormData.invoiceItems.push(this.invoiceItem) ;


   }

  ngOnInit(): void {
    this.invoiceRate = [
      {label: '[Select rate type]', value: null},
      {label: 'Hourly rate', value: 'HOURLY'},
      {label: 'Daily rate', value: 'DAILY'}
    ];

    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'personsdropdown', {headers})
      .subscribe(
        data => {
          this.personInvoiceSupplier = data;
          this.personInvoiceRecipient = this.personInvoiceSupplier;
        },
         error => {
             alert('Error :' + JSON.stringify(error));
         }
      );
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
    return this.httpClient.put<string>(this.backendUrl+ 'invoice', this.invoiceFormData, { params } );
  }


}
