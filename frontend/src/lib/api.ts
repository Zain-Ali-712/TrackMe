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
}

/** Validate a stored token on boot so a stale session doesn't flash the UI. */
export async function verifySession(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      clearToken();
      return false;
    }
    return true;
  } catch {
    // A network failure shouldn't log the user out; keep the token.
    return true;
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const token = getToken();

  const response = await fetch(url, {
    ...options,
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
    throw new Error(errorData?.message || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

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
export const toggleHabitLog = (habitId: string, date: string, completed: boolean) => 
  fetchAPI('/habits/toggle', { method: 'POST', body: JSON.stringify({ habitId, date, completed }) });
export const updateDailyMetric = (data: {
  date: string;
  sleepHours?: number;
  notes?: string;
  calories?: number;
  protein?: number;
  workoutStatus?: string;
}) => fetchAPI('/habits/metric', { method: 'POST', body: JSON.stringify(data) });

