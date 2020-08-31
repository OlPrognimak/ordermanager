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

function createNewModel(): void{

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
  expandedRows: any;
  executionResult:any = false;


  constructor( private dataGridService: PrInvoiceFormDirective, private httpClient: HttpClient) {
     this.backendUrl =
       document.getElementById('appConfigId')
         .getAttribute('data-backendUrl') ;
  }

  ngOnInit(): void {
    //createNewModel();
    this.invoiceFormData = new InvoiceFormModel();
    this.invoiceFormData.invoiceItems.push(new InvoiceItemModel()) ;

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
    this.handleClickHttp().toPromise().then(data => {
        this.resetModel();
      }
    ).then(error => {
      handleError(error);
    });
  }

  handleClick1(event: any): void{
    // tslint:disable-next-line:prefer-const
    this.executionResult = false;
    this.handleClickHttp().subscribe(
      {
        next(response): void{

          this.executionResult = true;
         // document.onreadystatechange = function () {

           // if (document.readyState === 'complete') {
              //this.invoiceFormData = new InvoiceFormModel();
              //this.invoiceFormData.invoiceItems.push(new InvoiceItemModel()) ;
              //alert("New Data: "+JSON.stringify( this.invoiceFormData));
           // }
          //}
          handleResult(response);
        },
        error(err): void {
          this.executionResult = false;
          handleError(err);
        }
      }
    );
    while (this.executionResult === false){
      alert("Exec result:="+this.executionResult);

    }

    if(this.executionResult === true) {
      alert('Document State XXX:=' + document.readyState);
    }
  }

  private resetModel(): void{
    this.invoiceFormData = new InvoiceFormModel();
    this.invoiceFormData.invoiceItems.push(new InvoiceItemModel()) ;
  }


  /**
   * Creates new instance of data model for invoice
   */
  handleClickHttp(): Observable<string>{
    const params = new HttpParams();
    return this.httpClient.put<string>(this.backendUrl + 'invoice', this.invoiceFormData, { params } );
  }

  /**
   * In case if items in table was deleted or added to the model
   * @param invoiceItems the new state of the items
   */
  itemsChanged(invoiceItems: InvoiceItemModel[]): any{
    this.invoiceFormData.invoiceItems = invoiceItems;
  }



  printToJson(data: any): void {
    alert(JSON.stringify(data));
  }



}
