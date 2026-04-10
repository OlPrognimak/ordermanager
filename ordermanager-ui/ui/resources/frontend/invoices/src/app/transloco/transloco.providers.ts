import { provideTransloco, translocoConfig } from '@jsverse/transloco';
import { MultiJsonTranslocoHttpLoader } from './transloco-loader';
import { environment } from '../../environments/environment';

export const translocoProviders = [
  provideTransloco({
    config: translocoConfig({
      availableLangs: ['en', 'de'],
      defaultLang: 'en',
      reRenderOnLangChange: true,
      prodMode: environment.production,
    }),
    loader: MultiJsonTranslocoHttpLoader,
  }),
];
