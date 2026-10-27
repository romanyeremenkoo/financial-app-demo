import { Account } from '../models/account.model';
import {
  Transaction,
  TransactionCategory,
  affectsBalance,
  isInternalTransfer,
} from '../models/transaction.model';
import { CurrencyCode } from '../money/currency';
import { Money, money, percentageShare } from '../money/money';

/** Inclusive-start, exclusive-end ISO period used by every aggregation. */
export interface DateRange {
  readonly startIso: string;
  readonly endIso: string;
}

const FIRST_DAY_OF_MONTH = 1;

/** Length of the `YYYY-MM` prefix of an ISO date. */
const MONTH_KEY_LENGTH = 7;

export const monthRange = (reference: Date, monthsAgo = 0): DateRange => {
  const start = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - monthsAgo, FIRST_DAY_OF_MONTH),
  );
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, FIRST_DAY_OF_MONTH),
  );
  return { startIso: start.toISOString(), endIso: end.toISOString() };
};

export const isWithin = (range: DateRange, isoDate: string): boolean =>
  isoDate >= range.startIso && isoDate < range.endIso;

const sumAccounts = (
  accounts: readonly Account[],
  currency: CurrencyCode,
  pick: (account: Account) => number,
): Money =>
  money(
    accounts
      .filter((account) => account.currency === currency && account.status === 'active')
      .reduce((sum, account) => sum + pick(account), 0),
    currency,
  );

/**
 * Total balance across accounts. All demo accounts share one currency; any
 * account in a different currency is excluded rather than silently converted.
 */
export const totalBalance = (accounts: readonly Account[], currency: CurrencyCode): Money =>
  sumAccounts(accounts, currency, (account) => account.balanceMinor);

export const totalAvailable = (accounts: readonly Account[], currency: CurrencyCode): Money =>
  sumAccounts(accounts, currency, (account) => account.availableMinor);

export interface PeriodTotals {
  readonly income: Money;
  readonly expenses: Money;
  readonly net: Money;
}

/**
 * Internal transfers are excluded from every statement figure: they move money
 * between the user's own accounts and would otherwise inflate both sides.
 */
const countsTowardsStatement = (
  transaction: Transaction,
  range: DateRange,
  currency: CurrencyCode,
): boolean =>
  transaction.currency === currency &&
  affectsBalance(transaction) &&
  !isInternalTransfer(transaction) &&
  isWithin(range, transaction.bookedAt);

export const periodTotals = (
  transactions: readonly Transaction[],
  range: DateRange,
  currency: CurrencyCode,
): PeriodTotals => {
  const relevant = transactions.filter((transaction) =>
    countsTowardsStatement(transaction, range, currency),
  );

  const incomeMinor = relevant
    .filter((transaction) => transaction.direction === 'credit')
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

  const expensesMinor = relevant
    .filter((transaction) => transaction.direction === 'debit')
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

  return {
    income: money(incomeMinor, currency),
    expenses: money(expensesMinor, currency),
    net: money(incomeMinor - expensesMinor, currency),
  };
};

export interface CategorySpend {
  readonly category: TransactionCategory;
  readonly total: Money;
  /** Share of total spending in the period, 0-100 with one decimal. */
  readonly share: number;
}

/** Expense totals grouped by category, descending, excluding transfers. */
export const spendingByCategory = (
  transactions: readonly Transaction[],
  range: DateRange,
  currency: CurrencyCode,
): readonly CategorySpend[] => {
  const totals = transactions
    .filter(
      (transaction) =>
        transaction.direction === 'debit' && countsTowardsStatement(transaction, range, currency),
    )
    .reduce<Map<TransactionCategory, number>>(
      (acc, transaction) =>
        acc.set(
          transaction.category,
          (acc.get(transaction.category) ?? 0) + transaction.amountMinor,
        ),
      new Map(),
    );

  const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return [...totals.entries()]
    .map(([category, amountMinor]) => ({
      category,
      total: money(amountMinor, currency),
      share: percentageShare(amountMinor, grandTotal),
    }))
    .sort((a, b) => b.total.amountMinor - a.total.amountMinor);
};

export interface MonthlyPoint {
  /** `YYYY-MM` key of the month; the presentation layer formats it for display. */
  readonly month: string;
  readonly income: Money;
  readonly expenses: Money;
}

/** Income/expense series for the last `months` months, oldest first. */
export const monthlySeries = (
  transactions: readonly Transaction[],
  reference: Date,
  currency: CurrencyCode,
  months: number,
): readonly MonthlyPoint[] =>
  Array.from({ length: months }, (_, index) => {
    const range = monthRange(reference, months - 1 - index);
    const totals = periodTotals(transactions, range, currency);
    return {
      month: range.startIso.slice(0, MONTH_KEY_LENGTH),
      income: totals.income,
      expenses: totals.expenses,
    };
  });
