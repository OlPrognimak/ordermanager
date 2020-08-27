import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {AppRoutingModule, routingComponent} from './app-routing.module';
import { AppComponent } from './app.component';
import {PrInvoiceFormDirective} from './invoiceform/invoiceform.service';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {ButtonModule, CalendarModule, DropdownModule} from 'primeng';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {PersonFormComponent} from './personform/personform.component';

@NgModule({
  declarations: [
    AppComponent,
    PrInvoiceFormDirective,
    InvoiceFormComponent,
    PersonFormComponent,
    routingComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ButtonModule,
    DropdownModule,
    CalendarModule

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
