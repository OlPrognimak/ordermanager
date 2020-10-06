import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {AppRoutingModule, routingComponent} from './app-routing.module';
import { AppComponent } from './app.component';
import {PrInvoiceFormDirective} from './invoiceform/invoiceform.service';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {PersonFormComponent} from './personform/personform.component';
import {CommonServicesPipesNumber} from './common-services/common-services.pipes.number';
import { PrintinvoiceComponent } from './printinvoice/printinvoice.component';
import {AgGridModule} from 'ag-grid-angular';
import { TableCellRendererComponent } from './table-cell-renderer/table-cell-renderer.component';
import {MatButton} from '@angular/material/button';
import {ButtonModule} from 'primeng/button';
import {DropdownModule} from 'primeng/dropdown';
import {CalendarModule} from 'primeng/calendar';
import {TableModule} from 'primeng/table';
import {MessagesModule} from 'primeng/messages';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import { ValidatableInputTextComponent } from './validatable-input-text/validatable-input-text.component';
import { ValidatableDropdownlistComponent } from './validatable-dropdownlist/validatable-dropdownlist.component';
import { ValidatableCalendarComponent } from './validatable-calendar/validatable-calendar.component';
import { UserRegistrationComponent } from './user-registration/user-registration.component';
import {CommonServicesUtilService} from './common-services/common-services-util.service';
import {MessageService} from 'primeng/api';
import { EditableInputCellComponent } from './editable-input-cell/editable-input-cell.component';
import { InvoiceItemsTableComponent } from './invoice-items-table/invoice-items-table.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { ItemsFormComponent } from './items-form/items-form.component';
import {CommonServicesAppHttpService} from "./common-services/common-services.app.http.service";



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
    AgGridModule.withComponents([MatButton, TableCellRendererComponent]),
    MessagesModule,
    MessageModule


  ],
  providers: [CommonServicesAppHttpService, CommonServicesUtilService, MessageService],
  bootstrap: [AppComponent]
})
export class AppModule { }
