import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ItemsFormComponent} from './items-form.component';
import {HttpClient, HttpClientModule, HttpHandler} from "@angular/common/http";
import {MessageModule} from "primeng/message";
import {MessageService} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {ValidatableInputTextModule} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {ButtonModule} from "primeng/button";
import {FormsModule} from "@angular/forms";

describe('ItemsFormComponent', () => {
  let component: ItemsFormComponent;
  let fixture: ComponentFixture<ItemsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientModule, MessageModule, ToastModule, FormsModule, ValidatableInputTextModule, ButtonModule],
      providers: [MessageService, HttpClient, HttpHandler]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
