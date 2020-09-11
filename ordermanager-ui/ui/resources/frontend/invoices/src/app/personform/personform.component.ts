import {Component, OnInit} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {DropdownDataType} from '../domain/domain.invoiceformmodel';
import {PersonAddressFormModel, BankAccountFormModel, PersonFormModel} from '../domain/domain.personformmodel';
import {Observable, of} from 'rxjs';
import {Message, MessageService} from 'primeng';
import {delay, map} from 'rxjs/operators';
import {ComponentsUtilService} from '../components/components.util.service';


function handleResult(result: string): void {
  console.log('Result: ' + JSON.stringify(result));
}


function handleError(err: any): void {
  console.log('Error: ' + JSON.stringify(err));
}

/**
 * The component which contains form component for creation of person
 */
@Component({
  selector:    'app-person',
  templateUrl: './personform.component.html',
  providers:  [MessageService, ComponentsUtilService]
})
export class PersonFormComponent implements OnInit {
  /** The base url string for communication with server */
  backendUrl: string;
  /** person model */
  personFormModel: PersonFormModel;
  /** bank account model */
  personBankAccountModel: BankAccountFormModel;
  /** Address model */
  personAddressModel: PersonAddressFormModel;
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  /** Model for person type dropdown component */
  personType: DropdownDataType[];

  /**
   * The constructor
   * @param httpClient the http client
   * @param messageService primeNG message service
   */
  constructor( private httpClient: HttpClient,
               private messageService: MessageService,
               private utilService: ComponentsUtilService){
  }

  /**
   * Init component
   */
  ngOnInit(): void {
    this.personType = [
      {label: '[Select person type]', value: null},
      {label: 'Private person', value: 'PRIVATE'},
      {label: 'Organisation', value: 'ORGANISATION'}
    ];
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') + 'person';
    this.personFormModel = new PersonFormModel();
    this.personBankAccountModel = this.personFormModel.bankAccountFormModel;
    this.personAddressModel = this.personFormModel.personAddressFormModel;
  }

  /**
   * Saves person to the database
   * @param event the event from ui
   */
  savePerson(event: any): void{
    this.handleClickHttp().subscribe((response) =>
      {
          this.personFormModel = new PersonFormModel();
          const msg: Message = {severity: 'success', summary: 'Congradulation!', detail: 'The person is saved successfully.'};
          this.messageService.add(msg);
          this.utilService.hideMassage(msg, 2000);
          handleResult(response);
      }, (error) => {
          const msg = {severity: 'error', summary: 'Error', detail: 'The person is not saved.'};
          this.messageService.add(msg);
          this.utilService.hideMassage(msg, 2000);
          handleError(error);
        }
    );
  }

  handleClickHttp(): Observable<string>{
    const params = new HttpParams();
    return this.httpClient.put<string>(this.backendUrl, this.personFormModel, { params } );
  }

}
