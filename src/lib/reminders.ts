import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { track } from './analytics';

/**
 * 每日學習提醒（本機排程，不是遠端推播）。
 *
 * ## 為什麼是本機通知
 *
 * 遠端推播要 APNs 金鑰、要存 device token、要一台會在對的時間醒來的伺服器，
 * 而我們要送的東西其實只有一句「今天還沒練」——這個手機自己就算得出來。
 * 本機排程不必後端、不花錢，而且關掉網路也會跳。
 * 之後要做「朋友超過你了」這種需要伺服器才知道的事，再加遠端推播。
 *
 * ## 為什麼整包 lazy require
 *
 * `expo-notifications` 是**原生模組**，import 當下就會 requireNativeModule。
 * 原生模組是編進 binary 的，`npx expo install` 不會讓它出現在**已經裝在手機上的
 * dev client** 裡——頂層 import 的話，舊的 dev client 一啟動就死在
 * 「Cannot find native module 'ExpoNotifications'」，整個 app 打不開，
 * 不是只有提醒功能壞掉。（`expo-store-review` 就這樣炸過一次。）
 * 所以這裡一律 `load()` 後判空，拿不到就安靜降級成「沒有提醒」。
 *
 * 另外 Expo Go 驗不出這個問題：Expo Go 內建了大部分 expo 模組，一切正常，
 * 裝 dev client 的實機才會炸。**裝完這個套件要重 build dev client**
 * （`npx expo run:ios` 或 EAS），不然實機上提醒會一直是關的。
 */
/**
 * 先問「原生模組在不在」，確定在才 require 這個套件。
 *
 * 原本只用 try/catch 包 require，實機上還是炸了一個 uncaught
 * 「Cannot find native module 'ExpoPushTokenManager'」——expo-notifications 的
 * index 在模組載入時就會抓一整排原生模組（推播 token、channel、scheduler…），
 * 那個 throw 沒有乖乖留在我們的 try 裡。
 *
 * `requireOptionalNativeModule` 是**找不到就回 null、不丟錯**的版本，
 * 所以改成先用它探一下：沒有就直接當作不支援，連 require 都不要發生。
 * 探 scheduler（我們真正要用的）和 pushTokenManager（實際炸掉的那個）兩個就夠——
 * 這些模組是同一次 build 一起進去的，不會只缺其中一個。
 */
const NEEDED = ['ExpoNotificationScheduler', 'ExpoPushTokenManager'];

/** 探測結果只算一次：這個函式會在每次 render 的判斷式裡被叫到 */
let cached: any | null | undefined;

function load(): any | null {
  if (cached !== undefined) return cached;
  try {
    if (NEEDED.some(name => !requireOptionalNativeModule(name))) return (cached = null);
    cached = require('expo-notifications');
  } catch {
    cached = null;
  }
  return cached;
}

const ENABLED_KEY = 'reminder-on-v1';
const HOUR_KEY = 'reminder-hour-v1';
/** 預設 20:00。晚餐後、睡前之前，是通勤族唯一有空坐下來的時段 */
export const DEFAULT_HOUR = 20;

/** 排程用同一個 id，重排時先全部取消——否則改時間會變成兩則提醒 */
const CHANNEL_ID = 'daily-reminder';

/**
 * 提醒文案。固定一句話會被當成系統噪音直接滑掉，
 * 所以備幾句輪替，而且**都講具體的事**（今天的流行語、待複習的單字），
 * 不要寫「快來學習吧」這種誰看了都沒有動機的句子。
 */
const LINES = [
  { title: '今天的日語還沒練', body: '一堂課大約 4 分鐘，比滑手機短。' },
  { title: 'きょうのことば', body: '今天的流行語已經換了一個，來看看是什麼。' },
  { title: '單字在等你複習', body: '間隔複習就是要趁快忘記的時候回來看一眼。' },
  { title: '連續紀錄還在', body: '今天練一題就能接下去。' },
];

export async function remindersEnabled(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(ENABLED_KEY)) === '1'; } catch { return false; }
}

export async function reminderHour(): Promise<number> {
  try {
    const h = parseInt((await AsyncStorage.getItem(HOUR_KEY)) ?? '', 10);
    return Number.isFinite(h) && h >= 0 && h <= 23 ? h : DEFAULT_HOUR;
  } catch { return DEFAULT_HOUR; }
}

/**
 * 打開提醒。回傳 false 代表沒排成功（使用者拒絕權限，或這個 build 沒有原生模組），
 * 呼叫端要據此把開關彈回去——顯示「已開啟」但其實不會跳，比沒有這個功能更糟。
 */
export async function enableReminders(hour = DEFAULT_HOUR): Promise<boolean> {
  const N = load();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    const granted = current.granted
      || (await N.requestPermissionsAsync()).granted;
    if (!granted) { track('reminder_permission_denied'); return false; }

    // Android 一定要有 channel，否則通知不會出現（iOS 忽略這段）
    if (N.setNotificationChannelAsync) {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: '每日學習提醒',
        importance: N.AndroidImportance?.DEFAULT ?? 3,
      });
    }

    await N.cancelAllScheduledNotificationsAsync();
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await N.scheduleNotificationAsync({
      content: { title: line.title, body: line.body },
      trigger: {
        type: N.SchedulableTriggerInputTypes?.DAILY ?? 'daily',
        hour, minute: 0, channelId: CHANNEL_ID,
      },
    });
    await AsyncStorage.multiSet([[ENABLED_KEY, '1'], [HOUR_KEY, String(hour)]]);
    track('reminder_enable', { hour });
    return true;
  } catch {
    return false;
  }
}

export async function disableReminders() {
  const N = load();
  try { await N?.cancelAllScheduledNotificationsAsync(); } catch { /* 忽略 */ }
  try { await AsyncStorage.setItem(ENABLED_KEY, '0'); } catch { /* 忽略 */ }
  track('reminder_disable');
}

/**
 * 啟動時重排一次。
 *
 * 排程會被「重裝 App」「還原備份到新手機」清掉，但我們存的開關還在，
 * 於是使用者以為提醒開著、其實再也不會跳。每次冷啟動重排一次最省事，
 * 而且本機排程重排的成本是零。
 */
export async function syncReminders() {
  if (!(await remindersEnabled())) return;
  await enableReminders(await reminderHour());
}

/** 這個 build 到底有沒有通知的原生模組。畫面用它決定要不要顯示開關 */
export const remindersSupported = () => !!load();
