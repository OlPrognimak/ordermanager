import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {LoggingCheck} from '../../domain/domain.invoiceformmodel';
import {Router} from '@angular/router';
import {map} from "rxjs/operators";
import {finalize, interval} from "rxjs";
import axios from 'axios'
import {environment} from "../../../environments/environment";
import {MessagesPrinter} from "../../common-services/common-services.app.http.service";

export  const basicAuthKey = 'basicAuthKey';

/**
 *
 */
export class Auth {
  private _authenticated: boolean

  set authenticated(value: boolean) {
    this._authenticated = value
  }

  get authenticated() : boolean {
    return this._authenticated
  }

}

/**
 *
 */
@Injectable()
export class AppSecurityService {

  // authenticated = false;
  backendUrl: string;
  credentials = {username: '', password: ''};

  /**
   *
   * @param http http client
   */
  constructor(private http: HttpClient, private router: Router, private messagePrinter: MessagesPrinter) {
    console.log('####### Init AppSecurityService');
    this.backendUrl = environment.baseUrl;
    this.isServerStillAlive(this)
  }

  isServerStillAlive(service: AppSecurityService) {
      interval(5000).subscribe(
        () => {
          console.log("!!!!!!!!!!! IsAuthenticated :" +service.isAuthenticated())
          if (service.isAuthenticated()) {
            service.checkBackendAuthentication(service)
          }
        })
  }

  /**
   * @param credentials security credentials
   * @param callback security callback
   */

  authenticate = (service: AppSecurityService, credentials, callback) => {

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
    this.credentials.username = ''
    this.credentials.password = ''
    localStorage.setItem('authenticated', 'false');
    localStorage.setItem(basicAuthKey, '');
  }

  /**
   * checks whether the app authenticated
   */
  isAuthenticated() {
    return localStorage.getItem('authenticated') === 'true';
  }


  checkBackendAuthentication (service: AppSecurityService) {
    const auth = new Auth();
    const headers = new HttpHeaders({
      'Content-Type' : 'application/json',
      'Access-Control-Allow-Origin': '*',
      Accept : '*/*'
    });

    this.http.get<LoggingCheck>(this.backendUrl+"checkUser", {headers})
      .subscribe(
        {
          next(response) {
            if (response.logged !== true) {
              service.clearCredentials()
              service.router.navigateByUrl('/')
            } else {
              auth.authenticated = true
            }
          },
          error(err) {
            service.clearCredentials()
            service.router.navigateByUrl('/')
          }
        }
      )
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




