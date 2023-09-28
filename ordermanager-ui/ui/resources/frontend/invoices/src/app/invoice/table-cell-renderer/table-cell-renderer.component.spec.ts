import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {TableCellRendererComponent} from './table-cell-renderer.component';
import {HttpClientModule} from "@angular/common/http";
import {MessageModule} from "primeng/message";
import {MessageService} from "primeng/api";
import {AgGridModule} from "ag-grid-angular";
import {ButtonModule} from "primeng/button";

describe('TableCellRendererComponent', () => {
  let component: TableCellRendererComponent;
  let fixture: ComponentFixture<TableCellRendererComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TableCellRendererComponent],
      imports: [HttpClientModule, MessageModule, AgGridModule, ButtonModule],
      providers: [MessageService]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TableCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
