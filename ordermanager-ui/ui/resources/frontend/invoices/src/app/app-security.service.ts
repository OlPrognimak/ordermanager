import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {LoggingCheck} from "./domain/domain.invoiceformmodel";

@Injectable()
export class AppSecurityService {

  authenticated = false;
  backendUrl: string;
  private loginResponse = 'user';

  /**
   *
   * @param http http client
   */
  constructor(private http: HttpClient) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
  }

  /**
   * @param credentials security credentials
   * @param callback security callback
   */
  authenticate(credentials, callback): any {

    console.log('Authenticate User Name: ' + credentials.username + ' Password :' + credentials.password);

    const headers = new HttpHeaders(credentials ? {
      Authorization : 'Basic ' + btoa(credentials.username + ':' + credentials.password),
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } : {});

    this.http.get<LoggingCheck>(this.backendUrl + 'user', {headers}).pipe().subscribe(
      (response) => {
      console.log('Logging checking logging :' + response);
      if (response.logged === true) {
        this.authenticated = true;
        console.log('Logging [is Logger]');
        return true;
      } else {
        this.authenticated = false;
        console.log('Logging [is Not Logged]');
        return false;
      }
      // return callback && callback();
    },
      ((error) => {
        console.log('Logging checking error :' + JSON.stringify(error));
      }));

  }

}

