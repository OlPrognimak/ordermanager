import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {PrintinvoiceComponent} from './printinvoice.component';
import {HttpClientModule} from "@angular/common/http";
import {MessageService} from "primeng/api";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {AgGridModule} from "ag-grid-angular";

describe('PrintinvoiceComponent', () => {
  let component: PrintinvoiceComponent;
  let fixture: ComponentFixture<PrintinvoiceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrintinvoiceComponent ],
      imports: [HttpClientModule, MessageModule, ToastModule, AgGridModule],
      providers: [MessageService]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintinvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
