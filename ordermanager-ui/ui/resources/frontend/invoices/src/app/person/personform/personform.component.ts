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
import {Component, NgModule, OnInit, ViewChild} from '@angular/core';
import {DropdownDataType} from '../../domain/domain.invoiceformmodel';
import {BankAccountFormModel, PersonAddressFormModel, PersonFormModel} from '../../domain/domain.personformmodel';
import {MessageService} from 'primeng/api';
import {AppSecurityService} from '../../user/user-login/app-security.service';
import {CommonServicesUtilService, personType} from '../../common-services/common-services-util.service';
import {CommonServicesAppHttpService} from '../../common-services/common-services.app.http.service';
import {CommonModule} from "@angular/common";
import {FormGroupDirective, FormsModule, NgForm, NgModel} from "@angular/forms";
import {ButtonModule} from "primeng/button";
import {ValidatableInputTextModule} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {MessagesModule} from "primeng/messages";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {ValidatableDropdownlistModule} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import {InputTextModule} from "primeng/inputtext";
import {AngularIbanModule} from "angular-iban";
import {InvoicePipesModule} from "../../common-services/common-services.pipes.number";

/**
 * The component which contains form component for creation of person
 */
@Component({
  styleUrls: ['./personform.component.css'],
  selector: 'app-person',
  templateUrl: './personform.component.html',
  providers: [MessageService, FormGroupDirective]
})
export class PersonFormComponent implements OnInit {

  @ViewChild('modelRef') ibanModelRef: NgModel
  @ViewChild('personForm') personForm: NgForm
  /** person model */
  personFormModel: PersonFormModel;
  /** bank account model */
  personBankAccountModel: BankAccountFormModel;
  /** Address model */
  personAddressModel: PersonAddressFormModel;
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  basicAuthKey = 'basicAuthKey';
  private hasPersonTypeError: boolean;
  private hasFirstNameError: boolean;
  private hasLastNameError: boolean;
  private hasCompanyNameError: boolean;
  private hasEmailError: boolean;
  private hasTaxNumberError: boolean;
  private hasZipCodeError: boolean;
  private hasCityError: boolean;
  private hasStreetError: boolean;
  private hasBankNameError: boolean;
  private hasIbahError: boolean = true;
  private hasBicError: boolean;
  ibanContolModel: NgModel;
  emailPattern =  '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}'
  ibanValidationAtts =  {
    ibanValidator: true
  }

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
    this.personFormModel = new PersonFormModel();
    this.personBankAccountModel = this.personFormModel.bankAccountFormModel;
    this.personAddressModel = this.personFormModel.personAddressFormModel;
  }


  /**
   * Saves person to the database on server
   * @param item the item for saving
   */
  savePerson(event: any): void {
    this.httpService.putObjectToServer('PUT', this.personFormModel, 'Person',
      'person', (callback) => {
        if (callback) {
          this.personFormModel = new PersonFormModel();
        }
      });
  }

  setHasPersonTypeError(val: boolean) {
    setTimeout( () => {
      if(this.hasPersonTypeError !== val) {
        this.hasPersonTypeError = val
      }
    })
  }

  setHasFirstNameError(val: boolean) {
    setTimeout(() => {
      if (this.hasFirstNameError !== val) {
        this.hasFirstNameError = val
      }
    })
  }

  setHasLastNameError(val: boolean) {
    setTimeout(() => {
      if (this.hasLastNameError !== val) {
        this.hasLastNameError = val
      }
    })
  }

  setHasCompanyNameError(val: boolean) {
    setTimeout(() => {
      if (this.hasCompanyNameError !== val) {
        this.hasCompanyNameError = val
      }
    })
  }

  setHasEmailError(val: boolean) {
    setTimeout(() => {
      if (this.hasEmailError !== val) {
        this.hasEmailError = val
      }
    })
  }

  setHasTaxNumberError(val: boolean) {
    setTimeout(() => {
      if (this.hasTaxNumberError !== val) {
        this.hasTaxNumberError = val
      }
    })
  }

  setHasZipCodeError(val: boolean) {
    setTimeout(() => {
      if (this.hasZipCodeError !== val) {
        this.hasZipCodeError = val
      }
    })
  }

  setHasCityError(val: boolean) {
    setTimeout(() => {
      if (this.hasCityError !== val) {
        this.hasCityError = val
      }
    })
  }

  setHasStreetError(val: boolean) {
    setTimeout(() => {
      if (this.hasStreetError !== val) {
        this.hasStreetError = val
      }
    })
  }

  setHasBankNameError(val: boolean) {
    setTimeout(() => {
      if (this.hasBankNameError !== val) {
        this.hasBankNameError = val
      }
    })
  }

  setHasIbahError(val: boolean, origin: any) {

    if (this.hasIbahError !== val) {
      setTimeout(() => {
          this.hasIbahError = val
        })
    }

    return origin;
  }


  setHasBicError(val: boolean) {
    setTimeout(() => {
      if (this.hasBicError !== val) {
        this.hasBicError = val
      }
    })
  }

  haveErrors() {
    let hasSomeError = false
    if(this.hasPersonTypeError) {
      return true;
    } else if(this.personFormModel.personType==='PRIVATE'){
      hasSomeError = this.hasFirstNameError || this.hasLastNameError || this.hasTaxNumberError
    } else if(this.personFormModel.personType==='ORGANISATION'){
      hasSomeError = this.hasCompanyNameError
    }
    const commonResult = hasSomeError ||
             this.hasEmailError ||
             this.hasZipCodeError ||
             this.hasCityError ||
             this.hasStreetError ||
             this.hasBankNameError ||
             this.hasIbahError ||
             this.hasBicError
    return commonResult
  }

  setIbanControlModel(val: NgModel) {
    setTimeout(() => {
      this.ibanContolModel = val
    })
  }

  setIbanContolModel(model: NgModel) {
    this.ibanContolModel = model
  }

  peronTypeChanged($event: any) {
    //this.formGroupDirective.form.updateValueAndValidity()
  }

  protected readonly personType = personType;
}

@NgModule(
  {
    imports: [CommonModule, FormsModule, ButtonModule, ValidatableInputTextModule, ValidatableDropdownlistModule,
      MessagesModule, MessageModule, ToastModule, InputTextModule, AngularIbanModule, InvoicePipesModule],
    declarations: [PersonFormComponent],
    exports: [PersonFormComponent],
  }
)
export class PersonFormModule{}
