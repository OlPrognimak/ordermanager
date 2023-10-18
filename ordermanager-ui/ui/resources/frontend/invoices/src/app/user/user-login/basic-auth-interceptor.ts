import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { basicAuthKey } from './app-security.service';
import { isAuthenticated } from "../../common-services/common-services-util.service";

@Injectable()
export class BasicInterceptor {
  constructor() {
  }

  /**
   * Injects Authorization header to request, if the system authorised
   *
   * @param request injects by angular
   * @param next injects by angular
   */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // add auth header
    if (isAuthenticated() === true) {
      request = request.clone({
        setHeaders: {Authorization: localStorage.getItem(basicAuthKey) as string}
      });
    }

    return next.handle(request);
  }
}
