import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {PersonFormModel} from "../../domain/domain.personformmodel";
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
import {MessagesPrinter} from "../../common-services/common-services.app.http.service";

@Component({
  selector: 'app-edit-person-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AngularIbanModule, ButtonModule, InputTextModule, MessageModule, ToastModule, ValidatableDropdownlistModule, ValidatableInputTextModule, DropdownModule, DialogModule],
  templateUrl: './edit-person-dialog.component.html',
  styleUrls: ['./edit-person-dialog.component.css']
})
export class EditPersonDialogComponent {
  /** person model */
  //personFormModel: PersonFormModel = new PersonFormModel();ƒ
  originalPersonFormModel: PersonFormModel = new PersonFormModel();
  /**true if no changes in edited person happens*/
  isNoChangesInPersonModel: boolean = true
  /**person type model*/
  personType: DropdownDataType[] = [
    // {label: '[Select person type]', value: ''},
    {label: 'Private person', value: 'PRIVATE'},
    {label: 'Organisation', value: 'ORGANISATION'}
  ];
  /**person form group*/
  editPersonFG: FormGroup
  @Input() visible: boolean = false
  @Output() visibilityChanged = new EventEmitter<boolean>
  @Output() personModelChanges = new EventEmitter<PersonFormModel>

  /**
   * Constructor
   *
   * @param securityService the security service
   * @param formBuilder form builder
   */
  constructor(public securityService: AppSecurityService, private formBuilder: FormBuilder, private messagePrinter: MessagesPrinter) {
    this.editPersonFG = this.formBuilder.group({
      personId: this.formBuilder.nonNullable.control(null),
      personLastName: this.formBuilder.nonNullable.control(''),
      personFirstName: this.formBuilder.nonNullable.control(''),
      companyName: this.formBuilder.nonNullable.control(''),
      personType: this.formBuilder.nonNullable.control('', [Validators.required]),
      taxNumber: this.formBuilder.nonNullable.control(''),
      email: this.formBuilder.nonNullable.control('', [Validators.required,
        Validators.minLength(5),
        Validators.pattern('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}')]),
      personAddressFormModel: this.formBuilder.group({
        city: this.formBuilder.nonNullable.control('', [Validators.required]),
        street: this.formBuilder.nonNullable.control('', [Validators.required]),
        zipCode: this.formBuilder.nonNullable.control('', [Validators.required]),
        postBoxCode: this.formBuilder.nonNullable.control(null)
      }),
      bankAccountFormModel: this.formBuilder.group({
        accountNumber: this.formBuilder.nonNullable.control(null),
        iban: this.formBuilder.nonNullable.control(null, [Validators.required,
          ValidatorService.validateIban]),
        bicSwift: this.formBuilder.nonNullable.control('', [Validators.required]),
        bankName: this.formBuilder.nonNullable.control('', [Validators.required])
      })
    })
  }



  setVisible(val: boolean) {
    this.visibilityChanged.emit(val)
  }

  personTypeChanged(e: any) {
    const personTypeFg = this.editPersonFG.get('personType') as FormControl
    personTypeFg.setValue(e.value)
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
    return this.editPersonFG.invalid
  }

  setPerson(personFormModel: PersonFormModel) {
    this.isNoChangesInPersonModel = true
    this.originalPersonFormModel = personFormModel
    this.getControl('personId').setValue(personFormModel.id)
    if (personFormModel.personType === 'ORGANISATION') {
      this.getControl('personFirstName').clearValidators()
      this.getControl('personLastName').clearValidators()
      this.getControl('taxNumber').clearValidators()
      this.getControl('companyName').setValidators([Validators.required, Validators.minLength(2)])
      this.editPersonFG.updateValueAndValidity()
    } else if (personFormModel.personType === 'PRIVATE') {
      this.getControl('personFirstName').setValidators([Validators.required, Validators.minLength(2)])
      this.getControl('personLastName').setValidators([Validators.required, Validators.minLength(2)])
      this.getControl('taxNumber').setValidators([Validators.required, Validators.minLength(2)])
      this.getControl('companyName').clearValidators()
      this.editPersonFG.updateValueAndValidity()
    }

    this.getControl('personFirstName').setValue(personFormModel.personFirstName)
    this.getControl('personLastName').setValue(personFormModel.personLastName)
    this.getControl('personType').setValue(personFormModel.personType)
    this.getControl('companyName').setValue(personFormModel.companyName)
    this.getControl('email').setValue(personFormModel.email)
    this.getControl('taxNumber').setValue(personFormModel.taxNumber)
    this.getControl('personAddressFormModel.city').setValue(personFormModel.personAddressFormModel.city)
    this.getControl('personAddressFormModel.postBoxCode').setValue(personFormModel.personAddressFormModel.postBoxCode)
    this.getControl('personAddressFormModel.zipCode').setValue(personFormModel.personAddressFormModel.zipCode)
    this.getControl('personAddressFormModel.street').setValue(personFormModel.personAddressFormModel.street)
    this.getControl('bankAccountFormModel.accountNumber').setValue(personFormModel.bankAccountFormModel.accountNumber)
    this.getControl('bankAccountFormModel.bankName').setValue(personFormModel.bankAccountFormModel.bankName)
    this.getControl('bankAccountFormModel.iban').setValue(personFormModel.bankAccountFormModel.iban)
    this.getControl('bankAccountFormModel.bicSwift').setValue(personFormModel.bankAccountFormModel.bicSwift)
    this.editPersonFG.updateValueAndValidity()
  }

  mapFromGroupToPersonModel() {
    const personModel: PersonFormModel = new PersonFormModel()

    personModel.personType = this.getControl('personType').value?.trim();
    personModel.id = this.getControl('personId').value;
    if (personModel.personType === 'ORGANISATION') {
      personModel.companyName = this.getControl('companyName').value?.trim()
      this.validateChanges(this.originalPersonFormModel.companyName?.trim() === personModel.companyName?.trim())
    } else if (this.getControl('personType').value === 'PRIVATE') {
      personModel.personFirstName = this.getControl('personFirstName').value?.trim()
      this.validateChanges(this.originalPersonFormModel.personFirstName?.trim() === personModel.personFirstName?.trim())
      personModel.personLastName = this.getControl('personLastName').value?.trim()
      this.validateChanges(this.originalPersonFormModel.personLastName?.trim() === personModel.personLastName?.trim())
      personModel.taxNumber = this.getControl('taxNumber').value?.trim()
      this.validateChanges(this.originalPersonFormModel.taxNumber?.trim() === personModel.taxNumber?.trim())
    }
    personModel.email = this.getControl('email').value?.trim()
    this.validateChanges(this.originalPersonFormModel.email?.trim() === personModel.email?.trim())
    personModel.taxNumber = this.getControl('taxNumber').value?.trim()
    this.validateChanges(this.originalPersonFormModel.taxNumber?.trim() === personModel.taxNumber?.trim())
    personModel.personAddressFormModel.city = this.getControl('personAddressFormModel.city').value?.trim()
    this.validateChanges(this.originalPersonFormModel.personAddressFormModel.city?.trim() === personModel.personAddressFormModel.city?.trim())
    personModel.personAddressFormModel.postBoxCode = this.getControl('personAddressFormModel.postBoxCode').value?.trim()
    this.validateChanges(this.originalPersonFormModel.personAddressFormModel.postBoxCode?.trim() === personModel.personAddressFormModel.postBoxCode?.trim())
    personModel.personAddressFormModel.zipCode = this.getControl('personAddressFormModel.zipCode').value?.trim()
    this.validateChanges(this.originalPersonFormModel.personAddressFormModel.zipCode?.trim() === personModel.personAddressFormModel.zipCode?.trim())
    personModel.personAddressFormModel.street = this.getControl('personAddressFormModel.street').value?.trim()
    this.validateChanges(this.originalPersonFormModel.personAddressFormModel.street?.trim() === personModel.personAddressFormModel.street?.trim())
    personModel.bankAccountFormModel.accountNumber = this.getControl('bankAccountFormModel.accountNumber').value
    this.validateChanges(this.originalPersonFormModel.bankAccountFormModel.accountNumber?.trim() === personModel.bankAccountFormModel.accountNumber?.trim())
    personModel.bankAccountFormModel.bankName = this.getControl('bankAccountFormModel.bankName').value?.trim()
    this.validateChanges(this.originalPersonFormModel.bankAccountFormModel.bankName?.trim() === personModel.bankAccountFormModel.bankName?.trim())
    personModel.bankAccountFormModel.iban = this.getControl('bankAccountFormModel.iban').value
    this.validateChanges(this.originalPersonFormModel.bankAccountFormModel.iban?.trim() === personModel.bankAccountFormModel.iban?.trim())
    personModel.bankAccountFormModel.bicSwift = this.getControl('bankAccountFormModel.bicSwift').value?.trim()
    this.validateChanges(this.originalPersonFormModel.bankAccountFormModel.bicSwift?.trim() === personModel.bankAccountFormModel.bicSwift?.trim())

    return personModel
  }

  validateChanges(isEquals: boolean) {
    this.isNoChangesInPersonModel = this.isNoChangesInPersonModel&&isEquals
  }


  /**
   * Sends the changes back to the person management form after successful changes of person
   */
  sendChanges() {

    if (this.editPersonFG.valid) {
      const model = this.mapFromGroupToPersonModel();
      console.log(" Result: "+JSON.stringify(model))
      console.log('is no changes? :'+this.isNoChangesInPersonModel)
      if(this.isNoChangesInPersonModel === true) {
        this.messagePrinter.printUnsuccessefulMessage("The person data has no changes.", null)
      } else {
        this.personModelChanges.emit(model)
        this.visibilityChanged.emit(false)
      }
    }
  }
}
