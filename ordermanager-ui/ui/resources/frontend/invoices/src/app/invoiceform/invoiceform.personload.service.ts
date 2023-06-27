import {Directive, Injectable} from '@angular/core';
import {DropdownDataType} from "../domain/domain.invoiceformmodel";


@Directive({
  selector: '[personLoadService]'
})

@Injectable()
export class PersonLoadServiceDirective {
  /** Model invoice supplier for dropdown component */
  personInvoiceSupplier: DropdownDataType[];
  /** Model invoice recipient for dropdown component */
  personInvoiceRecipient: DropdownDataType[];
}
