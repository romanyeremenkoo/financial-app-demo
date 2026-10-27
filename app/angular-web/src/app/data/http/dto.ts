import { AccountStatus, AccountType } from '../../domain/models/account.model';
import { CardNetwork, CardStatus } from '../../domain/models/card.model';
import {
  TransactionCategory,
  TransactionDirection,
  TransactionStatus,
} from '../../domain/models/transaction.model';
import { CurrencyCode } from '../../domain/money/currency';

/**
 * Wire shapes defined by `contracts/banking-api.yaml`.
 *
 * They are intentionally separate from the domain models: the transport may
 * change without the domain following it.
 */

export interface MoneyDto {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export interface AccountDto {
  readonly id: string;
  readonly name: string;
  readonly type: AccountType;
  readonly maskedIban: string;
  readonly balance: MoneyDto;
  readonly available: MoneyDto;
  readonly status: AccountStatus;
}

export interface CardDto {
  readonly id: string;
  readonly accountId: string;
  readonly label: string;
  readonly holderName: string;
  readonly maskedNumber: string;
  readonly expiry: string;
  readonly network: CardNetwork;
  readonly status: CardStatus;
}

export interface TransactionDto {
  readonly id: string;
  readonly accountId: string;
  readonly counterparty: string;
  readonly category: TransactionCategory;
  readonly bookedAt: string;
  readonly amount: MoneyDto;
  readonly direction: TransactionDirection;
  readonly status: TransactionStatus;
  readonly reference?: string;
  readonly transferId?: string;
}

export interface TransactionPageDto {
  readonly items: readonly TransactionDto[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface TransferDto {
  readonly id: string;
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: MoneyDto;
  readonly reference?: string;
  readonly createdAt: string;
  readonly status: 'completed';
  readonly debitTransactionId: string;
  readonly creditTransactionId: string;
}

export interface CreateTransferRequestDto {
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: MoneyDto;
  readonly reference?: string;
}

export interface UpdateCardStatusRequestDto {
  readonly status: CardStatus;
}

export interface ErrorDetailDto {
  readonly field: string;
  readonly code: string;
  readonly message?: string;
}

export interface ErrorDto {
  readonly code: string;
  readonly message: string;
  readonly timestamp: string;
  readonly details?: readonly ErrorDetailDto[];
}
