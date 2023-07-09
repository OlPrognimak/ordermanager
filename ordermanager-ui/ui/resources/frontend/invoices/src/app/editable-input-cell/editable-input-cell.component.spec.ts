import {ComponentFixture, TestBed} from '@angular/core/testing';

import {EditableInputCellComponent} from './editable-input-cell.component';
import {CellEditor, Table, TableModule, TableService} from "primeng/table";
import {CommonServicesPipesNumber} from "../common-services/common-services.pipes.number";

describe('EditableInputCellComponent', () => {
  let component: EditableInputCellComponent;
  let fixture: ComponentFixture<EditableInputCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditableInputCellComponent, CellEditor, Table, CommonServicesPipesNumber],
      imports: [TableModule],
      providers: [Table, TableService]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditableInputCellComponent);
    console.log("Fixture :"+fixture)
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
