import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceManagementComponent } from './invoice-management.component';
import {HttpClientModule} from "@angular/common/http";
import {MessageModule} from "primeng/message";
import {MessageService} from "primeng/api";

describe('InvoiceManagementComponent', () => {
  let component: InvoiceManagementComponent;
  let fixture: ComponentFixture<InvoiceManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvoiceManagementComponent, HttpClientModule, MessageModule],
      providers: [MessageService]
    });
    fixture = TestBed.createComponent(InvoiceManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
