import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ItemManagementComponent } from './item-management.component';
import { MessageService } from "primeng/api";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";

describe('ItemManagementComponent', () => {
  let component: ItemManagementComponent;
  let fixture: ComponentFixture<ItemManagementComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ItemManagementComponent],
      providers: [
        MessageService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });
    localStorage.setItem("remoteBackendURL", "http://backend/")
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ItemManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    flushItemsCatalogList();
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('remoteBackendURL');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.modelList).toEqual([{id: 1, description: 'Development'}]);
  });

  function flushItemsCatalogList(): void {
    const request = httpTestingController.expectOne(req =>
      req.url === 'http://backend/invoice/itemsCatalogList' &&
      req.params.get('criteria') === ''
    );
    expect(request.request.method).toBe('GET');
    request.flush([{id: 1, description: 'Development'}]);
  }
});
