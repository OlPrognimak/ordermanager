import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { invoiceReducer } from "./state/invoice.reducer"
import { StoreModule } from "@ngrx/store";
import { StoreDevtoolsModule } from "@ngrx/store-devtools";
import { InvoiceWorkflowComponent } from "./invoice-workflow.component";

@NgModule(
  {
    imports: [CommonModule, InvoiceWorkflowComponent,
      StoreModule.forFeature("invoiceWorkflow", invoiceReducer),
      StoreDevtoolsModule.instrument()]
  }
)
export class WorkflowModule {
}
