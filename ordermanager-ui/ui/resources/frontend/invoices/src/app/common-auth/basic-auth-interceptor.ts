import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AUTH_TOKEN_KEY } from "../common-utils/common-utils.constants";

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
    const authToken = 'Bearer '+localStorage.getItem(AUTH_TOKEN_KEY)
    if (authToken != null) {
      request = request.clone({
        setHeaders: {Authorization: authToken as string}
      });
    }

    return next.handle(request);
  }
}
