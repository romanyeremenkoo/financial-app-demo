import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Card } from '../../domain/models/card.model';
import { cardStatusKey } from '../../shared/util/translation-key.util';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';

/** Virtual card visual with its freeze / unfreeze control. */
@Component({
  selector: 'fin-card-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StatusChipComponent, TranslatePipe],
  templateUrl: './card-tile.component.html',
  styleUrl: './card-tile.component.scss',
})
export class CardTileComponent {
  readonly card = input.required<Card>();
  readonly accountName = input.required<string>();
  readonly busy = input<boolean>(false);
  readonly toggleRequested = output<Card>();

  readonly isFrozen = computed(() => this.card().status === 'frozen');
  readonly statusKey = computed(() => cardStatusKey(this.card().status));
  readonly statusTone = computed<StatusTone>(() => (this.isFrozen() ? 'info' : 'success'));
  readonly actionKey = computed(() => (this.isFrozen() ? 'card.unfreeze' : 'card.freeze'));
  readonly networkLabel = computed(() => (this.card().network === 'visa' ? 'VISA' : 'Mastercard'));

  protected requestToggle(): void {
    this.toggleRequested.emit(this.card());
  }
}
