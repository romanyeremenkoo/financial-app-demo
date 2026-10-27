import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Money, formatMoney } from '../../../domain/money/money';
import { LanguageService } from '../../../core/i18n/language.service';

/**
 * Renders a monetary value with tabular numerals and a screen-reader friendly
 * label. All formatting flows through the domain formatter, so no component
 * can invent its own currency presentation.
 */
@Component({
  selector: 'fin-money',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="amount"
      [class.amount--positive]="isPositive()"
      [class.amount--negative]="isNegative()"
    >
      {{ formatted() }}
    </span>
  `,
  styleUrl: './money.component.scss',
})
export class MoneyComponent {
  private readonly language = inject(LanguageService);

  readonly value = input.required<Money>();
  readonly signDisplay = input<'auto' | 'always' | 'never'>('auto');
  readonly hidden = input<boolean>(false);
  /** Colour credits green / debits neutral. Off for neutral totals. */
  readonly tone = input<'signed' | 'neutral'>('neutral');

  readonly formatted = computed(() =>
    formatMoney(this.value(), {
      signDisplay: this.signDisplay(),
      hidden: this.hidden(),
      locale: this.language.locale(),
    }),
  );

  readonly isPositive = computed(
    () => this.tone() === 'signed' && !this.hidden() && this.value().amountMinor > 0,
  );

  readonly isNegative = computed(
    () => this.tone() === 'signed' && !this.hidden() && this.value().amountMinor < 0,
  );
}
