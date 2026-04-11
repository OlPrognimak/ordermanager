import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { forkJoin, map, Observable } from 'rxjs';

const TRANSLATION_SCOPES = ['app', 'auth', 'common', 'invoice', 'person', 'workflow'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeTranslations(target: Translation, source: Translation): Translation {
  const result: Translation = {...target};

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = mergeTranslations(targetValue as Translation, sourceValue as Translation);
      return;
    }

    result[key] = sourceValue;
  });

  return result;
}

@Injectable({ providedIn: 'root' })
export class MultiJsonTranslocoHttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<Translation> {
    const requests = TRANSLATION_SCOPES.map((scope) =>
      this.http.get<Translation>(`assets/i18n/${lang}/${scope}.json`)
    );

    return forkJoin(requests).pipe(
      map((translations) => translations.reduce((acc, current) => mergeTranslations(acc, current), {} as Translation))
    );
  }
}
