import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonManagementComponent } from './person-management.component';
import {MessageModule} from "primeng/message";
import {MessageService} from "primeng/api";
import {HttpClient, HttpHandler} from "@angular/common/http";

describe('PersonManagementComponent', () => {
  let component: PersonManagementComponent;
  let fixture: ComponentFixture<PersonManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PersonManagementComponent, MessageModule],
      providers: [MessageService, HttpHandler, HttpClient]
    });
    fixture = TestBed.createComponent(PersonManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy(false);
    console.log("COMPONENT:="+component)
  });
});
