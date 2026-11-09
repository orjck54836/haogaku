import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { ChatReport } from './ai';
import type { PlanId } from '../content/plans';

/**
 * 會話分析的歷史紀錄。
 *
 * 在這版之前，aiReport 的結果只活在 ReportScreen 的 route param 裡，
 * 退出畫面就沒了——「會話分析保留完整歷史」那條付費文案是空頭的。
 *
 * ## 為什麼是子集合，不是 users/{uid} 的一個欄位
 *
 * 放進 users 文件最省事（跟著 data.tsx 的 commit 走就有同步和快取），
 * 但 commit 是**整份文件重寫**：每加一次 XP、每存一個單字都會把所有分析
 * 一起上傳一次。存到 200 份約 300KB，等於每次 commit 都在傳 300KB，
 * 開 app 也要先下載 300KB——成本和紀錄數一起線性長大，而且 Firestore
 * 單一文件有 1MB 上限，撞牆時連學習進度都存不進去。
 *
 * 搬到 users/{uid}/reports/{id} 之後：**寫只發生在產生分析那一次**，
 * 讀只發生在開 app 載入那一次，成本和紀錄數脫鉤。
 * 代價是離線快取要自己做——手機端那份仍然寫在 AsyncStorage 的 store 裡。
 *
 * 子集合不會繼承 users 的規則，firestore.rules 要另外寫一條（已補）。
 *
 * `remaining` 不存：它是「當下還剩幾次」，隔天就是錯的，留著只會誤導。
 */
export type ReportBody = Omit<ChatReport, 'remaining'>;

export type SavedReport = {
  /** 用時間當 id 就夠——同一個人不會在同一毫秒結束兩場會話 */
  id: string;
  scenarioId: string;
  lessonId?: string;
  at: number;
  report: ReportBody;
};

/**
 * 每個方案留幾份。
 *
 * 高級版的「完整歷史」給 200 份：一份約 1〜2KB，200 份約 300KB，
 * 離 Firestore 單一文件 1MB 的上限還有單字本和進度的空間。
 * 真的無上限的話，重度使用者一年就會把文件寫爆——那時連進度都存不進去。
 *
 * **這個分級不違反「額度要由後端決定」那條原則**：它不花 API 錢，
 * 擋的是手機自己的儲存量。有人改 client 想多留幾份，受害的只有他自己的文件大小。
 */
export const RETENTION: Record<PlanId, number> = { free: 3, plus: 20, pro: 200 };

export const retentionOf = (plan: PlanId) => RETENTION[plan] ?? RETENTION.free;

/** 新的放最前面，超出方案額度的從尾端砍掉 */
export function addReport(list: SavedReport[], entry: SavedReport, plan: PlanId): SavedReport[] {
  return [entry, ...list].slice(0, retentionOf(plan));
}

/**
 * 降級後要把超出的砍掉，否則高級版留下的 200 份會一直跟著免費使用者，
 * 畫面上也會看到比方案說明更多的紀錄。
 */
export function trimReports(list: SavedReport[], plan: PlanId): SavedReport[] {
  return list.length > retentionOf(plan) ? list.slice(0, retentionOf(plan)) : list;
}

export function makeReport(scenarioId: string, report: ChatReport, lessonId?: string): SavedReport {
  const { remaining, ...body } = report;
  const at = Date.now();
  // lessonId 要在沒有時整個不放，不能放 undefined：Firestore 不收 undefined，
  // setDoc 會直接丟錯，整份分析存不進去（從主題頁進來的會話就沒有 lessonId）
  return { id: String(at), scenarioId, ...(lessonId ? { lessonId } : {}), at, report: body };
}

// ---------- 雲端（users/{uid}/reports/{id}） ----------

const col = (uid: string) => collection(db, 'users', uid, 'reports');

/**
 * 載入雲端的紀錄。
 *
 * 只取方案額度那麼多筆：超出的部分使用者看不到，載下來只是白花流量。
 * 失敗時回 null 而不是空陣列——離線時回空的話，畫面會顯示「還沒有分析紀錄」，
 * 看起來像資料被刪了；回 null 讓呼叫端保留手機上的快取。
 */
export async function fetchReports(uid: string, plan: PlanId): Promise<SavedReport[] | null> {
  try {
    const snap = await getDocs(query(col(uid), orderBy('at', 'desc'), limit(retentionOf(plan))));
    return snap.docs.map(d => d.data() as SavedReport);
  } catch {
    return null;
  }
}

/**
 * 寫一筆。失敗不擋畫面——手機上那份已經存好了，下次開 app 會再試。
 *
 * 要 try/catch 而不是只接 .catch()：setDoc 的資料檢查是**同步**丟錯的
 * （例如值裡有 undefined），根本還沒變成 Promise，.catch 接不到，
 * 錯誤會一路冒到呼叫端變成「分析失敗」——但分析其實已經做完也付過錢了。
 */
export function pushReport(uid: string, r: SavedReport) {
  try { setDoc(doc(col(uid), r.id), r).catch(() => {}); } catch (e) { console.warn('pushReport failed', e); }
}

export function dropReport(uid: string, id: string) {
  try { deleteDoc(doc(col(uid), id)).catch(() => {}); } catch { /* 下次載入時再清 */ }
}

/**
 * 把不在 keep 裡的雲端紀錄刪掉。
 * 被擠出額度的那幾筆如果不刪，降級或存滿之後它們會永遠留在雲端，
 * 使用者看不到也刪不掉，卻一直在計費。
 */
export async function pruneReports(uid: string, keep: SavedReport[]) {
  const ids = new Set(keep.map(r => r.id));
  try {
    const snap = await getDocs(col(uid));
    for (const d of snap.docs) if (!ids.has(d.id)) deleteDoc(d.ref).catch(() => {});
  } catch { /* 離線時下次再清 */ }
}

// ---------- 給 AI 會話用的長期記憶 ----------

/** 送給後端的「這個學習者是誰」。全部選填——沒填的欄位不會出現在 prompt 裡 */
export type ChatMemory = {
  /** 最近幾場會話的摘要，新的在前 */
  recent?: string[];
  /** 反覆出現的問題，用來提醒 AI 多注意 */
  weak?: string[];
  /**
   * 單字本裡還不熟的詞，讓 AI 在對話中自然地用上。
   * 送 ja 和 zh 兩個欄位：只送日文的話，AI 得自己猜使用者當初存的是哪個意思，
   * 多義詞（「結構」「適当」）很容易用成另一個意思，反而在加深錯的印象。
   */
  words?: { ja: string; zh?: string }[];
  /** 一行學習進度（段位、連續天數、完成堂數），讓 AI 講話的深度對得上他的實力 */
  progress?: string;
  /** 上一場沒做分析就離開的對話聊到哪，見 ChatNote */
  lastTurn?: string;
  /**
   * 這個人在這個情境練過幾次（分析紀錄＋未完成紀錄都算）。
   * **只給手機端用**：>0 時不能再用寫死的「はじめまして」開場。
   * 後端的 parseLearner 只挑它認得的欄位，多送這個不會進 prompt。
   */
  times?: number;
};

/**
 * 沒做分析就離開的對話，留一筆輕量紀錄。
 *
 * 原因：記憶原本只從分析報告來，而分析要使用者**主動按「結束並分析」**才有。
 * 中途返回的那幾場在程式眼裡完全沒發生過，所以「我明明聊過好幾次」的人
 * 下次進來還是會被當成初次見面——這是「AI 不記得我」最主要的來源。
 *
 * 刻意不叫 AI 寫摘要：那要多一次 API 呼叫（每場約 NT$0.01），而這裡只需要
 * 「上次聊到哪」，使用者自己的最後幾句話就夠了，等於零邊際成本。
 */
export type ChatNote = {
  scenarioId: string;
  at: number;
  /** 使用者說了幾輪。用來判斷這場值不值得記（1 輪通常是點進去又退出） */
  turns: number;
  /** 使用者最後說的話，接起來當線索 */
  tail: string;
};

/** 留幾筆。只是「上次聊到哪」的線索，多留沒有用，而且 progress 是整份重寫的 */
export const CHAT_NOTES = 6;

/** 同一個情境只留最新那筆：舊的那筆講的事已經被新的那場蓋過去了 */
export function addChatNote(list: ChatNote[], note: ChatNote): ChatNote[] {
  return [note, ...list.filter(n => n.scenarioId !== note.scenarioId)].slice(0, CHAT_NOTES);
}

/** 單字本裡的一筆。只宣告這裡會用到的欄位，避免 lib 反過來依賴 state/data */
type WordLike = { ja: string; zh?: string; savedAt: number; box: number };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * 挑要給 AI 用的單字。
 *
 * 優先還不熟的（box ≤ 1）：已經背起來的詞再聽一次沒有新的記憶效果，
 * 而「複習」本來就有單字本自己的排程在做。
 *
 * **過濾掉長句**：單字本可以收藏 AI 的整句回覆和糾正，那種十幾二十字的句子
 * 塞進 prompt 只會讓 AI 整句照抄一遍，看起來像在念稿。14 字以內才算「詞」。
 */
function pickWords(words: WordLike[]): { ja: string; zh?: string }[] {
  const ok = words.filter(w => w.ja.length <= 14);
  const sorted = [...ok].sort((a, b) => (a.box - b.box) || (b.savedAt - a.savedAt));
  return sorted.slice(0, 6).map(w => ({ ja: w.ja, ...(w.zh ? { zh: clip(w.zh, 20) } : {}) }));
}

/**
 * 從手機上已經有的資料擠出記憶。
 *
 * 不另外呼叫 AI 產生「使用者筆記」是刻意的：那要多一次 API 呼叫（每場多約 NT$0.01），
 * 而分析報告本來就寫好了摘要和待改進項目，拿現成的等於**零邊際成本**。
 *
 * 同情境的優先：在便利商店聊過的事，下次回到便利商店才用得上；
 * 跨情境只留一則當背景，不然 prompt 會被塞滿不相干的內容，
 * AI 反而開始硬扯上次的事。
 */
export function chatMemory(input: {
  scenarioId: string;
  reports: SavedReport[];
  notes?: ChatNote[];
  words?: WordLike[];
  /** 「Lv.3 道案内」這種已經組好的字串，lib/rank 的段位名不在這裡重算 */
  rank?: string;
  streak?: number;
  /** 完成的課程數，要先把讀物排掉（見 isReadingLesson），不然數字會灌水 */
  lessons?: number;
}): ChatMemory {
  const { scenarioId, reports, notes = [], words = [] } = input;
  const same = reports.filter(r => r.scenarioId === scenarioId);
  const other = reports.filter(r => r.scenarioId !== scenarioId);
  const recent = [...same.slice(0, 2), ...other.slice(0, 1)]
    .map(r => clip(r.report.summary, 120))
    .filter(Boolean);

  // 只看最近 5 份：半年前改掉的毛病再拿出來講，聽起來像在翻舊帳
  const seen = new Set<string>();
  const weak: string[] = [];
  for (const r of reports.slice(0, 5)) {
    for (const im of r.report.improvements) {
      const k = clip(im.issue, 40);
      if (k && !seen.has(k)) { seen.add(k); weak.push(k); }
      if (weak.length >= 3) break;
    }
    if (weak.length >= 3) break;
  }

  // 比分析還舊的那筆不要用：那一場的事已經寫在分析摘要裡，
  // 兩個都塞進去 AI 會同時收到「上次聊完有分析」和「上次沒聊完就走」
  const note = notes.find(n => n.scenarioId === scenarioId && n.turns > 0 && (!same[0] || n.at > same[0].at));
  const lastTurn = note ? `上次在這個情境聊了 ${note.turns} 輪就離開（沒做分析），他最後說的是「${clip(note.tail, 60)}」` : '';

  const bits: string[] = [];
  if (input.rank) bits.push(`段位 ${input.rank}`);
  if (input.streak) bits.push(`連續學習 ${input.streak} 天`);
  if (input.lessons) bits.push(`完成 ${input.lessons} 堂課`);
  const times = same.length + notes.filter(n => n.scenarioId === scenarioId).length;
  if (times) bits.push(`這個情境練過 ${times} 次`);

  const picked = pickWords(words);
  return {
    ...(recent.length ? { recent } : {}),
    ...(weak.length ? { weak } : {}),
    ...(picked.length ? { words: picked } : {}),
    ...(bits.length ? { progress: bits.join('、') } : {}),
    ...(lastTurn ? { lastTurn } : {}),
    ...(times ? { times } : {}),
  };
}
