import {Injectable} from "@angular/core";
import {HttpClient, HttpEvent, HttpHeaders, HttpRequest, HttpResponse} from "@angular/common/http";
import {RequestPeriodDateInterface} from "../../domain/domain.invoiceformmodel";
import {environment} from "../../../environments/environment";
import {MessagesPrinter} from "../../common-services/common-services.app.http.service";

@Injectable({
  providedIn: 'root'
})
/**
 *
 */
export class RequestPeriodDateService {

  processRuns: boolean;
  constructor(private http: HttpClient, private msgPrinter: MessagesPrinter) {
  }

   findData = ( url:string, period: RequestPeriodDateInterface, callback) =>{
     const service: RequestPeriodDateService = this;
     service.setProcessRun(true)
     const headersReq = new HttpHeaders({
       'Content-Type' : 'application/json',
       Accept : '*/*'
     } );
     const reguest: HttpRequest<RequestPeriodDateInterface> =
       new HttpRequest('POST', environment.baseUrl+url, period,{headers: headersReq})
     const messagePrinter = this.msgPrinter
     this.http.request<any>(reguest).subscribe(
       {
         next(responseEv: HttpEvent<any> ) {
           const response = responseEv as HttpResponse<any>
           if (response.ok) {
             return callback(response.body)
           }
         },
         error(err) {
           messagePrinter.printUnsuccessefulMessage(" request period ", err)
           service.setProcessRun(false)
         },
         complete(){
           service.setProcessRun(false)
         }
       }
     )
  }


  public setProcessRun(isRun: boolean): void {
    this.processRuns = isRun;
  }
}
