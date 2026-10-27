import { qaSelector } from '../../qa';

declare global {
  /* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars --
     Cypress declares `namespace Cypress { interface Chainable<Subject = any> }`; declaration
     merging only applies when the augmented shape matches it exactly. */
  namespace Cypress {
    interface Chainable<Subject = any> {
      /** Resolves an element by its `data-qa` value, from the document root. */
      qa(id: string, options?: Partial<Timeoutable>): Chainable<JQuery<HTMLElement>>;
      /** Resolves a `data-qa` value inside the current subject. */
      qaIn(id: string, options?: Partial<Timeoutable>): Chainable<JQuery<HTMLElement>>;
      /**
       * Asserts on the element text with surrounding whitespace collapsed, which
       * is what a user actually sees. Retries like any built-in assertion.
       */
      shouldHaveTrimmedText(expected: string): Chainable<JQuery<HTMLElement>>;
    }
  }
  /* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
}

Cypress.Commands.add('qa', (id: string, options: Partial<Cypress.Timeoutable> = {}) =>
  cy.get(qaSelector(id), options),
);

Cypress.Commands.add(
  'qaIn',
  { prevSubject: 'element' },
  (subject: JQuery<HTMLElement>, id: string, options: Partial<Cypress.Timeoutable> = {}) =>
    cy.wrap(subject, { log: false }).find(qaSelector(id), options),
);

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

Cypress.Commands.add(
  'shouldHaveTrimmedText',
  { prevSubject: 'element' },
  (subject: JQuery<HTMLElement>, expected: string) =>
    cy.wrap(subject, { log: false }).should(($element) => {
      expect(collapseWhitespace($element.text())).to.equal(expected);
    }),
);

export {};
