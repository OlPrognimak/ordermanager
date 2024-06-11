import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from "@angular/forms";
import { ToastModule } from "primeng/toast";
import {
  ValidatableInputTextModule
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import { InvoiceFormModule } from "../invoiceform/invoiceform.component";
import { ValidatableCalendarModule } from "../../common-components/validatable-calendar/validatable-calendar.component";
import {
  ValidatableDropdownlistModule
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import { HttpClient } from "@angular/common/http";
import { AppSecurityService } from "../../common-auth/app-security.service";
import { MessageService } from "primeng/api";
import {
  CommonServicesUtilService,
  compareObjects,
  invoiceRate,
  isAuthenticated
} from "../../common-services/common-services-util.service";
import { CommonServicesAppHttpService, MessagesPrinter } from "../../common-services/common-services.app.http.service";
import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface,
  InvoiceItemModel
} from "../../domain/domain.invoiceformmodel";
import {
  CalendarValueWrapper,
  TemplatesComponentComponent
} from "../../common-components/templates-component/templates-component.component";
import { TooltipModule } from "primeng/tooltip";
import { DialogModule } from "primeng/dialog";
import { CalendarModule } from "primeng/calendar";
import {
  InvoiceReactiveItemsTableComponent
} from "../invoice-reactive-items-table/invoice-reactive-items-table.component";
import { Subject } from "rxjs";
import { MessageModule } from "primeng/message";
import { MessagesModule } from "primeng/messages";
import { ConfirmationDialogComponent } from "../../common-components/confirmation-dialog/confirmation-dialog.component";

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
    TooltipModule, MessageModule, MessagesModule,
    DialogModule, CalendarModule, InvoiceReactiveItemsTableComponent, ConfirmationDialogComponent],
  providers: [
    MessageService, MessagesPrinter, CommonServicesUtilService
  ],
  templateUrl: './edit-invoice-dialog.component.html',
  styleUrls: ['./edit-invoice-dialog.component.css']
})
export class EditInvoiceDialogComponent implements OnInit, AfterViewInit {

  @ViewChild('templatesComponent') templatesComponentComponent: TemplatesComponentComponent
  @ViewChild('templatesComponentForInvoiceDate') templatesComponentForInvoiceDate: TemplatesComponentComponent
  @ViewChild('reactiveItemsTableComponent') itemsTableComponent: InvoiceReactiveItemsTableComponent

  editInvoiceFG: InvoiceFormGroup
  visible: boolean;
  /** Model invoice supplier for dropdown component */
  @Input() personInvoiceSupplier: DropdownDataType[]
  /** Model invoice recipient for dropdown component */
  @Input() personInvoiceRecipient: DropdownDataType[]
  @Output() editObjectChangedChanged: EventEmitter<InvoiceFormModel> = new EventEmitter<InvoiceFormModel>();

  invoiceReactiveDlgFormData: InvoiceFormModel;
  originalInvoice: InvoiceFormModel
  invoiceItems: InvoiceItemModel[]
  eventsModelIsReset: Subject<void> = new Subject<void>();
  protected readonly invoiceRate = invoiceRate;
  protected readonly isAuthenticated = isAuthenticated;
  private isViewInitialized = false;

  constructor(private httpClient: HttpClient,
              public appSecurityService: AppSecurityService,
              private messageService: MessageService,
              private messagePrinter: MessagesPrinter,
              private utilService: CommonServicesUtilService,
              private httpService: CommonServicesAppHttpService<InvoiceFormModel>,
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
      personRecipientId: this.formBuilder.nonNullable.control(null, [Validators.required]),
      personSupplierId: this.formBuilder.nonNullable.control(null, [Validators.required]),
      rateType: this.formBuilder.nonNullable.control(null, [Validators.required]),
      totalSumNetto: this.formBuilder.nonNullable.control(0),
      totalSumBrutto: this.formBuilder.nonNullable.control(0)
    } as InvoiceControls) as InvoiceFormGroup
  }

  ngAfterViewInit(): void {
    //TODO reserved
  }

  ngOnInit(): void {
    this.resetModel();
    this.loadFormData()
  }

  /**
   * Loads initial person data from the server.
   */
  loadFormData() {
    this.httpService.loadDropdownData('person/personsdropdown', callback => {
      if (callback != null) {
        this.personInvoiceRecipient = callback;
        this.personInvoiceSupplier = callback;
      }
    })
  }

  /**
   * Sets object to be edited in dialog.
   *
   * @param invoice
   */
  setEditingObject(invoice: InvoiceFormModel) {
    this.originalInvoice = invoice
    this.invoiceReactiveDlgFormData = Object.assign({}, invoice)

    this.invoiceReactiveDlgFormData.invoiceItems = this.cloneInvoiceItems(invoice.invoiceItems)
    this.editInvoiceFG.setValue(this.invoiceReactiveDlgFormData)
    //FIXME need to fix Issue.  see Issue #16 in  Github project ordermanager
    this.getControl('personRecipientId').setValue('' + this.invoiceReactiveDlgFormData.personRecipientId)
    this.getControl('personSupplierId').setValue('' + this.invoiceReactiveDlgFormData.personSupplierId)
    this.getControl('creationDate').setValue(new Date(this.invoiceReactiveDlgFormData.creationDate))
    this.getControl('invoiceDate').setValue(new Date(this.invoiceReactiveDlgFormData.invoiceDate))
    ///end to fix
    this.itemsTableComponent.calculatorService.totalNettoSum.set(this.invoiceReactiveDlgFormData.totalSumNetto)
    this.itemsTableComponent.calculatorService.totalBruttoSum.set(this.invoiceReactiveDlgFormData.totalSumBrutto)

  }


  /**
   * @return true if model has errors.
   */
  haveErrors(): boolean {
    //this.itemsTableComponent.
    const model: InvoiceFormModel = this.editInvoiceFG.value
    return this.editInvoiceFG.invalid ||
      model?.invoiceItems.length === 0 ||
      model?.invoiceItems.filter(i => (i.amountItems <= 0 || i.amountItems === undefined)).length > 0
  }

  /**
   * Puts changes in dialog back to the invoice management component
   */
  putChangesBack() {
    if (this.haveErrors() === false) {
      const keepOriginalInvoice = this.originalInvoice
      this.originalInvoice = this.editInvoiceFG.value

      this.originalInvoice.totalSumNetto = this.itemsTableComponent.calculatorService.totalNettoSum()
      this.originalInvoice.totalSumBrutto =  this.itemsTableComponent.calculatorService.totalBruttoSum()

      const supplier =
        this.personInvoiceSupplier.filter((p, idx) =>
          p.value === this.originalInvoice.personSupplierId)?.at(0)
      const recipient =
        this.personInvoiceSupplier.filter((p, idx) =>
          p.value === this.originalInvoice.personRecipientId)?.at(0)
      //
      this.originalInvoice.supplierFullName = supplier?.label!
      this.originalInvoice.recipientFullName = recipient?.label!

      if (compareObjects(keepOriginalInvoice, this.originalInvoice) &&
        this.validateInvoiceItems(keepOriginalInvoice.invoiceItems, this.originalInvoice.invoiceItems)) {
        this.messagePrinter.printUnsuccessefulMessage(
          "No changes in the invoice found", null)

      } else {
        this.editObjectChangedChanged.emit(this.originalInvoice)
        this.visible = false
      }
    }
  }

  validateInvoiceItems(originalItems: InvoiceItemModel[], changedItems: InvoiceItemModel[]): boolean {
    if (originalItems.length !== changedItems.length) return false;
    if (!compareObjects(originalItems, changedItems)) return false
    let isValid: boolean = true
    originalItems.forEach((o, idx) => {
      const changed = changedItems.filter(c => c.id === o.id)?.at(0)
      if (changed !== undefined) {
        isValid = isValid && compareObjects(o, changed)
      } else {
        isValid = false
      }
    })
    return isValid
  }

  setVisible(isVisible: boolean) {
    this.visible = isVisible
  }

  getControl(controlPath: string) {
    return this.editInvoiceFG.get(controlPath) as FormControl;
  }

  setCalendarValue(event: CalendarValueWrapper) {
    this.getControl(event.calendarName).setValue(event.date)

  }

  invoiceItemsChanged(event: InvoiceItemModel[]) {
    this.getControl('invoiceItems').setValue(event)
  }

  totalNettoSumChanged(event: number) {
    this.invoiceReactiveDlgFormData.totalSumNetto = event
  }

  totalBruttoSumChanged(event: number) {
    this.invoiceReactiveDlgFormData.totalSumBrutto = event
  }

  /**
   * Resets data model.
   * @private
   */
  private resetModel(): void {
    this.invoiceReactiveDlgFormData = new InvoiceFormModel();
    this.invoiceReactiveDlgFormData.invoiceItems.push(new InvoiceItemModel());
    // this.eventsModelIsReset.next();

    if (this.isViewInitialized) {
      this.itemsTableComponent.resetTotalValues();
    }
  }

  /**
   * Clones {@code }
   * @param source
   * @private
   */
  private cloneInvoiceItems(source: InvoiceItemModel[]): InvoiceItemModel[] {
    const result: InvoiceItemModel[] = []

    source.forEach((item, idx) => {
      result.push(Object.assign({}, item))
    })

    return result
  }
}
