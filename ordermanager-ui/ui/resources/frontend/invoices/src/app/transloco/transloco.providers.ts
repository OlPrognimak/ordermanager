import { Provider } from '@angular/core';
import {
  TRANSLOCO_CONFIG,
  TRANSLOCO_LOADER,
  translocoConfig,
} from '@jsverse/transloco';
import { MultiJsonTranslocoHttpLoader } from './transloco-loader';

export const translocoProviders: Provider[] = [
  {
    provide: TRANSLOCO_CONFIG,
    useValue: translocoConfig({
      availableLangs: ['en', 'de'],
      defaultLang: 'en',
      reRenderOnLangChange: true,
      prodMode: false,
    }),
  },
  {
    provide: TRANSLOCO_LOADER,
    useClass: MultiJsonTranslocoHttpLoader,
  },
];
