import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { By } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_TOKEN_KEY } from '../../common-utils/common-utils.constants';
import { ItemsFormComponent } from './items-form.component';

@Component({
  template: '<router-outlet></router-outlet>',
  imports: [RouterOutlet]
})
class RoutedPageHostComponent {}

describe('create-invoice-item-page', () => {
  let fixture: ComponentFixture<RoutedPageHostComponent>;
  let httpTestingController: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'token-123');
    localStorage.setItem('basicAuthKey', 'Basic abc');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [RoutedPageHostComponent],
      providers: [
        MessageService,
        provideRouter([
          {path: 'create-invoice-item-page', component: ItemsFormComponent}
        ]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RoutedPageHostComponent);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('basicAuthKey');
    localStorage.removeItem('remoteBackendURL');
    vi.restoreAllMocks();
  });

  it('renders the create invoice item form for authenticated users', async () => {
    await navigateToCreateInvoiceItemPage();

    const compiled: HTMLElement = fixture.nativeElement;

    expect(compiled.querySelector('.catalog-item-page')).toBeTruthy();
    expect(compiled.querySelector('form.catalog-item-form')).toBeTruthy();
    expect(compiled.querySelector('#id_ItemDesc')).toBeTruthy();
    expect(compiled.querySelector('#id_ItemPrice')).toBeTruthy();
    expect(compiled.querySelector('#id_ItemVat')).toBeTruthy();
  });

  it('fills the item form and saves the catalog item', async () => {
    await navigateToCreateInvoiceItemPage();

    const pageComponent = fixture.debugElement.query(By.directive(ItemsFormComponent)).componentInstance as ItemsFormComponent;
    const compiled: HTMLElement = fixture.nativeElement;
    const descriptionInput = compiled.querySelector<HTMLInputElement>('#id_ItemDesc');
    const shortDescriptionInput = compiled.querySelector<HTMLInputElement>('#id-shortDescription');
    const form = compiled.querySelector<HTMLFormElement>('form.catalog-item-form');

    expect(descriptionInput).toBeTruthy();
    expect(shortDescriptionInput).toBeTruthy();
    expect(form).toBeTruthy();

    descriptionInput!.value = 'Development consulting';
    descriptionInput!.dispatchEvent(new Event('input', {bubbles: true}));
    shortDescriptionInput!.value = 'Development';
    shortDescriptionInput!.dispatchEvent(new Event('input', {bubbles: true}));
    pageComponent.model.itemPrice = 120;
    pageComponent.model.vat = 19;
    fixture.detectChanges();

    form!.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));

    const saveRequest = httpTestingController.expectOne('http://backend/invoice/itemcatalog');
    expect(saveRequest.request.method).toBe('PUT');
    expect(saveRequest.request.headers.get('Authorization')).toBe('Basic abc');
    expect(saveRequest.request.body).toEqual({
      description: 'Development consulting',
      shortDescription: 'Development',
      itemPrice: 120,
      vat: 19
    });

    saveRequest.flush({createdId: 77});

    expect(pageComponent.model.description).toBeNull();
    expect(pageComponent.model.shortDescription).toBeNull();
  });

  async function navigateToCreateInvoiceItemPage(): Promise<void> {
    await router.navigateByUrl('/create-invoice-item-page');
    fixture.detectChanges();

    const backendUrlRequest = httpTestingController.expectOne('backendUrl');
    expect(backendUrlRequest.request.method).toBe('GET');
    backendUrlRequest.flush({url: 'http://backend/'});

    fixture.detectChanges();
  }
});
