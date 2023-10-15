import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SplitterModule} from "primeng/splitter";
import {TimelineModule} from "primeng/timeline";
import {WorkflowEventsModel} from "./model/workflow.events.model";
import {WorkflowStatuses} from "./state/invoice.state";
import {Store} from "@ngrx/store";
import {InvoiceActions} from "./state/invoice.actions";
import {
  DropdownDataType,
  InvoiceFormModel,
  InvoiceFormModelInterface,
  InvoiceItemModel
} from "../../domain/domain.invoiceformmodel";
import {invoiceRate, isAuthenticated} from "../../common-services/common-services-util.service";
import {FormsModule} from "@angular/forms";
import {InputTextModule} from "primeng/inputtext";
import {
  ValidatableDropdownlistModule
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import {
  ValidatableInputTextModule
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {ButtonModule} from "primeng/button";
import {ValidatableCalendarModule} from "../../common-components/validatable-calendar/validatable-calendar.component";
import {CommonServicesAppHttpService} from "../../common-services/common-services.app.http.service";
import {InvoiceFormModule} from "../../invoice/invoiceform/invoiceform.component";
import {Subject} from "rxjs";
import {InvoiceItemsTableComponent} from "../../invoice/invoice-items-table/invoice-items-table.component";
import {InvoiceFormValidator} from "../../invoice/invoiceform/invoice.form.validator";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-invoice-workflow',
  standalone: true,
  imports: [CommonModule, SplitterModule, TimelineModule, FormsModule, InputTextModule, ValidatableDropdownlistModule, ValidatableInputTextModule, ButtonModule, ValidatableCalendarModule, InvoiceFormModule],
  templateUrl: './invoice-workflow.component.html',
  styleUrls: ['./invoice-workflow.component.css']
})
export class InvoiceWorkflowComponent extends InvoiceFormValidator implements OnInit{
  createInvoiceFlowEvents: any[];
  invoice: InvoiceFormModelInterface
  /** Model invoice supplier for dropdown component */
  @Input() personInvoiceSupplier: DropdownDataType[];
  /** Model invoice recipient for dropdown component */
  @Input() personInvoiceRecipient: DropdownDataType[];
  eventsModelIsReset: Subject<void> = new Subject<void>();
  @ViewChild("itemsTableRef") itemsTableComponent: InvoiceItemsTableComponent;
  currentStatus: WorkflowEventsModel
  protected readonly invoiceRate = invoiceRate;
  protected readonly isAuthenticated = isAuthenticated;

  constructor(private store: Store<any>,
              private httpService: CommonServicesAppHttpService<InvoiceFormModelInterface>,
              private router:Router,
              private route: ActivatedRoute){
    super()
  }

  ngOnInit(): void {
    this.loadPersons()

    this.createInvoiceFlowEvents = [
      new WorkflowEventsModel({statusDesc: 'Set Invoice Type/Number', status: WorkflowStatuses.SET_INVOICE_TYPE,level: 0}),
      new WorkflowEventsModel({statusDesc: 'Set Invoice date', status: WorkflowStatuses.SET_INVOICE_DATE, level: 1}),
      new WorkflowEventsModel({statusDesc: 'Set invoice Creator', status: WorkflowStatuses.SET_INVOICE_CREATOR, level: 2}),
      new WorkflowEventsModel({statusDesc: 'Set invoice Recipient', status: WorkflowStatuses.SET_INVOICE_RECIPIENT, level: 3}),
      new WorkflowEventsModel({statusDesc: 'Set invoice Items', status: WorkflowStatuses.SET_INVOICE_ITEMS, level: 4}),
      new WorkflowEventsModel({statusDesc: 'Save invoice', status: WorkflowStatuses.SAVE_INVOICE, level: 5}),
    ];

    this.route.queryParams.subscribe(params => {
      const createPersonType = params['createPerson'];
      if(createPersonType === 'creator') {
        this.currentStatus = this.createInvoiceFlowEvents[2]
      } else if(createPersonType === 'recipient'){
        this.currentStatus = this.createInvoiceFlowEvents[3]
      } else {
        this.currentStatus = this.createInvoiceFlowEvents[0]
      }

    });

   // this.currentStatus = this.createInvoiceFlowEvents[0]
    this.store.dispatch({type: InvoiceActions.loadInvoiceAction.type})
    this.store.subscribe(state =>{
      this.invoice = Object.assign(new InvoiceFormModel(),state?.invoiceWorkflow.data)
      this.invoice.invoiceItems = Object.assign([] , state.invoiceWorkflow.data.invoiceItems)
    })

  }

  /**
   * Set current selected workflow step
   *
   * @param selectedModel the selected model on workflow step
   */
  setWorkflowStep(selectedModel: WorkflowEventsModel) {
   this.savePreviousStatus(new WorkflowEventsModel(this.currentStatus),
      Object.assign(new InvoiceFormModel(), this.invoice))

      this.currentStatus = selectedModel
      this.store.dispatch({type: InvoiceActions.loadInvoiceAction.type})
      this.store.subscribe(s => {
        this.invoice = Object.assign(new InvoiceFormModel(), s.invoiceWorkflow.data)
        this.invoice.invoiceItems = Object.assign([], s.invoiceWorkflow.data.invoiceItems)
      })
  }

  /**
   * Saves previous status after changing a flow step
   *
   * @param prevWorkflowModel previous selected workflow model before changing to a new workflow step
   * @param invoiceFormModel the currecnt invoice model
   */
  savePreviousStatus(prevWorkflowModel: WorkflowEventsModel, invoiceFormModel: InvoiceFormModelInterface ) {
    this.store.dispatch({type: prevWorkflowModel.status, data: invoiceFormModel})
    this.store.subscribe(s =>{
      this.invoice =  Object.assign(new InvoiceFormModel(), s.invoiceWorkflow.data)
      this.invoice.invoiceItems = Object.assign([], s.invoiceWorkflow.data.invoiceItems)
   })
  }


  /**
   * Loads persons from server
   */
  loadPersons() {
    this.httpService.loadDropdownData('person/personsdropdown', callback => {
      if(callback !== null) {
        this.personInvoiceRecipient = callback;
        this.personInvoiceSupplier = callback;
      }
    })
  }

  /**
   * Saves person to the database on server
   * @param event the item for saving
   */
  saveInvoice(event: any): void {
    this.httpService.putObjectToServer('PUT', this.invoice, 'Invoice',
      'invoice', (callback) => {
        if (callback){
          this.resetModel();
        }
      });
  }

  /**
   * Resets ngrx store and data model
   *
   * @private
   */
  private resetModel() {
    this.currentStatus = this.createInvoiceFlowEvents[0]
    this.store.dispatch({type: InvoiceActions.loadInvoiceAction.type} )
    this.store.subscribe(state =>{
      this.invoice = Object.assign(new InvoiceFormModel(),new InvoiceItemModel())
      this.invoice.invoiceItems = Object.assign([] , [])
    })

  }

  /**
   * Make available for editing of components in view for currently selected workflow step and disable the rest of steps.
   *
   * @param level the level of selected workflow step
   */
  editStyle(level: number): any {
    if (this.currentStatus.level === level){
      return {}
    } else {
      return {'pointer-events':'none', opacity: '50%'}
    }
  }

  hasErrorsInvoiceType() {
    return this.hasInvoiceNumberError || this.hasInvoiceCreatesError
  }

  hasErrorsDates() {
    return this.hasInvoiceDateError || this.hasCreationDateError
  }

  hasErrorsPersons() {
    return this.hasCreatorError || this.hasRecipientError
  }


  /**
   * Define the style of workflow buttons.
   * - In case if button is selected than the color of this button will be blue
   *
   * @param flowEvent the flow event object from currently processed workflow step
   */
  flowButtonStyle(flowEvent: WorkflowEventsModel): any {
    let style = {}

    if(flowEvent.level === this.currentStatus.level) {
      style = {'background-color': '#2196F3', color: this.getColor(flowEvent)}
    } else {
      style = {color: this.getColor(flowEvent)}
    }
    return style;
  }

  /**
   * Defines the font color.
   *
   *   - in case if the components in step will contain errors than the font color will be red
   *   - in case if the components in step will not have errors than the font color will be white
   *
   * @param flowEvent the flow event object from currently processed workflow step
   */
  getColor(flowEvent: WorkflowEventsModel) : string {
     let fontColor: string = 'white'
     switch (flowEvent.status ){
       case WorkflowStatuses.SET_INVOICE_TYPE: {
         if(this.hasErrorsInvoiceType() === true) {
           fontColor = 'red'
         }
         return fontColor
       }
       case WorkflowStatuses.SET_INVOICE_DATE: {
         if(this.hasErrorsDates() === true || this.hasErrorsDates()===undefined) {
           fontColor = 'red'
         }
         return fontColor
       }
       case WorkflowStatuses.SET_INVOICE_CREATOR: {
         if(this.hasCreatorError === true) {
           fontColor = 'red'
         }
         return fontColor
       }
       case WorkflowStatuses.SET_INVOICE_RECIPIENT: {
         if(this.hasRecipientError === true) {
           fontColor = 'red'
         }

         return fontColor
       }
       case WorkflowStatuses.SET_INVOICE_ITEMS: {
         if(this.haveInvoiceItemsError(this.invoice?.invoiceItems) === true) {
           fontColor = 'red'
         }
         return fontColor
       }

     }
  }


  saveAndNext(currentStatus: WorkflowEventsModel) {
    this.setWorkflowStep(this.createInvoiceFlowEvents[currentStatus.level+1])
  }

  movePreviousStep(currentStatus: WorkflowEventsModel) {
    this.setWorkflowStep(this.createInvoiceFlowEvents[currentStatus.level-1])
  }

  createInvoiceCreator() {
    this.router.navigate(["/create-person_page"],{queryParams: {createPerson: 'creator'}})
  }

  createInvoiceRecipient() {
    this.router.navigate(["/create-person_page"],{queryParams: {createPerson: 'recipient'}})
  }


  onSupplierChanged(event: any) {
    console.log("set value:"+event)
    if(event !== null) {
      this.invoice.personSupplierId = event
    }
  }

}
