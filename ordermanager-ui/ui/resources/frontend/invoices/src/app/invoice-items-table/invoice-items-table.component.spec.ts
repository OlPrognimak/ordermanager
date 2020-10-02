import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceItemsTableComponent } from './invoice-items-table.component';

describe('InvoiceItemsTableComponent', () => {
  let component: InvoiceItemsTableComponent;
  let fixture: ComponentFixture<InvoiceItemsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InvoiceItemsTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceItemsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
