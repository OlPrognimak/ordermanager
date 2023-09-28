import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPersonDialogComponent } from './edit-person-dialog.component';
import {HttpClient, HttpHandler} from "@angular/common/http";
import {MessageService} from "primeng/api";

describe('EditPersonDialogComponent', () => {
  let component: EditPersonDialogComponent;
  let fixture: ComponentFixture<EditPersonDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditPersonDialogComponent],
      providers: [HttpClient, HttpHandler, MessageService]
    });
    fixture = TestBed.createComponent(EditPersonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
