import {Component, Input, NgModule, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {SharedModule} from "primeng/api";
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
import {CommonServicesAppHttpService, MessagesPrinter} from "../../common-services/common-services.app.http.service";
import {ConfirmationDialogComponent} from "../../common-components/confirmation-dialog/confirmation-dialog.component";
import {MessageModule} from "primeng/message";
import {MessagesModule} from "primeng/messages";
import {isAuthenticated} from "../../common-services/common-services-util.service";

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
    ButtonModule, RippleModule, EditInvoiceDialogComponent, CalendarModule, ConfirmationDialogComponent,
    MessageModule, MessagesModule],
  templateUrl: './invoice-management.component.html',
  styleUrls: ['./invoice-management.component.css'],
  providers: [CommonServicesPipesDate, AppSecurityService, MessagesPrinter]
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

  /**Reference to child component delete person confirmation dialog. */
  @ViewChild('confirmDeleteInvoiceDialog') confirmDeleteInvoiceDialog: ConfirmationDialogComponent
  keySelection: boolean = true;
  selectedInvoice!: InvoiceFormModel;
  private _isInvoiceDialogVisible: boolean;
  invoiceChangesList: InvoiceFormModel[] = []

  constructor(public securityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<any>, private messagePrinter: MessagesPrinter ) {
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
      this.confirmDeleteInvoiceDialog.transferObject = id
      this.showDeleteConfirmDialog = true
  }

  rowDoubleClick($event: MouseEvent, invoice: InvoiceFormModel) {
    setTimeout(() => {
      this.invoiceDialog.setInvoice(invoice)
      this.invoiceDialog.visible = true
      this.isInvoiceDialogVisible = true
    })
  }

  protected readonly Date = Date;
  deleteConfirmDialogMessage: any = 'Are you really want to permanently delete invoice?'
  showDeleteConfirmDialog: boolean = false
  showSaveConfirmDialog: boolean = false
  saveConfirmDialogMessage: string = 'Are you really want to permanently save changes in invoices'

  convertToDate(date: any) {
    return new Date(date)
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

  saveChangedInvoices($event: MouseEvent) {
    const changes = this.invoicesModel.filter(i =>
      i.id ===this.invoiceChangesList?.filter(c =>c?.id == i?.id)?.at(0)?.id)
    const changesList: InvoiceFormModel[] = []

    changes.forEach(i =>{
      changesList.push(Object.assign(new InvoiceFormModel(), i))
    })
    this.httpService.putObjectToServer('POST', changesList, "invoice changes", 'invoice', callback =>{
      if(callback){
        this.invoiceChangesList = []
      }
    })
  }

  /**
   * Indicates whether are changes in invoices
   */
  haveNoChanges() {
    return this.invoiceChangesList == undefined || this.invoiceChangesList.length < 1;
  }

  handleCancelDeleteInvoice($event: boolean) {
    this.showDeleteConfirmDialog = false
  }

  handleConfirmationDeleteInvoice(id: any) {
    this.httpService.putObjectToServer('DELETE',
      null, "invoice delete", 'invoice/'+id, callback =>{
        if(callback){
          console.log("DELETED :"+id)
          //this.messagePrinter.printSuccessMessage("The invoice successfully deleted.")
          this.showDeleteConfirmDialog = false
          this.ngOnInit()
        }
      })
  }

  handleConfirmationSaveInvoice(transferObject: any) {
    this.saveChangedInvoices(null)
    this.showSaveConfirmDialog = false
  }

  handleCancelSaveInvoice($event: boolean) {
    this.showSaveConfirmDialog = false
  }

  protected readonly isAuthenticated = isAuthenticated;
}
