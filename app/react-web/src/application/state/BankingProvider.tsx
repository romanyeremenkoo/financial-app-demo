import { type ReactNode, useCallback, useMemo, useReducer, useRef, useState } from 'react';
import {
  type BankingDataSource,
  DataSourceError,
} from '../../data/repositories/banking-data-source';
import { createBankingDataSource } from '../../data/repositories/create-data-source';
import { DEMO_CURRENCY, DEMO_HOLDER_NAME } from '../../data/demo/demo-data';
import type { Card, CardId, CardStatus } from '../../domain/models/card.model';
import type { TransferDraft } from '../../domain/models/transfer.model';
import {
  API_UNAVAILABLE_FAILURE,
  GENERIC_LOAD_FAILURE,
  bankingReducer,
  initialBankingState,
} from './banking-state';
import { BankingContext, type TransferOutcome } from './banking-context';

const toFailure = (error: unknown) =>
  error instanceof DataSourceError && error.kind === 'unavailable'
    ? API_UNAVAILABLE_FAILURE
    : GENERIC_LOAD_FAILURE;

export interface BankingProviderProps {
  readonly children: ReactNode;
  /** Injected in tests; production wires the configured adapter. */
  readonly dataSource?: BankingDataSource;
}

/**
 * Wires exactly one data adapter into the application and owns the canonical
 * ledger state. Components consume it through `useBanking`, never directly.
 */
export const BankingProvider = ({ children, dataSource }: BankingProviderProps) => {
  const [state, dispatch] = useReducer(bankingReducer, initialBankingState);

  // Lazy state rather than a ref: the adapter is created exactly once and is
  // safe to read during render.
  const [source] = useState<BankingDataSource>(() => dataSource ?? createBankingDataSource());

  /** Guards against the double invocation of effects in React strict mode. */
  const inFlightLoad = useRef(false);
  /** Keeps the bootstrap load a one-shot, so a failure cannot retry forever. */
  const loadRequested = useRef(false);

  const load = useCallback(
    (force = false) => {
      if (inFlightLoad.current || (!force && loadRequested.current)) {
        return;
      }
      inFlightLoad.current = true;
      loadRequested.current = true;
      dispatch({ type: 'load/started' });

      source
        .loadSnapshot()
        .then((snapshot) => {
          dispatch({ type: 'load/succeeded', snapshot });
        })
        .catch((error: unknown) => {
          dispatch({ type: 'load/failed', failure: toFailure(error) });
        })
        .finally(() => {
          inFlightLoad.current = false;
        });
    },
    [source],
  );

  const toggleBalances = useCallback(() => {
    dispatch({ type: 'balances/toggled' });
  }, []);

  const setCardStatus = useCallback(
    async (cardId: CardId, status: CardStatus): Promise<Card> => {
      const snapshot = await source.setCardStatus(cardId, status);
      dispatch({ type: 'snapshot/committed', snapshot });

      const updated = snapshot.cards.find((card) => card.id === cardId);
      if (updated === undefined) {
        throw new DataSourceError('not-found', 'CARD_NOT_FOUND', `Unknown card: ${cardId}`);
      }
      return updated;
    },
    [source],
  );

  const executeTransfer = useCallback(
    async (draft: TransferDraft, requestToken: string): Promise<TransferOutcome> => {
      const execution = await source.executeTransfer(draft, requestToken);
      dispatch({ type: 'snapshot/committed', snapshot: execution.snapshot });
      dispatch({ type: 'transfer/recorded', transfer: execution.transfer });
      return { transfer: execution.transfer, duplicate: execution.duplicate };
    },
    [source],
  );

  const resetDemoData = useCallback(async (): Promise<void> => {
    const snapshot = await source.resetDemoData();
    dispatch({ type: 'load/succeeded', snapshot });
  }, [source]);

  const value = useMemo(
    () => ({
      state,
      dataSource: source,
      holderName: DEMO_HOLDER_NAME,
      currency: DEMO_CURRENCY,
      load,
      toggleBalances,
      setCardStatus,
      executeTransfer,
      resetDemoData,
    }),
    [state, source, load, toggleBalances, setCardStatus, executeTransfer, resetDemoData],
  );

  return <BankingContext.Provider value={value}>{children}</BankingContext.Provider>;
};
