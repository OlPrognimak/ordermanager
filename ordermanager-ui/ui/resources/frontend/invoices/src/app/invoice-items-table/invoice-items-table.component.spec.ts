import {ComponentFixture, TestBed} from '@angular/core/testing';

import {InvoiceItemsTableComponent} from './invoice-items-table.component';
import {HttpClientModule} from "@angular/common/http";
import {Toast, ToastModule} from "primeng/toast";
import {MessagesModule} from "primeng/messages";
import {MessageService} from "primeng/api";
import {TableModule} from "primeng/table";
import {ButtonModule} from "primeng/button";
import {CommonServicesPipesNumber} from "../common-services/common-services.pipes.number";
import {Tooltip, TooltipModule} from "primeng/tooltip";
import {CUSTOM_ELEMENTS_SCHEMA} from "@angular/core";
import {NgModel} from "@angular/forms";

describe('InvoiceItemsTableComponent', () => {
  let component: InvoiceItemsTableComponent;
  let fixture: ComponentFixture<InvoiceItemsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InvoiceItemsTableComponent, Toast, CommonServicesPipesNumber, Tooltip, NgModel],
      imports: [HttpClientModule, ToastModule, MessagesModule, TableModule, ButtonModule, TooltipModule],
      providers: [MessageService],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
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
