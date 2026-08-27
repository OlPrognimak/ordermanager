import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditInvoiceDialogComponent } from './edit-invoice-dialog.component';
import { MessageService } from "primeng/api";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { InputNumberModule } from "primeng/inputnumber";
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('EditInvoiceDialogComponent', () => {
  let component: EditInvoiceDialogComponent;
  let fixture: ComponentFixture<EditInvoiceDialogComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('remoteBackendURL', 'http://backend/');

    TestBed.configureTestingModule({
      imports: [EditInvoiceDialogComponent, InputNumberModule],
      providers: [
        MessageService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EditInvoiceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    flushInitialDropdownRequests();
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('remoteBackendURL');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.personInvoiceSupplierRows).toEqual([{label: 'Acme GmbH', value: 1}]);
    expect(component.personInvoiceRecipientRows).toEqual([{label: 'Acme GmbH', value: 1}]);
  });

  function flushInitialDropdownRequests(): void {
    const personDropdownRequest = httpTestingController.expectOne('http://backend/person/personsdropdown');
    expect(personDropdownRequest.request.method).toBe('GET');
    personDropdownRequest.flush([{label: 'Acme GmbH', value: 1}]);

  }
});
