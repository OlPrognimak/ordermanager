import {Component, OnInit} from '@angular/core';
import {PrInvoiceFormDirective} from './invoiceform.service';
import {
  InvoiceFormModel,
  InvoiceFormModelInterface, InvoiceItemModel,
  InvoiceItemModelInterface
} from '../domain/domain.invoiceformmodel';



@Component({
  selector:    'app-root',
  templateUrl: './invoiceform.component.html',
  providers:  [ PrInvoiceFormDirective ]
})

export class InvoiceFormComponent implements OnInit{

  invoiceFormData: InvoiceFormModelInterface;
  invoiceItem: InvoiceItemModelInterface;
  constructor( private dataGridService: PrInvoiceFormDirective) {
     this.invoiceFormData = new InvoiceFormModel();
     this.invoiceItem = new InvoiceItemModel();
     this.invoiceFormData.invoiceItems.push(this.invoiceItem) ;
   }

  ngOnInit(): void {
    // document.onload = function() {
    //    alert('Document is Loaded');
    // };
  }




}
