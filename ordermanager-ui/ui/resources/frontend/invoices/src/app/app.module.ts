import {BrowserModule} from '@angular/platform-browser';
import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';

import {AppRoutingModule, routingComponent} from './app-routing.module';
import {AppComponent} from './app.component';
import {PrInvoiceFormDirective} from './invoiceform/invoiceform.service';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';
import {FormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {PersonFormComponent} from './personform/personform.component';
import {CommonServicesPipesNumber} from './common-services/common-services.pipes.number';
import {PrintinvoiceComponent} from './printinvoice/printinvoice.component';
import {AgGridModule} from 'ag-grid-angular';
import {TableCellRendererComponent} from './table-cell-renderer/table-cell-renderer.component';
import {MatButtonModule} from '@angular/material/button';
import {ButtonModule} from 'primeng/button';
import {DropdownModule} from 'primeng/dropdown';
import {CalendarModule} from 'primeng/calendar';
import {TableModule} from 'primeng/table';
import {MessagesModule} from 'primeng/messages';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {ValidatableInputTextComponent} from './validatable-input-text/validatable-input-text.component';
import {ValidatableDropdownlistComponent} from './validatable-dropdownlist/validatable-dropdownlist.component';
import {ValidatableCalendarComponent} from './validatable-calendar/validatable-calendar.component';
import {UserRegistrationComponent} from './user-registration/user-registration.component';
import {CommonServicesUtilService} from './common-services/common-services-util.service';
import {MessageService} from 'primeng/api';
import {EditableInputCellComponent} from './editable-input-cell/editable-input-cell.component';
import {InvoiceItemsTableComponent} from './invoice-items-table/invoice-items-table.component';
import {UserLoginComponent} from './user-login/user-login.component';
import {ItemsFormComponent} from './items-form/items-form.component';
import {CommonServicesAppHttpService} from './common-services/common-services.app.http.service';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {DialogModule} from 'primeng/dialog';
import {ToastModule} from 'primeng/toast';
import {TooltipModule} from 'primeng/tooltip';
import {MenubarModule} from 'primeng/menubar';
import {RouterModule} from "@angular/router";
import {BasicInterceptor} from "./user-login/basic-auth-interceptor";
import {InputMaskModule} from "primeng/inputmask";
import {InputNumberModule} from "primeng/inputnumber";
import {CommonModule} from "@angular/common";
import {InvoiceManagementModule} from "./invoice-management/invoice-management.component";
import {RippleModule} from "primeng/ripple";


@NgModule({
  declarations: [
    AppComponent,
    PrInvoiceFormDirective,
    InvoiceFormComponent,
    PersonFormComponent,
    routingComponent,
    CommonServicesPipesNumber,
    PrintinvoiceComponent,
    TableCellRendererComponent,
    ValidatableInputTextComponent,
    ValidatableDropdownlistComponent,
    ValidatableCalendarComponent,
    UserRegistrationComponent,
    EditableInputCellComponent,
    InvoiceItemsTableComponent,
    UserLoginComponent,
    ItemsFormComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    InputTextModule,
    AgGridModule,
    MessagesModule,
    MessageModule,
    MatProgressSpinnerModule,
    DialogModule,
    ToastModule,
    TooltipModule,
    MenubarModule,
    RouterModule,
    MatButtonModule,
    InputMaskModule,
    InputNumberModule,
    CommonModule,
    InvoiceManagementModule,
    RippleModule
  ],
  providers: [CommonServicesAppHttpService, CommonServicesUtilService, MessageService,
    {provide: HTTP_INTERCEPTORS, useClass: BasicInterceptor, multi: true}, HttpClient],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
