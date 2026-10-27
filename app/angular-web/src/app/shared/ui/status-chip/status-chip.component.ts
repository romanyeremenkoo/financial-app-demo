import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

/** Compact status pill used for transaction and card states. */
@Component({
  selector: 'fin-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'chip chip--' + tone()">{{ label() }}</span>`,
  styleUrl: './status-chip.component.scss',
})
export class StatusChipComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
}
