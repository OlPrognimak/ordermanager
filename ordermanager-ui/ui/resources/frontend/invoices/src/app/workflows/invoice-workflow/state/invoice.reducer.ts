import { InvoiceFormModel, InvoiceFormModelInterface } from "../../../domain/domain.invoiceformmodel";
import { Action, createReducer, on } from "@ngrx/store";
import { InvoiceActions } from "./invoice.actions";

export interface InvoiceState {
  data: InvoiceFormModelInterface | null
  status: "loading" | "loaded" | "success" | "error"
  errors: any | null
  error: any | null
}

export const initialInvoiceStale: InvoiceState = {
  data: new InvoiceFormModel(),
  status: 'loading',
  errors: null,
  error: null
}

export const invoiceReducer = createReducer(
  initialInvoiceStale,
  on(InvoiceActions.loadInvoiceAction || InvoiceActions.saveInvoiceAction, (state) => {
    return {
      ...state,
      data: state.data,
      errors: null,
      error: null
    };
  }),
  on(InvoiceActions.loadInvoiceSuccessAction, (state, {data}) => {
    return {
      ...state,
      data: data,
      error: null,
    };
  }),
  on(InvoiceActions.setInvoiceType,
    (state, {data}) => {
      return {
        ...state,
        data: data,
        error: null,
      };
    }),
  on(
    InvoiceActions.setInvoiceDateAction,
    (state, {data}) => {
      return {
        ...state,
        data: data,
        error: null,
      };
    }),
  on(InvoiceActions.setInvoiceRecipientAction,
    (state, {data}) => {
      return {
        ...state,
        data: data,
        error: null,
      };
    }),
  on(InvoiceActions.setInvoiceCreatorAction,
    (state, {data}) => {
      return {
        ...state,
        data: data,
        error: null,
      };
    }),
  on(InvoiceActions.setInvoiceItemsAction,
    (state, {data}) => {
      return {
        ...state,
        data: data,
        error: null,
      };
    }),
  on(InvoiceActions.actionFailure, (state, {error}) => {
    return {
      ...state,
      error: error,
    };
  })
)


export function reducer(state: InvoiceState | undefined, action: Action) {
  return invoiceReducer(state, action);
}
