import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { InvoiceWorkflowComponent } from './invoice-workflow.component';
import { provideMockStore } from '@ngrx/store/testing';
import { initialInvoiceStale } from './state/invoice.reducer';
import { MessageService } from 'primeng/api';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('InvoiceWorkflowComponent', () => {
  let component: InvoiceWorkflowComponent;
  let fixture: ComponentFixture<InvoiceWorkflowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvoiceWorkflowComponent],
      providers: [
        provideMockStore({
          initialState: {
            invoiceWorkflow: initialInvoiceStale
          }
        }),
        MessageService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    fixture = TestBed.createComponent(InvoiceWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
