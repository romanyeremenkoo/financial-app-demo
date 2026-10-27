import { createContext, useContext } from 'react';

export type FeedbackTone = 'success' | 'error' | 'info';

export interface FeedbackMessage {
  readonly id: string;
  readonly tone: FeedbackTone;
  readonly text: string;
}

export interface FeedbackContextValue {
  readonly messages: readonly FeedbackMessage[];
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  dismiss: (id: string) => void;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const useFeedback = (): FeedbackContextValue => {
  const context = useContext(FeedbackContext);
  if (context === null) {
    throw new Error('useFeedback must be used inside <FeedbackProvider>.');
  }
  return context;
};
