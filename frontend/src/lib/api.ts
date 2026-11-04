import { getToken, setToken, clearToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** Fired when the server rejects the session, so the app can bounce to /login. */
const SESSION_EXPIRED_EVENT = 'trackme:session-expired';

export function onSessionExpired(handler: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

export async function login(password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || 'Incorrect password');
  }

  setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });
  } catch {
    /* logging out locally is what matters */
  }
  clearToken();
  responseCache.clear();
}

/** Read a token's expiry without the server; the token is "<base64url JSON>.<signature>". */
function tokenExpiresAt(token: string): number {
  try {
    const payload = token.slice(0, token.lastIndexOf('.')).replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * Decide on boot whether the stored session is usable. An unexpired token lets
 * the app open straight away; the server still checks it in the background,
 * and any 401 later signs the user out.
 */
export async function verifySession(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  if (tokenExpiresAt(token) > Date.now()) {
    checkSessionWithServer(token);
    return true;
  }
  clearToken();
  return false;
}

function checkSessionWithServer(token: string) {
  fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    .then((response) => {
      if (response.status === 401 && getToken() === token) {
        clearToken();
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    })
    .catch(() => {
      /* offline: keep the session */
    });
}

const REQUEST_TIMEOUT_MS = 20000;
const RETRY_DELAYS_MS = [700, 2000];
const CACHE_TTL_MS = 30000;
// Statuses worth retrying: the server or its database was briefly unavailable.
const RETRYABLE = new Set([502, 503, 504]);

/** Recent GET responses, so moving between pages doesn't refetch what was just loaded. */
const responseCache = new Map<string, { at: number; data: unknown }>();
/** GETs in flight, so two components asking for the same thing share one request. */
const inFlight = new Map<string, Promise<unknown>>();
/** Bumped by every write; a GET that started before a write must not refill the cache with old data. */
let cacheGeneration = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = <T,>(data: T): T => (data === null || typeof data !== 'object' ? data : structuredClone(data));

class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request(url: string, options: RequestInit) {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new HttpError(errorData?.message || `API Error: ${response.status} ${response.statusText}`, response.status);
    }

    return response.json();
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new HttpError('The server took too long to respond', 504);
    if (error instanceof HttpError) throw error;
    throw new HttpError('Could not reach the server', 0); // offline or the request never landed
  } finally {
    clearTimeout(timer);
  }
}

/** GETs retry a couple of times on network hiccups and cold starts; writes never retry, so nothing is saved twice. */
async function requestWithRetry(url: string, options: RequestInit) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request(url, options);
    } catch (error: any) {
      const retryable = error instanceof HttpError && (error.status === 0 || RETRYABLE.has(error.status));
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw error;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  if (method !== 'GET') {
    try {
      return await request(url, options);
    } finally {
      // Anything cached may now be out of date, even if the write failed halfway.
      cacheGeneration += 1;
      responseCache.clear();
      inFlight.clear();
    }
  }

  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return copy(cached.data);

  let pending = inFlight.get(url);
  if (!pending) {
    const generation = cacheGeneration;
    const current: Promise<unknown> = requestWithRetry(url, options)
      .then((data) => {
        if (generation === cacheGeneration) responseCache.set(url, { at: Date.now(), data });
        return data;
      })
      .finally(() => {
        if (inFlight.get(url) === current) inFlight.delete(url);
      });
    pending = current;
    inFlight.set(url, pending);
  }
  return copy(await pending);
}

/** Forget cached GET responses, e.g. after signing out. */
export const clearApiCache = () => responseCache.clear();

// Niches
export const fetchNiches = () => fetchAPI('/niches');
export const createNiche = (data: any) => fetchAPI('/niches', { method: 'POST', body: JSON.stringify(data) });
export const updateNiche = (id: string, data: any) => fetchAPI(`/niches/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteNiche = (id: string) => fetchAPI(`/niches/${id}`, { method: 'DELETE' });
export const reorderNiches = (order: any) => fetchAPI('/niches/reorder', { method: 'PUT', body: JSON.stringify(order) });

// Leads
export const fetchLeads = (params?: Record<string, string>) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return fetchAPI(`/leads${query ? `?${query}` : ''}`);
};
export const fetchAllLeads = () => fetchAPI('/leads/all');
export const createLead = (data: any) => fetchAPI('/leads', { method: 'POST', body: JSON.stringify(data) });
export const updateLead = (id: string, data: any) => fetchAPI(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteLead = (id: string) => fetchAPI(`/leads/${id}`, { method: 'DELETE' });
export const batchDeleteLeads = (ids: string[]) => fetchAPI('/leads/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) });
export const fetchLeadStats = () => fetchAPI('/leads/stats');
export const fetchNicheStats = (nicheId?: string, month?: string) => {
  const params = new URLSearchParams();
  if (nicheId && nicheId !== 'all') params.append('nicheId', nicheId);
  if (month && month !== 'all') params.append('month', month);
  const qs = params.toString();
  return fetchAPI(`/leads/niche-stats${qs ? `?${qs}` : ''}`);
};

// Appointments
export const fetchAppointments = (params?: Record<string, string>) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return fetchAPI(`/appointments${query ? `?${query}` : ''}`);
};
export const createAppointment = (data: any) => fetchAPI('/appointments', { method: 'POST', body: JSON.stringify(data) });
export const updateAppointment = (id: string, data: any) => fetchAPI(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAppointment = (id: string) => fetchAPI(`/appointments/${id}`, { method: 'DELETE' });

// Habits
export const fetchHabits = () => fetchAPI('/habits');
export const createHabit = (data: any) => fetchAPI('/habits', { method: 'POST', body: JSON.stringify(data) });
export const updateHabit = (id: string, data: any) => fetchAPI(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHabit = (id: string) => fetchAPI(`/habits/${id}`, { method: 'DELETE' });
export const fetchMonthHabitData = (year: number, month: number) => fetchAPI(`/habits/month?year=${year}&month=${month}`);
/** Mark (or clear) a habit for a day. `level` is 1 light, 2 medium, 3 dark. */
export const toggleHabitLog = (habitId: string, date: string, completed: boolean, level?: number, value?: number) =>
  fetchAPI('/habits/toggle', { method: 'POST', body: JSON.stringify({ habitId, date, completed, level, value }) });

// Goals
export const fetchDailyGoals = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const qs = params.toString();
  return fetchAPI(`/goals/daily${qs ? `?${qs}` : ''}`);
};
export const createDailyGoal = (data: { date: string; text: string; time?: string; location?: string }) =>
  fetchAPI('/goals/daily', { method: 'POST', body: JSON.stringify(data) });
export const updateDailyGoal = (id: string, data: any) =>
  fetchAPI(`/goals/daily/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDailyGoal = (id: string) => fetchAPI(`/goals/daily/${id}`, { method: 'DELETE' });

export const fetchMonthlyGoals = (count = 6) => fetchAPI(`/goals/monthly?count=${count}`);
export const createMonthlyGoal = (data: { month: string; text: string }) =>
  fetchAPI('/goals/monthly', { method: 'POST', body: JSON.stringify(data) });
export const updateMonthlyGoal = (id: string, data: any) =>
  fetchAPI(`/goals/monthly/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMonthlyGoal = (id: string) => fetchAPI(`/goals/monthly/${id}`, { method: 'DELETE' });

export const createAchievement = (data: { title: string; date: string; details?: string }) =>
  fetchAPI('/goals/achievements', { method: 'POST', body: JSON.stringify(data) });
export const updateAchievement = (id: string, data: { title?: string; details?: string }) =>
  fetchAPI(`/goals/achievements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAchievement = (id: string) => fetchAPI(`/goals/achievements/${id}`, { method: 'DELETE' });
export const saveMonthlyJournal = (month: string, content: string) =>
  fetchAPI(`/goals/journal/${month}`, { method: 'PUT', body: JSON.stringify({ content }) });

export const fetchDreams = () => fetchAPI('/goals/dreams');
export const createDream = (data: any) => fetchAPI('/goals/dreams', { method: 'POST', body: JSON.stringify(data) });
export const updateDream = (id: string, data: any) =>
  fetchAPI(`/goals/dreams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDream = (id: string) => fetchAPI(`/goals/dreams/${id}`, { method: 'DELETE' });
export const updateDailyMetric = (data: {
  date: string;
  sleepHours?: number;
  notes?: string;
  calories?: number;
  protein?: number;
  workoutStatus?: string;
}) => fetchAPI('/habits/metric', { method: 'POST', body: JSON.stringify(data) });


export const fetchPlans = () => fetchAPI('/goals/plans');
export const createPlan = (data: { title: string; content: string; deadline: string }) =>
  fetchAPI('/goals/plans', { method: 'POST', body: JSON.stringify(data) });
export const updatePlan = (id: string, data: { title?: string; content?: string; done?: boolean }) =>
  fetchAPI(`/goals/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePlan = (id: string) => fetchAPI(`/goals/plans/${id}`, { method: 'DELETE' });
