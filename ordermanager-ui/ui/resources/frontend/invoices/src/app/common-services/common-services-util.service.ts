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
import {Injectable} from '@angular/core';
import {of} from 'rxjs';
import {delay, map} from 'rxjs/operators';
import {Message, MessageService} from 'primeng/api';

/**
 * The useful utility service
 */
@Injectable({
  providedIn: 'root'
})
export class CommonServicesUtilService{

  constructor( private messageService: MessageService) {
  }

  /**
   * Hide message after delay time
   */
  public hideMassage(message: Message, delayTimeMs: number): void{
    const observable = of(message).pipe(delay(delayTimeMs));
    const operatorFunction = map((msg: Message) => {
      this.messageService.clear(msg.key);
      return true;
    } );
    const messageFunction = operatorFunction(observable);
    messageFunction.toPromise().then((data) => {
        console.log('Message clear');
      }
    );
  }

  /**
   *
   *
   * @param objectName
   * @param errorText
   */
  printUnSuccessMessage(objectName: any, errorText): void{
    const msg: Message = {severity: 'error', summary: 'Error',
      detail: errorText};
    this.messageService.add(msg);

    this.hideMassage(msg, 10000);
  }

}
