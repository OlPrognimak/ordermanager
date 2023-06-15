import {Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {AppSecurityService} from './app-security.service';

@Injectable()
export class BasicInterceptor {
  constructor() { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // add auth header with jwt if account is logged in and request is to the api url
    console.log('******* HttpInterceptor called:');
    if (localStorage.getItem('basicAuthKey') ) {
      console.log('******* Http Header is added:');
      request = request.clone({
        setHeaders: { Authorization: localStorage.getItem('authenticated') }
      });
    }

    return next.handle(request);
  }
}
