import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Installed PWAs on Android close instead of navigating back when the
 * hardware back button/gesture runs out of history entries — and the very
 * last pop past react-router's history doesn't reliably fire `popstate` at
 * all (the OS closes the activity directly), so it can't be caught after
 * the fact. Instead, every time a back press lands us on react-router's
 * bottom-most entry (`idx === 0`), we immediately push another duplicate of
 * it, so a fresh buffer entry always sits between the user and that
 * un-catchable true bottom. As a fallback, if we ever do land on an entry
 * outside react-router's history entirely (no numeric `idx`), we redirect
 * to `homePath` instead of leaving the user on a blank page.
 */
export function useExitGuard(homePath: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const pushedFloor = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode's dev-only double-invoke, which would
    // otherwise push two duplicate entries instead of one.
    if (pushedFloor.current) return;
    pushedFloor.current = true;
    navigate(location.pathname + location.search, { replace: false });
    // Only ever run once, right after this screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const idx = (event.state as { idx?: number } | null)?.idx;
      if (typeof idx !== 'number') {
        navigate(homePath, { replace: false });
        return;
      }
      if (idx === 0) {
        navigate(window.location.pathname + window.location.search, { replace: false });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [homePath, navigate]);
}
