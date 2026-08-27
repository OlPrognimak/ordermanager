import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MessagesPrinter } from './common-services.app.http.service';
import { CommonServicesEditService } from './common-services.edit.service';

interface EditableModel {
  id: number;
  name: string;
}

class TestEditService extends CommonServicesEditService<EditableModel> {
  constructor(httpClient: HttpClient) {
    super(httpClient, 'Can not load data', 'items');
  }
}

describe('CommonServicesEditService', () => {
  let service: TestEditService;
  let httpTestingController: HttpTestingController;
  let messagePrinter: { printUnsuccessefulMessage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('remoteBackendURL', 'http://backend/');

    messagePrinter = {
      printUnsuccessefulMessage: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });

    service = new TestEditService(TestBed.inject(HttpClient));
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('rolls changed models back to their original value', () => {
    service.modelList = [
      {id: 1, name: 'Changed'},
      {id: 2, name: 'Kept'}
    ];
    service.changesList = [{id: 1, name: 'Original'}];

    service.rollbackChanges(1);

    expect(service.modelList).toEqual([
      {id: 1, name: 'Original'},
      {id: 2, name: 'Kept'}
    ]);
    expect(service.changesList).toEqual([]);
  });

  it('returns a selection color when the object has pending changes', () => {
    service.changesList = [{id: 7, name: 'Original'}];

    expect(service.isEditObjectChanged({id: 7, name: 'Changed'})).toBe('blue');
    expect(service.isEditObjectChanged({id: 8, name: 'Other'})).toBe('#495057');
  });

  it('loads data with criteria and calls completion handler', () => {
    const callback = vi.fn();
    const onComplete = vi.fn();

    service.loadData('active', messagePrinter as unknown as MessagesPrinter, callback, onComplete);

    const request = httpTestingController.expectOne(req =>
      req.url === 'http://backend/items' && req.params.get('criteria') === 'active'
    );
    expect(request.request.method).toBe('GET');

    request.flush([{id: 1, name: 'Invoice'}]);

    expect(callback).toHaveBeenCalledWith([{id: 1, name: 'Invoice'}]);
    expect(onComplete).toHaveBeenCalled();
  });

  it('returns an empty list and prints an error when loading fails', () => {
    const callback = vi.fn();
    const onComplete = vi.fn();

    service.loadData('broken', messagePrinter as unknown as MessagesPrinter, callback, onComplete);

    const request = httpTestingController.expectOne(req =>
      req.url === 'http://backend/items' && req.params.get('criteria') === 'broken'
    );
    request.flush({message: 'Failed'}, {status: 500, statusText: 'Server Error'});

    expect(callback).toHaveBeenCalledWith([]);
    expect(messagePrinter.printUnsuccessefulMessage).toHaveBeenCalledWith(
      'Can not load data: broken',
      expect.anything()
    );
    expect(onComplete).toHaveBeenCalled();
  });

  it('uses the relative endpoint when backend URL is not configured', () => {
    localStorage.removeItem('remoteBackendURL');
    const callback = vi.fn();

    service.loadData('active', messagePrinter as unknown as MessagesPrinter, callback);

    const request = httpTestingController.expectOne(req =>
      req.url === 'items' && req.params.get('criteria') === 'active'
    );

    expect(request.request.method).toBe('GET');

    request.flush([{id: 2, name: 'Relative'}]);

    expect(callback).toHaveBeenCalledWith([{id: 2, name: 'Relative'}]);
  });
});
