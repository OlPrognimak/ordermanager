import {ComponentFixture, TestBed} from '@angular/core/testing';

import {UserRegistrationComponent} from './user-registration.component';
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {MessageModule} from "primeng/message";
import {MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ValidatableInputTextModule} from "../common-components/validatable-input-text/validatable-input-text.component";
import {ButtonModule} from "primeng/button";
import {FormsModule} from "@angular/forms";

describe('UserRegistrationComponent', () => {
  let component: UserRegistrationComponent;
  let fixture: ComponentFixture<UserRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserRegistrationComponent ],
      imports: [HttpClientModule, FormsModule, MessageModule, ToastModule, ValidatableInputTextModule, ButtonModule],
      providers: [HttpClient, MessageService]

    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
