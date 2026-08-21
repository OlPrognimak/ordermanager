import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceReactiveItemsTableComponent } from './invoice-reactive-items-table.component';
import { HttpClient, HttpHandler, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { ToastModule } from "primeng/toast";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { InvoiceItemsTableService } from "../invoice-items-table/invoice-items-table.service";
import { InvoiceItemModel } from "../../domain/domain.invoiceformmodel";

describe('InvoiceReactiveItemsTableComponent', () => {
  let component: InvoiceReactiveItemsTableComponent;
  let fixture: ComponentFixture<InvoiceReactiveItemsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [ToastModule, MessageModule, TableModule, ButtonModule, TooltipModule,
        InputTextModule, InputNumberModule, SelectModule, FormsModule],
    providers: [MessageService, HttpClient, HttpHandler, InvoiceItemsTableService, provideHttpClient(withInterceptorsFromDi())]
})
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceReactiveItemsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('invoiceReactiveItems', [new InvoiceItemModel()]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
