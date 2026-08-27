import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableDropdownlistComponent } from './validatable-dropdownlist.component';
import { FormsModule } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { MessageModule } from "primeng/message";
import { describe, beforeEach, it, expect } from 'vitest';

describe('ValidableDropdownlistComponent', () => {
  let component: ValidatableDropdownlistComponent;
  let fixture: ComponentFixture<ValidatableDropdownlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidatableDropdownlistComponent, FormsModule, SelectModule, MessageModule]
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
