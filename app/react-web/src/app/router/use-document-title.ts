import { useEffect } from 'react';

/** Keeps the document title in step with the active route. */
export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    document.title = title;
  }, [title]);
};
