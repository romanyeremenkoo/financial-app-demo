export type NavTarget = 'dashboard' | 'accounts' | 'transactions' | 'transfers' | 'analytics';

export type LanguageCode = 'en' | 'ua';

type Element = Cypress.Chainable<JQuery<HTMLElement>>;

/**
 * Application shell: the demo gate, the primary navigation, the language switch
 * and the confirmation overlay every feature reuses.
 *
 * The Cypress mirror of `e2e/playwright/accessors/app.accessor.ts` — same
 * `data-qa` hooks, runner-specific syntax.
 */
export class AppAccessor {
  readonly enterDemoButton = (): Element => cy.qa('enter-demo');

  readonly primaryNav = (): Element => cy.qa('primary-nav');

  readonly confirmDialog = (): Element => cy.qa('confirm-dialog');

  readonly confirmDialogTitle = (): Element => this.confirmDialog().qaIn('dialog-title');

  readonly confirmDialogMessage = (): Element => this.confirmDialog().qaIn('dialog-message');

  readonly languageSwitch = (): Element => cy.qa('language-switch').first();

  readonly goto = (path = '/'): void => {
    cy.visit(path);
  };

  readonly enterDemo = (): void => {
    this.goto();
    this.enterDemoButton().click();
  };

  readonly navLink = (target: NavTarget): Element => this.primaryNav().qaIn(`nav-link-${target}`);

  readonly navigateTo = (target: NavTarget): void => {
    this.navLink(target).click();
  };

  readonly languageOption = (code: LanguageCode): Element =>
    this.languageSwitch().qaIn(`language-${code}`);

  readonly switchLanguage = (code: LanguageCode): void => {
    this.languageOption(code).click();
  };

  readonly confirm = (): void => {
    this.confirmDialog().qaIn('dialog-confirm').click();
  };

  readonly cancel = (): void => {
    this.confirmDialog().qaIn('dialog-cancel').click();
  };
}
