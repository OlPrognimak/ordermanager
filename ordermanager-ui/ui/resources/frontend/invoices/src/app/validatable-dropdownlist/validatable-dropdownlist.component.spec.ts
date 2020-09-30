import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableDropdownlistComponent } from './validatable-dropdownlist.component';

describe('ValidableDropdownlistComponent', () => {
  let component: ValidatableDropdownlistComponent;
  let fixture: ComponentFixture<ValidatableDropdownlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidatableDropdownlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidatableDropdownlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
