import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BankingStore } from '../../application/state/banking.store';
import { DemoSessionService } from '../services/demo-session.service';
import { FeedbackService } from '../services/feedback.service';
import { translateNow } from '../i18n/translate.util';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { MoneyComponent } from '../../shared/ui/money/money.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { monogram } from '../../shared/util/monogram.util';
import { LanguageSwitcherComponent } from '../../shared/ui/language-switcher/language-switcher.component';

interface NavItem {
  /** Doubles as the translation key suffix and the `data-qa` suffix. */
  readonly id: string;
  readonly path: string;
  readonly icon: IconName;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', path: '/dashboard', icon: 'grid' },
  { id: 'accounts', path: '/accounts', icon: 'wallet' },
  { id: 'transactions', path: '/transactions', icon: 'list' },
  { id: 'transfers', path: '/transfers', icon: 'transfer' },
  { id: 'analytics', path: '/analytics', icon: 'chart' },
];

/**
 * Product shell: persistent navigation, balance summary and the routed
 * outlet. It also owns the one-time dataset load so every feature page can
 * assume the store is populated or explicitly loading.
 */
@Component({
  selector: 'fin-app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    MoneyComponent,
    SkeletonComponent,
    LanguageSwitcherComponent,
    TranslatePipe,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly session = inject(DemoSessionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(FeedbackService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(BankingStore);

  protected readonly navItems = NAV_ITEMS;
  protected readonly mobileNavOpen = signal(false);

  protected readonly initials = computed(() => monogram(this.store.holderName));

  protected readonly balanceToggleKey = computed(() =>
    this.store.balancesHidden() ? 'shell.showBalances' : 'shell.hideBalances',
  );

  constructor() {
    this.store.load();
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  protected toggleBalances(): void {
    this.store.toggleBalanceVisibility();
  }

  protected exitDemo(): void {
    this.session.exit();
    void this.router.navigate(['/welcome']);
  }

  protected retryLoad(): void {
    this.store.load(true);
  }

  /**
   * Restoring the seeded dataset throws away the visitor's demo changes, so it
   * is always confirmed first.
   */
  protected confirmReset(): void {
    const data: ConfirmDialogData = {
      title: translateNow(this.translate, 'shell.resetDemoTitle'),
      message: translateNow(this.translate, 'shell.resetDemoMessage'),
      confirmLabel: translateNow(this.translate, 'shell.resetDemoConfirm'),
      tone: 'danger',
    };

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed === true) {
          this.applyReset();
        }
      });
  }

  private applyReset(): void {
    this.store
      .resetDemoData()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.feedback.success(translateNow(this.translate, 'shell.resetDemoDone'));
        },
        error: () => {
          this.feedback.error(translateNow(this.translate, 'shell.resetDemoFailed'));
        },
      });
  }
}
