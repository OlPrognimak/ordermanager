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
import {CreatedResponse, NewUser} from '../domain/domain.invoiceformmodel';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {MessageService} from 'primeng/api';
import {Message} from 'primeng/api/message';
import {Router} from '@angular/router';
import {CommonServicesUtilService} from "../common-services/common-services-util.service";
import {Observable, of, subscribeOn} from "rxjs";
import {delay, map} from "rxjs/operators";
import {environment} from "../../environments/environment";
import {MessagesPrinter} from "../common-services/common-services.app.http.service";

@Component({
  selector: 'app-user-registration',
  templateUrl: './user-registration.component.html',
  styleUrls: ['./user-registration.component.css'],
  providers: []
})
export class UserRegistrationComponent implements OnInit {

  public newUser: NewUser = new NewUser();
  backendUrl: string;
  basicAuthKey = 'basicAuthKey';
  observableMessagePrinter: Observable<MessagesPrinter> = of(this.messagePrinter);

  constructor(private httpClient: HttpClient,
              private messageService: MessageService,
              private utilService: CommonServicesUtilService,
              public router: Router, private messagePrinter: MessagesPrinter) {
    this.backendUrl = environment.baseUrl;

  }

  /**
   *
   */
  ngOnInit(): void {
  }

  registerUser(): void {
    this.registerUserInternal(this.newUser, this.router, this.observableMessagePrinter);
  }

  /**
   * save new user in the database
   */
  registerUserInternal(intNewUser: NewUser, intRouter: Router, intMsgPrinter:  Observable<MessagesPrinter>) {



    const headers = new HttpHeaders({
      'User-Name': this.newUser.userName,
      'User-Password': this.newUser.userPassword,
      'Content-Type': 'application/json',
      Accept: '*/*'
    });

    this.httpClient
      .post<CreatedResponse>(this.backendUrl + 'registration', {}, {headers})
      .subscribe(
        {
          next(response) {
            console.log(JSON.stringify(response))
            intNewUser.userName = ''
            intNewUser.userPassword = ''
            intNewUser.userPasswordRepeat = ''
            intMsgPrinter.subscribe(m => m.printSuccessMessage('You are successfully registered.'))
          },
          error(err) {
            console.log(JSON.stringify(err));
            intMsgPrinter.subscribe(m =>
              m.printUnSuccessMessage('You are not registered. Some error occurs. Please inform administrator.', err))
          }
        }

      )
      //
      // .subscribe((response => {
      //     console.log(JSON.stringify(response));
      //     const msg: Message = {
      //       severity: 'success', summary: 'Congratulation!',
      //       detail: 'You are successfully registered.'
      //     };
      //
      //     this.messageService.add(msg);
      //     this.newUser.userName = '';
      //     this.newUser.userPassword = '';
      //
      //     this.utilService.hideMassage(msg, 3000);
      //
      //     const observable = of().pipe(delay(3000));
      //     observable.toPromise().then(() => {
      //       this.router.navigateByUrl('/');
      //     });
      //   }),
      //   (error => {
      //     console.log(JSON.stringify(error));
      //     const msg: Message = {
      //       severity: 'error', summary: 'Error!',
      //       detail: 'You are not registered. Some error occurs. Please inform administrator.'
      //     };
      //     this.messageService.add(msg);
      //     this.utilService.hideMassage(msg, 3000);
      //   })
      //);
  }
}
