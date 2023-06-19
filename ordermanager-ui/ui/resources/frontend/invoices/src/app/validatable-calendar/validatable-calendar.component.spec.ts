import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ValidatableCalendarComponent} from './validatable-calendar.component';

describe('ValidableCalendarComponent', () => {
  let component: ValidatableCalendarComponent;
  let fixture: ComponentFixture<ValidatableCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidatableCalendarComponent ]
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
