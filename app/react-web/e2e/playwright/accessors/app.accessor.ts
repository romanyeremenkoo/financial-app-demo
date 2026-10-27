import type { Locator, Page } from '@playwright/test';
import { qa } from './qa';

export type NavTarget = 'dashboard' | 'accounts' | 'transactions' | 'transfers' | 'analytics';

export type LanguageCode = 'en' | 'ua';

/**
 * Entry point for the application shell: the demo gate, the primary navigation,
 * the language switch and the confirmation overlay every feature reuses.
 *
 * Every lookup goes through `data-qa`; role, class and text selectors are
 * deliberately avoided so the suite survives copy and markup changes.
 */
export class AppAccessor {
  readonly enterDemoButton: Locator;
  readonly primaryNav: Locator;
  readonly navToggle: Locator;
  readonly confirmDialog: Locator;
  readonly confirmDialogTitle: Locator;
  readonly confirmDialogMessage: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly languageSwitch: Locator;
  readonly resetDemoButton: Locator;
  readonly balanceToggle: Locator;

  constructor(private readonly page: Page) {
    this.enterDemoButton = qa(page, 'enter-demo');
    this.primaryNav = qa(page, 'primary-nav');
    this.navToggle = qa(page, 'nav-toggle');
    this.confirmDialog = qa(page, 'confirm-dialog');
    this.confirmDialogTitle = qa(this.confirmDialog, 'dialog-title');
    this.confirmDialogMessage = qa(this.confirmDialog, 'dialog-message');
    this.confirmButton = qa(this.confirmDialog, 'dialog-confirm');
    this.cancelButton = qa(this.confirmDialog, 'dialog-cancel');
    this.languageSwitch = qa(page, 'language-switch').first();
    this.resetDemoButton = qa(page, 'reset-demo');
    this.balanceToggle = qa(page, 'balance-toggle');
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async enterDemo(): Promise<void> {
    await this.goto();
    await this.enterDemoButton.click();
  }

  navLink(target: NavTarget): Locator {
    return qa(this.primaryNav, `nav-link-${target}`);
  }

  /** Opens the drawer first when the layout collapses the navigation. */
  async navigateTo(target: NavTarget): Promise<void> {
    if (await this.navToggle.isVisible()) {
      await this.navToggle.click();
    }
    await this.navLink(target).click();
  }

  languageOption(code: LanguageCode): Locator {
    return qa(this.languageSwitch, `language-${code}`);
  }

  async switchLanguage(code: LanguageCode): Promise<void> {
    await this.languageOption(code).click();
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async resetDemo(): Promise<void> {
    await this.resetDemoButton.click();
    await this.confirm();
  }
}
