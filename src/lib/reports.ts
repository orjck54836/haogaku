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
 * 無限方案的「完整歷史」給 200 份：一份約 1〜2KB，200 份約 300KB，
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
 * 降級後要把超出的砍掉，否則無限方案留下的 200 份會一直跟著免費使用者，
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
};

/**
 * 從已經存下來的分析紀錄裡擠出記憶。
 *
 * 不另外呼叫 AI 產生「使用者筆記」是刻意的：那要多一次 API 呼叫（每場多約 NT$0.01），
 * 而分析報告本來就寫好了摘要和待改進項目，拿現成的等於**零邊際成本**。
 *
 * 同情境的優先：在便利商店聊過的事，下次回到便利商店才用得上；
 * 跨情境只留一則當背景，不然 prompt 會被塞滿不相干的內容，
 * AI 反而開始硬扯上次的事。
 */
export function chatMemory(reports: SavedReport[], scenarioId: string): ChatMemory {
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
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
  return { ...(recent.length ? { recent } : {}), ...(weak.length ? { weak } : {}) };
}
