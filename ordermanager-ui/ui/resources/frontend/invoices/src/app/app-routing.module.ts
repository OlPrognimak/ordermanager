import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';
import {PersonFormComponent} from './personform/personform.component';


const routes: Routes = [
  {path: 'create-invoice-page',  component: InvoiceFormComponent},
  {path: 'create-person_page', component: PersonFormComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule{}
export  const routingComponent = [InvoiceFormComponent, PersonFormComponent];
