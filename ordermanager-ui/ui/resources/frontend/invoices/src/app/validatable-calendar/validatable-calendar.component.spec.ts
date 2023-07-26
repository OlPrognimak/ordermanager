import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ValidatableCalendarComponent} from './validatable-calendar.component';
import {FormsModule} from "@angular/forms";
import {CalendarModule} from "primeng/calendar";
import {MessageModule} from "primeng/message";

describe('ValidableCalendarComponent', () => {
  let component: ValidatableCalendarComponent;
  let fixture: ComponentFixture<ValidatableCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidatableCalendarComponent ],
      imports: [FormsModule, CalendarModule, MessageModule]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidatableCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
