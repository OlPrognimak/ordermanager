import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from "@angular/forms";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { AppSecurityService } from "../../common-auth/app-security.service";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {
  ValidatableDropdownlistComponent
} from "../../common-components/validatable-dropdownlist/validatable-dropdownlist.component";
import { DropdownModule } from "primeng/dropdown";
import { InvoiceFormComponent } from "./invoiceform.component";
import { InvoicePipesModule } from "../../common-pipes/common-services.pipes.number";

describe('InvoiceFormComponent', () => {
  let component: InvoiceFormComponent;
  let fixture: ComponentFixture<InvoiceFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ValidatableInputTextComponent, ValidatableDropdownlistComponent],
      imports: [CommonModule, FormsModule, MessageModule, HttpClientModule, DropdownModule, InvoicePipesModule],
      providers: [MessageService, AppSecurityService, HttpClient]
    });
    fixture = TestBed.createComponent(InvoiceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy(false);
    console.log("COMPONENT:=" + component)
  });
});
