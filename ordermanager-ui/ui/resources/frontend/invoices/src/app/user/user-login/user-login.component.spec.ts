import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';

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
import { provideRouter } from "@angular/router";


describe('UserLoginComponent', () => {
  let component: UserLoginComponent;
  let fixture: ComponentFixture<UserLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserLoginComponent, FormsModule, ToastModule, ButtonModule, MessageModule, ValidatableInputTextComponent],
      providers: [HttpHandler, MessageService, AppSecurityService, HttpClient, provideRouter([])],
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

  it('should login', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const userNameField: HTMLInputElement = compiled.querySelector('#id_UserName') as HTMLInputElement
    expect(userNameField).toBeTruthy()
    userNameField.value = 'test'
    const passwordField: HTMLInputElement = compiled.querySelector('#id_UserPassword') as HTMLInputElement
    passwordField.value = 'test123'
    expect(passwordField).toBeTruthy()
    const submitButton: HTMLButtonElement = compiled.querySelector('.submit-button') as HTMLButtonElement

    const loginSpy = vi.spyOn(fixture.componentInstance, 'login');
    expect(submitButton).toBeTruthy()
    submitButton.click()
    expect(loginSpy).toHaveBeenCalledWith(expect.any(NgForm));
  })
});
