import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { UserLoginComponent } from "./user/user-login/user-login.component";
import { NO_ERRORS_SCHEMA } from "@angular/compiler";
import { MessageService } from "primeng/api";
import { TooltipModule } from "primeng/tooltip";
import { FormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { ButtonModule } from "primeng/button";
import {
  ValidatableInputTextModule
} from "./common-components/validatable-input-text/validatable-input-text.component";

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

});
