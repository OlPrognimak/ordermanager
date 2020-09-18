import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidableCalendarComponent } from './validable-calendar.component';

describe('ValidableCalendarComponent', () => {
  let component: ValidableCalendarComponent;
  let fixture: ComponentFixture<ValidableCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidableCalendarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidableCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
