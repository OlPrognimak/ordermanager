import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatesComponentComponent } from './templates-component.component';

describe('TemplatesComponentComponent', () => {
  let component: TemplatesComponentComponent;
  let fixture: ComponentFixture<TemplatesComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TemplatesComponentComponent]
    });
    fixture = TestBed.createComponent(TemplatesComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
