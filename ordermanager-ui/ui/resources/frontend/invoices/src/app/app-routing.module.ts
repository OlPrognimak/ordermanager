import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';
import {PersonFormComponent} from './personform/personform.component';
import {PrintinvoiceComponent} from './printinvoice/printinvoice.component';


const routes: Routes = [
  {path: 'create-invoice-page',  component: InvoiceFormComponent},
  {path: 'create-person_page', component: PersonFormComponent},
  {path: 'invoice-list_page', component: PrintinvoiceComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule{}
export  const routingComponent = [InvoiceFormComponent, PersonFormComponent];
