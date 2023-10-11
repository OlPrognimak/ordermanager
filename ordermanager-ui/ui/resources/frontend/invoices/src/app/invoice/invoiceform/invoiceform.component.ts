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
  InvoiceItemModel
} from '../../domain/domain.invoiceformmodel';

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {Subject} from 'rxjs';
import {MessageService} from 'primeng/api';
import {AppSecurityService} from '../../user/user-login/app-security.service';
import {InvoiceItemsTableComponent} from '../invoice-items-table/invoice-items-table.component';
import {
  CommonServicesUtilService,
  invoiceRate,
  isAuthenticated
} from '../../common-services/common-services-util.service';
import {CommonServicesAppHttpService, MessagesPrinter} from '../../common-services/common-services.app.http.service';
import {FormsModule} from "@angular/forms";
import {ValidatableDropdownlistModule} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import {ValidatableInputTextModule} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {ValidatableCalendarModule} from "../../common-components/validatable-calendar/validatable-calendar.component";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {ButtonModule} from "primeng/button";
import {TableModule} from "primeng/table";
import {TooltipModule} from "primeng/tooltip";
import {InvoicePipesModule} from "../../common-services/common-services.pipes.number";
import {InputTextModule} from "primeng/inputtext";
import {InputNumberModule} from "primeng/inputnumber";
import {DropdownModule} from "primeng/dropdown";
import {RippleModule} from "primeng/ripple";
import {MessagesModule} from "primeng/messages";
import {InvoiceFormValidator} from "./invoice.form.validator";


registerLocaleData(localede, 'de');

/**
 * The component class for creation and management with invoice
 */
@Component({
  selector:    'app-invoice',
  templateUrl: './invoiceform.component.html',
  providers:  [HttpClient, AppSecurityService, MessageService, CommonServicesUtilService, MessagesPrinter,
    CommonServicesAppHttpService<InvoiceFormModelInterface>]
})
export class InvoiceFormComponent extends InvoiceFormValidator implements OnInit, AfterViewInit{

  eventsModelIsReset: Subject<void> = new Subject<void>();
  //backendUrl: string;
  /** The invoice data model */
  invoiceFormData: InvoiceFormModelInterface;
  private isViewInitialized = false;

  /** Model invoice supplier for dropdown component */
  @Input() personInvoiceSupplier: DropdownDataType[];
  /** Model invoice recipient for dropdown component */
  @Input() personInvoiceRecipient: DropdownDataType[];
  /** Event for updating input variable 'personInvoiceSupplier'*/
  @Output() personInvoiceSupplierEvent = new EventEmitter<DropdownDataType[]>();
  /** Event for updating input variable 'personInvoiceRecipient'*/
  @Output() personInvoiceRecipientEvent = new EventEmitter<DropdownDataType[]>();
  @ViewChild("itemsTableRef") itemsTableComponent: InvoiceItemsTableComponent;

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
               private messageService: MessagesPrinter,
               private utilService: CommonServicesUtilService,
               private httpService: CommonServicesAppHttpService<InvoiceFormModelInterface>) {
     //this.backendUrl = environment.baseUrl;
    super()
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
    this.loadFormData();
  }

  /**
   * Initialisation of the class
   */
  loadFormData() {
    this.httpService.loadDropdownData('person/personsdropdown', callback => {
      if(callback !=null) {
        this.personInvoiceRecipient = callback;
        this.personInvoiceSupplier = callback;
      }
    })
   }

    /** emits events with changed total netto and brutto sums */
  private emitPersonDataChanged(): void{
    this.personInvoiceSupplierEvent.emit(this.personInvoiceSupplier);
    this.personInvoiceRecipientEvent.emit(this.personInvoiceRecipient);
  }

  /**
   * Saves person to the database on server
   * @param event the item for saving
   */
  saveInvoice(event: any): void {
    this.httpService.putObjectToServer('PUT', this.invoiceFormData, 'Invoice',
      'invoice', (callback) => {
        if (callback){
          this.resetModel();
        }
      });
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
  protected readonly invoiceRate = invoiceRate;
  protected readonly isAuthenticated = isAuthenticated;
}

@NgModule(
  {
    imports: [CommonModule, FormsModule, ValidatableDropdownlistModule, ValidatableInputTextModule,
      ValidatableCalendarModule, InputTextModule, MessageModule, HttpClientModule, ToastModule,  MessagesModule,
      ButtonModule, TableModule, TooltipModule, InvoicePipesModule, InputNumberModule, DropdownModule, RippleModule],
    declarations: [InvoiceFormComponent, InvoiceItemsTableComponent],
    exports: [InvoiceFormComponent, InvoiceItemsTableComponent]
  }
)
export class InvoiceFormModule {}
