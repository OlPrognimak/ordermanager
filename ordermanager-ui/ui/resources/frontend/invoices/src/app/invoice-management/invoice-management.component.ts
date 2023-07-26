import {AfterViewInit, Component, Input, NgModule, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MessageService, SharedModule} from "primeng/api";
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {CommonServicesPipesDate} from "../common-services/common-services.pipes.date";
import {AppSecurityService} from "../user-login/app-security.service";
import {ValidatableCalendarModule} from "../validatable-calendar/validatable-calendar.component";
import {FormsModule} from "@angular/forms";
import {DateperiodFinderComponent} from "../common-components/dateperiod-finder/dateperiod-finder.component";
import {InvoiceFormModel} from "../domain/domain.invoiceformmodel";

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
  imports: [CommonModule, MatProgressSpinnerModule, SharedModule, FormsModule, TableModule, ToastModule,
    InvoiceManagementModule, ValidatableCalendarModule, DateperiodFinderComponent],
  templateUrl: './invoice-management.component.html',
  styleUrls: ['./invoice-management.component.css'],
  providers: [CommonServicesPipesDate, AppSecurityService, MessageService]
})
export class InvoiceManagementComponent  implements OnInit, AfterViewInit{

  @Input() invoicesModel: InvoiceFormModel[]
  @ViewChild('dataFinder', {static: true}) dataFinder: DateperiodFinderComponent
  constructor(public securityService: AppSecurityService) {
  }

  ngOnInit(): void {
  }

  set invoices(value){
    this.invoicesModel = value
  }

  get invoices() {
    return this.invoicesModel
  }

  ngAfterViewInit(): void {
    if( this.dataFinder !== undefined) {
      this.dataFinder.loadData(null)
    }
  }

}
