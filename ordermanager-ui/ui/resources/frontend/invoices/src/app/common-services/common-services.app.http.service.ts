import {Injectable} from '@angular/core';
import {MessageService} from 'primeng/api';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {observable, Observable, Observer, of, Subscription} from 'rxjs';
import {CreatedResponse} from '../domain/domain.invoiceformmodel';
import {Message} from 'primeng/api/message';
import {CommonServicesUtilService} from './common-services-util.service';
import {environment} from '../../environments/environment';


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
   * @param msgService
   * @param callback the callback object
   */
  putObjectToServer = (objectToSave: T, objectName: string, endPointPath: string,
                       msgService: MessageService,
                       utilService: CommonServicesUtilService, callback) => {

     const msgObservable = of(this.messagePrinter);

    this.handleHttpRequest(objectToSave, endPointPath).subscribe({
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
          msgObservable.subscribe(
            msgService => msgService.printUnSuccessMessage(objectName, err));
          return callback && callback(false);
        }
      })

  };

  /**
   * Creates PUT Observer  for saving invoice on server
   */
  private handleHttpRequest(objectToSave: T, endPointPath: string): Observable<CreatedResponse>{
    const reqheaders = new HttpHeaders({
      Authorization : localStorage.getItem(this.basicAuthKey),
      Accept : '*/*'
    } );
    const options = {headers : reqheaders};

    return this.httpClient.put<any>(
      this.backendUrl + endPointPath, objectToSave, options );
  }

}


@Injectable({
  providedIn: 'root'
})
export class MessagesPrinter {
  constructor(private messageService: MessageService,
              private utilService: CommonServicesUtilService) {}

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
   *
   *
   * @param objectName object name
   * @param error error which occures
   */
  public printUnSuccessMessage(objectName: any, error): void{
    console.log('Error: ' + error);
    handleError(error);
    let errorText = 'With processing ' + objectName + ' happens unexpected error.';
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        errorText = error.error.errorMessage;
      }

    }
    const msg: Message = {severity: 'error', summary: 'Error',
      detail: errorText};
    this.messageService.add(msg);
    this.utilService.hideMassage(msg, 10000);
  }

}
