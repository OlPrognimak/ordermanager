import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PrintinvoiceComponent } from './invoice/printinvoice/printinvoice.component';
import { AgGridModule } from 'ag-grid-angular';
import { TableCellRendererComponent } from './invoice/table-cell-renderer/table-cell-renderer.component';
import { MatButtonModule } from '@angular/material/button';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { MessagesModule } from 'primeng/messages';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import {
  ValidatableDropdownlistModule
} from './common-components/validatable-dropdownlist/validatable-dropdownlist.component';
import { ValidatableCalendarModule } from './common-components/validatable-calendar/validatable-calendar.component';
import { UserRegistrationComponent } from './user/user-registration/user-registration.component';
import { CommonServicesUtilService } from './common-services/common-services-util.service';
import { MessageService } from 'primeng/api';
import { EditableInputCellComponent } from './common-components/editable-input-cell/editable-input-cell.component';
import { CommonServicesAppHttpService } from './common-services/common-services.app.http.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MenubarModule } from 'primeng/menubar';
import { RouterModule } from "@angular/router";
import { BasicInterceptor } from "./common-auth/basic-auth-interceptor";
import { InputMaskModule } from "primeng/inputmask";
import { InputNumberModule } from "primeng/inputnumber";
import { CommonModule } from "@angular/common";
import { InvoiceManagementModule } from "./invoice/invoice-management/invoice-management.component";
import { RippleModule } from "primeng/ripple";
import { UserLoginModule } from "./user/user-login/user-login.component";
import {
  ValidatableInputTextModule
} from "./common-components/validatable-input-text/validatable-input-text.component";
import { PersonFormModule } from "./person/personform/personform.component";
import { InvoiceFormModule } from "./invoice/invoiceform/invoiceform.component";
import { DateperiodFinderComponent } from "./common-components/dateperiod-finder/dateperiod-finder.component";
import { InvoicePipesModule } from "./common-pipes/common-services.pipes.number";
import { TemplatesComponentComponent } from "./common-components/templates-component/templates-component.component";
import { StoreModule } from "@ngrx/store";
import { WorkflowModule } from "./workflows/invoice-workflow/workflow.module";


@NgModule({
  bootstrap: [AppComponent],
  declarations: [
    AppComponent,
    PrintinvoiceComponent,
    TableCellRendererComponent,
    UserRegistrationComponent,
    EditableInputCellComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ButtonModule,
    DropdownModule,
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
    RippleModule,
    UserLoginModule,
    ValidatableCalendarModule,
    ValidatableInputTextModule,
    ValidatableDropdownlistModule,
    PersonFormModule,
    InvoiceFormModule,
    DateperiodFinderComponent,
    InvoicePipesModule,
    ReactiveFormsModule,
    TemplatesComponentComponent,
    StoreModule.forRoot({}),
    WorkflowModule
  ],
  providers: [CommonServicesAppHttpService, CommonServicesUtilService, MessageService,
    {provide: HTTP_INTERCEPTORS, useClass: BasicInterceptor, multi: true}, HttpClient],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {
}
