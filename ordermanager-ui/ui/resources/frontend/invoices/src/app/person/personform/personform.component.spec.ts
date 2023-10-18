import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonFormComponent } from "./personform.component";
import { FormsModule } from "@angular/forms";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { AppSecurityService } from "../../user/user-login/app-security.service";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {
  ValidatableDropdownlistComponent
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import { DropdownModule } from "primeng/dropdown";

describe('PersonFormComponent', () => {
  let component: PersonFormComponent;
  let fixture: ComponentFixture<PersonFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ValidatableInputTextComponent, ValidatableDropdownlistComponent],
      imports: [CommonModule, FormsModule, MessageModule, HttpClientModule, DropdownModule],
      providers: [MessageService, AppSecurityService, HttpClient]
    });
    fixture = TestBed.createComponent(PersonFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy(false);
    console.log("COMPONENT:=" + component)
  });
});
