import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './auth';
import { LevelId } from '../content/types';
import { today, yesterday, addDays } from '../lib/date';
import { setSpeechRate } from '../lib/speech';

export type Goal = 'travel' | 'study' | 'work' | 'hobby';

export type Profile = {
  onboarded: boolean;
  nickname: string;       // 暱稱（顯示在 app 裡）
  jaName: string;         // 日文稱呼，例如「ケン」，選填
  intro: string;          // 一句話自我介紹，選填
  goal: Goal;
  startLevel: LevelId;
  dailyGoal: number;      // 每日 XP 目標
  speechRate: number;     // 語音速度
};

export type Progress = {
  completed: string[];
  xp: number;
  streak: number;
  lastDay: string | null;
  todayXp: { date: string; xp: number };
  resume: { lessonId: string; step: number } | null;
  chats: number;          // 完成的 AI 會話次數
  aiRemaining: number | null;
};

export type Word = {
  ja: string; zh?: string; source: string; savedAt: number;
  box: number;            // 熟練度 0〜4
  due: string;            // 下次複習日 YYYY-MM-DD
};

type Store = { profile: Profile; progress: Progress; words: Word[] };

const emptyStore: Store = {
  profile: { onboarded: false, nickname: '', jaName: '', intro: '', goal: 'travel', startLevel: 'L1', dailyGoal: 50, speechRate: 1.0 },
  progress: { completed: [], xp: 0, streak: 0, lastDay: null, todayXp: { date: '', xp: 0 }, resume: null, chats: 0, aiRemaining: null },
  words: [],
};

const INTERVALS = [0, 1, 3, 7, 14]; // 熟練度對應的複習間隔（天）
const localKey = (uid: string) => `haogaku-v2-${uid}`;

type DataCtx = Store & {
  loaded: boolean;
  setProfile: (p: Partial<Profile>) => void;
  addXp: (n: number) => void;
  completeLesson: (id: string) => void;
  setResume: (lessonId: string, step: number) => void;
  clearResume: () => void;
  recordChat: () => void;
  setAiRemaining: (n: number) => void;
  isSaved: (ja: string) => boolean;
  toggleWord: (w: { ja: string; zh?: string; source: string }) => void;
  removeWord: (ja: string) => void;
  reviewWord: (ja: string, known: boolean) => void;
  dueWords: () => Word[];
  todayXp: () => number;
  streak: () => number;
  resetProgress: () => void;
};

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [store, setStore] = useState<Store>(emptyStore);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<Store>(emptyStore);
  const uidRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 切換帳號時：先讀手機快取，再讀雲端
  useEffect(() => {
    let cancelled = false;
    const uid = user?.uid ?? null;
    uidRef.current = uid;
    setLoaded(false);
    if (!uid) { ref.current = emptyStore; setStore(emptyStore); return; }

    (async () => {
      let local: Store | null = null;
      try {
        const raw = await AsyncStorage.getItem(localKey(uid));
        if (raw) local = merge(JSON.parse(raw));
      } catch { /* 忽略 */ }
      if (!cancelled && local) { ref.current = local; setStore(local); }

      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (cancelled) return;
        if (snap.exists()) {
          const cloud = merge(snap.data() as Partial<Store>);
          ref.current = cloud; setStore(cloud);
          AsyncStorage.setItem(localKey(uid), JSON.stringify(cloud)).catch(() => {});
        } else if (local) {
          setDoc(doc(db, 'users', uid), { ...local, updatedAt: Date.now() }).catch(() => {});
        }
      } catch { /* 離線時使用快取 */ }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  function commit(fn: (s: Store) => Store) {
    const next = fn(ref.current);
    ref.current = next;
    setStore(next);
    const uid = uidRef.current;
    if (!uid) return;
    AsyncStorage.setItem(localKey(uid), JSON.stringify(next)).catch(() => {});
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDoc(doc(db, 'users', uid), { ...ref.current, updatedAt: Date.now() }).catch(() => {});
    }, 1500);
  }

  useEffect(() => { setSpeechRate(store.profile.speechRate); }, [store.profile.speechRate]);

  const withProgress = (fn: (p: Progress) => Progress) => commit(s => ({ ...s, progress: fn(s.progress) }));

  const value: DataCtx = {
    ...store,
    loaded,
    setProfile: p => commit(s => ({ ...s, profile: { ...s.profile, ...p } })),
    addXp: n => withProgress(p => {
      const t = today();
      const streak = p.lastDay === t ? p.streak : p.lastDay === yesterday() ? p.streak + 1 : 1;
      const todayXp = p.todayXp.date === t ? p.todayXp.xp + n : n;
      return { ...p, xp: p.xp + n, streak, lastDay: t, todayXp: { date: t, xp: todayXp } };
    }),
    completeLesson: id => withProgress(p => ({
      ...p, resume: null, completed: p.completed.includes(id) ? p.completed : [...p.completed, id],
    })),
    setResume: (lessonId, step) => withProgress(p => ({ ...p, resume: { lessonId, step } })),
    clearResume: () => withProgress(p => ({ ...p, resume: null })),
    recordChat: () => withProgress(p => ({ ...p, chats: p.chats + 1 })),
    setAiRemaining: n => withProgress(p => ({ ...p, aiRemaining: n })),
    isSaved: ja => store.words.some(w => w.ja === ja),
    toggleWord: w => commit(s => s.words.some(x => x.ja === w.ja)
      ? { ...s, words: s.words.filter(x => x.ja !== w.ja) }
      : { ...s, words: [{ ...w, savedAt: Date.now(), box: 0, due: today() }, ...s.words] }),
    removeWord: ja => commit(s => ({ ...s, words: s.words.filter(w => w.ja !== ja) })),
    reviewWord: (ja, known) => commit(s => ({
      ...s,
      words: s.words.map(w => {
        if (w.ja !== ja) return w;
        const box = known ? Math.min(w.box + 1, INTERVALS.length - 1) : 0;
        return { ...w, box, due: addDays(Math.max(INTERVALS[box], known ? 1 : 0)) };
      }),
    })),
    dueWords: () => store.words.filter(w => w.due <= today()),
    todayXp: () => (store.progress.todayXp.date === today() ? store.progress.todayXp.xp : 0),
    streak: () => {
      const p = store.progress;
      return p.lastDay === today() || p.lastDay === yesterday() ? p.streak : 0;
    },
    resetProgress: () => commit(s => ({ ...s, progress: emptyStore.progress })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function merge(d: Partial<Store>): Store {
  return {
    profile: { ...emptyStore.profile, ...(d.profile ?? {}) },
    progress: { ...emptyStore.progress, ...(d.progress ?? {}) },
    words: Array.isArray(d.words) ? d.words : [],
  };
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData 必須在 DataProvider 內使用');
  return c;
}
