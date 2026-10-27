import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import './modal.scss';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  readonly titleId: string;
  readonly title: string;
  readonly onClose: () => void;
  readonly qa?: string;
  readonly showCloseButton?: boolean;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * Accessible modal surface.
 *
 * Implemented directly rather than via a component library so the React app
 * carries no widget-framework dependency: it moves focus into the dialog,
 * keeps Tab inside it, restores focus to the trigger on close and supports
 * Escape and backdrop dismissal.
 */
export const Modal = ({
  titleId,
  title,
  onClose,
  qa = 'confirm-dialog',
  showCloseButton = false,
  children,
  footer,
}: ModalProps) => {
  const { t } = useTranslation();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const focusables = useCallback((): readonly HTMLElement[] => {
    const surface = surfaceRef.current;
    if (surface === null) {
      return [];
    }
    return [...surface.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.offsetParent !== null || element === document.activeElement,
    );
  }, []);

  useEffect(() => {
    restoreFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const preferred =
      surfaceRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]') ?? null;
    (preferred ?? surfaceRef.current)?.focus();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, []);

  // Bound imperatively so the dialog container stays a plain, non-interactive
  // element as far as the accessibility linting rules are concerned.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (surface === null) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusables();
      const first = elements.at(0);
      const last = elements.at(-1);
      if (first === undefined || last === undefined) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    surface.addEventListener('keydown', onKeyDown);
    return () => {
      surface.removeEventListener('keydown', onKeyDown);
    };
  }, [focusables, onClose]);

  return createPortal(
    <div className="modal">
      <button
        type="button"
        className="modal__scrim"
        tabIndex={-1}
        aria-hidden="true"
        data-qa="dialog-scrim"
        onClick={onClose}
      />
      {/* The dialog surface is focus-managed by the effect above. */}
      <div
        ref={surfaceRef}
        className="modal__surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-qa={qa}
      >
        <div className="modal__head">
          <h2 className="modal__title" id={titleId} data-qa="dialog-title">
            {title}
          </h2>
          {showCloseButton ? (
            <button
              type="button"
              className="modal__close"
              data-qa="dialog-close"
              aria-label={t('transactions.details.close')}
              onClick={onClose}
            >
              <Icon name="close" size={18} />
            </button>
          ) : null}
        </div>
        <div className="modal__body">{children}</div>
        {footer === undefined ? null : <div className="modal__actions">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
