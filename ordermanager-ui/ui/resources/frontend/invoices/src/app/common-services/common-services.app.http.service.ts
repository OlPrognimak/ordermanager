import {Injectable} from '@angular/core';
import {MessageService} from 'primeng/api';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {CreatedResponse, DropdownDataType} from '../domain/domain.invoiceformmodel';
import {Message} from 'primeng/api/message';
import {CommonServicesUtilService, printToJson} from './common-services-util.service';
import {environment} from '../../environments/environment';
import {map} from "rxjs/operators";


const  handleError = function(err: any): void {
  console.log('Error: ' + JSON.stringify(err));
}


@Injectable({
  providedIn: 'root'
})
export class CommonServicesAppHttpService<T> {

  backendUrl: string;
  basicAuthKey = 'basicAuthKey';

  constructor(private httpClient: HttpClient, public messagePrinter: MessagesPrinter) {
    this.backendUrl = environment.baseUrl;
  }

  /**
   * Call http PUT method to save object on server side
   * @param objectToSave object to be saved on server
   * @param objectName object name to be saved
   * @param endPointPath rest API end point path
   * @param callback the callback object
   */
  putObjectToServer = (httpMethod: string, objectToSave: T, objectName: string, endPointPath: string, callback) => {

     const msgObservable = of(this.messagePrinter);

    this.handleHttpRequest(objectToSave, endPointPath, httpMethod).subscribe({
        next (response) {
          if (response.createdId > 0) {
            msgObservable.subscribe(
              msgService => msgService.printSuccessMessage(objectName));
            console.log('PUT Object Success: ' + response);
            return callback(true);
          }else{
            console.log('Unexpected error: ' + response);
            return callback && callback(false);
          }
        },
        error (err) {
          console.log("Handle HTTP Request Error :" + JSON.stringify(err))
          msgObservable.subscribe(
            msgService => msgService.printUnsuccessefulMessage(objectName, err));
          return callback && callback(false);
        }
      })

  };

  /**
   * Creates PUT Observer  for saving invoice on server
   */
  private handleHttpRequest(objectToSave: T, endPointPath: string, method: string): Observable<CreatedResponse> {
    const reqheaders = new HttpHeaders({
      Authorization: localStorage.getItem(this.basicAuthKey) as string,
      Accept: '*/*'
    });
    const options = {headers: reqheaders};

    if (method === 'PUT') {
      return this.httpClient.put<any>(
        this.backendUrl + endPointPath, objectToSave, options);
    } else if (method === 'POST') {
      return this.httpClient.post<any>(
        this.backendUrl + endPointPath, objectToSave, options);
    } else if (method === 'DELETE'){
        return this.httpClient.delete<any>(
          this.backendUrl + endPointPath, options );
    } else {
      throw new Error("HTTP Method '"+method+"' not supported")
    }

  }


  loadDropdownData = (url: string, callback) => {
    const headers = new HttpHeaders({
      'Content-Type' : 'application/json',
      'Access-Control-Allow-Origin': '*',
      Accept : '*/*'
    });

    const observableHttpRequest = this.httpClient.get<DropdownDataType[]>(this.backendUrl + url, {headers})
      .pipe(
        map( response => {
            console.log('Get PersonDropDown Response :' + JSON.stringify(response));
            return response;
          },
        ),
      );

      observableHttpRequest.subscribe({
        next(response) {
          return callback(response)
        },
        error(err) {
          console.log("Error loading dropdown data: "+printToJson(err))
        }
      });

  }

}


@Injectable({
  providedIn: 'root'
})
export class MessagesPrinter {
  constructor(public messageService: MessageService,
              public utilService: CommonServicesUtilService) {}

  /*  prints success message  */
  public printSuccessMessage(objectName: any): void{
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
  public printUnsuccessefulMessage(messagePart: any, error): void{

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
    const msg: Message = {severity: 'error', summary: 'Error',
      detail: errorText};
    this.messageService.add(msg);
    this.utilService.hideMassage(msg, 10000);
  }

}
