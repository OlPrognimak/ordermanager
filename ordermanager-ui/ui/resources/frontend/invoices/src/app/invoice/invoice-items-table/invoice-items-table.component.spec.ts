import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, afterEach } from 'vitest';

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
import { TEST_BACKEND_BASE_URL, TEST_ITEM_CATALOG } from "../../app.component.spec";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { InvoiceItemsTableService } from "./invoice-items-table.service";

describe('InvoiceItemsTableComponent', () => {
  let component: InvoiceItemsTableComponent;
  let fixture: ComponentFixture<InvoiceItemsTableComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem('remoteBackendURL', TEST_BACKEND_BASE_URL);
    localStorage.setItem('basicAuthKey', 'Basic abc');

    await TestBed.configureTestingModule({
    imports: [InvoiceItemsTableComponent, ToastModule, MessageModule, TableModule, ButtonModule, TooltipModule,
        InputTextModule, InputNumberModule, SelectModule, FormsModule, CommonServicesPipesNumber],
      providers: [
        MessageService,
        InvoiceItemsTableService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    })
      .compileComponents();
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceItemsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('invoiceItems', [new InvoiceItemModel()]);
    fixture.detectChanges();
    flushCatalogItemsDropdown();
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('remoteBackendURL');
    localStorage.removeItem('basicAuthKey');
  });


  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.catalogItemRows).toEqual(TEST_ITEM_CATALOG);
  });

  function flushCatalogItemsDropdown(): void {
    const request = httpTestingController.expectOne(TEST_BACKEND_BASE_URL+ 'invoice/itemscatalogdropdown');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Basic abc');
    request.flush(TEST_ITEM_CATALOG);
  }
});
