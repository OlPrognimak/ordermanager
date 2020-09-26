import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {LoggingCheck} from "./domain/domain.invoiceformmodel";

@Injectable()
export class AppSecurityService {

  // authenticated = false;
  backendUrl: string;
  basicAuthKey = 'basicAuthKey';

  /**
   *
   * @param http http client
   */
  constructor(private http: HttpClient) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    localStorage.setItem('authenticated', 'false');
  }

  /**
   * @param credentials security credentials
   * @param callback security callback
   */

  authenticate = (credentials, callback) => {

    const basicAuth = 'Basic ' + btoa(credentials.username + ':' + credentials.password);
    const headers = new HttpHeaders(credentials ? {
      Authorization : basicAuth,
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } : {});

    this.http.get<LoggingCheck>(this.backendUrl + 'user', {headers}).pipe().subscribe(
      (response) => {
      console.log('authentication checking logging :' + response);
      if (response.logged === true) {
        localStorage.setItem('authenticated', 'true');
        localStorage.setItem(this.basicAuthKey, basicAuth);
        console.log('authentication [is OK]');
        return callback && callback(true);
      } else {
        this.clearCredentials(credentials);
        console.log('authentication [is Not Logged]');
        return callback && callback(false);
      }
    },
      ((error) => {
        this.clearCredentials(credentials);
        console.log('authentication checking error :' + JSON.stringify(error));
        return callback && callback(false);
      }));
  }

  /** clear credentials for logging */
  private clearCredentials(credentials: any): void{
    localStorage.setItem('authenticated', 'false');
    localStorage.setItem(this.basicAuthKey, '');
  }


  isAuthenticated(): boolean {
    if (localStorage.getItem('authenticated') === 'true'){
      return true;
    }else{
      return false;
    }
  }
}

