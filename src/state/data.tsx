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
import { track } from '../lib/analytics';
import { PlanId } from '../content/plans';
import { SavedReport, addReport, trimReports, makeReport, retentionOf, fetchReports, pushReport, dropReport, pruneReports } from '../lib/reports';
import type { ChatReport } from '../lib/ai';

export type Goal = 'travel' | 'study' | 'work' | 'hobby';

/** 學習目標的中文說法。畫面和 AI 會話的 prompt 都要用，所以放在型別旁邊共用 */
export const goalLabel: Record<Goal, string> = {
  travel: '去日本旅行', study: '留學或打工度假', work: '日商工作', hobby: '興趣',
};

export type Profile = {
  onboarded: boolean;
  nickname: string;       // 暱稱（顯示在 app 裡）
  jaName: string;         // 日文稱呼，例如「ケン」，選填
  intro: string;          // 一句話自我介紹，選填
  /**
   * 大頭照的網址（Firebase Storage）。空字串代表沒設，畫面退回名字首字的色塊。
   * 這裡只存網址不存圖：users/{uid} 是整份重寫的，圖塞進來等於每次加 XP 都重傳一次。
   */
  photo: string;
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

/**
 * 會話分析的歷史另外開一個欄位，不塞在 progress 裡。
 * progress 整份會被「重設進度」清掉，而分析是內容不是進度；
 * 而且它是這份文件裡唯一會長大的東西，分開才看得出文件大小是誰撐起來的。
 */
type Store = { profile: Profile; progress: Progress; words: Word[]; reports: SavedReport[] };

const emptyStore: Store = {
  profile: { onboarded: false, nickname: '', jaName: '', intro: '', photo: '', goal: 'travel', startLevel: 'L2', dailyGoal: 50, speechRate: 1.0, leaderboard: true, plan: 'free' },
  progress: { completed: [], xp: 0, streak: 0, lastDay: null, todayXp: { date: '', xp: 0 }, resume: null, chats: 0, aiRemaining: null, review: emptyReview },
  words: [],
  reports: [],
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
  /**
   * 大頭照網址。空字串代表沒設，榜上退回段位印章。
   *
   * 這是榜上唯一一個「使用者自己上傳的內容」，所以它是參加排行榜的**代價之一**：
   * 參加 = 暱稱、XP、照片都會被其他登入者看到。設定頁那一列有寫清楚。
   */
  photo: string;
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
    photo: s.profile.photo || '',
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
  saveReport: (scenarioId: string, report: ChatReport, lessonId?: string) => void;
  removeReport: (id: string) => void;
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

      // 分析紀錄在子集合，要另外讀一次；失敗（離線）時保留手機上的快取
      try {
        const plan = ref.current.profile.plan;
        const cloud = await fetchReports(uid, plan);
        if (cancelled) return;
        if (cloud) {
          // 舊版把紀錄存在 users 文件裡，雲端還沒有就先把手機上那份搬上去
          const local = ref.current.reports;
          const merged = cloud.length ? cloud : local;
          if (!cloud.length && local.length) local.forEach(r => pushReport(uid, r));
          const next = { ...ref.current, reports: trimReports(merged, plan) };
          ref.current = next; setStore(next);
          AsyncStorage.setItem(localKey(uid), JSON.stringify(next)).catch(() => {});
          // 超出額度的舊紀錄留在雲端會一直計費，而且使用者看不到也刪不掉
          if (cloud.length > next.reports.length) pruneReports(uid, next.reports);
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
      // reports 不進這份文件：commit 是整份重寫，分析跟著走的話每加一次 XP
      // 都會重傳全部紀錄。它有自己的子集合，寫入只在產生那一次（lib/reports.ts）
      const { reports, ...rest } = cur;
      setDoc(doc(db, 'users', uid), { ...rest, updatedAt: Date.now() }).catch(() => {});
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
    // 方案變動時順手砍一次：降級後畫面不該還看得到超出額度的分析
    setProfile: p => {
      commit(s => {
        const profile = { ...s.profile, ...p };
        return { ...s, profile, reports: trimReports(s.reports, profile.plan) };
      });
      // 降級砍掉的那幾筆也要從雲端清掉
      if (uidRef.current) pruneReports(uidRef.current, ref.current.reports);
    },
    addXp: n => withProgress(p => {
      const t = today();
      const streak = p.lastDay === t ? p.streak : p.lastDay === yesterday() ? p.streak + 1 : 1;
      const todayXp = p.todayXp.date === t ? p.todayXp.xp + n : n;
      return { ...p, xp: p.xp + n, streak, lastDay: t, todayXp: { date: t, xp: todayXp } };
    }),
    completeLesson: id => {
      // 只在第一次完成時記：重做一次不是新的學習行為，算進去會讓留存率看起來比實際好
      const first = !ref.current.progress.completed.includes(id);
      withProgress(p => ({
        ...p, resume: null, completed: p.completed.includes(id) ? p.completed : [...p.completed, id],
      }));
      if (first) {
        const done = ref.current.progress.completed.filter(x => !isReadingLesson(x)).length;
        track(isReadingLesson(id) ? 'reading_complete' : 'lesson_complete', { level: ref.current.profile.startLevel });
        // 「有沒有完成第一堂課」是留存最強的單一指標，所以另外送一筆。
        // GA4 的轉換要能單獨選一個事件名，混在 lesson_complete 的參數裡挑不出來。
        if (!isReadingLesson(id) && done === 0) track('first_lesson_complete', { level: ref.current.profile.startLevel });
      }
    },
    setResume: (lessonId, step) => withProgress(p => ({ ...p, resume: { lessonId, step } })),
    clearResume: () => withProgress(p => ({ ...p, resume: null })),
    recordChat: () => withProgress(p => ({ ...p, chats: p.chats + 1 })),
    setAiRemaining: n => withProgress(p => ({ ...p, aiRemaining: n })),
    setReview: r => withProgress(p => ({ ...p, review: { ...p.review, ...r } })),
    saveReport: (scenarioId, report, lessonId) => {
      const uid = uidRef.current;
      const entry = makeReport(scenarioId, report, lessonId);
      const dropped = ref.current.reports.slice(retentionOf(ref.current.profile.plan) - 1);
      commit(s => ({ ...s, reports: addReport(s.reports, entry, s.profile.plan) }));
      if (!uid) return;
      pushReport(uid, entry);
      // 被擠出額度的那幾筆要一起從雲端刪掉，不然會變成看不到也刪不掉的孤兒
      dropped.forEach(r => dropReport(uid, r.id));
    },
    removeReport: id => {
      commit(s => ({ ...s, reports: s.reports.filter(r => r.id !== id) }));
      if (uidRef.current) dropReport(uidRef.current, id);
    },
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

/**
 * 程度從四階改成兩階，舊資料裡還有 L1／L4。
 * 沒搬的話 levelShort[startLevel] 會是 undefined，畫面直接空一塊。
 */
function migrateLevel(p: Profile): Profile {
  const old = p.startLevel as string;
  if (old === 'L1') return { ...p, startLevel: 'L2' };
  if (old === 'L4') return { ...p, startLevel: 'L3' };
  return p;
}

function merge(d: Partial<Store>): Store {
  return {
    profile: migrateLevel({ ...emptyStore.profile, ...(d.profile ?? {}) }),
    // review 是後來才加的欄位，雲端舊資料沒有，要再補一層預設
    progress: { ...emptyStore.progress, ...(d.progress ?? {}), review: { ...emptyReview, ...(d.progress?.review ?? {}) } },
    words: Array.isArray(d.words) ? d.words : [],
    // 降級的人要在載入時就砍到方案額度，不然舊紀錄會比方案說明多
    reports: trimReports(Array.isArray(d.reports) ? d.reports : [], d.profile?.plan ?? 'free'),
  };
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData 必須在 DataProvider 內使用');
  return c;
}
