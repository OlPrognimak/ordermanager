import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemManagementComponent } from './item-management.component';
import {MessageService} from "primeng/api";
import {HttpClient, HttpHandler} from "@angular/common/http";

describe('ItemManagementComponent', () => {
  let component: ItemManagementComponent;
  let fixture: ComponentFixture<ItemManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ItemManagementComponent],
      providers: [MessageService, HttpClient, HttpHandler]
    });
    localStorage.setItem("remoteBackendURL", "http://localhost:8888/")
    fixture = TestBed.createComponent(ItemManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
