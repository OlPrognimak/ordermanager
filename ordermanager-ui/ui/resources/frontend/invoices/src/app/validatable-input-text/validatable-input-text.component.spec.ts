import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ValidatableInputTextComponent} from './validatable-input-text.component';

describe('ValidableInputTextComponent', () => {
  let component: ValidatableInputTextComponent;
  let fixture: ComponentFixture<ValidatableInputTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidatableInputTextComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidatableInputTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
