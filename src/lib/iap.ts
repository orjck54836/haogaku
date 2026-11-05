import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { PlanId } from '../content/plans';

/**
 * App 內購買（iOS 自動續訂訂閱）。
 *
 * ## 載入方式：探測過才 require
 *
 * `expo-iap` 有原生模組，頂層 import 會在「套件裝了、dev client 還沒重 build」的
 * 手機上一啟動就死在 Cannot find native module（見 CLAUDE.md）。
 * 所以一律走 `loadIap()`：先問原生模組在不在，不在就回 null，整個購買區塊安靜消失。
 *
 * **Expo Go 驗不出來。** Expo Go 沒有內建 ExpoIap，所以在 Expo Go 裡
 * `iapSupported()` 一定是 false，畫面會顯示「這個版本不能購買」——那是正確行為，
 * 不是壞掉。要測購買必須用 dev build 或 TestFlight，而且得有沙盒測試帳號。
 *
 * ## 誰說了算
 *
 * 這一層**不決定任何人的方案**。買完只做一件事：把 transactionId 送到
 * Cloud Functions 的 `verifyPurchase`，由後端跟 Apple 查證後寫 `entitlements/{uid}`。
 * 畫面上的 `profile.plan` 只是顯示用的影子，額度一律由後端讀 entitlements 決定。
 */

type IapModule = typeof import('expo-iap');

let cached: IapModule | null | undefined;

function loadIap(): IapModule | null {
  if (cached !== undefined) return cached;
  try {
    // 找不到回 null、不丟錯。確定在才 require，throw 就不會發生
    if (!requireOptionalNativeModule('ExpoIap')) return (cached = null);
    cached = require('expo-iap') as IapModule;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * 這台手機買不買得到。
 *
 * **不要在 render 的判斷式裡呼叫**——要在 `useEffect` 裡問一次存進 state。
 * 在 render 裡丟錯是整頁白掉，在 effect 裡最多是那顆按鈕不出現。
 */
export function iapSupported(): boolean {
  return Platform.OS === 'ios' && !!loadIap();
}

/**
 * 連線是 **Promise 快取**，不是布林旗標。
 *
 * 用 `let connected = false` 擋不住同時進來的兩個呼叫者：兩邊都看到 false，
 * 於是 `initConnection()` 被呼叫兩次。購買頁一打開就會發生——查價和
 * 「回前景時對方案」會同時觸發。重複 init 在 StoreKit 上是多掛一組監聽，
 * 交易事件會被收到兩次。把 Promise 本身存起來，後來的人等同一趟。
 */
let conn: Promise<IapModule> | null = null;

async function connect(): Promise<IapModule> {
  const m = loadIap();
  if (!m) throw new Error('這個版本不支援 App 內購買');
  if (!conn) {
    conn = m.initConnection().then(() => m).catch(e => { conn = null; throw e; });
  }
  return conn;
}

/** App 要結束或登出時收掉連線。沒收也不會壞，只是留著一個原生的監聽 */
export async function endIap() {
  const m = loadIap();
  if (!m || !conn) return;
  try { await m.endConnection(); } finally { conn = null; }
}

export type StorePrice = { productId: string; price: string };

/**
 * 跟 App Store 問實際售價。
 *
 * **畫面要顯示這個，不要顯示 plans.ts 的數字。** plans.ts 的 NT$150 是我們自己寫的，
 * 使用者在別的國家看到的是當地幣別和當地定價，兩者對不起來就是審查說的
 * 「價格標示不實」。問不到時（離線、商品還沒上架）才退回 plans.ts 當備案。
 */
export async function fetchPrices(productIds: string[]): Promise<StorePrice[]> {
  const m = await connect();
  const res = await m.fetchProducts({ skus: productIds, type: 'subs' });
  const list = Array.isArray(res) ? res : [];
  return list.map((p: any) => ({ productId: String(p.id ?? p.productId), price: String(p.displayPrice ?? '') }))
    .filter(p => p.productId && p.price);
}

/**
 * 一筆交易的 id。
 *
 * **欄位叫 `id`，不叫 `transactionId`。** expo-iap 6 的 `PurchaseCommon` 只有 `id`
 * （iOS 是 StoreKit 的 transaction id），寫成 `p.transactionId` 會拿到 undefined，
 * `String()` 之後變成字串 "undefined" 送上後端——Apple 兩個環境都查無此交易，
 * 於是**每一次購買都驗不過**，而且錯誤訊息長得像網路問題，很難看出是欄位名寫錯。
 * 留著舊名當備案是為了日後升級改回去也不會壞。
 */
function txId(p: any): string {
  const id = p?.id ?? p?.transactionId ?? p?.originalTransactionIdIOS;
  const s = id == null ? '' : String(id);
  if (!s || s === 'undefined') throw new Error('no-transaction-id');
  return s;
}

/**
 * 問 StoreKit 名下現有的交易，**不觸發 AppStore.sync()**。
 *
 * 這是和 `restorePurchases()` 的關鍵差別：sync 一定會跳 Apple ID 密碼框，
 * 只能掛在使用者自己按的「還原購買」上。自動對帳（冷啟動、回前景、購買失敗補救）
 * 一律走這一個，不然使用者會被密碼框追著跑（見 syncPlan 的註解）。
 */
async function availablePurchases(): Promise<any[]> {
  const m = await connect();
  const res = await m.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
  const list = Array.isArray(res) ? res : [];
  // pending 的交易（Ask to Buy 等家長核准、或銀行要二次驗證）還沒成交，拿去驗一定
  // 查無有效訂閱。濾掉是為了不要每次回前景都為同一筆 pending 白打一次後端
  return list.filter((p: any) => p?.purchaseState !== 'pending');
}

/** 好幾筆歷史交易時挑最新的：後端本來就會查整個訂閱群組的現況，給誰都一樣，給最新的最保險 */
function latestOf(list: any[]): any | null {
  if (!list.length) return null;
  return list.reduce((a, b) => (Number(b?.transactionDate ?? 0) > Number(a?.transactionDate ?? 0) ? b : a));
}

/** 後端驗證的結果 */
export type VerifyResult = { plan: PlanId; expiresAt: number; active: boolean };

async function verifyOnServer(transactionId: string): Promise<VerifyResult> {
  const res = await httpsCallable(functions, 'verifyPurchase')({ transactionId });
  return res.data as VerifyResult;
}

/**
 * 發起購買，等它走完，驗證，然後結束交易。
 *
 * `requestPurchase` 的回傳值**不是**購買結果（Apple 的付款表單是非同步的），
 * 結果會從 `purchaseUpdatedListener` 進來，所以這裡把兩個監聽包成一個 Promise。
 *
 * `finishTransaction` 一定要在驗證成功之後才呼叫：先結束交易、驗證卻失敗的話，
 * 這筆交易就從佇列裡消失了，使用者付了錢卻拿不到方案，只能靠還原購買救回來。
 * 反過來留著沒結束的交易，iOS 每次冷啟動都會重送，我們再驗一次就好。
 */
export async function purchaseSubscription(productId: string): Promise<VerifyResult> {
  const m = await connect();

  const purchase = await new Promise<any>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ok.remove(); bad.remove();
      fn();
    };

    const ok = m.purchaseUpdatedListener(p => {
      if (p.productId !== productId) return;   // 其他商品的補送交易，不是這次要等的
      finish(() => resolve(p));
    });
    const bad = m.purchaseErrorListener(e => finish(() => reject(e)));

    /**
     * 監聽沒回來的保險。
     *
     * Apple 的付款表單是另一個行程，它顯示「已完成」之後我們的監聽**有可能收不到**
     * （那一刻斷網、App 被系統凍結、或者交易被延後成 pending）。沒有這個 timeout 的話
     * Promise 永遠不 resolve：使用者看到 Apple 說成功、我們的畫面卻什麼都沒發生，
     * 而且 busy 卡在 true，連再按一次都不行。
     *
     * 逾時不等於沒買到——所以丟一個認得出來的錯，讓上層去走還原購買把它救回來。
     * 3 分鐘是給「要輸 Apple ID 密碼 ＋ 雙重驗證」的人留的餘裕。
     */
    const timer = setTimeout(() => finish(() => reject(new Error('purchase-timeout'))), 180_000);

    m.requestPurchase({ request: { apple: { sku: productId } }, type: 'subs' })
      .catch((e: unknown) => finish(() => reject(e)));
  });

  /**
   * 還沒成交的交易不能當成買到了。
   *
   * Ask to Buy（兒童帳號要家長核准）和銀行二次驗證會回 `purchaseState: 'pending'`：
   * Apple 的表單已經關掉，但錢還沒扣、訂閱還沒生效，拿去驗一定查無有效訂閱。
   * 原本會落到「購買沒有完成，沒有扣款」——對一個正在等核准的人這句話是錯的。
   *
   * 而且 **pending 不能 finishTransaction**：結束掉的話核准通過之後那筆交易
   * 不會再回來，使用者等到核准卻永遠拿不到方案。留著它，核准後 StoreKit 會重送。
   */
  if (purchase.purchaseState === 'pending') throw new Error('purchase-pending');

  const result = await verifyOnServer(txId(purchase));
  // 訂閱不是消耗型，isConsumable 要 false，否則 StoreKit 會當成可以再買一次
  await m.finishTransaction({ purchase, isConsumable: false }).catch(() => {});
  return result;
}

/**
 * 錢可能已經付了，只是我們沒接到。
 *
 * 購買失敗的處理不能只跳「購買沒有完成」就結束——除了使用者自己按取消，
 * 其他每一種失敗（監聽逾時、驗證那一步斷線、App 被殺掉）都有可能
 * **Apple 那邊已經成交**。這時候去問一次 StoreKit 名下有沒有有效訂閱，
 * 有就補驗、補開通，使用者不會看到一個「付了錢卻沒方案」的畫面。
 *
 * 回 null 代表真的沒買到，這時候才該跳失敗。
 */
export async function recoverPurchase(): Promise<VerifyResult | null> {
  try {
    const m = await connect();
    // 這裡**不能**叫 restoreSubscription()：它內含 AppStore.sync()，會跳 Apple ID 密碼框。
    // 購買失敗的補救是自動發生的，使用者沒有按任何「還原」，突然跳密碼框只會像當機
    const latest = latestOf(await availablePurchases());
    if (!latest) return null;
    const result = await verifyOnServer(txId(latest));
    if (result.active) await m.finishTransaction({ purchase: latest, isConsumable: false }).catch(() => {});
    return result.active ? result : null;
  } catch {
    return null;
  }
}

/**
 * 還原購買。訂閱型 App 沒有這個會被退件。
 *
 * 換手機、重裝、或是驗證那一步剛好斷線的人靠這個把方案找回來。
 * 回傳 null 代表這組 Apple ID 名下沒有我們的有效訂閱。
 */
export async function restoreSubscription(): Promise<VerifyResult | null> {
  const m = await connect();
  await m.restorePurchases().catch(() => {});
  const purchases = await m.getAvailablePurchases();
  const list = (Array.isArray(purchases) ? purchases : []) as any[];
  if (!list.length) return null;

  // 可能有好幾筆歷史交易，挑最新的那筆去問後端；後端本來就會查整個訂閱群組的現況
  const latest = latestOf(list);
  const result = await verifyOnServer(txId(latest));
  for (const p of list) {
    await m.finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
  }
  return result.active ? result : null;
}

/**
 * 讀目前的方案資格。
 *
 * `entitlements/{uid}` 本人讀得到、誰都寫不進去（見 firestore.rules）。
 * 這裡讀它只是為了讓畫面顯示正確的方案名稱——額度還是後端自己讀自己的。
 * 讀不到（離線、還沒買過）一律當免費，這是安全的預設。
 */
export async function cloudPlan(uid: string): Promise<PlanId> {
  try {
    const snap = await getDoc(doc(db, 'entitlements', uid));
    const d = snap.data();
    if (!d) return 'free';
    const live = !d.expiresAt || Number(d.expiresAt) > Date.now();
    const plan = d.plan;
    return live && (plan === 'plus' || plan === 'pro') ? plan : 'free';
  } catch {
    return 'free';
  }
}

/**
 * 冷啟動時對一次方案。
 *
 * 續訂、取消、退款都不會通知 App，所以不問就會停在上一次的狀態。
 * 先讀 entitlements（便宜、離線也不會壞），**沒過期就不打擾 Apple**；
 * 只有本來就有訂閱、而且已經過了到期日的人才需要重新驗證一次。
 */
export async function syncPlan(uid: string): Promise<PlanId> {
  const plan = await cloudPlan(uid);
  if (plan !== 'free' || !iapSupported()) return plan;

  // 到這裡代表後端認為沒有有效訂閱。可能真的沒買過，也可能是續訂了但我們還不知道。
  //
  // **這一段絕對不能呼叫 restorePurchases()。** 它在 iOS 就是 AppStore.sync()，
  // 一定會跳 Apple ID 密碼框；而這個函式掛在冷啟動和「回前景」上，密碼框自己
  // 就會讓 App 離開再回到前景，於是跳完一次又觸發一次——實測是密碼框跳不完，
  // 而且會把購買流程的 busy 一起卡住（TestFlight 上就是這樣炸的）。
  // getAvailablePurchases 讀的是本機已有的 entitlement，不會跳任何視窗。
  try {
    const latest = latestOf(await availablePurchases());
    if (!latest) return 'free';
    const result = await verifyOnServer(txId(latest));
    return result.active ? result.plan : 'free';
  } catch {
    return 'free';
  }
}
