import {AfterViewInit, Component, TemplateRef, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ButtonModule} from "primeng/button";
import {InputTextModule} from "primeng/inputtext";
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
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
import {CommonServicesUtilService} from "../../common-services/common-services-util.service";
import {CommonServicesAppHttpService} from "../../common-services/common-services.app.http.service";
import {
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
export class EditInvoiceDialogComponent implements AfterViewInit{

  @ViewChild('templatesComponent') templatesComponentComponent : TemplatesComponentComponent
  @ViewChild('templatesComponentForInvoiceDate') templatesComponentForInvoiceDate : TemplatesComponentComponent

  editInvoiceFG: FormGroup
  invoiceRate = [
    //{label: '[Select rate type]', value: null},
    {label: 'Hourly rate', value: 'HOURLY'},
    {label: 'Daily rate', value: 'DAILY'}
  ];
  personInvoiceSupplier: any;
  personInvoiceRecipient: any;
  visible: boolean;
  private invoice: InvoiceFormModel;
  dateModel:Date = new Date();

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
       // invoiceItems: this.formBuilder.nonNullable.control([]),
        supplierFullName: this.formBuilder.nonNullable.control(''),
        recipientFullName: this.formBuilder.nonNullable.control('', [Validators.required]),
        personRecipientId: this.formBuilder.nonNullable.control('',[Validators.required]),
        personSupplierId: this.formBuilder.nonNullable.control(0),
        rateType: [null],
        totalSumNetto: this.formBuilder.nonNullable.control(0),
        totalSumBrutto: this.formBuilder.nonNullable.control(0)
      }
    )
  }

  putInvoice($event: MouseEvent) {

  }

  setInvoice(invoice: InvoiceFormModel) {

    setTimeout(() => {

      this.invoice = invoice
    })
      this.getControl('id').setValue(invoice.id)
      this.getControl('invoiceNumber').setValue(invoice.invoiceNumber)
      this.getControl('invoiceDescription').setValue(invoice.invoiceDescription)
      this.getControl('creationDate').setValue(new Date(invoice.creationDate))
      this.getControl('invoiceDate').setValue(new Date(invoice.invoiceDate))
      this.getControl('supplierFullName').setValue(invoice.supplierFullName)
      this.getControl('recipientFullName').setValue(invoice.recipientFullName)
      this.getControl('personRecipientId').setValue(invoice.personRecipientId)
      this.getControl('personSupplierId').setValue(invoice.personSupplierId)
      this.getControl('rateType').setValue(invoice.rateType)
      this.getControl('totalSumNetto').setValue(invoice.totalSumNetto)
      this.getControl('totalSumBrutto').setValue(invoice.totalSumBrutto)
      this.editInvoiceFG.updateValueAndValidity()

  }
  ngAfterViewInit(): void {
    setTimeout(() => {
      //this.templatesComponentComponent.dateTemplateModel = this.invoice?.creationDate
      //this.templatesComponentForInvoiceDate.dateTemplateModel = this.invoice?.invoiceDate
    })

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

}
