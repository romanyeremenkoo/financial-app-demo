import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CardId, CardStatus } from '../../domain/models/card.model';
import { TransferDraft } from '../../domain/models/transfer.model';
import { BANKING_DATA_SOURCE, BankingSnapshot, TransferExecution } from './banking-data-source';

/**
 * Data access boundary used by the application layer.
 *
 * Everything asynchronous funnels through here, which keeps the store free of
 * transport concerns. The concrete adapter — browser-local demo or the shared
 * Spring Boot API — is selected once by `provideBankingDataSource()`.
 */
@Injectable({ providedIn: 'root' })
export class BankingRepository {
  private readonly source = inject(BANKING_DATA_SOURCE);

  /** Which adapter is active. Used by the shell to label the demo. */
  get mode(): 'demo' | 'api' {
    return this.source.mode;
  }

  /** Only the browser-local demo owns its dataset and can restore it. */
  get supportsReset(): boolean {
    return this.source.supportsReset;
  }

  loadSnapshot(): Observable<BankingSnapshot> {
    return this.source.loadSnapshot();
  }

  setCardStatus(cardId: CardId, status: CardStatus): Observable<BankingSnapshot> {
    return this.source.setCardStatus(cardId, status);
  }

  executeTransfer(draft: TransferDraft, requestToken: string): Observable<TransferExecution> {
    return this.source.executeTransfer(draft, requestToken);
  }

  resetDemoData(): Observable<BankingSnapshot> {
    return this.source.resetDemoData();
  }
}
