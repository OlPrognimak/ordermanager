import { TestBed } from '@angular/core/testing';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  compareObjects,
  CommonServicesUtilService,
  isAuthenticated,
  numberCellRenderer,
  setAuthenticated
} from './common-services-util.service';
import { AUTH_TOKEN_KEY } from '../common-utils/common-utils.constants';

describe('CommonServicesUtilService', () => {
  let messageService: { add: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };
  let service: CommonServicesUtilService;

  beforeEach(() => {
    localStorage.clear();
    messageService = {
      add: vi.fn(),
      clear: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CommonServicesUtilService,
        {provide: MessageService, useValue: messageService}
      ]
    });

    service = TestBed.inject(CommonServicesUtilService);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('stores and removes authentication token', () => {
    setAuthenticated('token-123');

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('token-123');
    expect(isAuthenticated()).toBe(true);

    setAuthenticated(null);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('compares primitive, date-compatible, and nested object values', () => {
    expect(compareObjects(' 42 ', 42)).toBe(true);
    expect(compareObjects('2026-08-26', new Date('2026-08-26T00:00:00.000Z'))).toBe(true);
    expect(compareObjects({id: 1, nested: {name: ' test '}}, {id: '1', nested: {name: 'test'}})).toBe(true);
    expect(compareObjects({id: 1}, {id: 1, extra: true})).toBe(false);
  });

  it('renders numeric grid cell values with two decimals and right alignment', () => {
    const element = numberCellRenderer({value: 12.3});

    expect(element.innerText).toBe('12.30');
    expect(element.style.textAlign).toBe('right');
  });

  it('adds an error toast and schedules hiding it', () => {
    const hideMessageSpy = vi.spyOn(service, 'hideMassage').mockImplementation(() => {});

    service.printUnSuccessMessage('Invoice', 'Could not save invoice');

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not save invoice'
    });

    expect(hideMessageSpy).toHaveBeenCalledWith(expect.objectContaining({severity: 'error'}), 10000);
  });

  it('clears a toast after the provided delay', async () => {
    const message: ToastMessageOptions = {key: 'invoice', severity: 'success'};

    service.hideMassage(message, 0);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(messageService.clear).toHaveBeenCalledWith('invoice');
  });
});
