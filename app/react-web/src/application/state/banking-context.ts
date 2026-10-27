import { createContext } from 'react';
import type { BankingDataSource } from '../../data/repositories/banking-data-source';
import type { Card, CardId, CardStatus } from '../../domain/models/card.model';
import type { TransferDraft, Transfer } from '../../domain/models/transfer.model';
import type { BankingState } from './banking-state';

export interface TransferOutcome {
  readonly transfer: Transfer;
  readonly duplicate: boolean;
}

export interface BankingContextValue {
  readonly state: BankingState;
  readonly dataSource: BankingDataSource;
  readonly holderName: string;
  readonly currency: 'EUR' | 'GBP';

  load: (force?: boolean) => void;
  toggleBalances: () => void;
  setCardStatus: (cardId: CardId, status: CardStatus) => Promise<Card>;
  executeTransfer: (draft: TransferDraft, requestToken: string) => Promise<TransferOutcome>;
  resetDemoData: () => Promise<void>;
}

export const BankingContext = createContext<BankingContextValue | null>(null);
