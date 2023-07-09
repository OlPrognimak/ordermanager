import {Component, NgModule, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {SharedModule} from "primeng/api";
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {InvoiceManagementService} from "./invoice-management.service";
import {CommonServicesPipesDate} from "../common-services/common-services.pipes.date";

@NgModule(
  {
    declarations: [CommonServicesPipesDate],
    exports: [CommonServicesPipesDate]
  }
)
export class InvoiceManagementModule{}

@Component({
  selector: 'app-invoice-management',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, SharedModule, TableModule, ToastModule, InvoiceManagementModule],
  templateUrl: './invoice-management.component.html',
  styleUrls: ['./invoice-management.component.css'],
  providers: [InvoiceManagementService,CommonServicesPipesDate]
})
export class InvoiceManagementComponent  implements OnInit{


  constructor(public invoiceManagementService: InvoiceManagementService) {
  }

  ngOnInit(): void {
    this.invoiceManagementService.loadInvoices(this.invoiceManagementService, 'Load Invoices')
  }

}
