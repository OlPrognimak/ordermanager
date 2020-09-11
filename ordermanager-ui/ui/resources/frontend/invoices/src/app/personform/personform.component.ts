import {Component, OnInit} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {DropdownDataType} from '../domain/domain.invoiceformmodel';
import {PersonAddressFormModel, BankAccountFormModel, PersonFormModel} from "../domain/domain.personformmodel";
import {Observable, of} from "rxjs";
import {Message, MessageService} from "primeng";
import {delay, map} from "rxjs/operators";


function handleResult(result: string): void {
  console.log('Result: ' + JSON.stringify(result));
}


function handleError(err: any): void {
  console.log('Error: ' + JSON.stringify(err));
}

@Component({
  selector:    'app-person',
  templateUrl: './personform.component.html',
  providers:  [MessageService]
})
export class PersonFormComponent implements OnInit {

  backendUrl: string;
  responseResult: string;
  personFormModel: PersonFormModel;
  personBankAccountModel: BankAccountFormModel;
  personAddresModel: PersonAddressFormModel;
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  /** Model for person type dropdown component */
  personType: DropdownDataType[];

  constructor( private httpClient: HttpClient, private messageService: MessageService){
  }

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
    this.personAddresModel = this.personFormModel.personAddressFormModel;
  }

  savePerson(event: any): void{
    this.handleClickHttp().subscribe((response) =>
      {
          this.personFormModel = new PersonFormModel();
          const msg: Message = {severity: 'success', summary: 'Congradulation!', detail: 'The person is saved successfully.'};
          this.messageService.add(msg);
          this.hideMassage(msg, 2000);
          handleResult(response);
      }, (error) => {
          const msg = {severity: 'error', summary: 'Error', detail: 'The person is not saved.'};
          this.messageService.add(msg);
          this.hideMassage(msg, 2000);
          handleError(error);
        }
    );
  }

  private hideMassage(messsage: Message, delayTimeMs: number): void{
    const observable = of(messsage).pipe(delay(delayTimeMs));
    const operatorFunction = map((msg: Message) => {
         console.log('Message add');
         this.messageService.clear();
         return true;
    } );
    const messageFunction = operatorFunction(observable);
    messageFunction.toPromise().then((data) => {
      console.log('Message clear');
      this.messageService.clear();
      }
    );
  }


  handleClickHttp(): Observable<string>{
    const params = new HttpParams();
    return this.httpClient.put<string>(this.backendUrl, this.personFormModel, { params } );
  }

}
