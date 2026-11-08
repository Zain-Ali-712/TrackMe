import { useEffect, useState } from 'react';
import { fetchPlans } from '@/lib/api';
import { PLANS_CHANGED_EVENT, planLockReason, type Plan } from '@/components/goals/UpcomingPlans';

const RECHECK_MS = 2 * 60 * 1000;
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * 'locked' while any plan's start passed without it being started, or its end passed
 * without it being done; 'checking' until the first answer. Re-checks the moment the
 * next start or end time passes.
 */
export function usePlanLock() {
  const [pending, setPending] = useState<Plan[]>([]);
  const [now, setNow] = useState(Date.now());
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchPlans()
        .then((list: Plan[]) => {
          if (!alive) return;
          setPending((list || []).filter((p) => !p.done));
          setNow(Date.now());
          setChecked(true);
        })
        .catch(() => {
          // Keep the last known state; it re-checks soon. Don't block the app if the check itself fails.
          if (alive) setChecked(true);
        });
    };
    const onVisible = () => document.visibilityState === 'visible' && load();

    load();
    const interval = setInterval(load, RECHECK_MS);
    window.addEventListener(PLANS_CHANGED_EVENT, load);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener(PLANS_CHANGED_EVENT, load);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Wake up right as the next start or end time passes, without waiting for the next poll.
  useEffect(() => {
    const times = pending.flatMap((p) => [p.startedAt ? NaN : new Date(p.startAt || '').getTime(), new Date(p.deadline || '').getTime()]);
    const next = times.filter((t) => t > now).sort((a, b) => a - b)[0];
    if (!next) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(next - Date.now() + 500, MAX_TIMEOUT));
    return () => clearTimeout(timer);
  }, [pending, now]);

  if (!checked) return 'checking' as const;
  return pending.some((p) => planLockReason(p, now)) ? ('locked' as const) : ('open' as const);
}
