import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';

import { UserLoginComponent } from './user-login.component';
import { NO_ERRORS_SCHEMA } from "@angular/compiler";
import { AppSecurityService } from "../../common-auth/app-security.service";
import { HttpClient, HttpHandler } from "@angular/common/http";
import { MessageService } from "primeng/api";
import { FormsModule, NgForm } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { ButtonModule } from "primeng/button";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import { MessageModule } from "primeng/message";


describe('UserLoginComponent', () => {
  let component: UserLoginComponent;
  let fixture: ComponentFixture<UserLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserLoginComponent, ValidatableInputTextComponent],
      imports: [FormsModule, ToastModule, ButtonModule, MessageModule],
      providers: [HttpHandler, MessageService, AppSecurityService, HttpClient],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();

  });

  it('should login', fakeAsync(() => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const userNameField: HTMLInputElement = compiled.querySelector('#id_UserName') as HTMLInputElement
    expect(userNameField).toBeTruthy()
    userNameField.value = 'test'
    const passwordField: HTMLInputElement = compiled.querySelector('#id_UserPassword') as HTMLInputElement
    passwordField.value = 'test123'
    expect(passwordField).toBeTruthy()
    const submitButton: HTMLButtonElement = compiled.querySelector('.submit-button') as HTMLButtonElement

    const loginSpy = spyOn(fixture.componentInstance, 'login').and.callThrough();
    expect(submitButton).toBeTruthy()
    submitButton.click()
    expect(loginSpy).toHaveBeenCalledWith(jasmine.any(NgForm));
  }))
});
