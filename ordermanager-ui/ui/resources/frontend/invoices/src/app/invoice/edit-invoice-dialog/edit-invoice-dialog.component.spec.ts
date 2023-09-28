import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditInvoiceDialogComponent } from './edit-invoice-dialog.component';
import {MessageService} from "primeng/api";
import {HttpClient, HttpHandler} from "@angular/common/http";
import {InputNumberModule} from "primeng/inputnumber";

describe('EditInvoiceDialogComponent', () => {
  let component: EditInvoiceDialogComponent;
  let fixture: ComponentFixture<EditInvoiceDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [EditInvoiceDialogComponent, InputNumberModule],
      providers: [MessageService, HttpHandler, HttpClient]
    });
    fixture = TestBed.createComponent(EditInvoiceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
