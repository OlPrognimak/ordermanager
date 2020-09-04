import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {AppRoutingModule, routingComponent} from './app-routing.module';
import { AppComponent } from './app.component';
import {PrInvoiceFormDirective} from './invoiceform/invoiceform.service';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {ButtonModule, CalendarModule, DropdownModule, InputTextareaModule, TableModule} from 'primeng';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {PersonFormComponent} from './personform/personform.component';
import {EditableCellComponent} from './components/components.cell';
import {ItemsTableComponent} from "./components/components.itemstable";
import {ComponentsPipesNumberDouble} from "./components/components.pipes.number";
import { PrintinvoiceComponent } from './printinvoice/printinvoice.component';



@NgModule({
  declarations: [
    AppComponent,
    PrInvoiceFormDirective,
    InvoiceFormComponent,
    PersonFormComponent,
    routingComponent,
    EditableCellComponent,
    ItemsTableComponent,
    ComponentsPipesNumberDouble,
    PrintinvoiceComponent
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
    InputTextareaModule

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
