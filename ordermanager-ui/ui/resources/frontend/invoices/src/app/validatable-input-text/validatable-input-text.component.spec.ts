import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ValidatableInputTextComponent} from './validatable-input-text.component';
import {FormsModule} from "@angular/forms";
import {ToastModule} from "primeng/toast";
import {MessagesModule} from "primeng/messages";
import {MessageModule} from "primeng/message";

describe('ValidableInputTextComponent', () => {
  let component: ValidatableInputTextComponent;
  let fixture: ComponentFixture<ValidatableInputTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidatableInputTextComponent ],
      imports:[FormsModule, ToastModule, MessagesModule, MessageModule]
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
