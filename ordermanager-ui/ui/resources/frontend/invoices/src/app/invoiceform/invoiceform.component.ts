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
import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {registerLocaleData} from '@angular/common';
import localede from '@angular/common/locales/de';


import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface, InvoiceItemModel,
  InvoiceItemModelInterface

} from '../domain/domain.invoiceformmodel';
import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpEvent, HttpHandler,
  HttpHeaders,
  HttpParams,
  HttpRequest,
  HttpResponse, HttpXhrBackend
} from '@angular/common/http';
import {Observable, Subject} from 'rxjs';
import {MessageService} from 'primeng/api';
import {AppSecurityService} from '../user-login/app-security.service';
import {InvoiceItemsTableComponent} from '../invoice-items-table/invoice-items-table.component';
import {CommonServicesUtilService} from '../common-services/common-services-util.service';
import {CommonServicesAppHttpService} from '../common-services/common-services.app.http.service';
import {environment} from '../../environments/environment';



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
  providers:  []
})
export class InvoiceFormComponent implements OnInit,  AfterViewInit{


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
  private isViewInitialized = false;
  basicAuthKey = 'basicAuthKey';
  httpClient: HttpClient;

  @ViewChild(InvoiceItemsTableComponent) itemsTableComponent: InvoiceItemsTableComponent;
  /**
   * Constructor
   *
   * @param httpClient injected the http client
   * @param appSecurityService injected service for authorization
   * @param messageService injected service for management with messages
   * @param utilService injected utility with method for deleting messages
   * @param httpService http service for communication with server
   */
  constructor( /*private httpClient: HttpClient, */
               private handler: HttpBackend, private httpXhrBackend: HttpXhrBackend,
               public appSecurityService: AppSecurityService,
               private messageService: MessageService,
               private utilService: CommonServicesUtilService,
               private httpService: CommonServicesAppHttpService<InvoiceFormModelInterface>) {
     this.backendUrl = environment.baseUrl;
     this.httpClient = new HttpClient(handler);

  }

  /**
   * @override
   */
  ngAfterViewInit(): void {
    this.isViewInitialized = true;
  }


  // @ts-ignore
  /**
   * Initialisation of the class
   */
  ngOnInit(): void {
    console.log('################## : ngOnInit Start InvoiceForm');
    this.resetModel();
    this.invoiceRate = [
      {label: '[Select rate type]', value: null},
      {label: 'Hourly rate', value: 'HOURLY'},
      {label: 'Daily rate', value: 'DAILY'}
    ];
    const auth = localStorage.getItem(this.basicAuthKey);
    console.log('###### Auth :' + auth);
    const rheaders = new HttpHeaders()
      .set('authorization', auth);
    //   .set('Content-Type', 'application/json')
    //   .set('Accept', '*/*');
    //   Authorization : localStorage.getItem(this.basicAuthKey),
    //   'Content-Type' : 'application/json' as const,
    //   Accept : '*/*' as const
    // });
    // const reqheaders = new HttpHeaders({
    //   Authorization : localStorage.getItem(this.basicAuthKey),
    //   'Content-Type' : 'application/json' as const,
    //   Accept : '*/*' as const
    // });
    //
    // const options = {
    //   headers: reqheaders
    // };

    const req = new HttpRequest('GET', this.backendUrl + 'person/personsdropdown', {headers : rheaders});
    console.log('********** Authorization header has set:' + req.headers.get('Authorization'));
    this.httpClient.request<DropdownDataType[]>(req).pipe()
      .subscribe(
        data => {
          const response = data as HttpResponse<DropdownDataType[]>;
          if (response.ok) {
            this.personInvoiceSupplier = response.body;
            this.personInvoiceRecipient = this.personInvoiceSupplier;
          } else {
            console.log('GET person/personsdropdown Error occurs. Status: ' + response.status);
            console.log('GET person/personsdropdown Error occurs. Headers: ' + JSON.stringify(response.headers));
            console.log('GET person/personsdropdown Error occurs. Body: ' + JSON.stringify(response.body));
          }
        },
        error => {
          console.log('GET person/personsdropdown Error occurs. Status: ' + error.status);
          console.log('GET person/personsdropdown Error occurs. Headers: ' + JSON.stringify(error.headers));
          console.log('Error :' + JSON.stringify(error));
        }
      );
  }

  //   this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'person/personsdropdown', options)
  //     .subscribe(
  //       data => {
  //         this.personInvoiceSupplier = data;
  //         this.personInvoiceRecipient = this.personInvoiceSupplier;
  //       },
  //        error => {
  //            console.log('GET person/personsdropdown Error occurs. Status: ' + error.status);
  //            console.log('GET person/personsdropdown Error occurs. Headers: ' + JSON.stringify(error.headers) );
  //            console.log('Error :' + JSON.stringify(error));
  //        }
  //     );
  // }

  /**
   * Saves person to the database on server
   * @param item the item for saving
   */
  saveInvoice(event: any): void {
    this.httpService.putObjectToServer(this.invoiceFormData, 'Invoice',
      'invoice', (callback) => {
        if (callback){
          this.resetModel();
        }
      });
  }

  public printToJson(data: any): void {
    alert(JSON.stringify(data));
  }

  /**
   * This method has two possible implementation to reset total values on
   * child component.
   * 1) With using subject eventsModelIsReset.next() or
   * 2) By using @ChildView reference Object this.itemsTableComponent.resetTotalValues()
   * @private
   */
  private resetModel(): void{
    this.invoiceFormData = new InvoiceFormModel();
    this.invoiceFormData.invoiceItems.push(new InvoiceItemModel());
    // this.eventsModelIsReset.next();

    if (this.isViewInitialized) {
       this.itemsTableComponent.resetTotalValues();
    }
  }

}
