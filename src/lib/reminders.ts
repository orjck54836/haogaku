import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { track } from './analytics';
import { today } from './date';

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
/** 最後一次「有練到東西」的日期 YYYY-MM-DD。決定今天那一則還要不要跳 */
const PRACTICED_KEY = 'reminder-practiced-v1';
/** 預設 20:00。晚餐後、睡前之前，是通勤族唯一有空坐下來的時段 */
export const DEFAULT_HOUR = 20;

const CHANNEL_ID = 'daily-reminder';

/**
 * 一次排未來幾天，而不是用一則「每天重複」的排程。
 *
 * 兩個問題都是重複排程造成的，而且都只能靠「一天一則」解掉：
 *
 * 1. **已經練完了還是會跳「今天的日語還沒練」。** 重複排程在跳出來之前
 *    不會回頭問今天練了沒，於是最認真的使用者每天晚上都被講一次他已經做完的事。
 *    這是會讓人直接把通知關掉的那種錯——而關掉是連帶關掉全部，之後再也喚不回來。
 *    拆成一天一則之後，`practicedToday()` 就能把今天那一則單獨取消。
 * 2. **文案不會輪替。** 四句是在排程當下抽的，一則重複排程等於從此固定那一句，
 *    備了四句也沒用。改成逐日排、逐日給不同的文案。
 *
 * 7 天是因為 iOS 的待排通知上限是 64 則，7 則離上限很遠；而冷啟動會重排一次
 * （`syncReminders`），只要使用者一週內開過一次 App 就永遠補得滿。
 * 一週都沒開的人，提醒本來也已經沒在發揮作用了。
 */
const HORIZON_DAYS = 7;

/**
 * 提醒文案。固定一句話會被當成系統噪音直接滑掉，
 * 所以備幾句**逐日輪替**（排程時依日期取，見 `scheduleAhead`），
 * 而且**都講具體的事**（今天的流行語、待複習的單字），
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
 * 真正排程的地方。先全部取消再排——重排時不清掉的話，改一次時間就多一組提醒。
 *
 * `skipToday` 由「今天練過了沒」決定，不是呼叫端自己挑的，
 * 因為冷啟動重排（`syncReminders`）也必須套用同一條規則：
 * 今天練完了才關掉 App，再打開時不該又把今天那一則排回來。
 */
async function scheduleAhead(N: any, hour: number) {
  await N.cancelAllScheduledNotificationsAsync();

  const practiced = await lastPracticedDay();
  const skipToday = practiced === today();
  const now = Date.now();

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const at = new Date();
    at.setDate(at.getDate() + i);
    at.setHours(hour, 0, 0, 0);

    // 今天的時間已經過了就跳過：排一個過去的時間點，通知會立刻跳出來
    if (at.getTime() <= now) continue;
    if (i === 0 && skipToday) continue;

    /**
     * 用「第幾天」挑文案，不是隨機抽。
     * 隨機的話連續兩天可能拿到同一句，而使用者實際感受到的就是「又是這句」——
     * 備四句的意義正是讓他每天看到的不一樣。
     */
    const line = LINES[Math.floor(at.getTime() / 86400000) % LINES.length];
    await N.scheduleNotificationAsync({
      content: { title: line.title, body: line.body },
      trigger: {
        type: N.SchedulableTriggerInputTypes?.DATE ?? 'date',
        date: at, channelId: CHANNEL_ID,
      },
    });
  }
}

async function lastPracticedDay(): Promise<string | null> {
  try { return await AsyncStorage.getItem(PRACTICED_KEY); } catch { return null; }
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

    await scheduleAhead(N, hour);
    await AsyncStorage.multiSet([[ENABLED_KEY, '1'], [HOUR_KEY, String(hour)]]);
    track('reminder_enable', { hour });
    return true;
  } catch {
    return false;
  }
}

/**
 * 「今天練到東西了」。完成課程、讀完讀物、練過一場 AI 會話都算。
 *
 * 記下日期之後把今天那一則取消掉（做法是整個重排，排程只有 7 則，重排很便宜）。
 * 沒開提醒的人只記日期不排程——他之後才打開提醒時，`enableReminders` 讀得到這筆，
 * 當天那一則一樣不會跳。
 */
export async function practicedToday() {
  try { await AsyncStorage.setItem(PRACTICED_KEY, today()); } catch { return; }
  if (!(await remindersEnabled())) return;
  const N = load();
  if (!N) return;
  try { await scheduleAhead(N, await reminderHour()); } catch { /* 下次冷啟動會補排 */ }
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
 *
 * 改成一天一則之後，這裡還多擔一件事：**把排到 7 天後的那一段補滿**。
 * 不補的話，連開 App 一週的人會在第 8 天安靜地沒有提醒。
 */
export async function syncReminders() {
  if (!(await remindersEnabled())) return;
  const N = load();
  if (!N) return;
  try { await scheduleAhead(N, await reminderHour()); } catch { /* 忽略：下次冷啟動再試 */ }
}

/** 這個 build 到底有沒有通知的原生模組。畫面用它決定要不要顯示開關 */
export const remindersSupported = () => !!load();
