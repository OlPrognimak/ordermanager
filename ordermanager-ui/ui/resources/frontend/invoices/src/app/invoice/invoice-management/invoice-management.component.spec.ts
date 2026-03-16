import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceManagementComponent } from './invoice-management.component';
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";

describe('InvoiceManagementComponent', () => {
  let component: InvoiceManagementComponent;
  let fixture: ComponentFixture<InvoiceManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [InvoiceManagementComponent, MessageModule],
    providers: [MessageService, provideHttpClient(withInterceptorsFromDi())]
});
    fixture = TestBed.createComponent(InvoiceManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
