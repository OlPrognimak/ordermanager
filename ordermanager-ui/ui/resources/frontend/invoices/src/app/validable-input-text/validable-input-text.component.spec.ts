import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidableInputTextComponent } from './validable-input-text.component';

describe('ValidableInputTextComponent', () => {
  let component: ValidableInputTextComponent;
  let fixture: ComponentFixture<ValidableInputTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidableInputTextComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidableInputTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
