import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit, viewChild} from '@angular/core';
import {FormsModule, NgForm} from '@angular/forms';
import {Router, ActivatedRoute} from '@angular/router';
import {Store} from '@ngrx/store';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';
import {Subject, takeUntil} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {FloatLabel} from 'primeng/floatlabel';
import {InputTextModule} from 'primeng/inputtext';
import {TableModule} from 'primeng/table';
import {ToastModule} from 'primeng/toast';

import {ValidatableCalendarModule} from '../../common-components/validatable-calendar/validatable-calendar.component';
import {ValidatableDropdownlistModule} from '../../common-components/validatable-dropdownlist/validatable-dropdownlist.component';
import {ValidatableInputTextComponent} from '../../common-components/validatable-input-text/validatable-input-text.component';
import {InvoicePipesModule} from '../../common-pipes/common-services.pipes.number';
import {CommonServicesAppHttpService, MessagesPrinter} from '../../common-services/common-services.app.http.service';
import {invoiceRate, isAuthenticated} from '../../common-services/common-services-util.service';
import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface,
  InvoiceItemModel
} from '../../domain/domain.invoiceformmodel';
import {InvoiceFormModule} from '../../invoice/invoiceform/invoiceform.component';
import {InvoiceItemsTableCalculatorService} from '../../invoice/invoice-items-table/invoice-items-table.calculator.service';
import {InvoiceItemsTableService} from '../../invoice/invoice-items-table/invoice-items-table.service';
import {WorkflowEventsModel} from './model/workflow.events.model';
import {InvoiceActions} from './state/invoice.actions';
import {WorkflowStatuses} from './state/invoice.state';

@Component({
  selector: 'app-invoice-workflow',
  standalone: true,
  imports: [
    ButtonModule,
    CommonModule,
    FloatLabel,
    FormsModule,
    InputTextModule,
    InvoiceFormModule,
    InvoicePipesModule,
    TableModule,
    ToastModule,
    TranslocoPipe,
    ValidatableCalendarModule,
    ValidatableDropdownlistModule,
    ValidatableInputTextComponent
  ],
  templateUrl: './invoice-workflow.component.html',
  styleUrls: ['./invoice-workflow.component.css']
})
export class InvoiceWorkflowComponent implements OnInit, OnDestroy {
  workflowFrm = viewChild.required<NgForm>('workflowFrm');
  createInvoiceFlowEvents: WorkflowEventsModel[] = [];
  currentStepIndex = 0;
  invoice: InvoiceFormModelInterface = new InvoiceFormModel();
  workflowInvoiceItems: InvoiceItemModel[] = [];
  catalogInvoiceItems: DropdownDataType[] = [];
  personInvoiceSupplier: DropdownDataType[] = [];
  personInvoiceRecipient: DropdownDataType[] = [];
  isSaving = false;

  protected readonly invoiceRate = invoiceRate;
  protected readonly isAuthenticated = isAuthenticated;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store<any>,
    private readonly httpService: CommonServicesAppHttpService<InvoiceFormModelInterface>,
    private readonly messagePrinter: MessagesPrinter,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly invoiceItemsTableCalculatorService: InvoiceItemsTableCalculatorService,
    private readonly invoiceItemsTableService: InvoiceItemsTableService,
    private readonly translocoService: TranslocoService
  ) {
  }

  get currentStatus(): WorkflowEventsModel {
    return this.createInvoiceFlowEvents[this.currentStepIndex];
  }

  get progressPercent(): number {
    return ((this.currentStepIndex + 1) / this.createInvoiceFlowEvents.length) * 100;
  }

  ngOnInit(): void {
    this.prepareInvoiceFlow();
    this.loadPersons();
    this.loadCatalogItems();

    this.translocoService.langChanges$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.prepareInvoiceFlow());

    this.store.select('invoiceWorkflow')
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (!state?.data) {
          return;
        }
        this.invoice = Object.assign(new InvoiceFormModel(), state.data);
        this.workflowInvoiceItems = (state.data.invoiceItems ?? []).map(item => ({...item}));
        this.invoice.invoiceItems = this.workflowInvoiceItems;
      });

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const personType = params['createPerson'];
        this.currentStepIndex = personType === 'creator' ? 2 : personType === 'recipient' ? 3 : 0;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setWorkflowStep(stepIndex: number): void {
    if (stepIndex < 0 || stepIndex >= this.createInvoiceFlowEvents.length) {
      return;
    }
    this.persistInvoice();
    const firstIncompleteStep = this.firstIncompleteStepBefore(stepIndex);
    if (firstIncompleteStep !== -1) {
      this.currentStepIndex = firstIncompleteStep;
      this.markCurrentStepTouched();
      return;
    }

    this.currentStepIndex = stepIndex;
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  saveAndNext(): void {
    if (!this.isCurrentStepComplete() || this.currentStepIndex >= this.createInvoiceFlowEvents.length - 1) {
      return;
    }
    this.setWorkflowStep(this.currentStepIndex + 1);
  }

  movePreviousStep(): void {
    this.setWorkflowStep(this.currentStepIndex - 1);
  }

  isCurrentStepComplete(): boolean {
    return this.isStepComplete(this.currentStepIndex);
  }

  isStepComplete(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0:
        return !this.hasErrorsInvoiceType();
      case 1:
        return !this.hasErrorsDates();
      case 2:
        return !!this.invoice.personSupplierId;
      case 3:
        return !!this.invoice.personRecipientId;
      case 4:
        return !this.haveInvoiceItemsError(this.workflowInvoiceItems);
      case 5:
        return !this.haveErrors(this.workflowInvoiceItems);
      default:
        return false;
    }
  }

  stepState(stepIndex: number): 'active' | 'complete' | 'incomplete' {
    if (stepIndex === this.currentStepIndex) {
      return 'active';
    }
    return this.isStepComplete(stepIndex) ? 'complete' : 'incomplete';
  }

  hasErrorsInvoiceType(): boolean {
    return !this.invoice.invoiceNumber || this.invoice.invoiceNumber.length < 5 || !this.invoice.rateType;
  }

  hasErrorsDates(): boolean {
    return !this.invoice.invoiceDate || !this.invoice.creationDate;
  }

  loadPersons(): void {
    this.httpService.loadDropdownData('person/personsdropdown', callback => {
      if (callback !== null) {
        this.personInvoiceRecipient = callback;
        this.personInvoiceSupplier = callback;
      }
    });
  }

  createInvoiceCreator(): void {
    this.openPersonForm('creator');
  }

  createInvoiceRecipient(): void {
    this.openPersonForm('recipient');
  }

  invoiceItemsChanges(items: InvoiceItemModel[]): void {
    this.workflowInvoiceItems = items.map(item => ({...item}));
    this.invoice.invoiceItems = this.workflowInvoiceItems;
  }

  personLabel(personId: string): string {
    return this.personInvoiceSupplier.find(person => String(person.value) === String(personId))?.label
      ?? this.translocoService.translate('workflow.invoice.review.not_selected');
  }

  rateLabel(rateType: string): string {
    return this.invoiceRate.find(rate => rate.value === rateType)?.label
      ?? this.translocoService.translate('workflow.invoice.review.not_selected');
  }

  itemLabel(item: InvoiceItemModel): string {
    return this.catalogInvoiceItems.find(catalogItem => Number(catalogItem.value) === Number(item.catalogItemId))?.label
      ?? item.description
      ?? String(item.catalogItemId ?? this.translocoService.translate('workflow.invoice.review.not_selected'));
  }

  totalNettoSum(items: InvoiceItemModel[]): number {
    return Number(items.reduce((sum, item) => sum + Number(item.sumNetto ?? 0), 0).toFixed(2));
  }

  totalBruttoSum(items: InvoiceItemModel[]): number {
    return Number(items.reduce((sum, item) => sum + Number(item.sumBrutto ?? 0), 0).toFixed(2));
  }

  saveInvoice(): void {
    if (this.haveErrors(this.workflowInvoiceItems) || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.persistInvoice();
    this.invoice.totalSumNetto = this.invoiceItemsTableCalculatorService.totalNettoSum();
    this.invoice.totalSumBrutto = this.invoiceItemsTableCalculatorService.totalBruttoSum();

    this.httpService.putObjectToServer('PUT', this.invoice, 'Invoice', 'invoice', callback => {
      this.isSaving = false;
      if (callback) {
        this.messagePrinter.printSuccessMessage('Invoice');
        this.resetModel();
      }
    });
  }

  private openPersonForm(personType: 'creator' | 'recipient'): void {
    this.persistInvoice();
    this.router.navigate(['/create-person-page'], {queryParams: {createPerson: personType}});
  }

  private persistInvoice(): void {
    this.invoice.invoiceItems = this.workflowInvoiceItems.map(item => ({...item}));
    this.store.dispatch(InvoiceActions.updateInvoice({data: {...this.invoice}}));
  }

  private loadCatalogItems(): void {
    this.invoiceItemsTableService.downloadCatalogItemsDropdownList(callback => {
      if (callback) {
        this.catalogInvoiceItems = callback;
      }
    });
  }

  private firstIncompleteStepBefore(stepIndex: number): number {
    if (stepIndex <= this.currentStepIndex) {
      return -1;
    }

    for (let index = 0; index < stepIndex; index++) {
      if (!this.isStepComplete(index)) {
        return index;
      }
    }

    return -1;
  }

  private markCurrentStepTouched(): void {
    setTimeout(() => this.workflowFrm().form.markAllAsTouched());
  }

  private resetModel(): void {
    this.currentStepIndex = 0;
    this.invoice = new InvoiceFormModel();
    this.workflowInvoiceItems = [];
    this.invoiceItemsTableCalculatorService.invoiceItems.set([]);
    this.store.dispatch(InvoiceActions.resetInvoice());
  }

  private prepareInvoiceFlow(): void {
    const statuses = [
      WorkflowStatuses.SET_INVOICE_TYPE,
      WorkflowStatuses.SET_INVOICE_DATE,
      WorkflowStatuses.SET_INVOICE_CREATOR,
      WorkflowStatuses.SET_INVOICE_RECIPIENT,
      WorkflowStatuses.SET_INVOICE_ITEMS,
      WorkflowStatuses.SAVE_INVOICE
    ];
    const keys = [
      'set_invoice_type_number',
      'set_invoice_date',
      'set_invoice_creator',
      'set_invoice_recipient',
      'set_invoice_items',
      'save_invoice'
    ];

    this.createInvoiceFlowEvents = keys.map((key, level) => new WorkflowEventsModel({
      statusDesc: this.translocoService.translate(`workflow.invoice.steps.${key}`),
      status: statuses[level],
      level
    }));
  }

  haveErrors(items: InvoiceItemModel[]): boolean {
    return this.hasErrorsInvoiceType()
      || this.hasErrorsDates()
      || !this.invoice.personSupplierId
      || !this.invoice.personRecipientId
      || this.haveInvoiceItemsError(items);
  }

  haveInvoiceItemsError(items: InvoiceItemModel[]): boolean {
    return !items?.length || items.some(item => item.amountItems === undefined || item.amountItems <= 0);
  }
}
