import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CommonServiceEventBus, CommonServiceEventListener } from './common-service.event.bus';

describe('CommonServiceEventBus', () => {
  let eventBus: CommonServiceEventBus<string>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CommonServiceEventBus]
    });

    eventBus = TestBed.inject(CommonServiceEventBus);
  });

  it('emits events to subscribers', () => {
    const received: string[] = [];

    eventBus.onEvent().subscribe(event => received.push(event));
    eventBus.emitEvent('invoice-saved');

    expect(received).toEqual(['invoice-saved']);
  });
});

describe('CommonServiceEventListener', () => {
  it('stores the last event after initialization', () => {
    TestBed.configureTestingModule({
      providers: [CommonServiceEventBus, CommonServiceEventListener]
    });

    const eventBus = TestBed.inject(CommonServiceEventBus<string>);
    const listener = TestBed.inject(CommonServiceEventListener<string>);

    listener.ngOnInit();
    eventBus.emitEvent('backend-error');

    expect(listener.busEvent).toBe('backend-error');
  });
});
