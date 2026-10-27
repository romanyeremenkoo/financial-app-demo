import type { ReactNode } from 'react';
import { BankingProvider } from '../../application/state/BankingProvider';
import { DemoSessionProvider } from './DemoSessionProvider';
import { FeedbackProvider } from './FeedbackProvider';
import { LanguageProvider } from './LanguageProvider';

/**
 * The single composition point for cross-cutting application context.
 *
 * Order matters: language is outermost because feedback and the banking layer
 * both surface translated text.
 */
export const AppProviders = ({ children }: { readonly children: ReactNode }) => (
  <LanguageProvider>
    <FeedbackProvider>
      <DemoSessionProvider>
        <BankingProvider>{children}</BankingProvider>
      </DemoSessionProvider>
    </FeedbackProvider>
  </LanguageProvider>
);
