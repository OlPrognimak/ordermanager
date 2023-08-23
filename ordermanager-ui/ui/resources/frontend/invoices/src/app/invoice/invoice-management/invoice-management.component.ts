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
import {ButtonModule} from "primeng/button";
import {RippleModule} from "primeng/ripple";
import {EditInvoiceDialogComponent} from "../edit-invoice-dialog/edit-invoice-dialog.component";
import {CalendarModule} from "primeng/calendar";

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
    InvoiceManagementModule, ValidatableCalendarModule, DateperiodFinderComponent, InvoicePipesModule,
    ButtonModule, RippleModule, EditInvoiceDialogComponent, CalendarModule],
  templateUrl: './invoice-management.component.html',
  styleUrls: ['./invoice-management.component.css'],
  providers: [CommonServicesPipesDate, AppSecurityService, MessageService]
})
export class InvoiceManagementComponent  implements OnInit {
  get isInvoiceDialogVisible(): boolean {
    return this._isInvoiceDialogVisible;
  }

  set isInvoiceDialogVisible(value: boolean) {
    this._isInvoiceDialogVisible = value;
  }

  @Input() invoicesModel: InvoiceFormModel[]
  @ViewChild('invoiceDialog') invoiceDialog: EditInvoiceDialogComponent
  @ViewChild('dataFinder', {static: false}) dataFinder: DateperiodFinderComponent
  keySelection: boolean = true;
  selectedInvoice!: InvoiceFormModel;
  private _isInvoiceDialogVisible: boolean;
  invoiceChangesList: InvoiceFormModel[] = []

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
    let obj = this.invoiceChangesList?.filter(v =>invoice.id === v.id)
    if( obj!==undefined && obj.length >0){
      return 'blue'
    } else {
      return '#495057'
    }
  }

  deleteInvoice(id) {

  }

  rowDoubleClick($event: MouseEvent, invoice: InvoiceFormModel) {
    //console.log("######## ID :"+invoice.id)
    setTimeout(() => {
      this.invoiceDialog.setInvoice(invoice)
      this.invoiceDialog.visible = true
      this.isInvoiceDialogVisible = true
    })
  }

  protected readonly Date = Date;

  convertToDate(date: any) {
    return new Date(date)
  }

  setCalendarValue($event: any) {

  }

  invoiceItemChanged(invoice: InvoiceFormModel) {
    const modelPerson = this.invoicesModel.filter(p =>p.id === invoice.id )?.at(0)
    const changedInvoice =
      this.invoiceChangesList.filter(i => i.id === invoice.id)?.at(0)
    //here I put original person to list of changes to keep original value
    if(changedInvoice === undefined) {
      this.invoiceChangesList.push(modelPerson)
    }

    this.invoicesModel.filter((i, idx) =>{
        if(i.id === invoice.id) {
          this.invoicesModel[idx] =  invoice
          return
        }
    })
  }
}
