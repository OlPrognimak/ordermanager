import {fakeAsync, TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {AppComponent} from './app.component';
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";
import {UserLoginComponent} from "./user-login/user-login.component";
import {NO_ERRORS_SCHEMA} from "@angular/compiler";
import {MessageService} from "primeng/api";
import {TooltipModule} from "primeng/tooltip";
import {FormsModule} from "@angular/forms";
import {ToastModule} from "primeng/toast";
import {ButtonModule} from "primeng/button";
import {ValidatableInputTextModule} from "./validatable-input-text/validatable-input-text.component";
import {HttpClient} from "@angular/common/http";

describe('AppComponent', () => {

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [
          RouterTestingModule, HttpClientTestingModule, TooltipModule, FormsModule, ToastModule, ButtonModule, ValidatableInputTextModule
        ],
        declarations: [
          AppComponent, UserLoginComponent
        ],
        providers: [MessageService],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
    })
  );

  // beforeEach(() => {
  // TestBed.configureTestingModule({
  //   imports: [ HttpClientTestingModule ]
  // });

  // Inject the http service and test controller for each test
  //httpClient = TestBed.inject(HttpClient);
  // httpTestingController = TestBed.inject(HttpTestingController);
  // });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'frontend'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('frontend');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.app_title').textContent).toContain('Order manager');
  });

  it('should login', fakeAsync(() =>
    {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
      const userNameField: HTMLInputElement = compiled.querySelector('#id_UserName') as HTMLInputElement
      expect(userNameField).toBeTruthy()
      userNameField.value = 'test'
      const passwordField: HTMLInputElement = compiled.querySelector('#id_UserPassword') as HTMLInputElement
      passwordField.value = 'test123'
      expect(passwordField).toBeTruthy()
      const submitButton: HTMLButtonElement = compiled.querySelector('.submit-button') as HTMLButtonElement


      spyOn(fixture.nativeElement, 'login').withArgs("loginForm");
      expect(submitButton).toBeTruthy()
      submitButton.click()
      expect(fixture.nativeElement.login).toHaveBeenCalled();
      //expect(compiled.querySelector('.app_title').textContent).toContain('Order manager');
  }))


});
