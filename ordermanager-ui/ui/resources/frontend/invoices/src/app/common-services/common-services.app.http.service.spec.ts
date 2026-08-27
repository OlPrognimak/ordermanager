import { HttpErrorResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommonServiceEventBus } from './common-service.event.bus';
import { CommonServicesAppHttpService, MessagesPrinter } from './common-services.app.http.service';
import { CommonServicesUtilService } from './common-services-util.service';

describe('CommonServicesAppHttpService', () => {
  let service: CommonServicesAppHttpService<{name: string}>;
  let httpTestingController: HttpTestingController;
  let messagePrinter: {
    printSuccessMessage: ReturnType<typeof vi.fn>;
    printUnsuccessefulMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('remoteBackendURL', 'http://backend/');
    localStorage.setItem('basicAuthKey', 'Basic abc');

    messagePrinter = {
      printSuccessMessage: vi.fn(),
      printUnsuccessefulMessage: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CommonServicesAppHttpService,
        CommonServiceEventBus,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {provide: MessagesPrinter, useValue: messagePrinter}
      ]
    });

    service = TestBed.inject(CommonServicesAppHttpService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('sends PUT requests, prints success message, and returns created id', () => {
    const callback = vi.fn();

    service.putObjectToServer('PUT', {name: 'Invoice'}, 'Invoice', 'invoice', callback);

    const request = httpTestingController.expectOne('http://backend/invoice');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe('Basic abc');
    expect(request.request.body).toEqual({name: 'Invoice'});

    request.flush({createdId: 42});

    expect(messagePrinter.printSuccessMessage).toHaveBeenCalledWith('Invoice');
    expect(callback).toHaveBeenCalledWith(42);
  });

  it('sends POST and DELETE requests to the selected endpoint', () => {
    service.putObjectToServer('POST', {name: 'Changed'}, 'Invoice', 'invoice', vi.fn());
    const postRequest = httpTestingController.expectOne('http://backend/invoice');
    expect(postRequest.request.method).toBe('POST');
    postRequest.flush({createdId: 11});

    service.putObjectToServer('DELETE', null, 'Invoice', 'invoice/11', vi.fn());
    const deleteRequest = httpTestingController.expectOne('http://backend/invoice/11');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({createdId: 11});
  });

  it('prints an error message when save request fails', () => {
    const callback = vi.fn();

    service.putObjectToServer('PUT', {name: 'Invoice'}, 'Invoice', 'invoice', callback);

    const request = httpTestingController.expectOne('http://backend/invoice');
    request.flush({message: 'Failed'}, {status: 500, statusText: 'Server Error'});

    expect(messagePrinter.printUnsuccessefulMessage).toHaveBeenCalledWith('Invoice', expect.any(HttpErrorResponse));
    expect(callback).not.toHaveBeenCalled();
  });

  it('throws for unsupported HTTP methods', () => {
    expect(() => service.putObjectToServer('PATCH', {name: 'Invoice'}, 'Invoice', 'invoice', vi.fn()))
      .toThrow("HTTP Method 'PATCH' not supported");
  });

  it('loads dropdown data from the backend URL', () => {
    const callback = vi.fn();

    service.loadDropdownData('person/personsdropdown', callback);

    const request = httpTestingController.expectOne('http://backend/person/personsdropdown');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Content-Type')).toBe('application/json');

    request.flush([{label: 'Acme', value: 1}]);

    expect(callback).toHaveBeenCalledWith([{label: 'Acme', value: 1}]);
  });
});

describe('MessagesPrinter', () => {
  let messageService: { add: ReturnType<typeof vi.fn> };
  let utilService: { hideMassage: ReturnType<typeof vi.fn> };
  let printer: MessagesPrinter;

  beforeEach(() => {
    messageService = {add: vi.fn()};
    utilService = {hideMassage: vi.fn()};
    printer = new MessagesPrinter(messageService as unknown as MessageService, utilService as unknown as CommonServicesUtilService);
  });

  it('prints success messages and schedules hiding them', () => {
    printer.printSuccessMessage('Invoice');

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Congratulation!',
      detail: 'The Invoice is saved successfully.'
    });
    expect(utilService.hideMassage).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}), 4000);
  });

  it('uses server error message details when available', () => {
    const error = new HttpErrorResponse({
      error: {errorMessage: 'Backend validation failed'},
      status: 400,
      statusText: 'Bad Request'
    });

    printer.printUnsuccessefulMessage('Invoice', error);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Backend validation failed'
    });
    expect(utilService.hideMassage).toHaveBeenCalledWith(expect.objectContaining({severity: 'error'}), 10000);
  });

  it('prints the provided message when no error object exists', () => {
    printer.printUnsuccessefulMessage('Could not save invoice', null);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not save invoice'
    });
  });
});
