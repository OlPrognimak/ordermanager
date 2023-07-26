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
import {AfterViewInit, Component, EventEmitter, Input, NgModule, OnInit, Output, ViewChild} from '@angular/core';
import {CommonModule, registerLocaleData} from '@angular/common';
import localede from '@angular/common/locales/de';


import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface,
  InvoiceItemModel,
  InvoiceItemModelInterface
} from '../domain/domain.invoiceformmodel';

import {HttpClient, HttpClientModule, HttpHeaders} from '@angular/common/http';
import {Subject} from 'rxjs';
import {MessageService} from 'primeng/api';
import {AppSecurityService, basicAuthKey} from '../user-login/app-security.service';
import {InvoiceItemsTableComponent} from '../invoice-items-table/invoice-items-table.component';
import {CommonServicesUtilService} from '../common-services/common-services-util.service';
import {CommonServicesAppHttpService} from '../common-services/common-services.app.http.service';
import {environment} from '../../environments/environment';
import {map} from "rxjs/operators";
import {FormsModule} from "@angular/forms";
import {ValidatableDropdownlistModule} from "../validatable-dropdownlist/validatable-dropdownlist.component";
import {ValidatableInputTextModule} from "../validatable-input-text/validatable-input-text.component";
import {ValidatableCalendarModule} from "../validatable-calendar/validatable-calendar.component";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {ButtonModule} from "primeng/button";
import {TableModule} from "primeng/table";
import {TooltipModule} from "primeng/tooltip";
import {InvoicePipesModule} from "../common-services/common-services.pipes.number";
import {InputTextModule} from "primeng/inputtext";
import {InputNumberModule} from "primeng/inputnumber";
import {DropdownModule} from "primeng/dropdown";


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
  providers:  [HttpClient, AppSecurityService, MessageService, CommonServicesUtilService,
    CommonServicesAppHttpService<InvoiceFormModelInterface>]
})
export class InvoiceFormComponent implements OnInit, AfterViewInit{

  //@ViewChild("invoiceForm") invoiceForm: FormControl;
  eventsModelIsReset: Subject<void> = new Subject<void>();
  backendUrl: string;
  invoiceRate: DropdownDataType[];
  /** The invoice data model */
  invoiceFormData: InvoiceFormModelInterface;
  invoiceItem: InvoiceItemModelInterface;
  executionResult = false;
  private isViewInitialized = false;

  /** Model invoice supplier for dropdown component */
  @Input() personInvoiceSupplier: DropdownDataType[];
  /** Model invoice recipient for dropdown component */
  @Input() personInvoiceRecipient: DropdownDataType[];
  /** Event for updating input variable 'personInvoiceSupplier'*/
  @Output() personInvoiceSupplierEvent = new EventEmitter<DropdownDataType[]>();
  /** Event for updating input variable 'personInvoiceRecipient'*/
  @Output() personInvoiceRecipientEvent = new EventEmitter<DropdownDataType[]>();
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
  constructor( private httpClient: HttpClient,
               public appSecurityService: AppSecurityService,
               private messageService: MessageService,
               private utilService: CommonServicesUtilService,
               private httpService: CommonServicesAppHttpService<InvoiceFormModelInterface>) {
     this.backendUrl = environment.baseUrl;

  }

  /**
   * @override
   */
  ngAfterViewInit(): void {
    this.isViewInitialized = true;
  }


  /**
   * Initialisation of the class
   */
  ngOnInit(): void {
    this.resetModel();
    this.invoiceRate = [
     //{label: '[Select rate type]', value: null},
      {label: 'Hourly rate', value: 'HOURLY'},
      {label: 'Daily rate', value: 'DAILY'}
    ];
      const promice: Promise<any> = this.loadFormData();
      promice.then( data => {
         //this.emitPersonDataChanged();
        }
      );
  }



  /**
   * Initialisation of the class
   */
  async loadFormData(): Promise<any> {
    const auth = localStorage.getItem(basicAuthKey);

    const headers = new HttpHeaders({
      'Content-Type' : 'application/json',
      'Access-Control-Allow-Origin': '*',
      Accept : '*/*'
    });

    const observableHttpRequest = this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'person/personsdropdown', {headers})
       .pipe(
         map( response => {
             this.personInvoiceRecipient = response;
             this.personInvoiceSupplier = response;
             console.log('Get PersonDropDown Response :' + JSON.stringify(response));
             return response;
           },
         ),

       );
     observableHttpRequest.subscribe();
   }


    /** emits events with changed total netto and brutto sums */
  private emitPersonDataChanged(): void{
    this.personInvoiceSupplierEvent.emit(this.personInvoiceSupplier);
    this.personInvoiceRecipientEvent.emit(this.personInvoiceRecipient);
  }

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

@NgModule(
  {
    imports: [CommonModule, FormsModule, ValidatableDropdownlistModule, ValidatableInputTextModule,
      ValidatableCalendarModule, InputTextModule, MessageModule, HttpClientModule, ToastModule,
      ButtonModule, TableModule, TooltipModule, InvoicePipesModule, InputNumberModule, DropdownModule],
    declarations: [InvoiceFormComponent, InvoiceItemsTableComponent],
    exports: [InvoiceFormComponent, InvoiceItemsTableComponent]
  }
)
export class InvoiceFormModule {}
