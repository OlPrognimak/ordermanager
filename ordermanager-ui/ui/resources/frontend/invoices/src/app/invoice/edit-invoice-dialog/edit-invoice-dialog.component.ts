import {AfterViewInit, Component, Input, OnInit, TemplateRef, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ButtonModule} from "primeng/button";
import {InputTextModule} from "primeng/inputtext";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from "@angular/forms";
import {ToastModule} from "primeng/toast";
import {
    ValidatableInputTextModule
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {InvoiceFormModule} from "../invoiceform/invoiceform.component";
import {ValidatableCalendarModule} from "../../common-components/validatable-calendar/validatable-calendar.component";
import {
  ValidatableDropdownlistModule
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import {HttpClient} from "@angular/common/http";
import {AppSecurityService} from "../../user/user-login/app-security.service";
import {MessageService} from "primeng/api";
import {CommonServicesUtilService, invoiceRate} from "../../common-services/common-services-util.service";
import {CommonServicesAppHttpService} from "../../common-services/common-services.app.http.service";
import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface
} from "../../domain/domain.invoiceformmodel";
import {
  CalendarValueWrapper,
  TemplatesComponentComponent
} from "../../common-components/templates-component/templates-component.component";
import {TooltipModule} from "primeng/tooltip";
import {DialogModule} from "primeng/dialog";
import {CalendarModule} from "primeng/calendar";
export type InvoiceControls = { [key in keyof InvoiceFormModelInterface]: AbstractControl }
type InvoiceFormGroup = FormGroup & { value: InvoiceFormModelInterface, controls: InvoiceControls }

@Component({
  selector: 'app-edit-invoice-dialog',
  standalone: true,
  imports: [CommonModule,
    ButtonModule,
    InputTextModule,
    ReactiveFormsModule,
    ToastModule,
    ValidatableInputTextModule,
    FormsModule,
    InvoiceFormModule,
    ValidatableCalendarModule,
    ValidatableDropdownlistModule,
    TemplatesComponentComponent,
    TooltipModule,
    DialogModule, CalendarModule],
  templateUrl: './edit-invoice-dialog.component.html',
  styleUrls: ['./edit-invoice-dialog.component.css']
})
export class EditInvoiceDialogComponent implements OnInit {

  @ViewChild('templatesComponent') templatesComponentComponent : TemplatesComponentComponent
  @ViewChild('templatesComponentForInvoiceDate') templatesComponentForInvoiceDate : TemplatesComponentComponent

  editInvoiceFG: FormGroup
  visible: boolean;
  /** Model invoice supplier for dropdown component */
  @Input() personInvoiceSupplier: DropdownDataType[]
  /** Model invoice recipient for dropdown component */
  @Input() personInvoiceRecipient: DropdownDataType[]
  private invoice: InvoiceFormModel;

  constructor(private httpClient: HttpClient,
              public appSecurityService: AppSecurityService,
              private messageService: MessageService,
              private utilService: CommonServicesUtilService,
              private httpService: CommonServicesAppHttpService<InvoiceFormModelInterface>,
              private formBuilder: FormBuilder) {

    this.editInvoiceFG = this.formBuilder.group({
        id: this.formBuilder.nonNullable.control(0),
        invoiceNumber: this.formBuilder.nonNullable.control('', [Validators.required]),
        invoiceDescription: this.formBuilder.nonNullable.control('', [Validators.required]),
        creationDate: this.formBuilder.nonNullable.control(null, [Validators.required]),
        invoiceDate: this.formBuilder.nonNullable.control(null, [Validators.required]),
        invoiceItems: this.formBuilder.nonNullable.control([]),
        supplierFullName: this.formBuilder.nonNullable.control(''),
        recipientFullName: this.formBuilder.nonNullable.control('', [Validators.required]),
        personRecipientId: this.formBuilder.nonNullable.control(null,[Validators.required]),
        personSupplierId: this.formBuilder.nonNullable.control(null, [Validators.required]),
        rateType:  this.formBuilder.nonNullable.control(null, [Validators.required]),
        totalSumNetto: this.formBuilder.nonNullable.control(0),
        totalSumBrutto: this.formBuilder.nonNullable.control(0)
      } as InvoiceControls) as InvoiceFormGroup
  }


  ngOnInit(): void {
    this.loadFormData()
  }

  loadFormData() {
    this.httpService.loadDropdownData('person/personsdropdown', callback => {
      if(callback !=null) {
        this.personInvoiceRecipient = callback;
        this.personInvoiceSupplier = callback;
      }
    })
  }

  setInvoice(invoice: InvoiceFormModel) {

    setTimeout(() => {

      this.invoice = invoice
    })
      // this.getControl('id').setValue(invoice.id)
      // this.getControl('invoiceNumber').setValue(invoice.invoiceNumber)
      // this.getControl('invoiceDescription').setValue(invoice.invoiceDescription)
      // this.getControl('creationDate').setValue(new Date(invoice.creationDate))
      // this.getControl('invoiceDate').setValue(new Date(invoice.invoiceDate))
      // this.getControl('supplierFullName').setValue(invoice.supplierFullName)
      // this.getControl('recipientFullName').setValue(invoice.recipientFullName)
      // this.getControl('personRecipientId').setValue(''+invoice.personRecipientId)
      // this.getControl('personSupplierId').setValue(''+invoice.personSupplierId)
      // this.getControl('rateType').setValue(invoice.rateType)
      // this.getControl('totalSumNetto').setValue(invoice.totalSumNetto)
      // this.getControl('totalSumBrutto').setValue(invoice.totalSumBrutto)
      // this.editInvoiceFG.updateValueAndValidity()
    this.editInvoiceFG.setValue(invoice)
    //FIXME need to fix Issue.  see Issue #16 in  Github project ordermanager
    this.getControl('personRecipientId').setValue(''+invoice.personRecipientId)
    this.getControl('personSupplierId').setValue(''+invoice.personSupplierId)
    this.getControl('creationDate').setValue(new Date(invoice.creationDate))
    this.getControl('invoiceDate').setValue(new Date(invoice.invoiceDate))

  }

  sendChanges() {

  }

  setVisible(isVisible: boolean) {
   // console.log("Set visible ="+isVisible)
    this.visible = isVisible
  }

  getControl(controlPath: string) {
    return this.editInvoiceFG.get(controlPath) as FormControl;
  }

  setCalendarValue(event: CalendarValueWrapper) {
    console.log('Set Value: Name:'+event.calendarName+ ': Date :'+event.date.toDateString())
    this.getControl(event.calendarName).setValue(event.date)

  }

  protected readonly invoiceRate = invoiceRate;
}
