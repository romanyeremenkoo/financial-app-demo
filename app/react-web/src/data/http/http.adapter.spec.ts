import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSourceError, TransferRejectedError } from '../repositories/banking-data-source';
import type { TransferDraft } from '../../domain/models/transfer.model';
import { HttpBankingDataSource } from './http.adapter';
import type { AccountDto, CardDto, TransactionPageDto, TransferDto } from './dto';

const BASE_URL = 'http://localhost:8080/api';

const ACCOUNT: AccountDto = {
  id: 'acc-current',
  name: 'Everyday Current',
  type: 'current',
  maskedIban: 'IE** **** **** 1234',
  balance: { amountMinor: 100_000, currency: 'EUR' },
  available: { amountMinor: 90_000, currency: 'EUR' },
  status: 'active',
};

const CARD: CardDto = {
  id: 'card-everyday',
  accountId: 'acc-current',
  label: 'Everyday card',
  holderName: 'Elena Vasquez',
  maskedNumber: 'â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ 4821',
  expiry: '2028-04',
  network: 'visa',
  status: 'active',
};

const PAGE: TransactionPageDto = {
  items: [
    {
      id: 'txn-1',
      accountId: 'acc-current',
      counterparty: 'Corner Grocer',
      category: 'groceries',
      bookedAt: '2024-05-10T09:00:00.000Z',
      amount: { amountMinor: 1250, currency: 'EUR' },
      direction: 'debit',
      status: 'completed',
    },
  ],
  page: 0,
  size: 500,
  totalItems: 1,
  totalPages: 1,
};

const TRANSFER: TransferDto = {
  id: 'trf-1',
  sourceAccountId: 'acc-current',
  destinationAccountId: 'acc-savings',
  amount: { amountMinor: 2500, currency: 'EUR' },
  createdAt: '2024-05-12T10:00:00.000Z',
  status: 'completed',
  debitTransactionId: 'txn-d',
  creditTransactionId: 'txn-c',
};

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

const snapshotResponder = (url: string): Response | null => {
  if (url.endsWith('/accounts')) {
    return json([ACCOUNT]);
  }
  if (url.endsWith('/cards')) {
    return json([CARD]);
  }
  if (url.includes('/transactions')) {
    return json(PAGE);
  }
  return null;
};

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response | null>>();

const draft: TransferDraft = {
  sourceAccountId: 'acc-current',
  destinationAccountId: 'acc-savings',
  amountMinor: 2500,
  currency: 'EUR',
  reference: '  Rent  ',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpBankingDataSource', () => {
  it('is an api adapter that cannot reset shared server state', async () => {
    const source = new HttpBankingDataSource(BASE_URL);
    expect(source.mode).toBe('api');
    expect(source.supportsReset).toBe(false);
    await expect(source.resetDemoData()).rejects.toMatchObject({ code: 'RESET_UNSUPPORTED' });
  });

  it('maps the API payloads onto domain models', async () => {
    fetchMock.mockImplementation((url) => Promise.resolve(snapshotResponder(url)));

    const snapshot = await new HttpBankingDataSource(BASE_URL).loadSnapshot();

    expect(snapshot.accounts[0]).toMatchObject({
      id: 'acc-current',
      balanceMinor: 100_000,
      availableMinor: 90_000,
      currency: 'EUR',
    });
    expect(snapshot.cards[0]?.id).toBe('card-everyday');
    expect(snapshot.transactions[0]).toMatchObject({ id: 'txn-1', amountMinor: 1250 });
  });

  it('sends the idempotency key and a nested money amount', async () => {
    fetchMock.mockImplementation((url, init) => {
      if (url.endsWith('/transfers') && init?.method === 'POST') {
        return Promise.resolve(json(TRANSFER, { status: 201 }));
      }
      return Promise.resolve(snapshotResponder(url));
    });

    const execution = await new HttpBankingDataSource(BASE_URL).executeTransfer(draft, 'req-9');

    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/transfers'));
    expect(call).toBeDefined();
    const [, init] = call as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('req-9');
    expect(JSON.parse(init.body as string)).toEqual({
      sourceAccountId: 'acc-current',
      destinationAccountId: 'acc-savings',
      amount: { amountMinor: 2500, currency: 'EUR' },
      reference: 'Rent',
    });
    expect(execution.duplicate).toBe(false);
    expect(execution.transfer.id).toBe('trf-1');
  });

  it('reports a replayed transfer as a duplicate', async () => {
    fetchMock.mockImplementation((url, init) => {
      if (url.endsWith('/transfers') && init?.method === 'POST') {
        return Promise.resolve(
          json(TRANSFER, {
            status: 200,
            headers: { 'content-type': 'application/json', 'Idempotency-Replayed': 'true' },
          }),
        );
      }
      return Promise.resolve(snapshotResponder(url));
    });

    const execution = await new HttpBankingDataSource(BASE_URL).executeTransfer(draft, 'req-dup');
    expect(execution.duplicate).toBe(true);
  });

  it('turns a business rejection into a typed transfer error', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          code: 'INSUFFICIENT_FUNDS',
          message: 'Not enough available funds.',
          timestamp: '2024-05-12T10:00:00.000Z',
        },
        { status: 422 },
      ),
    );

    await expect(
      new HttpBankingDataSource(BASE_URL).executeTransfer(draft, 'req-x'),
    ).rejects.toBeInstanceOf(TransferRejectedError);
  });

  it('surfaces a network failure as unavailable rather than falling back', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await new HttpBankingDataSource(BASE_URL).loadSnapshot().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DataSourceError);
    expect((error as DataSourceError).kind).toBe('unavailable');
    expect((error as DataSourceError).code).toBe('API_UNAVAILABLE');
  });

  it('maps a 404 to a not-found error', async () => {
    fetchMock.mockResolvedValue(
      json(
        { code: 'CARD_NOT_FOUND', message: 'Unknown card.', timestamp: '2024-05-12T10:00:00.000Z' },
        { status: 404 },
      ),
    );

    const error = await new HttpBankingDataSource(BASE_URL)
      .setCardStatus('card-nope', 'frozen')
      .catch((e: unknown) => e);

    expect((error as DataSourceError).kind).toBe('not-found');
  });

  it('re-reads the snapshot after a card status change', async () => {
    fetchMock.mockImplementation((url, init) => {
      if (url.includes('/cards/') && init?.method === 'PATCH') {
        return Promise.resolve(json({ ...CARD, status: 'frozen' }));
      }
      return Promise.resolve(snapshotResponder(url));
    });

    await new HttpBankingDataSource(BASE_URL).setCardStatus('card-everyday', 'frozen');

    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/accounts'))).toHaveLength(1);
  });

  it('reports health', async () => {
    fetchMock.mockResolvedValue(json({ status: 'UP' }));
    await expect(new HttpBankingDataSource(BASE_URL).checkHealth()).resolves.toBe(true);

    fetchMock.mockRejectedValue(new TypeError('down'));
    await expect(new HttpBankingDataSource(BASE_URL).checkHealth()).resolves.toBe(false);
  });
});
