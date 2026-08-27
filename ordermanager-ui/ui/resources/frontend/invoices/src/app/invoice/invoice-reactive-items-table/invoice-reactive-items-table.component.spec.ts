import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InvoiceReactiveItemsTableComponent } from './invoice-reactive-items-table.component';
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
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
import { TEST_BACKEND_BASE_URL, TEST_ITEM_CATALOG } from "../../app.component.spec";



describe('InvoiceReactiveItemsTableComponent', () => {
  let component: InvoiceReactiveItemsTableComponent;
  let fixture: ComponentFixture<InvoiceReactiveItemsTableComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem('remoteBackendURL', TEST_BACKEND_BASE_URL);
    localStorage.setItem('basicAuthKey', 'Basic abc');

    await TestBed.configureTestingModule({
    declarations: [],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [ToastModule, MessageModule, TableModule, ButtonModule, TooltipModule,
        InputTextModule, InputNumberModule, SelectModule, FormsModule],
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
    fixture = TestBed.createComponent(InvoiceReactiveItemsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('invoiceReactiveItems', [new InvoiceItemModel()]);
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
