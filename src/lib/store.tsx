import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { challengeById, challengeForDate, swapForDate } from '../features/today/challenges';
import { bumpStreak } from '../features/today/streak';
import { treeFromData } from '../features/tree/growth';
import { addDays, dateKey } from './dates';
import { loadSecure, loadStreak, requestPersistence, saveSecure, saveStreak, type Streak } from './db';
import type { AppData, Challenge, DayEntry, Level, TreeState } from './types';

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
  tree: TreeState;
  todayEntry: DayEntry;
  challenge: Challenge;
  /** Increments whenever the tree grows, so the tree can animate. */
  growTick: number;
  tab: Tab;
  /** Text handed to the Notes screen (a pen prompt, or a Talk reflection). */
  notesDraft: NotesDraft | null;
  go(tab: Tab, notesDraft?: NotesDraft | null): void;
  swap(): Promise<void>;
  complete(level: Level, indoor: boolean): Promise<void>;
  pen(result: 'wrote' | 'skipped'): Promise<void>;
  setName(name: string): Promise<void>;
  addExtra(branch: number, root: number): Promise<void>;
  /** Demo only: fill the five most recent empty past days with completions. */
  devFillHistory(): Promise<void>;
  replaceData(data: AppData): Promise<void>;
}

const emptyData = (): AppData => ({
  days: {},
  extra: { branch: 0, root: 0 },
  profile: { name: null },
  createdAt: Date.now(),
});

const Ctx = createContext<Store | null>(null);

/** Listeners that want to know about progress (the Grove sync). Set in grove/sync.ts. */
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
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    (async () => {
      const [stored, s] = await Promise.all([loadSecure<AppData>('app'), loadStreak()]);
      if (stored) setData(stored);
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
      tree: treeFromData(data),
      todayEntry,
      challenge,
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
      async addExtra(branch, root) {
        const cur = dataRef.current;
        await persist({ ...cur, extra: { branch: cur.extra.branch + branch, root: cur.extra.root + root } }, true);
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
          };
          added++;
        }
        await persist({ ...cur, days }, true);
      },
      async replaceData(next) {
        await persist(next, true);
      },
    }),
    [ready, today, data, streak, todayEntry, challenge, growTick, tab, notesDraft, updateToday, persist],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
