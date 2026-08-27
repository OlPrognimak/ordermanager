import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { TableCellRendererComponent } from './table-cell-renderer.component';
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { AgGridModule } from "ag-grid-angular";
import { ButtonModule } from "primeng/button";

describe('TableCellRendererComponent', () => {
  let component: TableCellRendererComponent;
  let fixture: ComponentFixture<TableCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
        imports: [TableCellRendererComponent, MessageModule, AgGridModule, ButtonModule],
        providers: [MessageService, provideHttpClient(withInterceptorsFromDi())
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TableCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
