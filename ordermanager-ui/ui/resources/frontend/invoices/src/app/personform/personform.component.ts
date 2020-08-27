import {Component, OnInit} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {DropdownDataType} from '../domain/domain.invoiceformmodel';
import {PersonAddressFormModel, BankAccountFormModel, PersonFormModel} from "../domain/domain.personformmodel";
import {Observable} from "rxjs";


function handleResult(result: string): void {
  console.log('Result: ' + JSON.stringify(result));
}


function handleError(err: any): void {
  console.log('Error: ' + JSON.stringify(err));
}

@Component({
  selector:    'app-person',
  templateUrl: './personform.component.html',
  providers:  []
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

  constructor( private httpClient: HttpClient){
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
    this.handleClickHttp().subscribe(

      {
        next(response): void{
          handleResult(response);
        },
        error(err): void {
          handleError(err);
        }
      }

    );
  }

  handleClickHttp(): Observable<string>{
    const params = new HttpParams();
    return this.httpClient.put<string>(this.backendUrl, this.personFormModel, { params } );
  }

}
