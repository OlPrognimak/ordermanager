import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableInputNumberComponent } from './validatable-input-number.component';
import { FormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { MessageModule } from "primeng/message";
import { InputNumberModule } from "primeng/inputnumber";
import {FloatLabelModule} from "primeng/floatlabel";

describe('ValidableInputTextComponent', () => {
  let component: ValidatableInputNumberComponent;
  let fixture: ComponentFixture<ValidatableInputNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidatableInputNumberComponent, FormsModule, ToastModule, MessageModule, InputNumberModule, FloatLabelModule]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidatableInputNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
