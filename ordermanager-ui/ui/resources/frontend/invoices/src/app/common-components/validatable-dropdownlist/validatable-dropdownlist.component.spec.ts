import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableDropdownlistComponent } from './validatable-dropdownlist.component';
import { FormsModule } from "@angular/forms";
import { DropdownModule } from "primeng/dropdown";
import { MessageModule } from "primeng/message";

describe('ValidableDropdownlistComponent', () => {
  let component: ValidatableDropdownlistComponent;
  let fixture: ComponentFixture<ValidatableDropdownlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ValidatableDropdownlistComponent],
      imports: [FormsModule, DropdownModule, MessageModule]
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
