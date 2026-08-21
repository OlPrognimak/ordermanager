import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserRegistrationComponent } from './user-registration.component';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ButtonModule } from "primeng/button";
import { FormsModule } from "@angular/forms";
import { provideRouter } from "@angular/router";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";

describe('UserRegistrationComponent', () => {
  let component: UserRegistrationComponent;
  let fixture: ComponentFixture<UserRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      UserRegistrationComponent,
      FormsModule,
      MessageModule,
      ToastModule,
      ButtonModule,
      ValidatableInputTextComponent
    ],
    providers: [HttpClient, MessageService, provideHttpClient(withInterceptorsFromDi()), provideRouter([])]
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
