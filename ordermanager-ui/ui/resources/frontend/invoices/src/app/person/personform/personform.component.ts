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
import { Component, NgModule, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { InvoiceFormModel, InvoiceFormModelInterface } from '../../domain/domain.invoiceformmodel';
import { BankAccountFormModel, PersonAddressFormModel, PersonFormModel } from '../../domain/domain.personformmodel';
import { MessageService } from 'primeng/api';
import { AppSecurityService } from '../../common-auth/app-security.service';
import {
  isAuthenticated,
  personType
} from '../../common-services/common-services-util.service';
import { CommonServicesAppHttpService, MessagesPrinter } from '../../common-services/common-services.app.http.service';
import { CommonModule } from "@angular/common";
import { FormGroupDirective, FormsModule, NgForm } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { MessagesModule } from "primeng/messages";
import { MessageModule } from "primeng/message";
import { ToastModule } from "primeng/toast";
import {
  ValidatableDropdownlistModule
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import { InputTextModule } from "primeng/inputtext";
import { AngularIbanModule } from "angular-iban";
import { InvoicePipesModule } from "../../common-pipes/common-services.pipes.number";
import { WorkflowModule } from "../../workflows/invoice-workflow/workflow.module";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { Store } from "@ngrx/store";
import { InvoiceActions } from "../../workflows/invoice-workflow/state/invoice.actions";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {FloatLabel} from "primeng/floatlabel";
import {TranslocoPipe} from "@jsverse/transloco";

/**
 * The component which contains form component for creation of person
 */
@Component({
  styleUrls: ['./personform.component.css'],
  selector: 'app-person',
  templateUrl: './personform.component.html',
  providers: [MessageService, FormGroupDirective, MessagesPrinter]
})
export class PersonFormComponent implements OnInit, OnDestroy {

  @ViewChild('personForm') personForm: NgForm
  /** person model */
  personFormModel: PersonFormModel;
  /** bank account model */
  personBankAccountModel: BankAccountFormModel;
  /** Address model */
  personAddressModel: PersonAddressFormModel;
  emailPattern = '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}'
  createPersonType: string
  flowInvoiceModel: InvoiceFormModelInterface
  protected readonly personType = personType;
  protected readonly isAuthenticated = isAuthenticated;
  private readonly destroy$ = new Subject<void>();

  get isWorkflowReturn(): boolean {
    return this.createPersonType === 'creator' || this.createPersonType === 'recipient';
  }

  get personDisplayName(): string {
    if (this.personFormModel?.personType === 'ORGANISATION') {
      return this.personFormModel.companyName || '—';
    }

    const name = [this.personFormModel?.personFirstName, this.personFormModel?.personLastName]
      .filter(Boolean)
      .join(' ');
    return name || '—';
  }

  /**
   * The constructor
   * @param messageService primeNG message service
   * @param messagePrinter use for printing messages
   * @param utilService utility service with method for management with success
   * and not success messages
   * @param securityService injects the security service module
   * @param httpService injects the http service module
   * @param route the active route. Uses to read parameters
   * @param router the router. Use for navigate back to workflow
   * @param store the ngrx store. Uses for keeping invoice workflow data
   */
  constructor(private messagePrinter: MessagesPrinter,
              public securityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<PersonFormModel>,
              private route: ActivatedRoute,
              private router: Router,
              private store: Store<any>) {

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Init component
   */
  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.createPersonType = params['createPerson'];
        if (this.isWorkflowReturn) {
          this.store.select('invoiceWorkflow')
            .pipe(takeUntil(this.destroy$))
            .subscribe(state => {
              this.flowInvoiceModel = Object.assign(new InvoiceFormModel(), state?.data)
            });
        }
      });
    this.personFormModel = new PersonFormModel();
    this.personBankAccountModel = this.personFormModel.bankAccountFormModel;
    this.personAddressModel = this.personFormModel.personAddressFormModel;
  }

  /**
   * Saves person to the database on server
   * @param event the event object
   */
  savePerson(returnCallBack: boolean): void {

    this.httpService.putObjectToServer('PUT', this.personFormModel, 'Person',
      'person', (callback) => {
        if (callback) {
          if (returnCallBack) {
            if (this.createPersonType === 'creator') {
              this.flowInvoiceModel.personSupplierId = '' + callback.toString()
            } else if (this.createPersonType === 'recipient') {
              this.flowInvoiceModel.personRecipientId = '' + callback.toString()
            }
            this.store.dispatch({type: InvoiceActions.setInvoiceCreatorAction.type, data: this.flowInvoiceModel})
            this.router.navigate(["/workflow-create-invoice"], {queryParams: {createPerson: this.createPersonType}})
          }
          this.personFormModel = new PersonFormModel();
          this.personBankAccountModel = this.personFormModel.bankAccountFormModel;
          this.personAddressModel = this.personFormModel.personAddressFormModel;
          this.personForm.resetForm(this.personFormModel);
        } else {
          setTimeout(() => {
            this.messagePrinter.printUnsuccessefulMessage('The person can not be saved', null)
          })
        }
      });
  }

}

@NgModule(
  {
    imports: [CommonModule, FormsModule, ButtonModule, ValidatableDropdownlistModule,
      MessagesModule, MessageModule, ToastModule, InputTextModule, AngularIbanModule, InvoicePipesModule, WorkflowModule, ValidatableInputTextComponent, FloatLabel, TranslocoPipe],
    declarations: [PersonFormComponent],
    exports: [PersonFormComponent],
  }
)
export class PersonFormModule {
}
