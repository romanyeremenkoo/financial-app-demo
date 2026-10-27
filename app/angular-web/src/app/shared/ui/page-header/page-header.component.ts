import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Consistent page heading with a slot for page-level actions. */
@Component({
  selector: 'fin-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="header__text">
        <h1 class="header__title">{{ title() }}</h1>
        @if (subtitle(); as text) {
          <p class="header__subtitle">{{ text }}</p>
        }
      </div>
      <div class="header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
