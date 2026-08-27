import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableInputTextComponent } from './validatable-input-text.component';
import { FormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { MessageModule } from "primeng/message";
import {FloatLabelModule} from "primeng/floatlabel";
import { describe, beforeEach, it, expect } from 'vitest';

describe('ValidableInputTextComponent', () => {
  let component: ValidatableInputTextComponent;
  let fixture: ComponentFixture<ValidatableInputTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, ToastModule, MessageModule, FloatLabelModule, ValidatableInputTextComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidatableInputTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
