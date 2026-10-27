import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Account, accountAvailable, accountBalance } from '../../../domain/models/account.model';
import { TranslatePipe } from '@ngx-translate/core';
import { accountTypeKey } from '../../util/translation-key.util';
import { IconComponent } from '../../ui/icon/icon.component';
import { MoneyComponent } from '../../ui/money/money.component';

/** Account summary tile shared by the dashboard and the accounts page. */
@Component({
  selector: 'fin-account-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, MoneyComponent, RouterLink, TranslatePipe],
  template: `
    <article class="card" data-qa="account-card">
      <header class="card__header">
        <span class="card__icon" aria-hidden="true"><fin-icon name="wallet" [size]="18" /></span>
        <div class="card__identity">
          <h3 class="card__name">{{ account().name }}</h3>
          <p class="card__type">{{ typeKey() | translate }} · {{ account().currency }}</p>
        </div>
      </header>

      <p class="card__iban">{{ account().maskedIban }}</p>

      <div class="card__balances">
        <div>
          <p class="card__label">{{ 'accounts.balance' | translate }}</p>
          <fin-money class="card__balance" [value]="balance()" [hidden]="hidden()" />
        </div>
        <div>
          <p class="card__label">{{ 'accounts.available' | translate }}</p>
          <fin-money class="card__available" [value]="available()" [hidden]="hidden()" />
        </div>
      </div>

      @if (showActions()) {
        <footer class="card__footer">
          <a
            class="card__link"
            [routerLink]="['/transactions']"
            [queryParams]="{ account: account().id }"
          >
            {{ 'accounts.viewTransactions' | translate }}
            <fin-icon name="arrow-right" [size]="16" />
          </a>
        </footer>
      }
    </article>
  `,
  styleUrl: './account-card.component.scss',
})
export class AccountCardComponent {
  readonly account = input.required<Account>();
  readonly hidden = input<boolean>(false);
  readonly showActions = input<boolean>(true);

  readonly balance = computed(() => accountBalance(this.account()));
  readonly available = computed(() => accountAvailable(this.account()));
  readonly typeKey = computed(() => accountTypeKey(this.account().type));
}
