import {ComponentFixture, TestBed} from '@angular/core/testing';

import {UserLoginComponent} from './user-login.component';
import {NO_ERRORS_SCHEMA} from "@angular/compiler";
import {AppSecurityService} from "./app-security.service";
import {HttpClient, HttpHandler} from "@angular/common/http";
import {MessageService} from "primeng/api";
import {FormsModule} from "@angular/forms";
import {ToastModule} from "primeng/toast";
import {ButtonModule} from "primeng/button";
import {ValidatableInputTextComponent} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {MessageModule} from "primeng/message";


describe('UserLoginComponent', () => {
  let component: UserLoginComponent;
  let fixture: ComponentFixture<UserLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserLoginComponent, ValidatableInputTextComponent],
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
});
