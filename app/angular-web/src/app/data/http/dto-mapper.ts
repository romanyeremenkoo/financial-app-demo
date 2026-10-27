import { Account } from '../../domain/models/account.model';
import { Card } from '../../domain/models/card.model';
import { Transaction } from '../../domain/models/transaction.model';
import { Transfer } from '../../domain/models/transfer.model';
import { AccountDto, CardDto, TransactionDto, TransferDto } from './dto';

/** Wire -> domain mapping. Minor units and currency pass through untouched. */

export const toAccount = (dto: AccountDto): Account => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  maskedIban: dto.maskedIban,
  currency: dto.balance.currency,
  balanceMinor: dto.balance.amountMinor,
  availableMinor: dto.available.amountMinor,
  status: dto.status,
});

export const toCard = (dto: CardDto): Card => ({
  id: dto.id,
  accountId: dto.accountId,
  label: dto.label,
  holderName: dto.holderName,
  maskedNumber: dto.maskedNumber,
  expiry: dto.expiry,
  network: dto.network,
  status: dto.status,
});

export const toTransaction = (dto: TransactionDto): Transaction => ({
  id: dto.id,
  accountId: dto.accountId,
  counterparty: dto.counterparty,
  category: dto.category,
  bookedAt: dto.bookedAt,
  amountMinor: dto.amount.amountMinor,
  currency: dto.amount.currency,
  direction: dto.direction,
  status: dto.status,
  reference: dto.reference,
  transferId: dto.transferId,
});

/**
 * The server owns the transfer identity; `requestToken` is the idempotency key
 * the client sent, carried back into the domain model so a replay is
 * recognisable locally too.
 */
export const toTransfer = (dto: TransferDto, requestToken: string): Transfer => ({
  id: dto.id,
  sourceAccountId: dto.sourceAccountId,
  destinationAccountId: dto.destinationAccountId,
  amountMinor: dto.amount.amountMinor,
  currency: dto.amount.currency,
  reference: dto.reference,
  createdAt: dto.createdAt,
  status: dto.status,
  debitTransactionId: dto.debitTransactionId,
  creditTransactionId: dto.creditTransactionId,
  requestToken,
});
