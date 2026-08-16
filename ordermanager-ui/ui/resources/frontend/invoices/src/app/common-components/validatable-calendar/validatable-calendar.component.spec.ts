import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidatableCalendarComponent, ValidatableCalendarModule } from './validatable-calendar.component';

describe('ValidableCalendarComponent', () => {
  let component: ValidatableCalendarComponent;
  let fixture: ComponentFixture<ValidatableCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidatableCalendarModule]
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
