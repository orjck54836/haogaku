import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncPlan, freeEntitlement, type Entitlement } from '../lib/iap';
import { useAuth } from './auth';
import { LevelId } from '../content/types';
import { today, yesterday, addDays } from '../lib/date';
import { setSpeechRate } from '../lib/speech';
import { rankOf } from '../lib/rank';
import { ReviewState, emptyReview } from '../lib/review';
import { isReadingLesson } from '../content/readings';
import { track } from '../lib/analytics';
import { practicedToday } from '../lib/reminders';
import { PlanId, planById, guestLimits } from '../content/plans';
import { SavedReport, addReport, trimReports, makeReport, retentionOf, fetchReports, pushReport, dropReport, pruneReports, ChatNote, addChatNote } from '../lib/reports';
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
  /**
   * 沒做分析就離開的 AI 會話留下的線索，見 lib/reports.ts 的 ChatNote。
   * 放在 progress 而不是另開子集合：最多 6 筆、每筆百來字，
   * 跟著 commit 一起走就有同步和離線快取，不值得為它多一次讀寫。
   */
  chatNotes: ChatNote[];
};

export type Word = {
  ja: string; zh?: string; source: string; savedAt: number;
  box: number;            // 熟練度 0〜4
  due: string;            // 下次複習日 YYYY-MM-DD
  /**
   * 以下兩個是手打新增的單字才有的，選填所以舊資料不必遷移。
   * kana 含漢字時才有意義（假名詞本身就是讀音），examples 產生失敗時是空的——
   * 例句失敗不該讓單字存不進去，留著讓畫面給一顆重試。
   */
  kana?: string;
  examples?: { ja: string; kana: string; zh: string }[];
};

/**
 * 會話分析的歷史另外開一個欄位，不塞在 progress 裡。
 * progress 整份會被「重設進度」清掉，而分析是內容不是進度；
 * 而且它是這份文件裡唯一會長大的東西，分開才看得出文件大小是誰撐起來的。
 */
type Store = { profile: Profile; progress: Progress; words: Word[]; reports: SavedReport[] };

const emptyStore: Store = {
  profile: { onboarded: false, nickname: '', jaName: '', intro: '', photo: '', goal: 'travel', startLevel: 'L2', dailyGoal: 50, speechRate: 1.0, leaderboard: true, plan: 'free' },
  progress: { completed: [], xp: 0, streak: 0, lastDay: null, todayXp: { date: '', xp: 0 }, resume: null, chats: 0, aiRemaining: null, review: emptyReview, chatNotes: [] },
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

/**
 * usage/{uid} 的日期界線。
 * 後端用 UTC+8 算（functions 的 `taipeiDate()`），這裡要用同一條公式——
 * 拿手機本機日期去比，出國的人會跨錯一天，看到的剩餘次數跟實際能用的不一樣。
 */
const taipeiDay = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);

/** 距離下一個台北午夜還有多久（毫秒）。和 `taipeiDay()` 用同一條位移才不會差一小時 */
const msToTaipeiMidnight = () => {
  const day = 86_400_000;
  return day - ((Date.now() + 8 * 3600_000) % day);
};

/** 推上排行榜；不該上榜的人要主動把舊那筆刪掉，否則會永遠停在最後一次的分數 */
function publishLeader(uid: string, s: Store) {
  if (shouldPublish(s)) setDoc(doc(db, 'leaderboard', uid), leaderRow(uid, s)).catch(() => {});
  else deleteDoc(doc(db, 'leaderboard', uid)).catch(() => {});
}

type DataCtx = Store & {
  loaded: boolean;
  setProfile: (p: Partial<Profile>) => void;
  /** 重新跟後端對一次方案資格。購買完、或 App 回到前景時呼叫 */
  refreshPlan: () => Promise<PlanId>;
  /**
   * 後端認定的方案資格（含下一期會變成什麼）。
   *
   * **判斷「他現在是不是這個方案」一律用這個，不要用 `profile.plan`**：
   * 後者是存在手機上的顯示值，而同一個訂閱群組裡降級是排程的——
   * 按下標準版之後這一期結束前他仍然是高級版，兩個值會不一樣。
   * 不另外存檔，每次冷啟動和回前景重讀。
   */
  entitlement: Entitlement;
  /** 重新讀一次今天還剩幾次 AI。冷啟動、回前景、方案變動後呼叫 */
  refreshQuota: () => Promise<void>;
  addXp: (n: number) => void;
  completeLesson: (id: string) => void;
  setResume: (lessonId: string, step: number) => void;
  clearResume: () => void;
  recordChat: () => void;
  setAiRemaining: (n: number) => void;
  setReview: (r: Partial<ReviewState>) => void;
  saveReport: (scenarioId: string, report: ChatReport, lessonId?: string) => void;
  /** 沒做分析就離開的會話，留一筆「聊到哪」。下次進同一個情境時當記憶用 */
  saveChatNote: (scenarioId: string, turns: number, tail: string) => void;
  removeReport: (id: string) => void;
  isSaved: (ja: string) => boolean;
  toggleWord: (w: { ja: string; zh?: string; source: string }) => void;
  /** 手打新增。已經收藏過的回 false，讓畫面知道要說「已經在單字本裡了」 */
  addWord: (w: Omit<Word, 'savedAt' | 'box' | 'due'>) => boolean;
  /** 補上 AI 產生的內容（例句失敗後重試用），不動複習進度 */
  fillWord: (ja: string, patch: Pick<Word, 'kana' | 'zh' | 'examples'>) => void;
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
  const [entitlement, setEntitlement] = useState<Entitlement>(freeEntitlement);
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
    if (!uid) { ref.current = emptyStore; setStore(emptyStore); setEntitlement(freeEntitlement); return; }

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

      /**
       * 對一次方案資格。
       *
       * 續訂、取消、退款**都不會通知 App**，所以不主動問就會停在上一次的狀態：
       * 取消的人還看得到付費標記，續訂的人反而以為自己掉回免費。
       *
       * 這裡更新的只是畫面上的顯示值——真正的額度是後端自己讀 entitlements 決定的，
       * 所以這一步失敗（離線）不影響任何功能，安靜吞掉就好。
       * 放在 setLoaded 之後：它可能要跟 App Store 來回一趟，不該卡住第一次進畫面。
       */
      if (!cancelled) syncAllRef.current();
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  /**
   * App 從背景回來時再對一次方案。
   *
   * 購買、取消、退款**有可能發生在 App 外面**：使用者去「設定 → 訂閱」取消，
   * 或是在 App Store 的付款表單上完成付款、我們的監聽卻沒收到（網路斷在那一刻）。
   * 只在冷啟動對一次的話，這些人會一直看到錯的方案標記，而且重開 App 才會好。
   */
  useEffect(() => {
    if (!user?.uid) return;
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') syncAllRef.current();
    });
    return () => sub.remove();
  }, [user?.uid]);

  /**
   * 跨過台北午夜時把剩餘次數對回來。
   *
   * 後端的額度是**比日期字串**決定的（functions 的 `taipeiDate()`），過 12 點
   * 那一刻就是新的一天，不需要任何排程、也不用重開 App——這部分本來就是對的。
   * 但畫面上那個數字只在冷啟動、回前景、呼叫完 AI 時才重讀，所以**一直開著 App
   * 跨過午夜的人**（晚上十一點多在練的那種）右上角會停在「0 次」。
   * 功能是好的，可是他看到 0 就不會再按，等於白擋。
   *
   * 分段醒（最多 30 分鐘）而不是一口氣排到午夜：長 timer 被系統延後或丟掉的話
   * 整晚都不會再對一次。醒來只比一個日期字串，對不上才去讀 Firestore，
   * 所以多醒幾次不花錢。
   */
  useEffect(() => {
    if (!user?.uid) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      // +1 秒：剛好壓在邊界上醒來，有機會還比到舊的那一天
      timer = setTimeout(tick, Math.min(msToTaipeiMidnight() + 1_000, 30 * 60_000));
    };
    const tick = () => {
      // quotaDay 還空的代表第一次 refreshQuota 還沒回來（它自己會把數字補上）
      if (quotaDay.current && quotaDay.current !== taipeiDay()) refreshQuotaRef.current();
      arm();
    };
    arm();
    return () => clearTimeout(timer);
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

  /**
   * 跟後端對一次方案資格，回傳對完之後的方案。
   *
   * **`profile.plan` 只是顯示值，權威在 `entitlements/{uid}`。** 所以這裡一律用
   * 後端的答案覆蓋本地，包含「降回免費」——取消或退款的人不該留著付費標記。
   *
   * 用 ref 包起來是因為 effect（冷啟動、回前景）要呼叫它，
   * 而它依賴 commit；放進 deps 會讓那兩個 effect 每次 render 都重跑。
   */
  async function refreshPlan(): Promise<PlanId> {
    const uid = uidRef.current;
    if (!uid) return ref.current.profile.plan;
    // 同時只跑一趟：這個函式掛在「回前景」上，而購買流程本身會讓 App 離開再回到前景
    // （Apple 的付款表單、雙重驗證都是另一個行程），事件會連著來好幾次。
    // 不擋的話每一次都各自跟 StoreKit 和後端來回一趟，疊起來把購買流程卡住
    if (planInFlight.current) return planInFlight.current;
    planInFlight.current = (async () => {
    try {
      const ent = await syncPlan(uid);
      setEntitlement(ent);
      const plan = ent.plan;
      if (plan !== ref.current.profile.plan) {
        commit(s => ({ ...s, profile: { ...s.profile, plan }, reports: trimReports(s.reports, plan) }));
      }
      return plan;
    } catch {
      // 離線時維持現狀：顯示值舊一點沒關係，額度本來就是後端說了算
      return ref.current.profile.plan;
    }
    })();
    try { return await planInFlight.current; } finally { planInFlight.current = null; }
  }
  const planInFlight = useRef<Promise<PlanId> | null>(null);
  const refreshPlanRef = useRef(refreshPlan);
  refreshPlanRef.current = refreshPlan;

  /**
   * 重新讀一次「今天還剩幾次 AI」。
   *
   * `aiRemaining` 原本只在呼叫 AI 回來那一刻被更新，而它又跟著 progress 存進手機和雲端，
   * 於是右上角那顆鈕會停在**上一次呼叫 AI 時**的數字：跨過午夜沒有歸零、
   * 在另一台手機用掉的次數看不到、剛升級完額度變大也不會變。
   *
   * 直接讀 `usage/{uid}`（firestore.rules 開了本人唯讀），不另外打一支 Cloud Function：
   * 一次 Firestore 讀取約 NT$0.00002，比為了一個數字喚醒一個實例便宜太多。
   * 上限用 plans.ts 的 aiPerDay——它和後端的 PLAN_ALLOWANCE 是同一組數字（兩邊要一起改）。
   */
  async function refreshQuota(planOverride?: PlanId) {
    const uid = uidRef.current;
    if (!uid) return;
    try {
      const snap = await getDoc(doc(db, 'usage', uid));
      const data = snap.data();
      // 日期界線要和後端的 taipeiDate() 一致：用本機時區算，出國的人會跨錯一天
      const day = taipeiDay();
      const used = data && data.date === day ? Number(data.count) || 0 : 0;
      const plan = planOverride ?? ref.current.profile.plan;
      const limit = userRef.current?.isAnonymous ? guestLimits.aiPerDay : planById(plan).aiPerDay;
      const left = Math.max(0, limit - used);
      // 記下這個數字算的是哪一天，跨午夜的 timer 靠它判斷該不該重讀
      quotaDay.current = day;
      if (left !== ref.current.progress.aiRemaining) {
        commit(s => ({ ...s, progress: { ...s.progress, aiRemaining: left } }));
      }
    } catch { /* 離線時維持現狀：這只是顯示值，擋不擋得住一律由後端決定 */ }
  }
  /** 目前畫面上那個剩餘次數是哪一天算的（台北日）。空字串代表還沒讀過 */
  const quotaDay = useRef('');
  const refreshQuotaRef = useRef(refreshQuota);
  refreshQuotaRef.current = refreshQuota;
  const userRef = useRef(user);
  userRef.current = user;

  /** 方案對完順手把次數也對一次：升級當下後端會重置當天用量，不重讀會看到舊數字 */
  async function syncPlanAndQuota() {
    const plan = await refreshPlanRef.current();
    await refreshQuotaRef.current(plan);
    return plan;
  }
  const syncAllRef = useRef(syncPlanAndQuota);
  syncAllRef.current = syncPlanAndQuota;

  const withProgress = (fn: (p: Progress) => Progress) => commit(s => ({ ...s, progress: fn(s.progress) }));

  const value: DataCtx = {
    ...store,
    loaded,
    entitlement,
    // 方案變動時順手砍一次：降級後畫面不該還看得到超出額度的分析
    refreshPlan,
    refreshQuota: () => refreshQuotaRef.current(),
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
      // 今天練到東西了：把今晚那一則「今天的日語還沒練」取消掉。
      // 重做一次也算——重點是「他今天有打開來練」，不是這堂是不是第一次完成
      practicedToday();
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
    recordChat: () => {
      // 練過一場 AI 會話也是練：不算的話，今晚還是會跳「今天的日語還沒練」
      practicedToday();
      withProgress(p => ({ ...p, chats: p.chats + 1 }));
    },
    // 後端回來的剩餘次數也要記下「這是哪一天的」：跨午夜的 timer 靠 quotaDay 判斷
    // 該不該重讀，而冷啟動時 refreshQuota 要是失敗了（離線），它會一直是空字串，
    // 之後就算靠這條路把數字補上，午夜那一刻也不會再對一次
    setAiRemaining: n => { quotaDay.current = taipeiDay(); withProgress(p => ({ ...p, aiRemaining: n })); },
    setReview: r => withProgress(p => ({ ...p, review: { ...p.review, ...r } })),
    /**
     * 中途離開也要留下痕跡。
     *
     * 不經過 AI、不扣額度：只是把輪數和他最後說的話記下來，
     * 下一場在同一個情境時組進 prompt（見 chatMemory）。
     * 一輪就走的通常是點錯進來，記了只會讓 AI 硬接一句沒頭沒尾的話。
     */
    saveChatNote: (scenarioId, turns, tail) => {
      if (turns < 2 || !tail.trim()) return;
      withProgress(p => ({ ...p, chatNotes: addChatNote(p.chatNotes, { scenarioId, at: Date.now(), turns, tail: tail.trim().slice(0, 120) }) }));
    },
    saveReport: (scenarioId, report, lessonId) => {
      const uid = uidRef.current;
      const entry = makeReport(scenarioId, report, lessonId);
      const dropped = ref.current.reports.slice(retentionOf(ref.current.profile.plan) - 1);
      commit(s => ({
        ...s,
        reports: addReport(s.reports, entry, s.profile.plan),
        // 這個情境有正式分析了，中途離開那筆線索就過期了：
        // 留著會讓下一場的 prompt 同時說「上次聊完有分析」和「上次沒聊完就走」
        progress: { ...s.progress, chatNotes: s.progress.chatNotes.filter(n => n.scenarioId !== scenarioId) },
      }));
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
    addWord: w => {
      if (ref.current.words.some(x => x.ja === w.ja)) return false;
      commit(s => ({ ...s, words: [{ ...w, savedAt: Date.now(), box: 0, due: today() }, ...s.words] }));
      return true;
    },
    // 重試時詞條已經在列表裡，只補內容，不要動 box／due——那會把複習進度歸零
    fillWord: (ja, patch) => commit(s => ({
      ...s, words: s.words.map(w => (w.ja === ja ? { ...w, ...patch } : w)),
    })),
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
    progress: {
      ...emptyStore.progress, ...(d.progress ?? {}),
      // review 是後來才加的欄位，雲端舊資料沒有，要再補一層預設
      review: { ...emptyReview, ...(d.progress?.review ?? {}) },
      // chatNotes 也是後來才加的，舊資料沒有這個欄位
      chatNotes: Array.isArray(d.progress?.chatNotes) ? d.progress.chatNotes : [],
      // 存下來的剩餘次數是「上次呼叫 AI 當下」的，跨日或換手機就是錯的數字。
      // 一律當成還不知道，由 refreshQuota() 讀 usage/{uid} 補上——
      // 寧願先不顯示次數，也不要顯示一個錯的
      aiRemaining: null,
    },
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
