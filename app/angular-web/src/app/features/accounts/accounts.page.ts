import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BankingStore } from '../../application/state/banking.store';
import { Card } from '../../domain/models/card.model';
import { FeedbackService } from '../../core/services/feedback.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { AccountCardComponent } from '../../shared/ledger/account-card/account-card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { CardTileComponent } from '../cards/card-tile.component';
import { cardToggleConfirmation, cardToggleFeedback } from './card-actions.util';
import { range } from '../../shared/util/collection.util';
import { translateNow } from '../../core/i18n/translate.util';

const SKELETON_ROW_COUNT = 3;

/**
 * Accounts and cards. Freezing is a confirmed, reversible action: the dialog
 * explains the consequence and the store update is immutable and immediate.
 */
@Component({
  selector: 'fin-accounts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccountCardComponent,
    CardTileComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    SkeletonComponent,
    TranslatePipe,
  ],
  templateUrl: './accounts.page.html',
  styleUrl: './accounts.page.scss',
})
export class AccountsPage {
  protected readonly store = inject(BankingStore);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  protected readonly pendingCardId = signal<string | null>(null);
  protected readonly skeletonRows = range(SKELETON_ROW_COUNT);

  protected accountName(card: Card): string {
    return (
      this.store.accountById(card.accountId)?.name ??
      translateNow(this.translate, 'accounts.unknownAccount')
    );
  }

  protected confirmToggle(card: Card): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      { data: cardToggleConfirmation(card, this.translate) },
    );

    this.pendingCardId.set(card.id);

    dialogRef
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        this.pendingCardId.set(null);
        if (confirmed === true) {
          this.applyToggle(card);
        }
      });
  }

  private applyToggle(card: Card): void {
    this.pendingCardId.set(card.id);

    this.store
      .toggleCard(card.id)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.pendingCardId.set(null);
          this.feedback.success(cardToggleFeedback(updated, this.translate));
        },
        error: () => {
          this.pendingCardId.set(null);
          this.feedback.error(translateNow(this.translate, 'accounts.cardUnavailable'));
        },
      });
  }
}
