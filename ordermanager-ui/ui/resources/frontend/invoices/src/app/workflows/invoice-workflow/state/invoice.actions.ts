import { createAction, props } from "@ngrx/store";
import {
  InvoiceFormModelInterface,
  InvoiceItemModel,
  InvoiceItemModelInterface
} from "../../../domain/domain.invoiceformmodel";
import { WorkflowStatuses } from "./invoice.state";

const loadInvoiceAction = createAction('LOAD_INVOICE')
const loadInvoiceSuccessAction =
  createAction('LOAD_INVOICE_SUCCESS', props<{ data: InvoiceFormModelInterface }>())
const setInvoiceType =
  createAction('SET_INVOICE_TYPE', props<{ data: InvoiceFormModelInterface }>())
const setInvoiceDateAction =
  createAction(WorkflowStatuses.SET_INVOICE_DATE, props<{ data: InvoiceFormModelInterface }>())
const setInvoiceCreatorAction =
  createAction(WorkflowStatuses.SET_INVOICE_CREATOR, props<{ data: InvoiceFormModelInterface }>())
const setInvoiceRecipientAction =
  createAction(WorkflowStatuses.SET_INVOICE_RECIPIENT, props<{ data: InvoiceFormModelInterface }>())
const setInvoiceItemsAction =
  createAction(WorkflowStatuses.SET_INVOICE_ITEMS, props<{ data: InvoiceFormModelInterface }>())
const saveInvoiceItemAction =
  createAction(WorkflowStatuses.SAVE_INVOICE_ITEM, props<{data: InvoiceItemModel[]}>())
const saveInvoiceAction = createAction(WorkflowStatuses.SAVE_INVOICE)
const actionFailure =
  createAction('INVOICE_FAILURE', props<{ error: string }>())


export class InvoiceActions {
  static loadInvoiceAction = loadInvoiceAction;
  static loadInvoiceSuccessAction = loadInvoiceSuccessAction
  static actionFailure = actionFailure
  static setInvoiceType = setInvoiceType
  static setInvoiceDateAction = setInvoiceDateAction
  static setInvoiceCreatorAction = setInvoiceCreatorAction
  static setInvoiceRecipientAction = setInvoiceRecipientAction
  static setInvoiceItemsAction = setInvoiceItemsAction
  static saveInvoiceAction = saveInvoiceAction
  static saveInvoiceItemAction = saveInvoiceItemAction
}



