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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CreatedResponse, NewUser } from '../../domain/domain.invoiceformmodel';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { CommonServicesUtilService } from "../../common-services/common-services-util.service";
import { MessagesPrinter } from "../../common-services/common-services.app.http.service";
import { AppSecurityService, remoteBackendUrl } from "../../common-auth/app-security.service";
import { NgForm } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: 'app-user-registration',
  templateUrl: './user-registration.component.html',
  styleUrls: ['./user-registration.component.css'],
  providers: [HttpClient, MessageService, CommonServicesUtilService, AppSecurityService, MessagesPrinter],
})
export class UserRegistrationComponent implements OnInit, OnDestroy {

  public newUser: NewUser = new NewUser();
  //backendUrl: string;
  basicAuthKey = 'basicAuthKey';
  notifier = new Subject()
  private isUserNameError: boolean = false
  private isPasswordError: boolean = false
  private isRepeatPasswordError: boolean = false

  constructor(private httpClient: HttpClient,
              private messageService: MessageService,
              private utilService: CommonServicesUtilService,
              private appSecurityService: AppSecurityService,
              public router: Router, private messagePrinter: MessagesPrinter) {
    //this.backendUrl = environment.baseUrl;

  }

  ngOnDestroy(): void {
    this.notifier.next('')
    this.notifier.complete()
  }

  /**
   *
   */
  ngOnInit(): void {

  }

  registerUser(form: NgForm): void {
    if (this.newUser.userPassword !== this.newUser.userPasswordRepeat) {
      this.messagePrinter.printUnsuccessefulMessage("The repeated password is not equals to password.", null)
    } else {
      this.registerUserInternal(this.newUser, this.router, this.messagePrinter);
    }
  }

  /**
   * save new user in the database
   */
  registerUserInternal(intNewUser: NewUser, intRouter: Router, intMsgPrinter: MessagesPrinter) {

    const headers = new HttpHeaders({
      'User-Name': this.newUser.userName,
      'User-Password': this.newUser.userPassword,
      'Content-Type': 'application/json',
      Accept: '*/*'
    });

    this.httpClient
      .post<CreatedResponse>(remoteBackendUrl() + 'registration', {}, {headers})
      .pipe(takeUntil(this.notifier))
      .subscribe(
        {
          next(response) {
            console.log(JSON.stringify(response))
            intNewUser.userName = ''
            intNewUser.userPassword = ''
            intNewUser.userPasswordRepeat = ''
            intMsgPrinter.printSuccessMessage('You are successfully registered.')
          },
          error(err) {
            console.log(JSON.stringify(err));
            intMsgPrinter.printUnsuccessefulMessage('You are not registered. Some error occurs. Please inform administrator.', err)
          }
        }
      )
  }

  haveErrors() {
    return this.isPasswordError || this.isUserNameError || this.isRepeatPasswordError
  }

  setHasUsernameError(b: boolean) {
    setTimeout(() => {
      this.isUserNameError = b
    })

  }

  setHasPasswordError(b: boolean) {
    setTimeout(() => {
      this.isPasswordError = b
    })
  }

  setHasRepeatPasswordError(b: boolean) {
    setTimeout(() => {
      this.isRepeatPasswordError = b
    })

  }

}
