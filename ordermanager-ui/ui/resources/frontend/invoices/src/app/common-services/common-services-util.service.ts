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
import {DropdownDataType} from "../domain/domain.invoiceformmodel";

export const printToJson = (data: any): void  => {
  console.log(JSON.stringify(data));
}


export const invoiceRate: DropdownDataType[] = [
  //{label: '[Select rate type]', value: null},
  {label: 'Hourly rate', value: 'HOURLY'},
  {label: 'Daily rate', value: 'DAILY'}
];

export const personType: DropdownDataType[] = [
  // {label: '[Select person type]', value: ''},
  {label: 'Private person', value: 'PRIVATE'},
  {label: 'Organisation', value: 'ORGANISATION'}
];

/**
 * Compare equality of two objects
 * @param obj1 first object
 * @param obj2 second object
 */
export function compareObjects(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    console.log("1--The objects are equals :"+JSON.stringify(obj1))
    console.log("2--The objects are equals :"+JSON.stringify(obj2))
    return true;
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    console.log("1The type is not object: "+ JSON.stringify(obj1))
    console.log("2The type is not object: "+JSON.stringify(obj2))
    if(Number(obj1)===Number(obj2)){
      console.log('1+++The numbers are equals')
      return true
    }
    if(String(obj1)?.trim()===String(obj2)?.trim()) {
      console.log('2+++The String are equals')
      return true
    }
    if ( new Date(obj1).getTime() === new Date(obj2).getTime()) {
       console.log('3+++The Dates are equals')
      return true
    }
    console.log('1The type is object FALSE')
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    console.log("the objects attribute length is different")
    return false;
  }

  for (const key of keys1) {
    console.log(" K E Y ="+key)
    if (!compareObjects(obj1[key], obj2[key])) return false;
  }
  console.log("TRUE")
  return true;
}

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
    messageFunction.subscribe(data=>console.log('Message clear'))
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
