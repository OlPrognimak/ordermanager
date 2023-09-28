import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateperiodFinderComponent } from './dateperiod-finder.component';
import {HttpClient, HttpHandler} from "@angular/common/http";
import {MessageService} from "primeng/api";

describe('DateperiodFinderComponent', () => {
  let component: DateperiodFinderComponent;
  let fixture: ComponentFixture<DateperiodFinderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DateperiodFinderComponent],
      providers: [HttpClient, HttpHandler, MessageService],
    });
    fixture = TestBed.createComponent(DateperiodFinderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
