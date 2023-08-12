import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPersonDialogComponent } from './edit-person-dialog.component';

describe('EditPersonDialogComponent', () => {
  let component: EditPersonDialogComponent;
  let fixture: ComponentFixture<EditPersonDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditPersonDialogComponent]
    });
    fixture = TestBed.createComponent(EditPersonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
