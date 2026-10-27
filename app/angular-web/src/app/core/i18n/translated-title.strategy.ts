import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';
import { translateNow } from './translate.util';

/**
 * Resolves the route `title` as a translation key and re-applies it whenever the
 * active language changes, so the browser tab follows the UI language instead of
 * being frozen at the value picked during navigation.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly activeKey = signal<string | null>(null);

  constructor() {
    super();
    effect(() => {
      // Depend on the language so a switch re-renders the current title.
      this.language.language();
      const key = this.activeKey();
      if (key) {
        this.title.setTitle(translateNow(this.translate, key));
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.activeKey.set(this.buildTitle(snapshot) ?? null);
  }
}
