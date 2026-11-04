import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './auth';
import { LevelId } from '../content/types';
import { today, yesterday, addDays } from '../lib/date';
import { setSpeechRate } from '../lib/speech';
import { rankOf } from '../lib/rank';
import { ReviewState, emptyReview } from '../lib/review';
import { isReadingLesson } from '../content/readings';
import { PlanId } from '../content/plans';

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
  /** 要不要出現在排行榜上。預設參加，但隨時可以退出 */
  leaderboard: boolean;
  /**
   * 目前的付費方案。
   * **這個值只拿來顯示畫面**，不能用它決定額度——它存在手機上，改得動。
   * 真正的額度一律由 Cloud Functions 依驗證過的訂閱收據決定。
   */
  plan: PlanId;
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
  /** 評價詢問的紀錄，見 lib/review.ts */
  review: ReviewState;
};

export type Word = {
  ja: string; zh?: string; source: string; savedAt: number;
  box: number;            // 熟練度 0〜4
  due: string;            // 下次複習日 YYYY-MM-DD
};

type Store = { profile: Profile; progress: Progress; words: Word[] };

const emptyStore: Store = {
  profile: { onboarded: false, nickname: '', jaName: '', intro: '', goal: 'travel', startLevel: 'L1', dailyGoal: 50, speechRate: 1.0, leaderboard: true, plan: 'free' },
  progress: { completed: [], xp: 0, streak: 0, lastDay: null, todayXp: { date: '', xp: 0 }, resume: null, chats: 0, aiRemaining: null, review: emptyReview },
  words: [],
};

const INTERVALS = [0, 1, 3, 7, 14]; // 熟練度對應的複習間隔（天）
const localKey = (uid: string) => `haogaku-v2-${uid}`;

/**
 * 排行榜用的公開資料。
 *
 * **刻意和 users/{uid} 分開**：users 裡有單字本、學習目標、自我介紹，
 * 那些不該被別人讀到。排行榜另開一個集合，只放榜上真的要顯示的欄位，
 * 規則才能開放「登入者皆可讀」而不外洩其他東西（見 firestore.rules）。
 *
 * 沒填暱稱的人用「學習者」，不要退回 email 或 uid——那是個人資料。
 */
export type LeaderRow = {
  uid: string;
  name: string;
  jaName: string;
  xp: number;
  lv: number;
  streak: number;
  lessons: number;
  updatedAt: number;
};

/**
 * 該不該把這個人放上排行榜。
 * 除了本人意願，還擋掉兩種：還沒走完引導的（名字都還沒取），
 * 以及一分都還沒賺的——榜尾塞一排 0 分的人會讓榜單看起來像殭屍名冊。
 */
function shouldPublish(s: Store): boolean {
  return s.profile.leaderboard && s.profile.onboarded && s.progress.xp > 0;
}

function leaderRow(uid: string, s: Store): Omit<LeaderRow, 'uid'> {
  return {
    name: (s.profile.nickname || '').trim().slice(0, 12) || '學習者',
    jaName: (s.profile.jaName || '').trim().slice(0, 12),
    xp: s.progress.xp,
    lv: rankOf(s.progress.xp).n,
    streak: s.progress.streak,
    lessons: s.progress.completed.filter(id => !isReadingLesson(id)).length,
    updatedAt: Date.now(),
  };
}

/** 推上排行榜；不該上榜的人要主動把舊那筆刪掉，否則會永遠停在最後一次的分數 */
function publishLeader(uid: string, s: Store) {
  if (shouldPublish(s)) setDoc(doc(db, 'leaderboard', uid), leaderRow(uid, s)).catch(() => {});
  else deleteDoc(doc(db, 'leaderboard', uid)).catch(() => {});
}

type DataCtx = Store & {
  loaded: boolean;
  setProfile: (p: Partial<Profile>) => void;
  addXp: (n: number) => void;
  completeLesson: (id: string) => void;
  setResume: (lessonId: string, step: number) => void;
  clearResume: () => void;
  recordChat: () => void;
  setAiRemaining: (n: number) => void;
  setReview: (r: Partial<ReviewState>) => void;
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
      const cur = ref.current;
      setDoc(doc(db, 'users', uid), { ...cur, updatedAt: Date.now() }).catch(() => {});
      // 排行榜跟著同一個 debounce 走：每加一次 XP 就寫一次雲端太浪費，
      // 而且榜單本來就不需要即時。退出排行榜的人要把既有的那筆刪掉，
      // 只停止更新的話他會永遠卡在榜上最後一次的分數。
      publishLeader(uid, cur);
    }, 1500);
  }

  useEffect(() => { setSpeechRate(store.profile.speechRate); }, [store.profile.speechRate]);

  /**
   * 載入完成後推一次排行榜。
   *
   * 不能只靠 commit 推：commit 只在資料有變動時跑，所以在這版之前就已經在用的人、
   * 或換了手機剛同步下來的人，會一直不在榜上，直到他下次賺到 XP 為止。
   * 開 app 就推一次，榜單才會反映真實的使用者。
   */
  useEffect(() => {
    const uid = uidRef.current;
    if (!loaded || !uid) return;
    publishLeader(uid, ref.current);
  }, [loaded]);

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
    setReview: r => withProgress(p => ({ ...p, review: { ...p.review, ...r } })),
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
    // review 是後來才加的欄位，雲端舊資料沒有，要再補一層預設
    progress: { ...emptyStore.progress, ...(d.progress ?? {}), review: { ...emptyReview, ...(d.progress?.review ?? {}) } },
    words: Array.isArray(d.words) ? d.words : [],
  };
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData 必須在 DataProvider 內使用');
  return c;
}
