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
import {Component, OnInit} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {DropdownDataType} from '../domain/domain.invoiceformmodel';
import {PersonAddressFormModel, BankAccountFormModel, PersonFormModel} from '../domain/domain.personformmodel';
import {Observable, of} from 'rxjs';
import {ComponentsUtilService} from '../components/components.util.service';
import {Message, MessageService} from 'primeng/api';
import {InputTextModule} from 'primeng/inputtext';
import {MessagesModule} from 'primeng/messages';
import {UIMessage} from 'primeng/message';


function handleResult(result: string): void {
  console.log('Result: ' + JSON.stringify(result));
}


function handleError(err: any): void {
  console.log('Error: ' + JSON.stringify(err));
}

/**
 * The component which contains form component for creation of person
 */
@Component({
  styleUrls: ['./personform.component.css'],
  selector:    'app-person',
  templateUrl: './personform.component.html',
  providers:  [MessageService, ComponentsUtilService]
})
export class PersonFormComponent implements OnInit {
  /** The base url string for communication with server */
  backendUrl: string;
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
  /**
   * The constructor
   * @param httpClient the http client
   * @param messageService primeNG message service
   */
  constructor( private httpClient: HttpClient,
               private messageService: MessageService,
               private utilService: ComponentsUtilService){
  }

  /**
   * Init component
   */
  ngOnInit(): void {
    this.personType = [
      {label: '[Select person type]', value: null},
      {label: 'Private person', value: 'PRIVATE'},
      {label: 'Organisation', value: 'ORGANISATION'}
    ];
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') + 'person';
    this.personFormModel = new PersonFormModel();
    this.personBankAccountModel = this.personFormModel.bankAccountFormModel;
    this.personAddressModel = this.personFormModel.personAddressFormModel;
  }

  /**
   * Saves person to the database
   * @param event the event from ui
   */
  savePerson(event: any): void{
    this.handleClickHttp().subscribe((response) =>
      {
          this.personFormModel = new PersonFormModel();
          const msg: Message = {severity: 'success', summary: 'Congratulation!', detail: 'The person is saved successfully.'};
          this.messageService.add(msg);
          this.utilService.hideMassage(msg, 2000);
          handleResult(response);
      }, (error) => {
          const msg = {severity: 'error', summary: 'Error', detail: 'The person is not saved.'};
          this.messageService.add(msg);
          this.utilService.hideMassage(msg, 2000);
          handleError(error);
        }
    );
  }

  isLengthInvalide(value: any, minLength: number): boolean {
    if ( value === undefined || value === null || value < minLength){
      return true;
    } else {
      return true;
    }
  }

  showJson(event: any): void{
    console.log(JSON.stringify(this.personFormModel));
  }

  handleClickHttp(): Observable<string>{
    const params = new HttpParams();
    return this.httpClient.put<string>(this.backendUrl, this.personFormModel, { params } );
  }

}
