import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableInputNumberComponent } from './validatable-input-number.component';
import { FormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { MessagesModule } from "primeng/messages";
import { MessageModule } from "primeng/message";
import { InputNumberModule } from "primeng/inputnumber";

describe('ValidableInputTextComponent', () => {
  let component: ValidatableInputNumberComponent;
  let fixture: ComponentFixture<ValidatableInputNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ValidatableInputNumberComponent],
      imports: [FormsModule, ToastModule, MessagesModule, MessageModule, InputNumberModule]
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
