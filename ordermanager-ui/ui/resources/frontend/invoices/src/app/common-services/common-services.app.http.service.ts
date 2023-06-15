import {Injectable} from '@angular/core';
import {MessageService} from 'primeng/api';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {CreatedResponse} from '../domain/domain.invoiceformmodel';
import {Message} from 'primeng/api/message';
import {CommonServicesUtilService} from './common-services-util.service';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommonServicesAppHttpService<T> {

  backendUrl: string;
  basicAuthKey = 'basicAuthKey';

  constructor(private httpClient: HttpClient,
              private messageService: MessageService,
              private utilService: CommonServicesUtilService) {
    this.backendUrl = environment.baseUrl;
    //  document.getElementById('appConfigId')
    //    .getAttribute('data-backendUrl') ;
  }

  /**
   * Call http PUT method to save object on server side
   * @param objectToSave object to be saved on server
   * @param objectName object name to be saved
   * @param endPointPath rest API end point path
   * @param callback the callback object
   */
  putObjectToServer = (objectToSave: T, objectName: string, endPointPath: string, callback) => {
    this.handleHttpRequest(objectToSave, endPointPath).toPromise().then((response) => {
        if (response.createdId > 0) {
          this.printSuccessMessage(objectName);
        }else{
          console.log('Unexpected error: ' + response);
          return callback && callback(false);
        }
      }
    ).catch(error => {
      this.printUnSuccessMessage(objectName, error);
      return callback && callback(false);
    });

    return callback && callback(true);
  }


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
    this.handleError(error);
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

  private handleError(err: any): void {
    console.log('Error: ' + JSON.stringify(err));
  }
}
