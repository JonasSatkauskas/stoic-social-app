import { dateKey } from '../../lib/dates';
import type { AppData, DayEntry } from '../../lib/types';

/** Demo mode is on only when the app is opened with ?demo in the address. */
export function demoModeEnabled(): boolean {
  return new URLSearchParams(window.location.search).has('demo');
}

/**
 * A day added by the demo shortcut. Older demo days have no flag, but a real
 * completion is always recorded on its own date, so a mismatch gives them away.
 */
export function isDemoDay(key: string, e: DayEntry): boolean {
  if (e.demo) return true;
  return !!e.done && dateKey(new Date(e.done.at)) !== key;
}

export function countDemoDays(data: AppData): number {
  return Object.entries(data.days).filter(([k, e]) => isDemoDay(k, e)).length;
}

export function withoutDemoDays(data: AppData): AppData {
  return { ...data, days: Object.fromEntries(Object.entries(data.days).filter(([k, e]) => !isDemoDay(k, e))) };
}
