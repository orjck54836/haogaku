/**
 * 購買流程的步驟紀錄。
 *
 * ## 為什麼需要這個檔案
 *
 * 購買會卡住的地方全部在「我們看不到的那一側」：StoreKit 的原生 promise、
 * Apple 的付款表單、後端的查證。每一步都已經有逾時保護，但逾時只會丟一個
 * 錯誤字串上去，**卡在哪一步完全不留痕跡**——於是回報進來只剩一句
 * 「顯示成功但按鈕一直轉」，剩下的只能猜。猜過的每一輪都要重新 build、
 * 重新沙盒購買一次，成本比記 log 高得多。
 *
 * 所以每一步進／出都記一筆，附上從按下按鈕起算的毫秒數。
 * 停在哪一行、以及那一行等了多久，就是答案。
 *
 * ## 為什麼不用 console.log
 *
 * `console.log` 只有接著 Metro 的 dev client 看得到，而**購買根本不能在
 * Expo Go 驗**（沒有 ExpoIap），真實的購買問題幾乎都發生在 TestFlight 上，
 * 那裡沒有 console。所以紀錄要留在記憶體裡、而且畫面上拿得到。
 * （console.log 還是照發一份，開著 Metro 的時候比較順手。）
 *
 * 不寫檔、不上傳：這是一次購買當下的診斷，重開 App 就不需要了，
 * 而且裡面會有 transactionId，沒必要讓它離開這台手機。
 */

/** 只留最後這麼多筆。purchaseSubscription 的輪詢會一直長，不設上限會無限吃記憶體 */
const MAX = 120;

type Entry = { ms: number; text: string };

let entries: Entry[] = [];
let t0 = Date.now();
const subs = new Set<() => void>();

/** 新的一次購買／還原從 0 開始算，不然時間軸會接到上一次的尾巴，看不出這次等了多久 */
export function iapLogReset(label: string) {
  t0 = Date.now();
  entries = [];
  ilog(label);
}

/**
 * 記一步。
 *
 * `text` 要寫得出「哪一步」和「結果」，例如 `verify ok plan=plus`。
 * **不要記使用者輸入或憑證**：這段文字會整段顯示在畫面上，也會被截圖傳出來。
 */
export function ilog(text: string) {
  entries.push({ ms: Date.now() - t0, text });
  if (entries.length > MAX) entries = entries.slice(-MAX);
  if (__DEV__) console.log(`[iap +${Date.now() - t0}ms] ${text}`);
  subs.forEach(fn => fn());
}

/** 錯誤物件的可讀形式。code 比 message 有用（StoreKit 的 message 是本地化的） */
export function errText(e: any): string {
  if (!e) return 'unknown';
  const code = e.code ? `code=${e.code}` : '';
  const msg = String(e.message ?? e);
  return [code, msg].filter(Boolean).join(' ');
}

/** 畫面上現在該顯示哪一步：最後一筆就是「卡住的那一步」 */
export function iapStage(): string {
  return entries.length ? entries[entries.length - 1].text : '';
}

export function iapLogText(): string {
  return entries.map(e => `+${(e.ms / 1000).toFixed(1)}s  ${e.text}`).join('\n');
}

export function hasIapLog(): boolean {
  return entries.length > 0;
}

/** 讓畫面可以跟著步驟更新；回傳取消訂閱 */
export function onIapLog(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
