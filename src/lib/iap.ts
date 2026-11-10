import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { PlanId } from '../content/plans';
import { ilog, iapLogReset, errText } from './iaplog';

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

/**
 * 原生呼叫不保證會回來，所以每一個都要有上限。
 *
 * 這是「掃臉成功之後按鈕一直轉圈」的根因：StoreKit 的 promise 卡住時既不 resolve
 * 也不 reject，上層的 `finally { setBusy(false) }` 永遠跑不到。
 * `purchaseSubscription` 裡那個 75 秒的 timeout 只保護「等交易事件」那一段，
 * 它前後的 initConnection／finishTransaction／getAvailablePurchases 都在它外面。
 * 逾時丟錯比永遠轉圈好：丟錯上層會去走補救，轉圈只能重開 App。
 */
function withTimeout<T>(p: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // 逾時一定要記一筆：原生 promise 不回來的時候，「哪一個 tag 逾時了」
    // 就是唯一的線索，而這裡是所有逾時的共同出口
    const timer = setTimeout(() => { ilog(`逾時 ${tag}（${ms / 1000}s）`); reject(new Error(tag)); }, ms);
    p.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

async function connect(): Promise<IapModule> {
  const m = loadIap();
  if (!m) throw new Error('這個版本不支援 App 內購買');
  if (!conn) {
    ilog('連線 StoreKit…');
    // 逾時一定要把 conn 清掉（下面的 catch）：連線的 promise 是快取的，
    // 留著一個永遠不 resolve 的在裡面，之後每一次購買都會在第一行就卡死
    conn = withTimeout(m.initConnection(), 15_000, 'iap-connect-timeout')
      .then(() => { ilog('連線完成'); return m; })
      .catch(e => { conn = null; ilog(`連線失敗 ${errText(e)}`); throw e; });
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
  const res = await withTimeout(m.fetchProducts({ skus: productIds, type: 'subs' }), 20_000, 'iap-price-timeout');
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
async function availablePurchases(activeOnly = true): Promise<any[]> {
  const m = await connect();
  const res = await withTimeout(
    m.getAvailablePurchases({ onlyIncludeActiveItemsIOS: activeOnly }), 20_000, 'iap-query-timeout');
  const list = Array.isArray(res) ? res : [];
  ilog(`名下交易 ${list.length} 筆${activeOnly ? '' : '（含歷史）'}`);
  // pending 的交易（Ask to Buy 等家長核准、或銀行要二次驗證）還沒成交，拿去驗一定
  // 查無有效訂閱。濾掉是為了不要每次回前景都為同一筆 pending 白打一次後端
  return list.filter((p: any) => p?.purchaseState !== 'pending');
}

/**
 * 名下交易問到東西為止，**空手不算答案**。
 *
 * `initConnection()` 剛接起來那一下問，StoreKit 的本機交易快取還沒暖，
 * 常常回空陣列——而對帳的呼叫端一看到空的就結論「這個人沒有訂閱」。
 * 實際踩到的是換帳號登入：Apple 帳號買過高級版，改用 Google 登入後
 * 對帳問到空的，畫面停在免費版；去按訂閱才被 StoreKit 回
 * 「你已經訂閱這個項目」，那一下才把名下交易叫出來。
 *
 * 重試只是本機查詢，不打後端也不跳任何視窗，真的沒買過的人成本是幾毫秒。
 * 間隔不能太短：要留時間給 StoreKit 把交易讀進來。
 */
async function availablePurchasesRetry(tries = 3, gapMs = 1_500): Promise<any[]> {
  for (let i = 0; i < tries; i++) {
    const list = await availablePurchases();
    if (list.length) return list;
    if (i < tries - 1) {
      ilog('名下沒有交易，等一下再問一次');
      await new Promise(r => setTimeout(r, gapMs));
    }
  }
  /**
   * 「現有資格」問不到時，**改問整串歷史**。
   *
   * `onlyIncludeActiveItemsIOS: true` 問的是 StoreKit 的 currentEntitlements，
   * 它在「App 還沒跟 App Store 對過這組 Apple ID」的狀態下會是空的——
   * 實測就是換帳號登入後一直停在免費版，直到使用者去按一次訂閱
   * （`requestPurchase` 會逼 StoreKit 同步一次）才突然好了。
   * 那一步不該是使用者的責任。
   *
   * 問歷史不會跳密碼框（跳框的是 restorePurchases 的 AppStore.sync()），
   * 而且**拿到過期或退款的舊交易也無所謂**：我們只需要一個 transactionId，
   * 有沒有效是後端拿去跟 Apple 查證之後才算數的。
   */
  ilog('現有資格是空的，改問整串歷史');
  try {
    return await availablePurchases(false);
  } catch (e) {
    ilog(`問歷史也失敗 ${errText(e)}`);
    return [];
  }
}

/** 好幾筆歷史交易時挑最新的：後端本來就會查整個訂閱群組的現況，給誰都一樣，給最新的最保險 */
function latestOf(list: any[]): any | null {
  if (!list.length) return null;
  return list.reduce((a, b) => (Number(b?.transactionDate ?? 0) > Number(a?.transactionDate ?? 0) ? b : a));
}

/** 後端驗證的結果 */
export type VerifyResult = { plan: PlanId; expiresAt: number; nextPlan?: PlanId; active: boolean };

/**
 * 目前的方案資格，含「下一期會變成什麼」。
 *
 * `nextPlan` 和 `plan` 不一樣時代表有一筆**排程中的變更**：同一個訂閱群組裡
 * 降級不是立刻生效的，按下標準版之後這一期結束前他仍然是高級版。
 * 畫面要講得出這件事，不然使用者會覺得自己按的那一下沒有作用。
 * `nextPlan: 'free'` 是已經取消自動續訂。
 */
export type Entitlement = {
  plan: PlanId; expiresAt: number; nextPlan: PlanId;
  /**
   * 這份資格是沙盒交易換來的（TestFlight 或沙盒測試帳號）。
   *
   * 只給「測試重置」那顆按鈕用（見 `resetPlanOnServer`）：正式付費的人
   * 不該看到它，而後端也只認沙盒，按了只會被拒絕。
   */
  sandbox?: boolean;
};

export const freeEntitlement: Entitlement = { plan: 'free', expiresAt: 0, nextPlan: 'free' };

/**
 * 方案變更被 Apple 排到下一期，**現在不會有新交易**。
 *
 * 同一個訂閱群組裡，只有「升級」是立刻生效、立刻開一筆新交易的；
 * 被 Apple 判定成降級或平移（crossgrade）的變更只會改 renewalInfo 的
 * autoRenewProductId，這一期的交易原封不動。
 *
 * 這就是「標準版的人按高級版、掃臉成功、按鈕一直轉」的真正原因：
 * 購買流程在等一筆**永遠不會出現**的交易，只能等到逾時。
 *
 * 判定是升級還是降級看的是 App Store Connect 裡訂閱群組的 **Level**
 * （數字小 = 等級高）。高級版的 level 沒有排在標準版上面的話，
 * 從標準版買高級版就會被當成降級——那是後台設定，程式改不掉，
 * 但程式至少要認得出這個結果，並且把「下一期才生效」講給使用者聽。
 */
export class PurchaseScheduled extends Error {
  constructor(public readonly result: VerifyResult) {
    super('purchase-scheduled');
  }
}

/**
 * 後端給的是**最終答案**、再問一百次也一樣的錯誤碼。
 *
 * 這一條分界很重要：購買流程裡所有的重試（每 7 秒問一次排程、逾時後的
 * recoverPurchase）都是為了「交易還沒傳到我們手上」設計的，對這幾種錯完全無效。
 * 實際踩到的是 `permission-denied`（同一筆訂閱已經綁在別的帳號上）：
 * 同一個 403 被重問三次、拖滿 75 秒逾時、再花 45 秒補救又問一次——
 * 使用者看到的就是一顆轉快兩分鐘的按鈕，而答案第一次就拿到了。
 *
 * 不在這張表裡的（internal、unavailable、網路斷掉）才值得重試。
 */
const FINAL_CODES = [
  'permission-denied',    // 這筆訂閱綁在別的帳號上
  'failed-precondition',  // 訪客帳號不能訂閱
  'unauthenticated',      // 沒登入
  'invalid-argument',     // transactionId 有問題
];

/** callable 的錯誤碼長得像 `functions/permission-denied` */
export function verifyCode(e: unknown): string {
  const raw = String((e as any)?.code ?? '');
  return raw.split('/').pop() ?? '';
}

/** 驗證那一步失敗時認得出來的錯：Apple 已經成交，卡在我們這邊 */
export class VerifyFailed extends Error {
  /** 後端明講的最終答案（見 FINAL_CODES）。true 就不要再重試、也不要走補救 */
  readonly final: boolean;
  readonly code: string;
  constructor(public readonly cause: unknown) {
    super('verify-failed');
    this.code = verifyCode(cause);
    this.final = FINAL_CODES.includes(this.code);
  }
}

/**
 * 把交易送給後端驗。
 *
 * 失敗一律包成 `VerifyFailed`：**到這一步 Apple 已經收錢了**，畫面不能再說
 * 「沒有扣款」。實際踩過的是後端金鑰被 Apple 回 401，每一筆都驗不過，
 * 而使用者看到的是「購買沒有完成，沒有扣款」——他真的被扣了，
 * 錯的是伺服器設定，這種話會讓他再買一次。
 */
/**
 * 這次查證是「使用者主動做了什麼」，還是背景對帳。
 *
 * 後端的測試重置會把當期的沙盒訂閱忽略掉（見 functions 的 `resetPlan`），
 * 而那個忽略**只對背景對帳有效**：使用者自己按了購買或還原，就是要這份資格，
 * 再擋著只會變成「Apple 說成功、我們說沒有」，購買流程等一個永遠不會變的答案。
 */
type VerifyIntent = 'purchase' | 'restore';

async function verifyOnServer(transactionId: string, intent?: VerifyIntent): Promise<VerifyResult> {
  ilog(`送後端查證 tx=${transactionId}`);
  try {
    /**
     * **這裡一定要有自己的上限。** callable 的預設上限是 70 秒，而它前面
     * 已經可能等過 StoreKit 一輪；驗證卡住的時候畫面就是一顆轉不停的鈕。
     * 後端自己的 timeoutSeconds 是 30，所以 35 秒沒回來就是網路那一段卡住，
     * 等下去不會有別的結果（交易留在佇列裡，冷啟動會自動補驗）。
     */
    const res = await withTimeout(
      httpsCallable(functions, 'verifyPurchase')({ transactionId, intent }), 35_000, 'iap-verify-timeout');
    const r = res.data as VerifyResult;
    ilog(`查證回來 plan=${r?.plan} next=${r?.nextPlan ?? '-'} active=${r?.active}`);
    return r;
  } catch (e) {
    console.warn('verifyPurchase failed', e);
    ilog(`查證失敗 ${errText(e)}`);
    throw new VerifyFailed(e);
  }
}

/**
 * 發起購買，等它走完，驗證，然後結束交易。
 *
 * ## 不要只等 `purchaseUpdatedListener`
 *
 * 原本整個流程押在那個監聽上，結果是 Apple 的付款表單顯示成功、我們的畫面
 * 什麼都沒發生、按鈕一直轉——因為那一則事件**有可能不會進到我們的監聽**：
 *
 * - expo-iap 6 在 iOS 上做了交易**去重**，而那份歷史是 module 層的全域變數：
 *   同一筆 transaction id 只要在這次連線裡被發出過一次（冷啟動補送、
 *   上一次購買嘗試、回前景對帳），後面新掛的監聽就收不到了。
 *   這裡對自己掛的監聽關掉去重（`dedupeTransactionIOS: false`）。
 * - iOS 的 `requestPurchase` 本身就會 resolve 成那筆 Purchase（文件說不要「只」靠它，
 *   但它是最直接的那一手），所以兩邊誰先到就用誰。
 * - 兩邊都沒到時，隔幾秒去問一次 StoreKit 名下現有的交易。付款已經成交的話
 *   那筆一定在裡面，不必等到逾時。
 *
 * 逾時從 3 分鐘縮到 75 秒：逾時不是結論，上層會接著走 recoverPurchase() 補救，
 * 讓人盯著一顆轉三分鐘的按鈕才是最糟的那個選擇。
 *
 * `finishTransaction` 一定要在驗證成功之後才呼叫：先結束交易、驗證卻失敗的話，
 * 這筆交易就從佇列裡消失了，使用者付了錢卻拿不到方案，只能靠還原購買救回來。
 * 反過來留著沒結束的交易，iOS 每次冷啟動都會重送，我們再驗一次就好。
 */
export async function purchaseSubscription(productId: string, wantPlan: PlanId): Promise<VerifyResult> {
  iapLogReset(`購買 ${productId} → ${wantPlan}`);
  const m = await connect();

  /**
   * 等不到交易事件時，問後端「現在到底算什麼」。
   *
   * 要問後端而不是看本機：排程中的變更只存在 Apple 的 renewalInfo 裡，
   * StoreKit 名下的交易看起來完全沒變（還是舊方案），本機分不出
   * 「還沒成交」和「成交了但下一期才生效」。
   *
   * **三種答案都要處理，不能只認 scheduled。** 原本這裡只回傳「排到下一期」
   * 那一種，於是購買成功的情況被當成「還沒有答案」丟掉——而 `verifyOnServer`
   * 查證通過的同時後端就已經把 entitlement 寫進去了，方案其實在第一次問
   * （第 6 秒）就開通了。丟掉這個答案的代價是一路空等到 75 秒逾時、
   * 再走 45 秒的 recoverPurchase，使用者看到的就是「Apple 說成功、
   * 畫面轉了快兩分鐘」。
   */
  type Probe =
    | { kind: 'bought'; purchase: any }
    | { kind: 'scheduled'; result: VerifyResult }
    | null;
  const probe = async (): Promise<Probe> => {
    const latest = latestOf(await availablePurchases());
    if (!latest) return null;
    const r = await verifyOnServer(txId(latest), 'purchase');
    if (!r.active) return null;
    // 回傳交易本體而不是 VerifyResult：下面要用它 finishTransaction。
    // 不結束的話那筆交易會留在佇列裡，每次冷啟動都重送一遍
    if (r.plan === wantPlan) return { kind: 'bought', purchase: latest };
    if (r.nextPlan === wantPlan) return { kind: 'scheduled', result: r };
    return null;
  };

  const purchase = await new Promise<any>((resolve, reject) => {
    let done = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      ok.remove(); bad.remove();
      fn();
    };
    /** 只認這次要買的商品；其他商品的補送交易交給冷啟動對帳去處理 */
    const take = (p: any) => {
      if (!p || p.productId !== productId) return false;
      finish(() => resolve(p));
      return true;
    };

    // dedupeTransactionIOS: false —— 見上面，去重歷史是全域的，用預設值會漏掉補送的那一則
    const ok = m.purchaseUpdatedListener(p => {
      ilog(`收到交易事件 ${p?.productId ?? '?'} state=${p?.purchaseState ?? '-'}`);
      take(p);
    }, { dedupeTransactionIOS: false });
    const bad = m.purchaseErrorListener(e => { ilog(`交易事件錯誤 ${errText(e)}`); finish(() => reject(e)); });

    /**
     * 監聽沒回來的保險。
     *
     * Apple 的付款表單是另一個行程，它顯示「已完成」之後我們的監聽**有可能收不到**
     * （那一刻斷網、App 被系統凍結、交易被去重掉，或者被延後成 pending）。
     * 沒有這個 timeout 的話 Promise 永遠不 resolve：使用者看到 Apple 說成功、
     * 我們的畫面卻什麼都沒發生，而且 busy 卡在 true，連再按一次都不行。
     *
     * 逾時不等於沒買到——所以丟一個認得出來的錯，讓上層去走還原購買把它救回來。
     */
    timers.push(setTimeout(() => {
      ilog('等不到交易，逾時（75s）');
      finish(() => reject(new Error('purchase-timeout')));
    }, 75_000));

    /**
     * 等不到新交易時，問一次「是不是排到下一期了」。
     *
     * 排程中的變更不會有新交易，所以上面那些路全部走不到，只能等 75 秒逾時——
     * 那 75 秒裡使用者看到的就是 Apple 說成功、我們一直轉圈。
     * 12 秒夠讓正常的升級（立刻發交易）先走完，不會白打這一趟。
     */
    const checkScheduled = (delay: number) => timers.push(setTimeout(async () => {
      if (done) return;
      ilog(`問後端現在算什麼（第 ${Math.round((delay - 6_000) / 7_000) + 1} 次）`);
      try {
        const hit = await probe();
        if (hit && !done) {
          if (hit.kind === 'scheduled') {
            ilog('是排程中的變更');
            finish(() => reject(new PurchaseScheduled(hit.result)));
            return;
          }
          // 後端已經認這個方案了。走 take() 和監聽同一條路，
          // 才會接著做 pending 檢查和 finishTransaction
          ilog('後端說已經是這個方案了');
          if (take(hit.purchase)) return;
          ilog('但那筆交易不是這個商品，繼續等');
        }
      } catch (e) {
        ilog(`問不到 ${errText(e)}`);
        // 後端已經給了最終答案：再等下去只會把同一個錯重問到逾時（見 VerifyFailed.final）
        if (e instanceof VerifyFailed && e.final && !done) { finish(() => reject(e)); return; }
      }
      // **一定要重問。** Apple 的 renewalInfo 不是按下確認就馬上變，
      // 第一次問常常還是舊值（降級特別明顯）。只問一兩次的話就會問空，
      // 然後一路空等到 75 秒逾時——那就是「降級也一直轉圈」的原因。
      if (!done && delay < 60_000) checkScheduled(delay + 7_000);
    }, delay));
    checkScheduled(6_000);

    /** 監聽和回傳值都沒給答案時，自己去問 StoreKit。成交了的話那筆一定在名下 */
    const poll = (delay: number) => timers.push(setTimeout(async () => {
      if (done) return;
      ilog('問 StoreKit 名下有沒有這筆');
      try {
        const hit = (await availablePurchases()).filter((p: any) => p?.productId === productId);
        ilog(`符合這個商品的 ${hit.length} 筆`);
        if (!done) take(latestOf(hit));
      } catch (e) { ilog(`問不到 ${errText(e)}`); }
      if (!done && delay < 40_000) poll(delay + 5_000);
    }, delay));
    // 2.5 秒就問第一次：原生層的交易去重是「設定過才關掉」，而關掉它要跟原生來回一趟
    // （expo-iap 的 setPurchaseUpdatedListenerOptions 沒有被 await），
    // 緊接著就 requestPurchase 的話，那一則事件有機會在設定生效前就被原生擋掉。
    // 問 StoreKit 名下有什麼是不會被去重影響的那條路，所以愈早問愈好
    poll(2_500);

    ilog('叫出付款表單');
    m.requestPurchase({ request: { apple: { sku: productId } }, type: 'subs' })
      // iOS 會 resolve 成這筆 Purchase（subs 有可能回陣列）。監聽先到就以監聽為準
      .then((r: any) => {
        const one = Array.isArray(r) ? latestOf(r.filter(Boolean)) : r;
        ilog(`付款表單回來 ${one ? `${one.productId} state=${one.purchaseState ?? '-'}` : '沒有交易'}`);
        take(one);
      })
      .catch((e: unknown) => { ilog(`付款表單錯誤 ${errText(e)}`); finish(() => reject(e)); });
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
  if (purchase.purchaseState === 'pending') { ilog('交易還在等核准（pending）'); throw new Error('purchase-pending'); }

  const result = await verifyOnServer(txId(purchase), 'purchase');
  // 訂閱不是消耗型，isConsumable 要 false，否則 StoreKit 會當成可以再買一次。
  // 加上限是因為它在「驗證成功之後」：卡在這裡的話方案其實已經開通，
  // 畫面卻還在轉圈——結不掉沒關係，下次冷啟動 StoreKit 會重送同一筆
  ilog('結束交易');
  await withTimeout(m.finishTransaction({ purchase, isConsumable: false }), 10_000, 'iap-finish-timeout')
    .catch(e => ilog(`結束交易失敗（方案已開通，不影響）${errText(e)}`));
  ilog('購買流程結束');
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
  // 整段包一個上限：這支是「購買逾時之後」的補救，使用者已經盯著轉圈等了一輪，
  // 這裡再卡住就變成永遠轉圈。失敗回 null，上層會跳「購買沒有完成」讓他有事可做
  return withTimeout(recoverOnce(), 45_000, 'iap-recover-timeout').catch(() => null);
}

async function recoverOnce(): Promise<VerifyResult | null> {
  ilog('開始補救：問名下有沒有有效訂閱');
  try {
    const m = await connect();
    // 這裡**不能**叫 restoreSubscription()：它內含 AppStore.sync()，會跳 Apple ID 密碼框。
    // 購買失敗的補救是自動發生的，使用者沒有按任何「還原」，突然跳密碼框只會像當機
    const latest = latestOf(await availablePurchasesRetry());
    if (!latest) { ilog('名下沒有交易，真的沒買到'); return null; }
    const result = await verifyOnServer(txId(latest), 'purchase');
    if (result.active) {
      await withTimeout(m.finishTransaction({ purchase: latest, isConsumable: false }), 10_000, 'iap-finish-timeout')
        .catch(() => {});
    }
    if (!result.active) ilog('有交易但不是有效訂閱（過期或已退款）');
    return result.active ? result : null;
  } catch (e) {
    ilog(`補救失敗 ${errText(e)}`);
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
  iapLogReset('還原購買');
  const m = await connect();
  // restorePurchases 內含 AppStore.sync()，會跳 Apple ID 密碼框；使用者沒輸入完
  // 它就不會回來，所以上限給得比別的寬，但不能沒有——不然「還原購買」也會轉不停
  ilog('向 Apple 同步（會跳密碼框）');
  await withTimeout(m.restorePurchases(), 90_000, 'iap-restore-timeout').catch(e => ilog(`同步沒完成 ${errText(e)}`));
  const purchases = await withTimeout(m.getAvailablePurchases(), 20_000, 'iap-query-timeout');
  const list = (Array.isArray(purchases) ? purchases : []) as any[];
  if (!list.length) return null;

  // 可能有好幾筆歷史交易，挑最新的那筆去問後端；後端本來就會查整個訂閱群組的現況
  const latest = latestOf(list);
  const result = await verifyOnServer(txId(latest), 'restore');
  /**
   * 收尾要**一起發**，不要一筆一筆等。
   *
   * 這裡的 list 是整串歷史交易（沒帶 onlyIncludeActiveItemsIOS，還原本來就要看全部），
   * 沙盒帳號測久了會累積十幾筆。序列跑的話每筆最多 10 秒，疊起來「還原購買」
   * 會轉好幾分鐘——而方案在上面 verifyOnServer 回來那一刻就已經開通了，
   * 這幾筆結不掉也只是下次冷啟動 StoreKit 再重送一次，不影響任何結果。
   * 彼此之間沒有順序關係，所以總時間應該是一筆的時間，不是 N 筆的總和。
   */
  await Promise.all(list.map(p =>
    withTimeout(m.finishTransaction({ purchase: p, isConsumable: false }), 10_000, 'iap-finish-timeout')
      .catch(() => {})));
  return result.active ? result : null;
}

/**
 * 讀目前的方案資格。
 *
 * `entitlements/{uid}` 本人讀得到、誰都寫不進去（見 firestore.rules）。
 * 這裡讀它只是為了讓畫面顯示正確的方案名稱——額度還是後端自己讀自己的。
 * 讀不到（離線、還沒買過）一律當免費，這是安全的預設。
 */
export async function cloudEntitlement(uid: string): Promise<Entitlement> {
  try {
    const snap = await getDoc(doc(db, 'entitlements', uid));
    const d = snap.data();
    if (!d) return freeEntitlement;
    const live = !d.expiresAt || Number(d.expiresAt) > Date.now();
    const paid = (v: unknown): PlanId => (v === 'plus' || v === 'pro' ? v : 'free');
    const plan = live ? paid(d.plan) : 'free';
    // nextPlan 是後來才加的欄位，舊資料沒有就當成「下一期還是同一個方案」
    const nextPlan = plan === 'free' ? 'free' : paid(d.nextPlan ?? d.plan);
    return { plan, expiresAt: Number(d.expiresAt ?? 0), nextPlan, sandbox: d.environment === 'Sandbox' };
  } catch {
    return freeEntitlement;
  }
}

export async function cloudPlan(uid: string): Promise<PlanId> {
  return (await cloudEntitlement(uid)).plan;
}

/**
 * 冷啟動時對一次方案。
 *
 * 續訂、取消、退款都不會通知 App，所以不問就會停在上一次的狀態。
 * 先讀 entitlements（便宜、離線也不會壞），**沒過期就不打擾 Apple**；
 * 只有本來就有訂閱、而且已經過了到期日的人才需要重新驗證一次。
 */
export async function syncPlan(uid: string): Promise<Entitlement> {
  const ent = await cloudEntitlement(uid);
  if (ent.plan !== 'free' || !iapSupported()) return ent;

  // 到這裡代表後端認為沒有有效訂閱。可能真的沒買過，也可能是續訂了但我們還不知道。
  //
  // **這一段絕對不能呼叫 restorePurchases()。** 它在 iOS 就是 AppStore.sync()，
  // 一定會跳 Apple ID 密碼框；而這個函式掛在冷啟動和「回前景」上，密碼框自己
  // 就會讓 App 離開再回到前景，於是跳完一次又觸發一次——實測是密碼框跳不完，
  // 而且會把購買流程的 busy 一起卡住（TestFlight 上就是這樣炸的）。
  // getAvailablePurchases 讀的是本機已有的 entitlement，不會跳任何視窗。
  // 降回免費也要保留 sandbox 旗標：沙盒訂閱取消完就是 plan free，
  // 這時正是最需要「測試重置」那顆按鈕的時候，旗標掉了按鈕就跟著不見
  const free: Entitlement = { ...freeEntitlement, sandbox: ent.sandbox };
  try {
    // 問到為止：一次空手不代表沒買過（見 availablePurchasesRetry）
    const latest = latestOf(await availablePurchasesRetry());
    if (!latest) return free;
    const result = await verifyOnServer(txId(latest));   // 背景對帳不帶 intent：被測試重置忽略掉的那一期，這裡就該當作沒有
    return result.active
      ? { plan: result.plan, expiresAt: result.expiresAt, nextPlan: result.nextPlan ?? result.plan, sandbox: ent.sandbox }
      : free;
  } catch {
    return free;
  }
}

/**
 * 把自己的訂閱資格打回免費版（只有沙盒訂閱做得到，見後端的 `resetPlan`）。
 *
 * 後端會順便把**現在這一期忽略掉**（取消訂閱到當期結束前 Apple 都還是回
 * ACTIVE，不忽略的話下一次 syncPlan 就把資格寫回來），`suppressedUntil`
 * 是那一期的到期時間。呼叫端清完仍然要再對一次方案，用對回來的結果講話：
 * 忽略只認同一筆、而且到期日沒往後跳的訂閱，所以還是有長回來的可能。
 */
export async function resetPlanOnServer(): Promise<{ previousPlan: PlanId; claims: number; suppressedUntil: number }> {
  ilog('測試重置：請後端清掉資格');
  const res = await withTimeout(httpsCallable(functions, 'resetPlan')({}), 30_000, 'iap-reset-timeout');
  const d = (res as any).data ?? {};
  ilog(`測試重置回來 previous=${d.previousPlan} claims=${d.claims} 忽略到=${d.suppressedUntil ?? 0}`);
  return {
    previousPlan: (d.previousPlan ?? 'free') as PlanId,
    claims: Number(d.claims) || 0,
    suppressedUntil: Number(d.suppressedUntil) || 0,
  };
}
