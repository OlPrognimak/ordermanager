import { InvoiceItemModel } from "../../domain/domain.invoiceformmodel";

export class InvoiceFormValidator {
  hasInvoiceNumberError: boolean = true;
  hasInvoiceCreatesError: boolean = true;
  hasCreatorError: boolean = true;
  hasRecipientError: boolean = true;
  hasCreationDateError: boolean = true;
  hasInvoiceDateError: boolean = true;

  resetErrors() {
    this.hasInvoiceNumberError = true;
    this.hasInvoiceCreatesError = true;
    this.hasCreatorError = true;
    this.hasRecipientError = true;
    this.hasCreationDateError = true;
    this.hasInvoiceDateError = true;
  }


  setHasInvoiceNumberError(val: boolean) {
    setTimeout(() => {
      if (this.hasInvoiceNumberError !== val) {
        this.hasInvoiceNumberError = val
      }
    })
  }

  setHasInvoiceratesError(event: boolean) {
    setTimeout(() => {
      this.hasInvoiceCreatesError = event
    })
  }

  setHasCreatorError(event: boolean) {
    setTimeout(() => {
      this.hasCreatorError = event
    })
  }

  setHasRecipientError(event: boolean) {
    setTimeout(() => {
      this.hasRecipientError = event
    })
  }

  haveErrors(items: InvoiceItemModel[]): boolean {
    return (this.hasInvoiceNumberError ||
      this.hasCreatorError ||
      this.hasRecipientError ||
      this.hasInvoiceCreatesError ||
      this.hasCreationDateError ||
      this.hasInvoiceDateError) || this.haveInvoiceItemsError(items)
  }

  haveInvoiceItemsError(items: InvoiceItemModel[]) {
    return items.length === 0 || items.length === undefined ||
      items.filter(i => (i.amountItems <= 0 || i.amountItems === undefined)).length > 0
  }

  setHasCreationDateError(event: boolean) {
    setTimeout(() => {
      this.hasCreationDateError = event
    })
  }

  setHasInvoiceDateError(event: boolean) {
    setTimeout(() => {
      this.hasInvoiceDateError = event
    })
  }


}
