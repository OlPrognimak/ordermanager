import { Component, NgModule, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { SharedModule } from "primeng/api";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { CommonServicesPipesDate } from "../../common-pipes/common-services.pipes.date";
import { AppSecurityService } from "../../common-auth/app-security.service";
import { ValidatableCalendarModule } from "../../common-components/validatable-calendar/validatable-calendar.component";
import { FormsModule } from "@angular/forms";
import { DateperiodFinderComponent } from "../../common-components/dateperiod-finder/dateperiod-finder.component";
import { InvoiceFormModel } from "../../domain/domain.invoiceformmodel";
import { of } from "rxjs";
import { InvoicePipesModule } from "../../common-pipes/common-services.pipes.number";
import { ButtonModule } from "primeng/button";
import { RippleModule } from "primeng/ripple";
import { EditInvoiceDialogComponent } from "../edit-invoice-dialog/edit-invoice-dialog.component";
import { CalendarModule } from "primeng/calendar";
import { CommonServicesAppHttpService, MessagesPrinter } from "../../common-services/common-services.app.http.service";
import { ConfirmationDialogComponent } from "../../common-components/confirmation-dialog/confirmation-dialog.component";
import { MessageModule } from "primeng/message";
import { MessagesModule } from "primeng/messages";
import {isAuthenticated, printToJson} from "../../common-services/common-services-util.service";
import { CommonServicesEditService } from "../../common-services/common-services.edit.service";
import { environment } from "../../../environments/environment";
import { CommonServiceEventListener } from "../../common-services/common-service.event.bus";

@NgModule(
  {
    declarations: [CommonServicesPipesDate],
    exports: [CommonServicesPipesDate]
  }
)
export class InvoiceManagementModule {
}

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
export class InvoiceManagementComponent extends CommonServicesEditService<InvoiceFormModel> implements OnInit {
  @ViewChild('invoiceDialog') invoiceDialog: EditInvoiceDialogComponent
  @ViewChild('dataFinder', {static: false}) dataFinder: DateperiodFinderComponent
  /**Reference to child component delete person confirmation dialog. */
  @ViewChild('confirmDeleteInvoiceDialog') confirmDeleteInvoiceDialog: ConfirmationDialogComponent
  keySelection: boolean = true;
  selectedInvoice!: InvoiceFormModel;
  deleteConfirmDialogMessage: any = 'Are you really want to permanently delete invoice?'
  showDeleteConfirmDialog: boolean = false
  showSaveConfirmDialog: boolean = false

  //invoiceChangesList: InvoiceFormModel[] = []
  saveConfirmDialogMessage: string = 'Are you really want to permanently save changes in invoices'
  protected readonly Date = Date;
  protected readonly isAuthenticated = isAuthenticated;
  eventBusVal: any

  constructor(public securityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<any>, private messagePrinter: MessagesPrinter, private eventListener: CommonServiceEventListener<any>) {
    super(httpService.httpClient, 'Can not load items catalog by criteria: ', 'invoice/itemsCatalogList')
    if (environment.debugMode) {
       of(eventListener).subscribe(l =>this.eventBusVal=l.busEvent);
    }
  }

  private _isInvoiceDialogVisible: boolean;

  get isInvoiceDialogVisible(): boolean {
    return this._isInvoiceDialogVisible;
  }

  set isInvoiceDialogVisible(value: boolean) {
    this._isInvoiceDialogVisible = value;
  }

  get invoices() {
    return this.modelList
  }

  set invoices(value) {
    this.modelList = value
  }

  ngOnInit(): void {
    setTimeout(() => {
      of(this.dataFinder).subscribe(f => f.loadData())
    })
  }

  finderIsReady(value: boolean) {
    //TODO maybe will be need
  }

  deleteInvoice(id) {
    this.confirmDeleteInvoiceDialog.transferObject = id
    this.showDeleteConfirmDialog = true
  }

  rowDoubleClick($event: MouseEvent, invoice: InvoiceFormModel) {
    setTimeout(() => {
      this.invoiceDialog.setEditingObject(invoice)
      this.invoiceDialog.visible = true
      this.isInvoiceDialogVisible = true
    })
  }

  convertToDate(date: any) {
    return new Date(date)
  }

  putEditDialogChanges(invoice: InvoiceFormModel) {
    const modelInvoice = this.modelList.filter(i => i.id === invoice.id)?.at(0)
    const changedInvoice =
      this.changesList.filter(i => i.id === invoice.id)?.at(0)
    //here I put original person to list of changes to keep original value
    if (changedInvoice === undefined && modelInvoice !== undefined) {
      this.changesList.push(modelInvoice)
    }

    this.modelList.filter((i, idx) => {
      if (i.id === invoice.id) {
        this.modelList[idx] = invoice
        return
      }
    })
  }

  saveChangedInvoices() {
    const changes = this.modelList.filter(i =>
      i.id === this.changesList?.filter(c => c?.id == i?.id)?.at(0)?.id)
    const changesList: InvoiceFormModel[] = []

    changes.forEach(i => {
      changesList.push(Object.assign(new InvoiceFormModel(), i))
    })
    this.httpService.putObjectToServer('POST', changesList, "invoice changes", 'invoice', callback => {
      if (callback) {
        this.changesList = []
      }
    })
  }

  /**
   * Indicates whether are changes in invoices
   */
  haveNoChanges() {
    return this.changesList == undefined || this.changesList.length < 1;
  }

  handleCancelDeleteInvoice($event: boolean) {
    this.showDeleteConfirmDialog = false
  }

  handleConfirmationDeleteInvoice(id: any) {
    this.httpService.putObjectToServer('DELETE',
      null, "invoice delete", 'invoice/' + id, callback => {
        if (callback) {
          console.log("DELETED :" + id)
          //this.messagePrinter.printSuccessMessage("The invoice successfully deleted.")
          this.showDeleteConfirmDialog = false
          this.ngOnInit()
        }
      })
  }

  handleConfirmationSaveInvoice(transferObject: any) {
    this.saveChangedInvoices()
    this.showSaveConfirmDialog = false
  }

  handleCancelSaveInvoice($event: boolean) {
    this.showSaveConfirmDialog = false
  }

  protected readonly JSON = JSON;
  protected readonly printToJson = printToJson;
}
