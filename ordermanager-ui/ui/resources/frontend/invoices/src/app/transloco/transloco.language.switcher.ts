import {Component, NgModule} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  templateUrl: './language-switcher.component.html'
})
export class LanguageSwitcherComponent {
  constructor(public translocoService: TranslocoService) {}

  switchLang(lang: 'de' | 'en'): void {
    this.translocoService.setActiveLang(lang);
  }

  getCurrentLanguageLabel(): string {
    const lang = this.translocoService.getActiveLang();
    return lang === 'de' ? '🇩🇪 DE' : '🇬🇧 EN';
  }
}

