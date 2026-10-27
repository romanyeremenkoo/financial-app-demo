import { Account } from '../../domain/models/account.model';
import { Card } from '../../domain/models/card.model';
import {
  Transaction,
  TransactionCategory,
  TransactionDirection,
  TransactionStatus,
  affectsBalance,
} from '../../domain/models/transaction.model';
import { CurrencyCode } from '../../domain/money/currency';

export const DEMO_CURRENCY: CurrencyCode = 'EUR';

export const DEMO_HOLDER_NAME = 'Elena Vasquez';

/** Number of months of statement history generated for the demo. */
const HISTORY_MONTHS = 6;

interface AccountSeed {
  readonly id: string;
  readonly name: string;
  readonly type: Account['type'];
  readonly maskedIban: string;
  /** Balance before the generated statement history is applied. */
  readonly openingBalanceMinor: number;
}

const ACCOUNT_SEEDS: readonly AccountSeed[] = [
  {
    id: 'acc-current',
    name: 'Everyday Current',
    type: 'current',
    maskedIban: 'IE29 •••• •••• 4471',
    openingBalanceMinor: 318_540,
  },
  {
    id: 'acc-savings',
    name: 'Reserve Savings',
    type: 'savings',
    maskedIban: 'IE64 •••• •••• 1902',
    openingBalanceMinor: 1_284_000,
  },
  {
    id: 'acc-joint',
    name: 'Household Joint',
    type: 'joint',
    maskedIban: 'IE11 •••• •••• 7765',
    openingBalanceMinor: 141_880,
  },
];

interface EntryTemplate {
  readonly key: string;
  readonly accountId: string;
  readonly counterparty: string;
  readonly category: TransactionCategory;
  readonly direction: TransactionDirection;
  /** Day of month the entry is booked on. */
  readonly day: number;
  readonly baseAmountMinor: number;
  /** Maximum deterministic variation applied per month, in percent. */
  readonly variationPercent: number;
  readonly reference?: string;
}

const ENTRY_TEMPLATES: readonly EntryTemplate[] = [
  {
    key: 'salary',
    accountId: 'acc-current',
    counterparty: 'Northwind Analytics',
    category: 'income',
    direction: 'credit',
    day: 25,
    baseAmountMinor: 325_000,
    variationPercent: 0,
    reference: 'Monthly salary',
  },
  {
    key: 'rent',
    accountId: 'acc-current',
    counterparty: 'Baumann Immobilien',
    category: 'housing',
    direction: 'debit',
    day: 3,
    baseAmountMinor: 118_000,
    variationPercent: 0,
    reference: 'Rent',
  },
  {
    key: 'energy',
    accountId: 'acc-joint',
    counterparty: 'Vattenfall Energie',
    category: 'utilities',
    direction: 'debit',
    day: 8,
    baseAmountMinor: 7_490,
    variationPercent: 18,
  },
  {
    key: 'broadband',
    accountId: 'acc-joint',
    counterparty: 'KPN Broadband',
    category: 'utilities',
    direction: 'debit',
    day: 11,
    baseAmountMinor: 4_250,
    variationPercent: 0,
  },
  {
    key: 'groceries-ah',
    accountId: 'acc-current',
    counterparty: 'Albert Heijn',
    category: 'groceries',
    direction: 'debit',
    day: 5,
    baseAmountMinor: 6_235,
    variationPercent: 22,
  },
  {
    key: 'groceries-lidl',
    accountId: 'acc-joint',
    counterparty: 'Lidl',
    category: 'groceries',
    direction: 'debit',
    day: 12,
    baseAmountMinor: 3_820,
    variationPercent: 25,
  },
  {
    key: 'groceries-carrefour',
    accountId: 'acc-current',
    counterparty: 'Carrefour',
    category: 'groceries',
    direction: 'debit',
    day: 21,
    baseAmountMinor: 5_480,
    variationPercent: 20,
  },
  {
    key: 'coffee',
    accountId: 'acc-current',
    counterparty: 'Café Mokka',
    category: 'dining',
    direction: 'debit',
    day: 7,
    baseAmountMinor: 1_260,
    variationPercent: 30,
  },
  {
    key: 'restaurant',
    accountId: 'acc-current',
    counterparty: 'Trattoria Verdi',
    category: 'dining',
    direction: 'debit',
    day: 18,
    baseAmountMinor: 4_800,
    variationPercent: 28,
  },
  {
    key: 'rail',
    accountId: 'acc-current',
    counterparty: 'NS Rail',
    category: 'transport',
    direction: 'debit',
    day: 9,
    baseAmountMinor: 3_200,
    variationPercent: 15,
  },
  {
    key: 'ride',
    accountId: 'acc-current',
    counterparty: 'Bolt Ride',
    category: 'transport',
    direction: 'debit',
    day: 16,
    baseAmountMinor: 1_475,
    variationPercent: 35,
  },
  {
    key: 'fashion',
    accountId: 'acc-current',
    counterparty: 'Zalando',
    category: 'shopping',
    direction: 'debit',
    day: 14,
    baseAmountMinor: 8_999,
    variationPercent: 40,
  },
  {
    key: 'streaming',
    accountId: 'acc-current',
    counterparty: 'Spotify',
    category: 'entertainment',
    direction: 'debit',
    day: 2,
    baseAmountMinor: 1_099,
    variationPercent: 0,
  },
  {
    key: 'cinema',
    accountId: 'acc-current',
    counterparty: 'Pathé Cinema',
    category: 'entertainment',
    direction: 'debit',
    day: 22,
    baseAmountMinor: 2_400,
    variationPercent: 20,
  },
  {
    key: 'pharmacy',
    accountId: 'acc-current',
    counterparty: 'Apotheek Centraal',
    category: 'health',
    direction: 'debit',
    day: 19,
    baseAmountMinor: 2_740,
    variationPercent: 30,
  },
  {
    key: 'interest',
    accountId: 'acc-savings',
    counterparty: 'Savings Interest',
    category: 'income',
    direction: 'credit',
    day: 28,
    baseAmountMinor: 1_120,
    variationPercent: 12,
    reference: 'Monthly interest',
  },
];

/**
 * Small deterministic hash so the generated history is identical on every run
 * (stable IDs, stable totals, reproducible tests) while still looking organic.
 * FNV-1a over the seed string, reduced to a ratio in `[0, 1)`.
 */
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;
const RATIO_BUCKETS = 1_000;

const deterministicRatio = (seed: string): number => {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return ((hash >>> 0) % RATIO_BUCKETS) / RATIO_BUCKETS;
};

const PERCENT_SCALE = 100;

/** The deterministic ratio is remapped from `[0, 1)` onto `[-1, 1)`. */
const SWING_SPAN = 2;

const MIN_ENTRY_AMOUNT_MINOR = 1;

const variedAmount = (template: EntryTemplate, monthKey: string): number => {
  if (template.variationPercent === 0) {
    return template.baseAmountMinor;
  }
  const ratio = deterministicRatio(`${template.key}:${monthKey}`);
  const swing = (ratio * SWING_SPAN - 1) * (template.variationPercent / PERCENT_SCALE);
  return Math.max(MIN_ENTRY_AMOUNT_MINOR, Math.round(template.baseAmountMinor * (1 + swing)));
};

/** `YYYY-MM` key used for stable transaction IDs and per-month variation. */
const MONTH_DIGITS = 2;

const monthKeyOf = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(MONTH_DIGITS, '0')}`;

/** Entries that only exist in the current month, to exercise non-final states. */
interface ExceptionEntry {
  readonly key: string;
  readonly accountId: string;
  readonly counterparty: string;
  readonly category: TransactionCategory;
  readonly direction: TransactionDirection;
  readonly status: TransactionStatus;
  readonly dayOffset: number;
  readonly amountMinor: number;
  readonly reference?: string;
}

const EXCEPTION_ENTRIES: readonly ExceptionEntry[] = [
  {
    key: 'pending-car-hire',
    accountId: 'acc-current',
    counterparty: 'Hertz Autovermietung',
    category: 'transport',
    direction: 'debit',
    status: 'pending',
    dayOffset: -1,
    amountMinor: 15_000,
    reference: 'Authorisation hold',
  },
  {
    key: 'failed-subscription',
    accountId: 'acc-current',
    counterparty: 'Nimbus Cloud Storage',
    category: 'shopping',
    direction: 'debit',
    status: 'failed',
    dayOffset: -4,
    amountMinor: 1_999,
    reference: 'Card declined',
  },
];

const bookedAtIso = (year: number, monthIndex: number, day: number, hour: number): string =>
  new Date(Date.UTC(year, monthIndex, day, hour)).toISOString();

/** Entries are booked during business hours, spread deterministically by day. */
const FIRST_BOOKING_HOUR = 9;
const BOOKING_HOUR_SPREAD = 8;

const FIRST_DAY_OF_MONTH = 1;

const buildRecurringEntries = (now: Date): readonly Transaction[] =>
  Array.from({ length: HISTORY_MONTHS }, (_, index) => HISTORY_MONTHS - 1 - index).flatMap(
    (offset) => {
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, FIRST_DAY_OF_MONTH),
      );
      const monthKey = monthKeyOf(monthStart);

      return ENTRY_TEMPLATES.map((template) => ({
        template,
        iso: bookedAtIso(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth(),
          template.day,
          FIRST_BOOKING_HOUR + (template.day % BOOKING_HOUR_SPREAD),
        ),
      }))
        .filter(({ iso }) => new Date(iso).getTime() <= now.getTime())
        .map(({ template, iso }) => ({
          id: `txn-${monthKey}-${template.key}`,
          accountId: template.accountId,
          counterparty: template.counterparty,
          category: template.category,
          bookedAt: iso,
          amountMinor: variedAmount(template, monthKey),
          currency: DEMO_CURRENCY,
          direction: template.direction,
          status: 'completed' as const,
          reference: template.reference,
        }));
    },
  );

const buildExceptionEntries = (now: Date): readonly Transaction[] =>
  EXCEPTION_ENTRIES.map((exception) => {
    const booked = new Date(now.getTime());
    booked.setUTCDate(booked.getUTCDate() + exception.dayOffset);
    return {
      id: `txn-${exception.key}`,
      accountId: exception.accountId,
      counterparty: exception.counterparty,
      category: exception.category,
      bookedAt: booked.toISOString(),
      amountMinor: exception.amountMinor,
      currency: DEMO_CURRENCY,
      direction: exception.direction,
      status: exception.status,
      reference: exception.reference,
    };
  });

const buildTransactions = (now: Date): readonly Transaction[] =>
  [...buildRecurringEntries(now), ...buildExceptionEntries(now)].sort((a, b) =>
    b.bookedAt.localeCompare(a.bookedAt),
  );

/**
 * Account balances are derived from the opening balance plus every completed
 * ledger entry, so the seeded data satisfies the same balance invariant the
 * transfer use case must preserve. Available funds additionally reserve
 * pending debits.
 */
const buildAccounts = (transactions: readonly Transaction[]): readonly Account[] =>
  ACCOUNT_SEEDS.map((seed) => {
    const forAccount = transactions.filter((transaction) => transaction.accountId === seed.id);

    const bookedMinor = forAccount
      .filter(affectsBalance)
      .reduce(
        (sum, transaction) =>
          transaction.direction === 'credit'
            ? sum + transaction.amountMinor
            : sum - transaction.amountMinor,
        seed.openingBalanceMinor,
      );

    const pendingHoldsMinor = forAccount
      .filter(
        (transaction) => transaction.status === 'pending' && transaction.direction === 'debit',
      )
      .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

    return {
      id: seed.id,
      name: seed.name,
      type: seed.type,
      maskedIban: seed.maskedIban,
      currency: DEMO_CURRENCY,
      balanceMinor: bookedMinor,
      availableMinor: bookedMinor - pendingHoldsMinor,
      status: 'active' as const,
    };
  });

/** Fictional virtual cards. The digits are display-only and not a real PAN. */
const CARD_SEEDS: readonly Card[] = [
  {
    id: 'card-everyday',
    accountId: 'acc-current',
    label: 'Everyday virtual card',
    holderName: DEMO_HOLDER_NAME,
    maskedNumber: '•••• •••• •••• 4218',
    expiry: '09/29',
    network: 'visa',
    status: 'active',
  },
  {
    id: 'card-household',
    accountId: 'acc-joint',
    label: 'Household virtual card',
    holderName: DEMO_HOLDER_NAME,
    maskedNumber: '•••• •••• •••• 7703',
    expiry: '04/28',
    network: 'mastercard',
    status: 'frozen',
  },
];

export interface DemoDataSet {
  readonly accounts: readonly Account[];
  readonly cards: readonly Card[];
  readonly transactions: readonly Transaction[];
}

/** Builds the full demo dataset relative to `now` (injected for testability). */
export const buildDemoDataSet = (now: Date = new Date()): DemoDataSet => {
  const transactions = buildTransactions(now);
  return {
    accounts: buildAccounts(transactions),
    cards: CARD_SEEDS.map((card) => ({ ...card })),
    transactions,
  };
};
