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
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Message, MessageService } from 'primeng/api';
import { DropdownDataType } from "../domain/domain.invoiceformmodel";
import { CommonServicesPipesNumber } from "../common-pipes/common-services.pipes.number";
import { AUTH_TOKEN_KEY } from "../common-utils/common-utils.constants";

export const printToJson = (data: any): void => {
  console.log(JSON.stringify(data));
}

/**
 * Sets flag to local stage that app is authenticated
 *
 * @param isAuthenticated true if authenticated
 */
export const setAuthenticated = (token: string | null): void => {
  if( token !== null) {
     localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    console.log('Login canceled.')
  }
}

/**
 * @return true if authenticated
 */
export const isAuthenticated = (): boolean => {
  return localStorage.getItem(AUTH_TOKEN_KEY) !== null
}

/**
 * The list of rates
 */
export const invoiceRate: DropdownDataType[] = [
  //{label: '[Select rate type]', value: null},
  {label: 'Hourly rate', value: 'HOURLY'},
  {label: 'Daily rate', value: 'DAILY'}
];

/**
 * The list of person types
 */
export const personType: DropdownDataType[] = [
  // {label: '[Select person type]', value: ''},
  {label: 'Private person', value: 'PRIVATE'},
  {label: 'Organisation', value: 'ORGANISATION'}
];

/**
 * Instance of pipeline for number
 */
export const pipeNumberTransformer: CommonServicesPipesNumber = new CommonServicesPipesNumber();

/**
 * Renders number value with 2 digits after  point
 *
 * @param value object with number value
 * @return HTMLDivElement with right align of value in it
 */
export const numberCellRenderer = (value: any) => {
  // Create the cell element
  const cellElement = document.createElement('div')
  cellElement.style.textAlign = 'right'
  cellElement.innerText = pipeNumberTransformer.transform(Number(value.value))

  return cellElement
}

/**
 * Compare two objects for idntity
 *
 * @param obj1 first object for comparison
 * @param obj2 second object for comparison
 */
export function compareObjects(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    if (Number(obj1) === Number(obj2)) {
      return true
    }
    if (String(obj1)?.trim() === String(obj2)?.trim()) {
      return true
    }
    if (new Date(obj1).getTime() === new Date(obj2).getTime()) {
      return true
    }
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!compareObjects(obj1[key], obj2[key])) return false;
  }
  return true;
}

/**
 * The useful utility service
 */
@Injectable({
  providedIn: 'root'
})
export class CommonServicesUtilService {

  constructor(private messageService: MessageService) {
  }

  /**
   * Hide message after delay time
   */
  public hideMassage(message: Message, delayTimeMs: number): void {
    const observable = of(message).pipe(delay(delayTimeMs));
    const operatorFunction = map((msg: Message) => {
      this.messageService.clear(msg.key);
      return true;
    });
    const messageFunction = operatorFunction(observable);
    messageFunction.subscribe(data => console.log('Message clear'))
  }

  /**
   *
   *
   * @param objectName
   * @param errorText
   */
  printUnSuccessMessage(objectName: any, errorText): void {
    const msg: Message = {
      severity: 'error', summary: 'Error',
      detail: errorText
    };
    this.messageService.add(msg);

    this.hideMassage(msg, 10000);
  }


}
