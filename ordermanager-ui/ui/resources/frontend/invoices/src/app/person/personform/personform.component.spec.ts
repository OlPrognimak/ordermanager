import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonFormComponent } from "./personform.component";
import { FormsModule } from "@angular/forms";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { AppSecurityService } from "../../common-auth/app-security.service";
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {
  ValidatableDropdownlistComponent
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import { SelectModule } from "primeng/select";
import { provideRouter } from "@angular/router";
import { provideMockStore } from "@ngrx/store/testing";

describe('PersonFormComponent', () => {
  let component: PersonFormComponent;
  let fixture: ComponentFixture<PersonFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [PersonFormComponent, CommonModule, FormsModule, MessageModule, SelectModule, ValidatableInputTextComponent, ValidatableDropdownlistComponent],
    providers: [
      MessageService,
      AppSecurityService,
      HttpClient,
      provideHttpClient(withInterceptorsFromDi()),
      provideRouter([]),
      provideMockStore()
    ]
});
    fixture = TestBed.createComponent(PersonFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    console.log("COMPONENT:=" + component)
  });
});
