import { useContext } from 'react';
import { BankingContext, type BankingContextValue } from '../state/banking-context';

export const useBanking = (): BankingContextValue => {
  const context = useContext(BankingContext);
  if (context === null) {
    throw new Error('useBanking must be used inside <BankingProvider>.');
  }
  return context;
};
