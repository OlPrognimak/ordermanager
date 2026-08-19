import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { SelectModule } from "primeng/select";

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [SelectModule, FormsModule],
  templateUrl: './language-switcher.component.html'
})
export class LanguageSwitcherComponent {
  activeLang: 'de' | 'en';
  readonly languageOptions = [
    {label: '🇬🇧 EN', value: 'en'},
    {label: '🇩🇪 DE', value: 'de'}
  ];

  constructor(private translocoService: TranslocoService) {}

  ngOnInit(): void {
    this.activeLang = this.translocoService.getActiveLang() as 'de' | 'en';
  }

  switchLang(lang: 'de' | 'en'): void {
    this.activeLang = lang;
    this.translocoService.setActiveLang(lang);
  }
}
