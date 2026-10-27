import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

type FeedbackTone = 'success' | 'error' | 'info';

const DURATION_MS: Readonly<Record<FeedbackTone, number>> = {
  success: 4000,
  error: 6000,
  info: 4000,
};

/**
 * Thin wrapper over Material's snack bar so feedback styling and timings stay
 * consistent and components never touch Material APIs directly.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  private show(message: string, tone: FeedbackTone): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: DURATION_MS[tone],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [`app-snackbar`, `app-snackbar--${tone}`],
    });
  }
}
