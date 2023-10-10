import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {InvoiceFormComponent} from './invoice/invoiceform/invoiceform.component';
import {PersonFormComponent} from './person/personform/personform.component';
import {PrintinvoiceComponent} from './invoice/printinvoice/printinvoice.component';
import {UserRegistrationComponent} from './user/user-registration/user-registration.component';
import {ItemsFormComponent} from './invoice/items-form/items-form.component';
import {PersonManagementComponent} from "./person/person-management/person-management.component";
import {InvoiceManagementComponent} from "./invoice/invoice-management/invoice-management.component";
import {ItemManagementComponent} from "./invoice/item-management/item-management.component";
import {InvoiceWorkflowComponent} from "./workflows/invoice-workflow/invoice-workflow.component";


const routes: Routes = [

  {path: 'create-invoice-item-page',  component: ItemsFormComponent},
  {path: 'catalog-item-management-page',  component: ItemManagementComponent},
  {path: 'create-invoice-page',  component: InvoiceFormComponent},
  {path: 'create-person_page', component: PersonFormComponent},
  {path: 'invoice-list_page', component: PrintinvoiceComponent},
  {path: 'invoice-management_page', component: InvoiceManagementComponent},
  {path: 'user-registration-page', component: UserRegistrationComponent },
  {path: 'person-management-page', component: PersonManagementComponent },
  {path: 'workflow-create-invoice', component: InvoiceWorkflowComponent },

];

@NgModule({
  imports: [RouterModule, RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule{}
