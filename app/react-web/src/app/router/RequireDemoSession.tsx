import type { ReactElement } from 'react';
import { Navigate } from 'react-router';
import { useDemoSession } from '../providers/demo-session-context';

/**
 * Route guard for the product area.
 *
 * This is a demo gate, not authentication: it only ensures the user has passed
 * through the entry screen before seeing the fictional dataset.
 */
export const RequireDemoSession = ({ children }: { readonly children: ReactElement }) => {
  const { isActive } = useDemoSession();
  return isActive ? children : <Navigate to="/welcome" replace />;
};
