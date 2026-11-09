import { Alert, Linking, Platform } from 'react-native';
import { linkById } from '../content/links';
import { today } from './date';

/**
 * 請使用者給評價。
 *
 * 兩段式，不是直接跳原生評分視窗。理由很實際：
 * iOS 一年只允許跳三次原生視窗（而且是系統在數，不是我們），
 * 跳給一個正在不爽的人等於浪費掉一次額度，還會換來一顆星。
 * 所以先自己問一句「用得還習慣嗎」：
 *   說喜歡 → 才叫原生視窗（那時幾乎篤定是好評）
 *   說普通 → 不叫評分，改導去 LINE 聽他要說什麼（負評變成客服對話）
 *   說晚點 → 什麼都不做，過一陣子再問
 *
 * 時機的三條規則，都是為了不要在人家學到一半時打斷：
 * 1. 至少完成 5 堂課或讀物——沒用過幾次就問，答案沒有意義
 * 2. 距上次詢問至少 60 天
 * 3. 一輩子最多問 3 次；說過喜歡或留過意見就不再問
 */

export type ReviewState = {
  /** 已經問過幾次 */
  asked: number;
  /** 上次問的日期 YYYY-MM-DD */
  lastAskedAt: string | null;
  /** 已經給過評價或留過意見，之後都不要再問 */
  done: boolean;
};

export const emptyReview: ReviewState = { asked: 0, lastAskedAt: null, done: false };

const MIN_COMPLETED = 5;
const MIN_DAYS_BETWEEN = 60;
const MAX_ASKS = 3;

function daysSince(day: string | null): number {
  if (!day) return Infinity;
  const ms = Date.parse(`${day}T00:00:00`);
  if (Number.isNaN(ms)) return Infinity;
  return Math.floor((Date.now() - ms) / 86400000);
}

/** 現在該不該問。純函式，方便在畫面裡直接判斷 */
export function shouldAskReview(r: ReviewState, completedCount: number): boolean {
  if (r.done) return false;
  if (r.asked >= MAX_ASKS) return false;
  if (completedCount < MIN_COMPLETED) return false;
  return daysSince(r.lastAskedAt) >= MIN_DAYS_BETWEEN;
}

/**
 * expo-store-review 要**用到才載入**，不能寫成頂層 import。
 *
 * 這個套件在 import 的當下就會去要原生模組（requireNativeModule），
 * 所以只要執行環境裡沒有它，整個 app 會在啟動時就死在
 * 「Cannot find native module 'ExpoStoreReview'」——連課程都打不開。
 *
 * 什麼時候會沒有？**加這個套件之前編譯的 dev client**。原生模組是編進
 * binary 裡的，裝新套件不會自動進到已經裝在手機上的那包，要重新 build。
 * 正式版和 Expo Go 都有，所以這條路只會在開發機上走到。
 *
 * 一個評分功能不值得讓整個 app 開不起來，所以這裡寧可安靜放棄。
 */
type StoreReviewModule = typeof import('expo-store-review');

function loadStoreReview(): StoreReviewModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-store-review') as StoreReviewModule;
  } catch {
    return null;
  }
}

/** 原生評分視窗。不能用時退回 App Store 頁面（兩者都沒有就當作沒發生） */
async function openNativeReview(): Promise<void> {
  const SR = loadStoreReview();
  if (!SR) {
    if (__DEV__) console.warn('[review] 這個 build 沒有 expo-store-review 原生模組，需要重新 build dev client');
    return;
  }
  try {
    if (await SR.hasAction()) {
      await SR.requestReview();
      return;
    }
  } catch { /* 往下退回商店頁 */ }
  // storeUrl() 讀的是 app.config.ts 裡的 appStoreUrl；沒填就是 null，那就當作沒發生
  const url = SR.storeUrl();
  if (url) Linking.openURL(url).catch(() => {});
}

/** 留意見：導去 LINE 官方帳號，沒設定 LINE 就不提供這個選項 */
function feedbackUrl(): string | null {
  const line = linkById('line');
  return line?.url?.trim() ? line.url : null;
}

/** 詢問的結果。asked 的累加由呼叫端做——這裡不知道目前是第幾次 */
export type AskResult = { lastAskedAt: string; done?: boolean };

/**
 * 跳出詢問。回傳要寫回 ReviewState 的欄位——
 * 這個函式不碰儲存，由呼叫端決定怎麼存，才不用把 data context 拉進 lib。
 */
export function askForReview(): Promise<AskResult> {
  return new Promise(resolve => {
    const asked: AskResult = { lastAskedAt: today() };
    const fb = feedbackUrl();

    const buttons: any[] = [
      {
        text: '很喜歡', onPress: () => {
          openNativeReview();
          resolve({ ...asked, done: true });
        },
      },
    ];

    if (fb) {
      buttons.push({
        text: '有地方想建議', onPress: () => {
          Linking.openURL(fb).catch(() => {});
          // 願意留意見的人已經表達過了，不要再用評分視窗煩他
          resolve({ ...asked, done: true });
        },
      });
    }

    buttons.push({ text: '以後再說', style: 'cancel', onPress: () => resolve(asked) });

    Alert.alert(
      '用得還習慣嗎？',
      Platform.OS === 'ios'
        ? '皓學日語是小團隊做的。如果這個 app 有幫到你，一則 App Store 評價對我們幫助很大。'
        : '皓學日語是小團隊做的。如果這個 app 有幫到你，一則商店評價對我們幫助很大。',
      buttons,
      { cancelable: true, onDismiss: () => resolve(asked) },
    );
  });
}
