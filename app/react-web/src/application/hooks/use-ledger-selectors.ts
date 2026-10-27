import { useMemo } from 'react';
import {
  type CategorySpend,
  type MonthlyPoint,
  type PeriodTotals,
  monthRange,
  monthlySeries,
  periodTotals,
  spendingByCategory,
  totalAvailable,
  totalBalance,
} from '../../domain/analytics/analytics';
import type { Account } from '../../domain/models/account.model';
import type { Transaction } from '../../domain/models/transaction.model';
import type { Money } from '../../domain/money/money';
import { ANALYTICS_MONTHS, RECENT_TRANSACTION_COUNT, mostRecent } from '../state/banking-state';
import { useBanking } from './use-banking';

export interface LedgerSelectors {
  readonly totalBalance: Money;
  readonly totalAvailable: Money;
  readonly currentMonthTotals: PeriodTotals;
  readonly currentMonthSpending: readonly CategorySpend[];
  readonly monthlySeries: readonly MonthlyPoint[];
  readonly recentTransactions: readonly Transaction[];
  readonly eligibleAccounts: readonly Account[];
}

/**
 * Every aggregate the product displays, derived from canonical state.
 *
 * Keeping the derivations here means a dashboard figure and an analytics
 * figure can never be computed by two different rules.
 */
export const useLedgerSelectors = (reference: Date = new Date()): LedgerSelectors => {
  const { state, currency } = useBanking();
  const { accounts, transactions } = state;
  const referenceTime = reference.getTime();

  return useMemo(() => {
    const now = new Date(referenceTime);
    const thisMonth = monthRange(now);

    return {
      totalBalance: totalBalance(accounts, currency),
      totalAvailable: totalAvailable(accounts, currency),
      currentMonthTotals: periodTotals(transactions, thisMonth, currency),
      currentMonthSpending: spendingByCategory(transactions, thisMonth, currency),
      monthlySeries: monthlySeries(transactions, now, currency, ANALYTICS_MONTHS),
      recentTransactions: mostRecent(transactions, RECENT_TRANSACTION_COUNT),
      eligibleAccounts: accounts.filter((account) => account.status === 'active'),
    };
  }, [accounts, transactions, currency, referenceTime]);
};
