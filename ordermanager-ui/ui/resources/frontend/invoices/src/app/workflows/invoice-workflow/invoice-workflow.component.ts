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

  constructor(private store: Store<any>, private httpService: CommonServicesAppHttpService<InvoiceFormModelInterface>){
    super()
  }

  ngOnInit(): void {
    this.createInvoiceFlowEvents = [
      new WorkflowEventsModel({statusDesc: 'Set Invoice Type/Number', status: WorkflowStatuses.SET_INVOICE_TYPE,level: 0}),
      new WorkflowEventsModel({statusDesc: 'Set Invoice date', status: WorkflowStatuses.SET_INVOICE_DATE, level: 1}),
      new WorkflowEventsModel({statusDesc: 'Set invoice Creator', status: WorkflowStatuses.SET_INVOICE_CREATOR, level: 2}),
      new WorkflowEventsModel({statusDesc: 'Set invoice Recipient', status: WorkflowStatuses.SET_INVOICE_RECIPIENT, level: 3}),
      new WorkflowEventsModel({statusDesc: 'Set invoice Items', status: WorkflowStatuses.SET_INVOICE_ITEMS, level: 4}),
      new WorkflowEventsModel({statusDesc: 'Save invoice', status: WorkflowStatuses.SAVE_INVOICE, level: 5}),
    ];
    this.currentStatus = this.createInvoiceFlowEvents[0]
    console.log('CUR STATUS =:' +this.currentStatus.status)
    this.store.dispatch({type: InvoiceActions.loadInvoiceAction.type})
    this.store.subscribe(state =>{
      this.invoice = Object.assign(new InvoiceFormModel(),state?.invoiceWorkflow.data)
      this.invoice.invoiceItems = Object.assign([] , state.invoiceWorkflow.data.invoiceItems)
      //console.log(" LOAD STATE = :"+ JSON.stringify(this.invoice))
    })

  }

  setWorkflowStep(status: WorkflowEventsModel) {
   this.saveOldStatus(new WorkflowEventsModel(this.currentStatus),
      Object.assign(new InvoiceFormModel(), this.invoice))

    if(status.level === 2 || status.level === 3) {
      this.loadPersons()
    }
    this.currentStatus = status
    this.store.dispatch({type: InvoiceActions.loadInvoiceAction.type})
    this.store.subscribe(s =>{
      this.invoice = Object.assign(new InvoiceFormModel(), s.invoiceWorkflow.data)
      this.invoice.invoiceItems = Object.assign([] , s.invoiceWorkflow.data.invoiceItems)
    })
  }

  saveOldStatus(stat: WorkflowEventsModel, model: InvoiceFormModelInterface ) {
    this.store.dispatch({type: stat.status, data: model})
    this.store.subscribe(s =>{
      this.invoice =  Object.assign(new InvoiceFormModel(), s.invoiceWorkflow.data)
      this.invoice.invoiceItems = Object.assign([], s.invoiceWorkflow.data.invoiceItems)
   })
  }


  loadPersons() {
    this.httpService.loadDropdownData('person/personsdropdown', callback => {
      if(callback !=null) {
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


  private resetModel() {
    this.currentStatus = this.createInvoiceFlowEvents[0]
    this.store.dispatch({type: InvoiceActions.loadInvoiceAction.type} )
    this.store.subscribe(state =>{
      this.invoice = Object.assign(new InvoiceFormModel(),new InvoiceItemModel())
      this.invoice.invoiceItems = Object.assign([] , [])
    })

  }
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



  flowButtonStyle(flowEvent: WorkflowEventsModel): any {
    let style = {}

    if(flowEvent.level === this.currentStatus.level) {
      style = {'background-color': '#2196F3', color: this.getColor(flowEvent)}
    } else {
      style = {color: this.getColor(flowEvent)}
    }
    return style;
  }

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


}
