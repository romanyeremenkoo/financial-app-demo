import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shimmer placeholder used while the demo dataset is loading. */
@Component({
  selector: 'fin-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="skeleton" [style.width]="width()" [style.height]="height()"></span>`,
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('16px');
}
