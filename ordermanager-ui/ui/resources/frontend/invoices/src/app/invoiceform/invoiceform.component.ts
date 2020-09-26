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
  CreatedResponse,
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
import {ItemsTableComponent} from "../components/components.itemstable";
import {AppSecurityService} from "../app-security.service";



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
  @ViewChild(ItemsTableComponent) itemsTableComponent: ItemsTableComponent;
  /**
   * Constructor
   *
   * @param httpClient injected the http client
   * @param appSecurityService injected service for authorization
   * @param messageService injected service for management with messages
   * @param utilService injected utility with method for deleting messages
   */
  constructor( private httpClient: HttpClient,
               private appSecurityService: AppSecurityService,
               private messageService: MessageService,
               private utilService: ComponentsUtilService) {
     this.backendUrl =
       document.getElementById('appConfigId')
         .getAttribute('data-backendUrl') ;

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
      {label: '[Select rate type]', value: null},
      {label: 'Hourly rate', value: 'HOURLY'},
      {label: 'Daily rate', value: 'DAILY'}
    ];



    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    this.httpClient.get<DropdownDataType[]>(this.backendUrl + 'person/personsdropdown', {headers})
      .subscribe(
        data => {
          this.personInvoiceSupplier = data;
          this.personInvoiceRecipient = this.personInvoiceSupplier;
        },
         error => {
             console.log('Error :' + JSON.stringify(error));
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
          this.resetModel();
          this.utilService.hideMassage(msg, 2000);
      }
    ).catch(error => {
      const msg: Message = {severity: 'error', summary: 'Error',
                              detail: 'The invoice is not saved.'};
      this.messageService.add(msg);
      this.utilService.hideMassage(msg, 2000);
      handleError(error);
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


  /**
   * Creates PUT Observer  for saving invoice on server
   */
  private handleHttpRequest(): Observable<CreatedResponse>{
    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      Accept : '*/*'
    } );
    return this.httpClient.put<CreatedResponse>(
      this.backendUrl + 'invoice', this.invoiceFormData, { headers } );
  }

}
