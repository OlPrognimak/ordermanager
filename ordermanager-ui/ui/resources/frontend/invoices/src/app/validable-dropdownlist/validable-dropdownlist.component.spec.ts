import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidableDropdownlistComponent } from './validable-dropdownlist.component';

describe('ValidableDropdownlistComponent', () => {
  let component: ValidableDropdownlistComponent;
  let fixture: ComponentFixture<ValidableDropdownlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidableDropdownlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidableDropdownlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
