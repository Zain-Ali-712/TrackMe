export const LOCATIONS = ['Lib', 'Fyp1', 'Fyp2', 'C block', 'Lec time', 'Sofa', 'Room'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
};
export const addDays = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + days));
};

export const longDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};
export const shortDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};
export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
};
export const formatTime = (time?: string) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${suffix}`;
};

/** GitHub greens for "done" marks, matching the habit grid. */
export const DONE_CLASSES = 'border-transparent bg-[#116329] text-white dark:bg-[#56d364] dark:text-slate-950';
