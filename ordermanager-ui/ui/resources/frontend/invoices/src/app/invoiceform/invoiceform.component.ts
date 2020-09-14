import {Component, OnDestroy, OnInit} from '@angular/core';
import {PrInvoiceFormDirective} from './invoiceform.service';
import {registerLocaleData} from '@angular/common';
import localede from '@angular/common/locales/de';


import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface, InvoiceItemModel,
  InvoiceItemModelInterface

} from '../domain/domain.invoiceformmodel';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable, Subject} from 'rxjs';
import {ComponentsUtilService} from '../components/components.util.service';
import {Message} from 'primeng/api/message';
import {MessageService} from 'primeng/api';



registerLocaleData(localede, 'de');

function handleResult(result: string): void {
  console.log('Result: ' + JSON.stringify(result));
}


function handleError(err: any): void {
  console.log('Error: ' + JSON.stringify(err));
}

/**
 * The component class for creation and management with invoice
 */
@Component({
  selector:    'app-invoice',
  templateUrl: './invoiceform.component.html',
  providers:  [MessageService, ComponentsUtilService]
})
export class InvoiceFormComponent implements OnInit{


  eventsModelIsReset: Subject<void> = new Subject<void>();
  backendUrl: string;
  invoiceRate: DropdownDataType[];
  /** The invoice data model */
  invoiceFormData: InvoiceFormModelInterface;
  invoiceItem: InvoiceItemModelInterface ;
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  /** Model invoice recipient for dropdown component */
  personInvoiceRecipient: DropdownDataType[];
  executionResult = false;

  /**
   * Constructor
   * @param dataGridService inject service
   * @param httpClient the http client
   */
  constructor( private httpClient: HttpClient,
               private messageService: MessageService,
               private utilService: ComponentsUtilService) {
     this.backendUrl =
       document.getElementById('appConfigId')
         .getAttribute('data-backendUrl') ;
  }


  /**
   * Initialisation of the class
   */
  ngOnInit(): void {
    this.resetModel();
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


  /**
   * save invoice to the server
   * @param event possible event
   */
  public saveInvoice(event: any): void{
    this.handleHttpRequest(
       ).toPromise().then(response => {

          const msg: Message = {severity: 'success', summary: 'Congradulation!',
                        detail: 'The invoice is saved successfully.'};
          this.messageService.add(msg);
          this.utilService.hideMassage(msg, 2000);
          this.resetModel();
      }
    ).catch(error => {
      const msg: Message = {severity: 'error', summary: 'Error',
                              detail: 'The invoice is not saved.'};
      this.messageService.add(msg);
      this.utilService.hideMassage(msg, 2000);
      handleError(error);
    });
  }

  /**
   * In case if items in table was deleted or added to the model
   * @param invoiceItems the new state of the items
   */
  itemsChanged(invoiceItems: InvoiceItemModel[]): any{
    this.invoiceFormData.invoiceItems = invoiceItems;
  }

  itemsTotalBruttoChanged(totalBrutto: number): any{
    this.invoiceFormData.totalSumBrutto = totalBrutto;
  }

  itemsTotalNettoChanged(totalNetto: number): any{
    this.invoiceFormData.totalSumNetto = totalNetto;
  }


  printToJson(data: any): void {
    alert(JSON.stringify(data));
  }


  private resetModel(): void{
    this.invoiceFormData = new InvoiceFormModel();
    this.invoiceFormData.invoiceItems.push(new InvoiceItemModel());
    this.eventsModelIsReset.next();
  }


  /**
   * Creates new instance of data model for invoice
   */
  private handleHttpRequest(): Observable<string>{
    const params = new HttpParams();
    return this.httpClient.put<string>(
      this.backendUrl + 'invoice', this.invoiceFormData, { params } );
  }

}
