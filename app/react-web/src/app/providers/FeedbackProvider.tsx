import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createId } from '../../shared/util/id.util';
import { FeedbackContext, type FeedbackMessage, type FeedbackTone } from './feedback-context';
import './feedback.scss';

const DURATION_MS: Readonly<Record<FeedbackTone, number>> = {
  success: 4000,
  error: 6000,
  info: 4000,
};

/**
 * Application-wide transient feedback.
 *
 * Messages are announced politely rather than interrupting the user, and each
 * one can be dismissed from the keyboard.
 */
export const FeedbackProvider = ({ children }: { readonly children: ReactNode }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<readonly FeedbackMessage[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof globalThis.setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (text: string, tone: FeedbackTone) => {
      const message: FeedbackMessage = { id: createId('msg'), tone, text };
      setMessages((current) => [...current, message]);

      const timer = globalThis.setTimeout(() => {
        dismiss(message.id);
      }, DURATION_MS[tone]);
      timers.current.set(message.id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => {
        globalThis.clearTimeout(timer);
      });
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      messages,
      dismiss,
      success: (text: string) => {
        show(text, 'success');
      },
      error: (text: string) => {
        show(text, 'error');
      },
      info: (text: string) => {
        show(text, 'info');
      },
    }),
    [messages, dismiss, show],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="feedback" role="status" aria-live="polite" data-qa="feedback-region">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`feedback__item feedback__item--${message.tone}`}
            data-qa={`feedback-${message.tone}`}
          >
            <span className="feedback__text">{message.text}</span>
            <button
              type="button"
              className="feedback__dismiss"
              data-qa="feedback-dismiss"
              onClick={() => {
                dismiss(message.id);
              }}
            >
              {t('transactions.details.close')}
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
};
