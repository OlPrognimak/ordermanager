import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditItemDialogComponent } from './edit-item-dialog.component';

describe('EditIdemDialogComponent', () => {
  let component: EditItemDialogComponent;
  let fixture: ComponentFixture<EditItemDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditItemDialogComponent]
    });
    fixture = TestBed.createComponent(EditItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
