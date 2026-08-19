import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceItemsTableComponent } from './invoice-items-table.component';
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { ToastModule } from "primeng/toast";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { FormsModule } from "@angular/forms";
import { InvoiceItemModel } from "../../domain/domain.invoiceformmodel";
import { CommonServicesPipesNumber } from "../../common-pipes/common-services.pipes.number";

describe('InvoiceItemsTableComponent', () => {
  let component: InvoiceItemsTableComponent;
  let fixture: ComponentFixture<InvoiceItemsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [InvoiceItemsTableComponent, ToastModule, MessageModule, TableModule, ButtonModule, TooltipModule,
        InputTextModule, InputNumberModule, SelectModule, FormsModule, CommonServicesPipesNumber],
    providers: [MessageService, provideHttpClient(withInterceptorsFromDi())]
})
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceItemsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('invoiceItems', [new InvoiceItemModel()]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
