import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {LoggingCheck} from '../domain/domain.invoiceformmodel';
import {Router} from '@angular/router';
import {finalize} from "rxjs/operators";

@Injectable()
export class AppSecurityService {

  // authenticated = false;
  backendUrl: string;
  basicAuthKey = 'basicAuthKey';
  credentials = {username: '', password: ''};
  /**
   *
   * @param http http client
   */
  constructor(private http: HttpClient, private router: Router) {
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

  /**
   * checks wheather the app authenticated
   */
  isAuthenticated(): boolean {
    if (localStorage.getItem('authenticated') === 'true'){
      return true;
    }else{

      return false;
    }
  }


  /**
   * Site logout
   */
  logout(): any {
    this.http.post('logout', {}).pipe(finalize(() => {
      // this.appSecurityService.authenticated = false;
      localStorage.setItem('authenticated', 'false');
      this.credentials.username = '';
      this.credentials.password = '';
      console.log('Logout Call');
      this.router.navigateByUrl('/');

    })).subscribe();
  }

  /**
   * navigate to the root bage
   */
  navigateToRootPage(): void{
    this.router.navigateByUrl('/');
  }


}

