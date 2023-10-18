import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditItemDialogComponent } from './edit-item-dialog.component';
import { MessageService } from "primeng/api";
import { HttpClient, HttpHandler } from "@angular/common/http";

describe('EditIdemDialogComponent', () => {
  let component: EditItemDialogComponent;
  let fixture: ComponentFixture<EditItemDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      //declarations: [EditItemDialogComponent], //That is not necessary for standalone module
      providers: [MessageService, HttpHandler, HttpClient]
    });
    fixture = TestBed.createComponent(EditItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
