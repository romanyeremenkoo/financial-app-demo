import type { TransactionCategory } from '../../domain/models/transaction.model';

/** Single source for the colour each category uses in chips and charts. */
export const CATEGORY_COLOR: Readonly<Record<TransactionCategory, string>> = {
  groceries: '#315EF5',
  dining: '#18B7A0',
  transport: '#7A5AF8',
  housing: '#0E7090',
  utilities: '#B7791F',
  shopping: '#E4578A',
  health: '#16856B',
  entertainment: '#F2994A',
  income: '#16856B',
  transfer: '#667085',
};
