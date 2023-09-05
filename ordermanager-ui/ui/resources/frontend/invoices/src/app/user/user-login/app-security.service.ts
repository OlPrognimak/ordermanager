import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {LoggingCheck} from '../../domain/domain.invoiceformmodel';
import {Router} from '@angular/router';
import {map} from "rxjs/operators";
import {finalize, interval} from "rxjs";
import axios from 'axios'
import {environment} from "../../../environments/environment";

export  const basicAuthKey = 'basicAuthKey';
import {isAuthenticated, setAuthenticated} from "../../common-services/common-services-util.service";

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

export const remoteBackendUrl = () => {
  return localStorage.getItem("remoteBackendURL")
}

/**
 *
 */
@Injectable({
  providedIn: 'root'
  }
)
export class AppSecurityService {

  // authenticated = false;
  credentials = {username: '', password: ''};

  /**
   *
   * @param http http client
   */
  constructor(private http: HttpClient, private router: Router) {
    this.getBackendBaseUrl()
    this.isServerStillAlive(this)
  }

  isServerStillAlive(service: AppSecurityService) {
      interval(30000).subscribe(
        () => {
          if (isAuthenticated()) {
            service.checkBackendAuthentication(service)
          }
        })
  }

  getBackendBaseUrl(): void {
   // if( localStorage.getItem("remoteBackendURL") === null ) {
      this.http.get<any>("backendUrl").subscribe(
        {
          next(response) {
            console.log("+++++++++ Try to get backend URL from server.")
            localStorage.setItem("remoteBackendURL", response.url);
          },
          error() {
            localStorage.setItem("remoteBackendURL", environment.baseUrl);
            console.log("--------- Get backend URL from environment :" +remoteBackendUrl())
          }
        }
      )
    //}
  }

  /**
   * @param credentials security credentials
   * @param callback security callback
   */
  authenticate = (service: AppSecurityService, credentials, callback) => {

    if ( isAuthenticated() === true) {
      return callback(true);
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
   const login  = this.http.post<LoggingCheck>(remoteBackendUrl() + 'login', null, options ).pipe(
      map( response => {
        if (response.logged === true) {
          setAuthenticated(true);
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
    setAuthenticated(false)
    localStorage.removeItem("remoteBackendURL")
    localStorage.setItem(basicAuthKey, '')
  }


  checkBackendAuthentication (service: AppSecurityService) {
    const auth = new Auth();
    const headers = new HttpHeaders({
      'Content-Type' : 'application/json',
      'Access-Control-Allow-Origin': '*',
      Accept : '*/*'
    });

    this.http.get<LoggingCheck>(remoteBackendUrl()+"checkUser", {headers})
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
    this.http.post(remoteBackendUrl() + 'perform_logout', {}).pipe(finalize(() => {
      this.clearCredentials()
    })).subscribe();
  }

}




