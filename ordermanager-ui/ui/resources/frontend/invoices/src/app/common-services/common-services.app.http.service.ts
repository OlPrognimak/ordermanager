import { Injectable, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject, takeUntil } from 'rxjs';
import { CreatedResponse, DropdownDataType } from '../domain/domain.invoiceformmodel';
import { Message } from 'primeng/api/message';
import { CommonServicesUtilService, printToJson } from './common-services-util.service';
import { map } from "rxjs/operators";
import { remoteBackendUrl } from "../common-auth/app-security.service";
import { CommonServiceEventBus } from "./common-service.event.bus";
import { environment } from "../../environments/environment";


const handleError = function (err: any): void {
  console.log('Error: ' + JSON.stringify(err));
}


@Injectable({
  providedIn: 'root'
})
export class CommonServicesAppHttpService<T> implements OnDestroy {

  //backendUrl: string;
  basicAuthKey = 'basicAuthKey';
  notifier = new Subject();

  constructor(public httpClient: HttpClient, public messagePrinter: MessagesPrinter, private eventBus: CommonServiceEventBus<any>) {
    //this.backendUrl = environment.baseUrl;
  }

  /**
   * Call http  method to save/delete/update object on server side
   *
   * @param httpMethod the HTTP Method PUT, DELETE or POST
   * @param objectToSave object to be saved on server
   * @param objectName object name to be saved
   * @param endPointPath rest API end point path
   * @param callback the callback object
   */
  putObjectToServer = (httpMethod: string, objectToSave: T | null, objectName: string, endPointPath: string, callback) => {

    const msgObservable = of(this.messagePrinter);
    let eventBusObservable
    if(environment.debugMode) {
      eventBusObservable = of(this.eventBus).pipe(takeUntil(this.notifier))
    }

    this.handleHttpRequest(objectToSave, endPointPath, httpMethod).pipe(takeUntil(this.notifier),).subscribe()

    this.handleHttpRequest(objectToSave, endPointPath, httpMethod).pipe(takeUntil(this.notifier),).subscribe({
      next(response) {
        if (response.createdId > 0) {
          msgObservable.subscribe(
            msgService => msgService.printSuccessMessage(objectName));

          return callback(response.createdId);
        } else {
          console.log('Unexpected error: ' + response);
          //return callback && callback(false);
        }
      },
      error(err) {
        console.log("Handle HTTP Request Error :" + JSON.stringify(err))
        msgObservable.subscribe(
          msgService => msgService.printUnsuccessefulMessage(objectName, err));
        if(environment.debugMode) {
          eventBusObservable.subscribe(eb => eb.emitEvent(err))
        }
      }
    })

  };

  loadDropdownData = (url: string, callback) => {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      Accept: '*/*'
    });

    const observableHttpRequest = this.httpClient.get<DropdownDataType[]>(remoteBackendUrl() + url, {headers})
      .pipe(takeUntil(this.notifier),).pipe(
        map(response => {
            //console.log('Get PersonDropDown Response :' + JSON.stringify(response));
            return response;
          },
        ),
      );

    observableHttpRequest.subscribe({
      next(response) {
        return callback(response)
      },
      error(err) {
        console.log("Error loading dropdown data: " + printToJson(err))
      }
    });

  }

  ngOnDestroy(): void {
    this.notifier.next('')
    this.notifier.complete()
  }

  /**
   * Creates PUT Observer  for saving invoice on server
   */
  private handleHttpRequest(objectToSave: T | null, endPointPath: string, method: string): Observable<CreatedResponse> {
    const reqheaders = new HttpHeaders({
      Authorization: localStorage.getItem(this.basicAuthKey) as string,
      'Content-Type': 'application/json',
      Accept: '*/*'
    });
    const options = {headers: reqheaders};

    if (method === 'PUT') {
      return this.httpClient.put<any>(
        remoteBackendUrl() + endPointPath, objectToSave, options);
    } else if (method === 'POST') {
      return this.httpClient.post<any>(
        remoteBackendUrl() + endPointPath, objectToSave, options);
    } else if (method === 'DELETE') {
      return this.httpClient.delete<any>(
        remoteBackendUrl() + endPointPath, options);
    } else {
      throw new Error("HTTP Method '" + method + "' not supported")
    }

  }

}


@Injectable({
  providedIn: 'root'
})
export class MessagesPrinter {
  constructor(public messageService: MessageService,
              public utilService: CommonServicesUtilService) {
  }

  /*  prints success message  */
  public printSuccessMessage(objectName: any): void {
    const msg: Message = {
      severity: 'success', summary: 'Congratulation!',
      detail: 'The ' + objectName + ' is saved successfully.'
    };
    this.messageService.add(msg);
    console.log('Object saved successful: ' + objectName + ' : ' + msg);
    this.utilService.hideMassage(msg, 4000);
  }

  /**
   * Shows the error message
   *
   * @param messagePart object name
   * @param error error which occures
   */
  public printUnsuccessefulMessage(messagePart: string, error): void {

    let errorText: string

    if (error != null) {
      console.log('Error: ' + error);
      handleError(error);
      errorText = 'With processing ' + messagePart + ' happens unexpected error.';
      if (error instanceof HttpErrorResponse) {
        if (error.status === 400) {
          errorText = error.error.errorMessage;
        }

      }
    } else {
      errorText = messagePart;
      console.log('Error: ' + errorText);
    }
    const msg: Message = {
      severity: 'error', summary: 'Error',
      detail: errorText
    };
    this.messageService.add(msg);
    this.utilService.hideMassage(msg, 10000);
  }

}
