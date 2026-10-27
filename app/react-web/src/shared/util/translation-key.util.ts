import type { AccountType } from '../../domain/models/account.model';
import type { CardStatus } from '../../domain/models/card.model';
import type { TransactionCategory, TransactionStatus } from '../../domain/models/transaction.model';
import type { TransferErrorCode } from '../../domain/models/transfer.model';

/**
 * Bridges the language-free domain enums to the translation dictionary. Keeping
 * the mapping here lets `domain/` stay free of presentation concerns while the
 * key shape remains a single, greppable convention.
 */
export const accountTypeKey = (type: AccountType): string => `accountType.${type}`;

export const cardStatusKey = (status: CardStatus): string => `cardStatus.${status}`;

export const transactionCategoryKey = (category: TransactionCategory): string =>
  `transactionCategory.${category}`;

export const transactionStatusKey = (status: TransactionStatus): string =>
  `transactionStatus.${status}`;

export const transferErrorKey = (code: TransferErrorCode): string => `transferError.${code}`;
