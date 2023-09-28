import {ComponentFixture, TestBed} from '@angular/core/testing';

import {InvoiceItemsTableComponent} from './invoice-items-table.component';
import {HttpClientModule} from "@angular/common/http";
import {Toast, ToastModule} from "primeng/toast";
import {MessagesModule} from "primeng/messages";
import {MessageService} from "primeng/api";
import {TableModule} from "primeng/table";
import {ButtonModule} from "primeng/button";
import {Tooltip, TooltipModule} from "primeng/tooltip";
import {NgModel} from "@angular/forms";
import {InputTextModule} from "primeng/inputtext";
import {InputNumberModule} from "primeng/inputnumber";
import {DropdownModule} from "primeng/dropdown";

describe('InvoiceItemsTableComponent', () => {
  let component: InvoiceItemsTableComponent;
  let fixture: ComponentFixture<InvoiceItemsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [  Toast, Tooltip, NgModel ],
      imports: [HttpClientModule, ToastModule, MessagesModule, TableModule, ButtonModule, TooltipModule,
        InputTextModule, InputNumberModule, DropdownModule],
      providers: [MessageService]
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
