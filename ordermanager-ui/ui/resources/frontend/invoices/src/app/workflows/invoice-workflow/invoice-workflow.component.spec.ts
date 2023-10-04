import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceWorkflowComponent } from './invoice-workflow.component';

describe('InvoiceWorkflowComponent', () => {
  let component: InvoiceWorkflowComponent;
  let fixture: ComponentFixture<InvoiceWorkflowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvoiceWorkflowComponent]
    });
    fixture = TestBed.createComponent(InvoiceWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
