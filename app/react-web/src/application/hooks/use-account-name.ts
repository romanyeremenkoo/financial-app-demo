import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccountId } from '../../domain/models/account.model';
import { useBanking } from './use-banking';

/**
 * Resolves an account id to its display name, falling back to a translated
 * placeholder so a stale reference can never render a raw identifier.
 */
export const useAccountName = (): ((accountId: AccountId) => string) => {
  const { t } = useTranslation();
  const { state } = useBanking();

  const names = useMemo(
    () => new Map(state.accounts.map((account) => [account.id, account.name])),
    [state.accounts],
  );

  return useCallback(
    (accountId: AccountId) => names.get(accountId) ?? t('accounts.unknownAccount'),
    [names, t],
  );
};
