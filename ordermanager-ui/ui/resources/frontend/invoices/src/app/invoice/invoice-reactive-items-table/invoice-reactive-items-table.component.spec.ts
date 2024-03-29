import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceReactiveItemsTableComponent } from './invoice-reactive-items-table.component';
import { HttpClient, HttpClientModule, HttpHandler } from "@angular/common/http";
import { Toast, ToastModule } from "primeng/toast";
import { MessagesModule } from "primeng/messages";
import { MessageService } from "primeng/api";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { Tooltip, TooltipModule } from "primeng/tooltip";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { NgModel } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { DropdownModule } from "primeng/dropdown";
import { InvoiceItemsTableService } from "../invoice-items-table/invoice-items-table.service";

describe('InvoiceReactiveItemsTableComponent', () => {
  let component: InvoiceReactiveItemsTableComponent;
  let fixture: ComponentFixture<InvoiceReactiveItemsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Toast, Tooltip, NgModel],
      imports: [HttpClientModule, ToastModule, MessagesModule, TableModule, ButtonModule, TooltipModule,
        InputTextModule, InputNumberModule, DropdownModule],
      providers: [MessageService, HttpClient, HttpHandler, InvoiceItemsTableService],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceReactiveItemsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
