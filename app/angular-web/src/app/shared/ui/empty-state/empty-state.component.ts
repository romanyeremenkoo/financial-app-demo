import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from '../../ui/icon/icon.component';

/** Shared empty / zero-result presentation with an optional projected action. */
@Component({
  selector: 'fin-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="empty" role="status">
      <span class="empty__icon"><fin-icon [name]="icon()" [size]="24" /></span>
      <h3 class="empty__title">{{ title() }}</h3>
      <p class="empty__message">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly icon = input<IconName>('search');
}
