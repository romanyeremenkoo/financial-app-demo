import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_LANGUAGES, AppLanguage, LANGUAGE_SHORT_LABEL } from '../../../core/i18n/language';
import { LanguageService } from '../../../core/i18n/language.service';

/** Segmented control that switches the active interface language at runtime. */
@Component({
  selector: 'fin-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div
      class="switch"
      role="group"
      data-qa="language-switch"
      [attr.aria-label]="'language.label' | translate"
    >
      @for (option of languages; track option) {
        <button
          type="button"
          class="switch__option"
          [class.switch__option--active]="active() === option"
          [attr.data-qa]="'language-' + option"
          [attr.aria-pressed]="active() === option"
          [attr.aria-label]="
            'language.switchTo' | translate: { language: 'language.' + option | translate }
          "
          (click)="select(option)"
        >
          {{ shortLabels[option] }}
        </button>
      }
    </div>
  `,
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  private readonly language = inject(LanguageService);

  protected readonly languages = APP_LANGUAGES;
  protected readonly shortLabels = LANGUAGE_SHORT_LABEL;
  protected readonly active = this.language.language;

  protected select(option: AppLanguage): void {
    this.language.use(option);
  }
}
