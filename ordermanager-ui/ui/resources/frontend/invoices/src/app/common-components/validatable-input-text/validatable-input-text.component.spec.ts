import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableInputTextComponent } from './validatable-input-text.component';
import { FormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { MessageModule } from "primeng/message";
import {FloatLabelModule} from "primeng/floatlabel";

describe('ValidableInputTextComponent', () => {
  let component: ValidatableInputTextComponent;
  let fixture: ComponentFixture<ValidatableInputTextComponent>;

  beforeEach(waitForAsync (() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ToastModule, MessageModule, FloatLabelModule, ValidatableInputTextComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidatableInputTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
