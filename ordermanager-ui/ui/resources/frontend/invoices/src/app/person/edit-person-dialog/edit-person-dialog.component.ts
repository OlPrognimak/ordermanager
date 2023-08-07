import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {BankAccountFormModel, PersonAddressFormModel, PersonFormModel} from "../../domain/domain.personformmodel";
import {AppSecurityService} from "../../user/user-login/app-security.service";
import {AngularIbanModule, ValidatorService} from "angular-iban";
import {ButtonModule} from "primeng/button";
import {InputTextModule} from "primeng/inputtext";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {
  ValidatableDropdownlistModule
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import {
  ValidatableInputTextModule
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {DropdownDataType} from "../../domain/domain.invoiceformmodel";
import {DropdownModule} from "primeng/dropdown";
import {DialogModule} from "primeng/dialog";

@Component({
  selector: 'app-edit-person-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AngularIbanModule, ButtonModule, InputTextModule, MessageModule, ToastModule, ValidatableDropdownlistModule, ValidatableInputTextModule, DropdownModule, DialogModule],
  templateUrl: './edit-person-dialog.component.html',
  styleUrls: ['./edit-person-dialog.component.css']
})
export class EditPersonDialogComponent {
  /** person model */
  personFormModel: PersonFormModel = new PersonFormModel();
  /**person type model*/
  personType: DropdownDataType[] =  [
    // {label: '[Select person type]', value: ''},
    {label: 'Private person', value: 'PRIVATE'},
    {label: 'Organisation', value: 'ORGANISATION'}
  ];
  /**person form group*/
   editPersonFG= new FormGroup({
       id: new FormControl(-1),
       personLastName:  new FormControl(''),
       personFirstName: new FormControl(''),
       companyName: new FormControl(''),
       personType: new FormControl(''),
       taxNumber: new FormControl(''),
       email: new FormControl(''),
       personAddressFormModel:  new FormGroup({
         id: new FormControl(-1),
         city: new FormControl(''),
         street: new FormControl(''),
         zipCode: new FormControl(''),
         postBoxCode: new FormControl('')
       }),
        bankAccountFormModel: new FormGroup({
          id: new FormControl(-1),
          accountNumber: new FormControl(''),
          iban: new FormControl(null, [Validators.required,
            ValidatorService.validateIban]),
          bicSwift: new FormControl(''),
          bankName: new FormControl('')
        })
    })
   @Input() visible: boolean = false;
   @Output() visibilityChanged = new EventEmitter<boolean>




    constructor(public securityService: AppSecurityService) {
    }


  setVisibilityChanged(val: boolean) {
    // setTimeout(() =>{
    //   this.visible = val
    // })
    this.visibilityChanged.emit(val)
  }

  typeChanged(e: any) {
    console.log(e.value)
    const personTypeFg = this.editPersonFG.get('personType') as FormControl
    personTypeFg.setValue(e.target.value, {
      onlySelf: true
    })
  }

  /**
   * The full path to the control in form group.
   *
   * @param controlPath the path to control with avoiding the root form group
   */
  getControl(controlPath: string) {
    //console.log('Try read control with PATH : '+controlPath)
    return this.editPersonFG.get(controlPath) as FormControl;
  }

  haveErrors(): boolean {
    console.log('-----ERRORS : '+this.editPersonFG.errors)
    return this.editPersonFG.invalid
  }

  setChanges(event: MouseEvent) {

  }
}
