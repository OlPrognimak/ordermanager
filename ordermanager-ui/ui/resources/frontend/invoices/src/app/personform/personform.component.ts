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
import {Component, NgModule, OnInit} from '@angular/core';
import {DropdownDataType} from '../domain/domain.invoiceformmodel';
import {BankAccountFormModel, PersonAddressFormModel, PersonFormModel} from '../domain/domain.personformmodel';
import {MessageService} from 'primeng/api';
import {AppSecurityService} from '../user-login/app-security.service';
import {CommonServicesUtilService} from '../common-services/common-services-util.service';
import {CommonServicesAppHttpService} from '../common-services/common-services.app.http.service';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {ButtonModule} from "primeng/button";
import {ValidatableInputTextModule} from "../common-components/validatable-input-text/validatable-input-text.component";
import {MessagesModule} from "primeng/messages";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {ValidatableDropdownlistModule} from "../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import {InputTextModule} from "primeng/inputtext";

/**
 * The component which contains form component for creation of person
 */
@Component({
  styleUrls: ['./personform.component.css'],
  selector: 'app-person',
  templateUrl: './personform.component.html',
  providers: [MessageService]
})
export class PersonFormComponent implements OnInit {
  /** person model */
  personFormModel: PersonFormModel;
  /** bank account model */
  personBankAccountModel: BankAccountFormModel;
  /** Address model */
  personAddressModel: PersonAddressFormModel;
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  /** Model for person type dropdown component */
  personType: DropdownDataType[];
  basicAuthKey = 'basicAuthKey';

  /**
   * The constructor
   * @param messageService primeNG message service
   * @param utilService utility service with method for management with success
   * and not success messages
   * @param securityService injects the security service module
   * @param httpService injects the http service module
   */
  constructor(private messageService: MessageService,
              private utilService: CommonServicesUtilService,
              public securityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<PersonFormModel>) {
  }

  /**
   * Init component
   */
  ngOnInit(): void {
    this.personType = [
      // {label: '[Select person type]', value: ''},
      {label: 'Private person', value: 'PRIVATE'},
      {label: 'Organisation', value: 'ORGANISATION'}
    ];
    this.personFormModel = new PersonFormModel();
    this.personBankAccountModel = this.personFormModel.bankAccountFormModel;
    this.personAddressModel = this.personFormModel.personAddressFormModel;
  }


  /**
   * Saves person to the database on server
   * @param item the item for saving
   */
  savePerson(event: any): void {
    this.httpService.putObjectToServer(this.personFormModel, 'Person',
      'person', (callback) => {
        if (callback) {
          this.personFormModel = new PersonFormModel();
        }
      });
  }

}

@NgModule(
  {
    imports: [CommonModule, FormsModule, ButtonModule, ValidatableInputTextModule, ValidatableDropdownlistModule,
      MessagesModule, MessageModule, ToastModule, InputTextModule],
    declarations: [PersonFormComponent],
    exports:  [PersonFormComponent],
  }
)
export class PersonFormModule{}
