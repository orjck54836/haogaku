import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * 使用者行為分析（GA4 Measurement Protocol）。
 *
 * ## 為什麼不用 Firebase Analytics
 *
 * 自動事件比較完整，但它是**原生模組**：裝了之後沒有重 build 的 dev client
 * 一啟動就死在「Cannot find native module」，而且模擬器的 Expo Go 驗不出來
 * （Expo Go 內建了大部分 expo 模組）。Measurement Protocol 只是一個 HTTP 端點，
 * Expo Go 和實機都能跑，不必重 build——代價是所有事件都要自己埋。
 *
 * ## 為什麼經過 Cloud Functions 而不是直接打 GA4
 *
 * MP 要帶 api_secret。放進 app 等於公開，任何人都能往你的報表灌假資料。
 * 放在後端的 secret 裡，手機只送事件本身。
 *
 * ## 批次送
 *
 * 一次呼叫一個事件的話，每一次點擊都是一次 Function invocation。
 * 這裡攢到 8 筆或 30 秒才送一次，順便把重試的複雜度關在這個檔案裡。
 * 送失敗就丟掉：行為分析掉幾筆沒關係，為了它重試反而更貴。
 */

type Event = { name: string; params?: Record<string, string | number | boolean> };

const CID_KEY = 'ga4-cid-v1';
const MAX_BATCH = 8;
const FLUSH_MS = 30_000;

let cid: string | null = null;
let queue: Event[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = true;

/** GA4 的 client_id：裝置識別，不是帳號。沒有帳號的訪客也要能算成一個人 */
async function clientId(): Promise<string> {
  if (cid) return cid;
  try {
    const saved = await AsyncStorage.getItem(CID_KEY);
    if (saved) return (cid = saved);
  } catch { /* 忽略 */ }
  // GA4 慣例是「數字.數字」，不必是真的 UUID
  const made = `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
  cid = made;
  AsyncStorage.setItem(CID_KEY, made).catch(() => {});
  return made;
}

async function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  const events = queue;
  queue = [];
  if (!events.length || !enabled) return;
  try {
    await httpsCallable(functions, 'track')({ clientId: await clientId(), events });
  } catch {
    // 後端沒設定 GA4 或離線：安靜放棄，不重試也不吵使用者
  }
}

/**
 * 記一個事件。名稱用小寫底線（GA4 的慣例），參數值只放純量。
 * **不要放個人資料**：暱稱、自我介紹、會話內容都不該進 GA4。
 */
export function track(name: string, params?: Record<string, string | number | boolean>) {
  if (!enabled) return;
  queue.push({ name, params });
  if (queue.length >= MAX_BATCH) { flush(); return; }
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

/** 關掉追蹤（之後要做「不要分析我的使用狀況」時用得到），會把還沒送的丟掉 */
export function setAnalyticsEnabled(on: boolean) {
  enabled = on;
  if (!on) { queue = []; if (timer) { clearTimeout(timer); timer = null; } }
}

/** 畫面切到背景時先送一次，不然最後那幾筆會跟著 app 一起消失 */
export const flushAnalytics = flush;
