import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditableInputCellComponent } from './editable-input-cell.component';

describe('EditableInputCellComponent', () => {
  let component: EditableInputCellComponent;
  let fixture: ComponentFixture<EditableInputCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditableInputCellComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditableInputCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
