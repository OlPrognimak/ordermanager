import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {InvoiceFormComponent} from './invoiceform/invoiceform.component';


const routes: Routes = [
  {path: 'ng-data-table',  component: InvoiceFormComponent},
 // {path: 'prime-data-table', component: InvoiceFormComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule{}
export  const routingComponent = [InvoiceFormComponent];
