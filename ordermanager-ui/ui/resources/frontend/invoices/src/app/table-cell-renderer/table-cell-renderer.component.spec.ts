import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCellRendererComponent } from './table-cell-renderer.component';

describe('TableCellRendererComponent', () => {
  let component: TableCellRendererComponent;
  let fixture: ComponentFixture<TableCellRendererComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TableCellRendererComponent ]
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
