/**
 * Signals that the language is changes
 */
export class TranslocoLanguageChangedEvent {
  constructor(lang: "en" | "de") {
    this.lang = lang;
  }

  /**Language name*/
  lang: string;
}
