/**
 * Picks a value from a `fin-select`.
 *
 * The control is a custom listbox rather than a native `<select>`, so the
 * trigger has to be opened before the option can be clicked.
 */
export const chooseOption = (qaId: string, value: string): void => {
  cy.qa(qaId).click();
  cy.get(`[data-qa="${qaId}-option"][data-value="${value}"]`).click();
};
