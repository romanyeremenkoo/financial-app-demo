import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly tone?: 'primary' | 'danger';
  readonly busy?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** Confirmation dialog used before any state-changing demo action. */
export const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Modal
      titleId={titleId}
      title={title}
      qa="confirm-dialog"
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="fin-button fin-button--secondary"
            data-qa="dialog-cancel"
            onClick={onCancel}
          >
            {cancelLabel ?? t('dialog.cancel')}
          </button>
          <button
            type="button"
            className={`fin-button fin-button--${tone}`}
            data-autofocus="true"
            data-qa="dialog-confirm"
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="modal__message" data-qa="dialog-message">
        {message}
      </p>
    </Modal>
  );
};
