import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly tone?: 'primary' | 'danger';
}

/** Accessible confirmation dialog backed by Angular Material's a11y plumbing. */
@Component({
  selector: 'fin-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, TranslatePipe],
  host: { 'data-qa': 'confirm-dialog' },
  template: `
    <h2 mat-dialog-title data-qa="dialog-title">{{ data.title }}</h2>
    <div mat-dialog-content>
      <p class="message" data-qa="dialog-message">{{ data.message }}</p>
    </div>
    <div mat-dialog-actions class="actions">
      <button
        type="button"
        class="fin-button fin-button--secondary"
        data-qa="dialog-cancel"
        (click)="dismiss()"
      >
        {{ data.cancelLabel ?? ('dialog.cancel' | translate) }}
      </button>
      <button
        type="button"
        class="fin-button"
        [class.fin-button--primary]="(data.tone ?? 'primary') === 'primary'"
        [class.fin-button--danger]="data.tone === 'danger'"
        cdkFocusInitial
        data-qa="dialog-confirm"
        (click)="confirm()"
      >
        {{ data.confirmLabel }}
      </button>
    </div>
  `,
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);

  confirm(): void {
    this.dialogRef.close(true);
  }

  dismiss(): void {
    this.dialogRef.close(false);
  }
}
