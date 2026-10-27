import { Injectable, Signal, computed, signal } from '@angular/core';
import { readDemoSessionFlag, writeDemoSessionFlag } from './demo-session.storage';

/**
 * Lightweight stand-in for authentication.
 *
 * There is no credential handling: entering the demo simply marks the session
 * as active and unlocks the product routes. The flag survives a page reload so
 * deep links keep working during a demo.
 */
@Injectable({ providedIn: 'root' })
export class DemoSessionService {
  private readonly activeState = signal<boolean>(readDemoSessionFlag());

  readonly isActive: Signal<boolean> = this.activeState.asReadonly();
  readonly isLocked = computed(() => !this.activeState());

  enter(): void {
    this.setActive(true);
  }

  exit(): void {
    this.setActive(false);
  }

  private setActive(value: boolean): void {
    this.activeState.set(value);
    writeDemoSessionFlag(value);
  }
}
