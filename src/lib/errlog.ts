import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * 把手機上出的事送回後端（Firestore 的 `clientLogs`）。
 *
 * ## 為什麼需要
 *
 * 後端的 log 只看得到後端那一半。「我付了錢沒開通」這種問題，關鍵的那一半
 * （StoreKit 回了什麼、卡在哪一步）只存在使用者手機的記憶體裡（lib/iaplog.ts），
 * 關掉 app 就沒了；JS 層的錯誤更是完全沒有人知道發生過。
 *
 * ## 為什麼不用 Sentry 之類的服務
 *
 * 那是原生模組：要重新 build，而且舊的 dev client 一載入就死
 * （CLAUDE.md「新裝的原生模組不要頂層 import」）。這裡只用已經有的 Firestore，
 * 純 JS，`eas update` 就推得出去。代價是抓不到**原生層**的閃退，只抓得到 JS 的錯。
 *
 * ## 只寫不讀
 *
 * 規則只開 create（見 firestore.rules 的 clientLogs），和內容檢舉同一個做法：
 * 送得進來，但使用者自己也讀不回去、改不掉。看紀錄從後台（public/admin）。
 *
 * **不要把個人資料放進來**：暱稱、會話內容、單字本都不該出現在 message／detail。
 * 錯誤訊息和購買流程的步驟紀錄本身不含這些。
 */

export type LogKind = 'purchase' | 'error';
type Entry = { kind: LogKind; message: string; detail: string; createdAt: number };

const PENDING_KEY = 'client-logs-pending-v1';
/** 一次啟動最多送幾筆。同一個錯在迴圈裡連噴的話，沒有上限會把自己的 Firestore 寫爆 */
const MAX_PER_SESSION = 12;
/** 沒送出去的最多留幾筆。只是為了「下次開 app 補送」，留多了沒有意義 */
const MAX_PENDING = 6;

let sent = 0;
const seen = new Set<string>();

const appVersion = String(Constants.expoConfig?.version ?? '?').slice(0, 40);
const osLabel = `${Platform.OS} ${Platform.Version}`.slice(0, 40);

async function readPending(): Promise<Entry[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

async function writePending(list: Entry[]) {
  try { await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-MAX_PENDING))); } catch { /* 忽略 */ }
}

/** 送一筆。沒登入或送不出去回 false，由呼叫端決定要不要留著 */
async function send(e: Entry): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  // 規則要求 uid 等於登入者：還沒登入時送不進去，留到登入後補送
  if (!uid) return false;
  try {
    await addDoc(collection(db, 'clientLogs'), {
      uid, kind: e.kind, message: e.message, detail: e.detail,
      app: appVersion, os: osLabel, createdAt: e.createdAt,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 記一筆。永遠不丟錯、不擋畫面——回報失敗不該變成第二個錯誤。
 *
 * **先存手機再送**：致命錯誤之後 app 隨時會被收掉，網路請求多半來不及跑完，
 * 但寫 AsyncStorage 通常趕得上。送成功再從待送清單拿掉，沒成功就等下次啟動補送。
 */
export function reportLog(kind: LogKind, message: string, detail = '') {
  try {
    const m = String(message).slice(0, 300);
    // 錯誤去重：render 裡的錯會每一幀都噴一次。購買不去重——同一個人失敗兩次是兩件事
    if (kind === 'error') {
      if (seen.has(m)) return;
      seen.add(m);
    }
    if (sent >= MAX_PER_SESSION) return;
    sent++;
    const entry: Entry = { kind, message: m, detail: String(detail).slice(0, 6000), createdAt: Date.now() };
    void (async () => {
      await writePending([...(await readPending()), entry]);
      if (await send(entry)) {
        await writePending((await readPending()).filter(x => x.createdAt !== entry.createdAt));
      }
    })();
  } catch { /* 忽略 */ }
}

/** 補送上次沒送出去的（閃退前那一筆、離線時的購買失敗） */
async function flushPending() {
  const list = await readPending();
  if (!list.length) return;
  const left: Entry[] = [];
  for (const e of list) if (!(await send(e))) left.push(e);
  await writePending(left);
}

let started = false;

/**
 * 掛上全域的 JS 錯誤處理。整個 app 只呼叫一次，而且要早——在第一次 render 之前。
 *
 * 一定要把原本的 handler 接回去：那是 React Native 自己處理錯誤的地方
 * （開發時的紅畫面、正式版的結束 app），蓋掉不叫的話錯誤會被我們安靜吃掉。
 */
export function initErrorLog() {
  if (started) return;
  started = true;

  // 登入後補送：待送的那幾筆通常是「上一次啟動」留下的，那時候可能還沒登入或已經斷線
  auth.onAuthStateChanged(u => { if (u) void flushPending(); });

  // 開發時不回報：紅畫面和熱重載的錯都會進來，只會把真正的問題淹掉
  if (__DEV__) return;

  const EU = (globalThis as any).ErrorUtils;
  if (!EU?.setGlobalHandler) return;
  const prev = EU.getGlobalHandler?.();
  EU.setGlobalHandler((err: any, isFatal?: boolean) => {
    try {
      reportLog('error', `${isFatal ? '[fatal] ' : ''}${err?.name ?? 'Error'}: ${err?.message ?? String(err)}`, String(err?.stack ?? ''));
    } catch { /* 回報本身壞掉也要讓原本的處理照常跑 */ }
    prev?.(err, isFatal);
  });
}
