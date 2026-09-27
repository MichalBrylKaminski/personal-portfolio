/** Calendar month used for resume maths; JSON Resume dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
export interface YearMonth {
  year: number;
  month: number; // 1–12
}

/** The build date: the site is static, so "now" is when it was last built. */
const today = new Date();
export const NOW: YearMonth = { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };

export function parseYearMonth(value: string): YearMonth {
  const [year, month = '1'] = value.split('-');
  return { year: Number(year), month: Number(month) };
}

export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return (to.year - from.year) * 12 + (to.month - from.month);
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year - b.year || a.month - b.month;
}

/** 126 → "10 yrs 6 mos", 12 → "1 yr", 2 → "2 mos". */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (rest || !years) parts.push(`${rest} ${rest === 1 ? 'mo' : 'mos'}`);
  return parts.join(' ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 2016" */
export function formatYearMonth({ year, month }: YearMonth): string {
  return `${MONTHS[month - 1]} ${year}`;
}

/** "16 Dec 2024" */
export function formatDay(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
