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
import {HttpClient, HttpErrorResponse, HttpHeaders, HttpParams} from '@angular/common/http';
import {DropdownDataType, ItemCatalogModel} from '../domain/domain.invoiceformmodel';
import {PersonAddressFormModel, BankAccountFormModel, PersonFormModel} from '../domain/domain.personformmodel';
import {Observable, of} from 'rxjs';
import {Message, MessageService} from 'primeng/api';
import {AppSecurityService} from '../user-login/app-security.service';
import {CommonServicesUtilService} from '../common-services/common-services-util.service';
import {CommonServicesAppHttpService} from '../common-services/common-services.app.http.service';

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
  providers:  [MessageService, CommonServicesUtilService]
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
  basicAuthKey = 'basicAuthKey';
  /**
   * The constructor
   * @param httpClient the http client
   * @param messageService primeNG message service
   * @param utilService utility service with method for management with success
   * and not success messages
   * @param securityService
   * @param httpService
   */
  constructor( private httpClient: HttpClient,
               private messageService: MessageService,
               private utilService: CommonServicesUtilService,
               public securityService: AppSecurityService,
               private httpService: CommonServicesAppHttpService<PersonFormModel>) {
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


  // /**
  //  * Saves person to the database on server
  //  * @param item the item for saving
  //  */
  // savePerson(event: any): void {
  //   this.httpService.putObjectToServer(this.personFormModel, 'Person',
  //     'invoice/itemcatalog', (callback) => {
  //       if (callback){
  //         this.personFormModel = new PersonFormModel();
  //       }
  //     });
  // }

  /**
   * Saves person to the database
   * @param event the event from ui
   */
  savePerson(event: any): void {
    this.handleClickHttp().subscribe((response) => {
        this.personFormModel = new PersonFormModel();
        const msg: Message = {
          severity: 'success',
          summary: 'Congratulation!',
          detail: 'The person is saved successfully.'
        };
        this.messageService.add(msg);
        this.utilService.hideMassage(msg, 2000);
        handleResult(response);
      }, (error) => {
        let errorText = 'The person is not saved.';
        if (error instanceof HttpErrorResponse) {
          if (error.status === 400) {
            errorText = error.error.errorMessage;
          }
        }
        const msg = {severity: 'error', summary: 'Error', detail: errorText};
        this.messageService.add(msg);
        this.utilService.hideMassage(msg, 4000);
        handleError(error);
      }
    );
  }


  /** for test */
  showJson(event: any): void{
    console.log(JSON.stringify(this.personFormModel));
  }

  /**
   * Creates Observable for put http request
   */
  handleClickHttp(): Observable<string>{
    const headers = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    return this.httpClient.put<string>(this.backendUrl, this.personFormModel, { headers } );
  }

}
