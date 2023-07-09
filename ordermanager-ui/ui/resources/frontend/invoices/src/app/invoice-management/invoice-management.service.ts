import {HttpClient, HttpHeaders} from "@angular/common/http";
import {InvoiceFormModel} from "../domain/domain.invoiceformmodel";
import {AppSecurityService} from "../user-login/app-security.service";
import {MessagesPrinter} from "../common-services/common-services.app.http.service";
import {Injectable} from "@angular/core";
import {printToJson} from "../common-services/common-services-util.service";

@Injectable({
  providedIn: 'root'
})
export class InvoiceManagementService {

  processRuns: boolean;
  invoices: InvoiceFormModel[];
  constructor(private httpClient: HttpClient, public securityService: AppSecurityService,
              private messagePrinter:MessagesPrinter) {

  }

  loadInvoices(component:InvoiceManagementService, errorMessagePart: string): void {
    this.isProcessRunned(true);

    const headers = new HttpHeaders({
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    this.httpClient.get<InvoiceFormModel[]>(this.securityService.backendUrl + 'invoice/invoicesList', {headers})
      .subscribe({
        next(response) {
          component.invoices = response
        },
        error(err) {
          component.isProcessRunned(false)
          printToJson(err)
          component.messagePrinter.printUnSuccessMessage(errorMessagePart, err);
        },
        complete(){
          component.isProcessRunned(false)
        }
      })
  }

  /**
   *
   * @param isRun
   */
  public isProcessRunned(isRun: boolean): void {
    this.processRuns = isRun;
  }
}
