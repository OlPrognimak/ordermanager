import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';
import {PersonFormComponent} from './personform/personform.component';
import {PrintinvoiceComponent} from './printinvoice/printinvoice.component';
import {UserRegistrationComponent} from './user-registration/user-registration.component';
import {ItemsFormComponent} from './items-form/items-form.component';


const routes: Routes = [

  {path: 'create-invoice-item-page',  component: ItemsFormComponent},
  {path: 'create-invoice-page',  component: InvoiceFormComponent},
  {path: 'create-person_page', component: PersonFormComponent},
  {path: 'invoice-list_page', component: PrintinvoiceComponent},
  {path: 'user-registration-page', component: UserRegistrationComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule{}
export  const routingComponent = [InvoiceFormComponent, PersonFormComponent];
