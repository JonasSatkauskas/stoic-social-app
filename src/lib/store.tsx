import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { challengeById, challengeForDate, swapForDate } from '../features/today/challenges';
import { demoModeEnabled, withoutDemoDays } from '../features/today/demo';
import { bumpStreak } from '../features/today/streak';
import { cairnFromData } from '../features/cairn/growth';
import { addDays, dateKey } from './dates';
import { loadSecure, loadStreak, requestPersistence, saveSecure, saveStreak, type Streak } from './db';
import type { AppData, CairnState, Challenge, DayEntry, Level } from './types';

export type Tab = 'today' | 'talk' | 'grove' | 'notes' | 'settings';

/** Handed to the Notes screen: a pen prompt (no paper nearby) or a Talk reflection. */
export interface NotesDraft {
  prompt?: string;
  text?: string;
}

interface Store {
  ready: boolean;
  today: string;
  data: AppData;
  streak: Streak;
  cairn: CairnState;
  todayEntry: DayEntry;
  challenge: Challenge;
  /** Increments whenever the cairn grows, so it can animate. */
  growTick: number;
  tab: Tab;
  /** Text handed to the Notes screen (a pen prompt, or a Talk reflection). */
  notesDraft: NotesDraft | null;
  go(tab: Tab, notesDraft?: NotesDraft | null): void;
  swap(): Promise<void>;
  complete(level: Level, indoor: boolean): Promise<void>;
  pen(result: 'wrote' | 'skipped'): Promise<void>;
  setName(name: string): Promise<void>;
  addExtra(stones: number, marks: number): Promise<void>;
  /** Demo only: fill the five most recent empty past days with completions. */
  devFillHistory(): Promise<void>;
  removeDemoDays(): Promise<void>;
  /** Clears the day log, growth and streak. Keeps notes, friends and name. */
  resetCairn(): Promise<void>;
  /** The daily quote threshold has been passed. */
  markQuote(kind: 'seen' | 'copied'): Promise<void>;
  /** Carve one word on today's stone, or null to skip. */
  carveWord(word: string | null): Promise<void>;
  setFlag(name: string, value: boolean): Promise<void>;
  /** True while today's quote threshold should be shown. */
  thresholdPending: boolean;
  replaceData(data: AppData): Promise<void>;
}

const emptyData = (): AppData => ({
  days: {},
  extra: { stones: 0, marks: 0 },
  profile: { name: null },
  createdAt: Date.now(),
});

const Ctx = createContext<Store | null>(null);

let demoThresholdDone = false;

/** Older saves used tree points (branch, root). */
function migrate(d: AppData): AppData {
  const e = (d.extra ?? {}) as Partial<AppData['extra']> & { branch?: number; root?: number };
  return { ...d, extra: { stones: e.stones ?? e.branch ?? 0, marks: e.marks ?? e.root ?? 0 } };
}

/** Listeners that want to know about progress (the Trail sync). Set in grove/sync.ts. */
type ProgressListener = (data: AppData) => void;
const progressListeners = new Set<ProgressListener>();
export function onProgress(fn: ProgressListener): () => void {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(emptyData);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastDate: null });
  const [today, setToday] = useState(dateKey());
  const [growTick, setGrowTick] = useState(0);
  const [tab, setTab] = useState<Tab>('today');
  const [notesDraft, setNotesDraft] = useState<NotesDraft | null>(null);
  const [thresholdTick, setThresholdTick] = useState(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    (async () => {
      const [stored, s] = await Promise.all([loadSecure<AppData>('app'), loadStreak()]);
      if (stored) setData(migrate(stored));
      setStreak(s);
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  // Keep "today" correct across midnight and when the app comes back to the foreground.
  useEffect(() => {
    const refresh = () => setToday(dateKey());
    const id = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const persist = useCallback(async (next: AppData, grew = false) => {
    setData(next);
    dataRef.current = next;
    await saveSecure('app', next);
    if (grew) {
      setGrowTick((t) => t + 1);
      progressListeners.forEach((fn) => fn(next));
    }
  }, []);

  const todayEntry: DayEntry = data.days[today] ?? { challengeId: challengeForDate(today).id, swapped: false };
  const challenge = challengeById(todayEntry.challengeId) ?? challengeForDate(today);
  // Demo mode shows the threshold once per page load, so it can be presented again.
  const thresholdPending = demoModeEnabled() ? !demoThresholdDone : !todayEntry.quote && !todayEntry.done;

  const updateToday = useCallback(
    (fn: (e: DayEntry) => DayEntry, grew = false) => {
      const cur = dataRef.current;
      const entry = cur.days[today] ?? { challengeId: challengeForDate(today).id, swapped: false };
      return persist({ ...cur, days: { ...cur.days, [today]: fn(entry) } }, grew);
    },
    [persist, today],
  );

  const store: Store = useMemo(
    () => ({
      ready,
      today,
      data,
      streak,
      cairn: cairnFromData(data),
      todayEntry,
      challenge,
      thresholdPending,
      growTick,
      tab,
      notesDraft,
      go(next, draft = null) {
        setNotesDraft(draft);
        setTab(next);
        window.scrollTo(0, 0);
      },
      async swap() {
        await updateToday((e) => (e.swapped || e.done ? e : { ...e, swapped: true, challengeId: swapForDate(today).id }));
      },
      async complete(level, indoor) {
        await updateToday((e) => (e.done ? e : { ...e, done: { level, indoor, at: Date.now() } }), true);
        const s = bumpStreak(streak, today);
        setStreak(s);
        await saveStreak(s);
        void requestPersistence();
      },
      async pen(result) {
        await updateToday((e) => ({ ...e, pen: e.pen === 'wrote' ? 'wrote' : result }), result === 'wrote');
      },
      async setName(name) {
        const cur = dataRef.current;
        await persist({ ...cur, profile: { ...cur.profile, name: name.trim().slice(0, 24) } });
      },
      async addExtra(stones, marks) {
        const cur = dataRef.current;
        await persist({ ...cur, extra: { stones: cur.extra.stones + stones, marks: cur.extra.marks + marks } }, true);
      },
      async devFillHistory() {
        const cur = dataRef.current;
        const days = { ...cur.days };
        const levels: Level[] = ['easy', 'medium', 'brave'];
        let added = 0;
        for (let i = 1; added < 5 && i < 400; i++) {
          const d = addDays(today, -i);
          if (days[d]) continue;
          days[d] = {
            challengeId: challengeForDate(d).id,
            swapped: false,
            done: { level: levels[(i * 7) % 3], indoor: false, at: Date.now() },
            pen: i % 4 === 0 ? 'skipped' : 'wrote',
            demo: true,
          };
          added++;
        }
        await persist({ ...cur, days }, true);
      },
      async removeDemoDays() {
        await persist(withoutDemoDays(dataRef.current));
      },
      async markQuote(kind) {
        demoThresholdDone = true;
        await updateToday((e) => ({ ...e, quote: e.quote === 'copied' ? 'copied' : kind }), kind === 'copied');
        setThresholdTick((t) => t + 1);
      },
      async carveWord(word) {
        const clean = word === null ? null : word.trim().split(/\s+/)[0].slice(0, 24) || null;
        await updateToday((e) => ({ ...e, word: clean }), !!clean);
      },
      async setFlag(name, value) {
        const cur = dataRef.current;
        if (!!cur.flags?.[name] === value) return;
        await persist({ ...cur, flags: { ...cur.flags, [name]: value } });
      },
      async resetCairn() {
        const cur = dataRef.current;
        await persist({ ...cur, days: {}, extra: { stones: 0, marks: 0 } });
        const s = { count: 0, lastDate: null };
        setStreak(s);
        await saveStreak(s);
      },
      async replaceData(next) {
        await persist(next, true);
      },
    }),
    [ready, today, data, streak, todayEntry, challenge, growTick, tab, notesDraft, updateToday, persist, thresholdPending, thresholdTick],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
