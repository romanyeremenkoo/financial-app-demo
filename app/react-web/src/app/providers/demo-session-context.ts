import { createContext, useContext } from 'react';

export interface DemoSessionContextValue {
  readonly isActive: boolean;
  enter: () => void;
  exit: () => void;
}

export const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

export const useDemoSession = (): DemoSessionContextValue => {
  const context = useContext(DemoSessionContext);
  if (context === null) {
    throw new Error('useDemoSession must be used inside <DemoSessionProvider>.');
  }
  return context;
};
