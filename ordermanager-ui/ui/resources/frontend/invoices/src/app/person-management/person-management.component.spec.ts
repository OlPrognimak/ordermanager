import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonManagementComponent } from './person-management.component';

describe('PersonManagementComponent', () => {
  let component: PersonManagementComponent;
  let fixture: ComponentFixture<PersonManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PersonManagementComponent]
    });
    fixture = TestBed.createComponent(PersonManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy(false);
    console.log("COMPONENT:="+component)
  });
});
