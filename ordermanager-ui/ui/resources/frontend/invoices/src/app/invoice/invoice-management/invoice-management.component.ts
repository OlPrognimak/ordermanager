import {Component, Input, NgModule, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MessageService, SharedModule} from "primeng/api";
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {CommonServicesPipesDate} from "../../common-services/common-services.pipes.date";
import {AppSecurityService} from "../../user/user-login/app-security.service";
import {ValidatableCalendarModule} from "../../common-components/validatable-calendar/validatable-calendar.component";
import {FormsModule} from "@angular/forms";
import {DateperiodFinderComponent} from "../../common-components/dateperiod-finder/dateperiod-finder.component";
import {InvoiceFormModel} from "../../domain/domain.invoiceformmodel";
import {of} from "rxjs";
import {InvoicePipesModule} from "../../common-services/common-services.pipes.number";

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
    InvoiceManagementModule, ValidatableCalendarModule, DateperiodFinderComponent, InvoicePipesModule],
  templateUrl: './invoice-management.component.html',
  styleUrls: ['./invoice-management.component.css'],
  providers: [CommonServicesPipesDate, AppSecurityService, MessageService]
})
export class InvoiceManagementComponent  implements OnInit {

  @Input() invoicesModel: InvoiceFormModel[]
  @ViewChild('dataFinder', {static: false}) dataFinder: DateperiodFinderComponent
  private invoicesChanges: InvoiceFormModel[]
  keySelection: boolean = true;
  selectedInvoice!: InvoiceFormModel;

  constructor(public securityService: AppSecurityService) {
  }

  ngOnInit(): void {
    setTimeout(() =>{
      of(this.dataFinder).subscribe(f =>f.loadData())
    })
  }

  set invoices(value){
    this.invoicesModel = value
  }

  get invoices() {
    return this.invoicesModel
  }


  finderIsReady(value: boolean) {
    //TODO maybe will be need
  }

  isInvoiceChanged(invoice: InvoiceFormModel) {
    let obj = this.invoicesChanges?.filter(v =>invoice.id === v.id)
    if( obj!==undefined && obj.length >0){
      return 'blue'
    } else {
      return '#495057'
    }
  }
}
