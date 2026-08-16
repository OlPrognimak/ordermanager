import '@analogjs/vitest-angular/setup-zone';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const translocoTestingModule = TranslocoTestingModule.forRoot({
  langs: {
    en: {
      title: 'Order manager',
    },
    de: {
      title: 'Order manager',
    },
  },
  translocoConfig: {
    availableLangs: ['en', 'de'],
    defaultLang: 'en',
    reRenderOnLangChange: true,
  },
});

getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, translocoTestingModule],
  platformBrowserDynamicTesting(),
  {
    teardown: { destroyAfterEach: true },
  },
);
