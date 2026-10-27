import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BankingStore } from '../../application/state/banking.store';
import { DemoSessionService } from '../../core/services/demo-session.service';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { LanguageSwitcherComponent } from '../../shared/ui/language-switcher/language-switcher.component';

/**
 * Demo entry screen. Deliberately not an authentication form: there are no
 * credentials to verify, so the screen explains the simulation and unlocks the
 * product area.
 */
@Component({
  selector: 'fin-demo-entry-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './demo-entry.page.html',
  styleUrl: './demo-entry.page.scss',
})
export class DemoEntryPage {
  private readonly session = inject(DemoSessionService);
  private readonly store = inject(BankingStore);
  private readonly router = inject(Router);

  protected readonly highlightKeys = [
    'demoEntry.highlights.accounts',
    'demoEntry.highlights.history',
    'demoEntry.highlights.transfers',
  ];

  protected enterDemo(): void {
    this.session.enter();
    this.store.load();
    void this.router.navigate(['/dashboard']);
  }
}
