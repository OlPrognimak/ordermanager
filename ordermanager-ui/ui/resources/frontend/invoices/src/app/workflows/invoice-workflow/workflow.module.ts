import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { invoiceReducer } from "./state/invoice.reducer"
import { StoreModule } from "@ngrx/store";
import { InvoiceWorkflowComponent } from "./invoice-workflow.component";
import {RouterModule, Routes} from "@angular/router";

const routesWorkflow: Routes = [
  { path: '', component: InvoiceWorkflowComponent }
];

@NgModule(
  {
    imports: [CommonModule, InvoiceWorkflowComponent,
      RouterModule.forChild(routesWorkflow),
      StoreModule.forFeature("invoiceWorkflow", invoiceReducer)]
  }
)
export class WorkflowModule {
}
