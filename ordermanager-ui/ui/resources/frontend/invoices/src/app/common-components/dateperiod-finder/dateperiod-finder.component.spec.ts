import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateperiodFinderComponent } from './dateperiod-finder.component';

describe('DateperiodFinderComponent', () => {
  let component: DateperiodFinderComponent;
  let fixture: ComponentFixture<DateperiodFinderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DateperiodFinderComponent]
    });
    fixture = TestBed.createComponent(DateperiodFinderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
