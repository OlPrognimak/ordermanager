import {Injectable} from '@angular/core';
import {HttpBackend, HttpClient, HttpHeaders} from '@angular/common/http';
import {LoggingCheck} from '../domain/domain.invoiceformmodel';
import {Router} from '@angular/router';
import {map} from "rxjs/operators";
import {finalize} from "rxjs";
import axios from 'axios'

export  const basicAuthKey = 'basicAuthKey';

@Injectable()
export class AppSecurityService {

  // authenticated = false;
  backendUrl: string;
  credentials = {username: '', password: ''};
  http: HttpClient;
  /**
   *
   * @param http http client
   */
  constructor(private handler: HttpBackend, private router: Router) {
    console.log('####### Init AppSecurityService');
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    this.http = new HttpClient(handler);
  }

  /**
   * @param credentials security credentials
   * @param callback security callback
   */

  authenticate = (credentials, callback) => {

    const isAuthenticated = localStorage.getItem('authenticated');
    console.log('######## Is authenticated? ' + isAuthenticated);
    if ( isAuthenticated !== undefined && isAuthenticated !== '' && isAuthenticated === 'true') {
      return;
    }

    const basicAuth =  'Basic ' + btoa(credentials.username + ':' + credentials.password);
    const reqheaders = new HttpHeaders(credentials ? {
      Authorization : basicAuth,
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } : {});

    const options = {
      headers : reqheaders
    };

   const login  = this.http.post<LoggingCheck>(this.backendUrl + 'login', null, options ).pipe(
      map( response => {
        if (response.logged === true) {
          localStorage.setItem('authenticated', 'true');
          localStorage.setItem(basicAuthKey, basicAuth);
          console.log('authentication [is OK]');
          return true;
        } else {
          console.log('authentication [is Not Logged]');
          return false;
        }
      }));
   login.subscribe(
     {
       next(data) {
         if(data) {
           return callback(true);
         } else {
           return callback(false);
         }

       },
       error(err) {
         return callback(false);
       }
     }
   )
  }

  /** clear credentials for logging */
  public clearCredentials(): void{
    localStorage.setItem('authenticated', 'false');
    localStorage.setItem(basicAuthKey, '');
  }

  /**
   * checks whether the app authenticated
   */
  isAuthenticated(): boolean {
    if (localStorage.getItem('authenticated') === 'true'){
      return true;
    }else{
      return false;
    }
  }


  /**
   *
   * Site logout
   */
  //TODO After migration to Angular-16 doesnt work more
  logout(): any {
    this.http.post(this.backendUrl + 'logout', {}).pipe(finalize(() => {
      // this.appSecurityService.authenticated = false;
      localStorage.setItem('authenticated', 'false');
      this.credentials.username = '';
      this.credentials.password = '';
      console.log('Logout Call');
      this.router.navigateByUrl('/');

    })).subscribe();
  }

}

