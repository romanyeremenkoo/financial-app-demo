import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { DemoSessionService } from './demo-session.service';

/** Blocks the product area until the visitor has entered the demo. */
export const demoSessionGuard: CanActivateFn = (): boolean | UrlTree => {
  const session = inject(DemoSessionService);
  const router = inject(Router);
  return session.isActive() ? true : router.createUrlTree(['/welcome']);
};
