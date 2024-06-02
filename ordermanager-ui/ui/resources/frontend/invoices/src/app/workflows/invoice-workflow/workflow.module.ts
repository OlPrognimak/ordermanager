import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { invoiceReducer } from "./state/invoice.reducer"
import { StoreModule } from "@ngrx/store";
import { StoreDevtoolsModule } from "@ngrx/store-devtools";
import { InvoiceWorkflowComponent } from "./invoice-workflow.component";
import {RouterModule, Routes} from "@angular/router";

const routesWorkflow: Routes = [
  { path: '', component: InvoiceWorkflowComponent }
];

@NgModule(
  {
    imports: [CommonModule, InvoiceWorkflowComponent,
      RouterModule.forChild(routesWorkflow),
      StoreModule.forFeature("invoiceWorkflow", invoiceReducer),
      StoreDevtoolsModule.instrument({connectInZone: true})]
  }
)
export class WorkflowModule {
}
