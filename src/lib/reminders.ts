import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { doc, setDoc } from 'firebase/firestore';
import { track } from './analytics';
import { dayString, today } from './date';
import { auth, db } from './firebase';
import { InboxMsg, INBOX_TTL_MS, parseInbox } from './inbox';

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

/** 探測結果只算一次：冷啟動和每次完成練習都會叫到 */
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
/**
 * 排程一律排隊，一次只跑一個。
 *
 * 這裡是「先全部取消、再逐則排」，中間有好幾個 await。冷啟動、完成課程、
 * ゆい的訊息更新可能在同一秒各叫一次，兩個同時跑的話，A 排到一半被 B 取消、
 * B 排完 A 又接著排剩下的——同一天會跳兩則。
 */
let chain: Promise<void> = Promise.resolve();
function scheduleAhead(N: any, hour: number): Promise<void> {
  const run = chain.then(() => scheduleAheadNow(N, hour));
  chain = run.catch(() => {});
  return run;
}

async function scheduleAheadNow(N: any, hour: number) {
  await N.cancelAllScheduledNotificationsAsync();

  const practiced = await lastPracticedDay();
  const skipToday = practiced === today();
  const now = Date.now();
  const yui = await readYui();
  let yuiPlaced = false;
  const st = await readStreak();

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
    const rotating = LINES[Math.floor(at.getTime() / 86400000) % LINES.length];
    /**
     * 連續紀錄會在今晚斷掉的那一天，文案換成講天數的那句。
     * 「連續 12 天」比任何一句通用的提醒都有動機——那是他自己累積的東西。
     * 只換「最後一次學習的隔天」那一則：再往後他沒練的話紀錄已經斷了，講天數是在說謊。
     * 2 天以上才講：連續 1 天叫人「別斷了」很奇怪。
     */
    const atRisk = !!st && st.streak >= 2 && st.lastDay === dayString(new Date(at.getTime() - 86400000));
    const line = atRisk
      ? { title: `連續 ${st!.streak} 天，今天還沒練`, body: '練一堂課或複習幾個單字，就能接到第 ' + (st!.streak + 1) + ' 天。' }
      : rotating;
    /**
     * ゆい有話要說的話，送達後的第一則提醒換成她的訊息，不另外多排一則：
     * 一天被叫兩次是讓人關通知的最快方法。只換第一則——連續好幾天都是同一句，
     * 就從朋友的訊息變成系統在催。沒點開的話，下次開 App 重排時會再排到下一天
     * （直到過期，見 INBOX_TTL_MS），那時候首頁也看得到。
     */
    const useYui = !!yui && !yuiPlaced && at.getTime() >= yui.deliverAt && at.getTime() < yui.deliverAt + INBOX_TTL_MS;
    if (useYui) yuiPlaced = true;
    const content = useYui
      ? {
          title: 'ゆい',
          // 日文一行、中文一行：看不懂日文的人也知道她在問什麼，才會點進來
          body: yui!.zh ? `${yui!.ja}\n${yui!.zh}` : yui!.ja,
          // 訊息內容跟著通知走：點開時就算雲端那份已經被別台手機讀掉，這裡還是開得起來
          data: { kind: 'yui', day: dayString(at), id: yui!.id, ja: yui!.ja, zh: yui!.zh },
        }
      // day 給回報用：跳出來之後從通知中心讀回來，就知道是哪一天的那則（見 reportStatus）
      : { title: line.title, body: line.body, data: { kind: 'daily', day: dayString(at) } };
    await N.scheduleNotificationAsync({
      content,
      trigger: {
        type: N.SchedulableTriggerInputTypes?.DATE ?? 'date',
        date: at, channelId: CHANNEL_ID,
      },
    });
  }
}

// ---------- 連續紀錄 ----------

/** 理由同 YUI_KEY：排程在冷啟動就要跑，不能等 data.tsx 載入 */
const STREAK_KEY = 'reminder-streak-v1';
type StreakInfo = { streak: number; lastDay: string | null };

async function readStreak(): Promise<StreakInfo | null> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(STREAK_KEY)) ?? 'null');
    return v && typeof v.streak === 'number' ? v : null;
  } catch { return null; }
}

let lastStreak = '';
/**
 * 連續天數變了就記下來並重排。data.tsx 在 streak／lastDay 變動時呼叫。
 * 今天第一次學習時 `practicedToday()` 也會重排，這裡只是確保明天那則拿到的是新的天數。
 */
export async function setStreakReminder(streak: number, lastDay: string | null) {
  const key = `${streak}|${lastDay}`;
  if (key === lastStreak) return;
  lastStreak = key;
  try { await AsyncStorage.setItem(STREAK_KEY, JSON.stringify({ streak, lastDay })); } catch { return; }
  const N = load();
  if (!N) return;
  try {
    if (!(await N.getPermissionsAsync()).granted) return;
    await scheduleAhead(N, await reminderHour());
  } catch { /* 下次冷啟動會補排 */ }
}

// ---------- ゆい的訊息 ----------

/**
 * 訊息本身存在 progress.inbox（跟著雲端走），這裡只放一份給排程讀。
 * 排程在冷啟動時就要跑，那時候學習資料可能還沒載入完，不能等 data.tsx。
 */
const YUI_KEY = 'yui-inbox-v1';

async function readYui(): Promise<InboxMsg | null> {
  try { return parseInbox(JSON.parse((await AsyncStorage.getItem(YUI_KEY)) ?? 'null')); } catch { return null; }
}

let lastYui = '';
/** 訊息變了（新的一則、讀掉了）就重排。data.tsx 在 inbox 變動時呼叫 */
export async function setYuiReminder(m: InboxMsg | null) {
  const key = m ? m.id : '';
  if (key === lastYui) return;
  lastYui = key;
  try {
    if (m) await AsyncStorage.setItem(YUI_KEY, JSON.stringify(m));
    else await AsyncStorage.removeItem(YUI_KEY);
  } catch { return; }
  const N = load();
  if (!N) return;
  try {
    if (!(await N.getPermissionsAsync()).granted) return;
    await scheduleAhead(N, await reminderHour());
  } catch { /* 下次冷啟動會補排 */ }
}

export type YuiOpen = { id: string; ja: string; zh: string };
let yuiHandler: ((m: YuiOpen) => void) | null = null;
let yuiPending: YuiOpen | null = null;

/**
 * 點了ゆい的通知要直接進對話，不是停在首頁——像點開 LINE 通知一樣。
 *
 * 冷啟動是被通知點開的話，那一刻導覽還沒建好，所以先記著，
 * 等導覽準備好呼叫這裡登記的時候再補跳一次。
 */
export function onYuiOpen(cb: (m: YuiOpen) => void): () => void {
  yuiHandler = cb;
  if (yuiPending) { const m = yuiPending; yuiPending = null; cb(m); }
  return () => { if (yuiHandler === cb) yuiHandler = null; };
}

async function lastPracticedDay(): Promise<string | null> {
  try { return await AsyncStorage.getItem(PRACTICED_KEY); } catch { return null; }
}

/**
 * 有權限就把提醒排好。提醒**預設開啟、App 裡沒有開關**：要關就到系統設定關通知，
 * 那是 iOS／Android 本來就給的、使用者最熟的那個開關。App 裡再做一個的話，
 * 兩邊狀態會對不上（系統關了、App 顯示開著），而且多一個讓人順手關掉的地方。
 *
 * 這裡**不跳權限視窗**，那件事交給 `askReminderAfterLesson()`。
 * 以前冷啟動就問：視窗蓋在登入頁上，那時他連這個 App 在做什麼都還不知道，
 * 按「不允許」的機率最高，而 iOS 拒絕一次就永遠不能再問。
 * 對沒綁定的訪客來說，通知是唯一能把他拉回來的管道（沒有 email、沒有帳號），
 * 浪費在這個時間點太可惜。
 */
async function ensureScheduled(): Promise<void> {
  const N = load();
  if (!N) return;
  try {
    if (!(await N.getPermissionsAsync()).granted) return;
    await scheduleNow(N);
  } catch { /* 忽略：下次冷啟動再試 */ }
}

async function scheduleNow(N: any) {
  // Android 一定要有 channel，否則通知不會出現（iOS 忽略這段）
  if (N.setNotificationChannelAsync) {
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: '每日學習提醒',
      importance: N.AndroidImportance?.DEFAULT ?? 3,
    });
  }
  await scheduleAhead(N, await reminderHour());
}

/** 自己問過幾次、最後一次是哪天。和系統的權限狀態分開記：按「先不用」不會燒掉系統那一次 */
const ASK_KEY = 'reminder-ask-v1';
const MAX_SOFT_ASKS = 3;
const SOFT_ASK_GAP_DAYS = 2;

/**
 * 課程完成頁問一次「要不要每天提醒你」，說好才叫系統的權限視窗。
 *
 * 時機選在完成頁，是因為那時他剛拿到 XP、剛知道一堂課只要幾分鐘，
 * 「每天提醒一下」聽起來才像在幫他，而不是 App 在討東西。
 *
 * 先用自己的 Alert 問一句，不是直接叫系統視窗：系統視窗一輩子只有一次，
 * 他按了「不允許」就再也問不回來；自己的問句按「先不用」，隔兩天還能再問，
 * 最多問 3 次。
 *
 * 函式自己決定要不要問，呼叫端每次完成都叫它就好。
 */
export async function askReminderAfterLesson(): Promise<void> {
  await softAsk('lesson', '要每天提醒你練一下嗎？');
}

/** 第一次打開 App 的日期。用來判斷「這是不是他隔天以後又回來了」 */
const FIRST_SEEN_KEY = 'first-seen-v1';

/**
 * 沒上過課的人回來時問一次通知。
 *
 * 只在完成頁問的話，從沒上完一堂課的人**永遠不會被問到**——後台實測
 * 回報的手機裡 72% 是「還沒問」，而這些人正是最需要被拉回來的。
 * 「隔天以後又打開」本身就是有興趣的訊號，這時問比冷啟動第一次好得多。
 *
 * 只在一次都沒問過時才問（n === 0）：問過的人交給完成頁的節奏，
 * 不然首頁和完成頁會各自累計，三次額度很快就燒完。
 */
export async function askReminderOnReturn(): Promise<void> {
  try {
    const first = await AsyncStorage.getItem(FIRST_SEEN_KEY);
    if (!first) { await AsyncStorage.setItem(FIRST_SEEN_KEY, today()); return; }
    if (first === today()) return;
    const rec = JSON.parse((await AsyncStorage.getItem(ASK_KEY)) ?? '{}');
    if ((rec.n ?? 0) > 0) return;
  } catch { return; }
  await softAsk('return', '要每天提醒你練一下嗎？');
}

/** 兩個問的時機共用同一份次數與間隔紀錄，系統視窗也只在這裡叫 */
async function softAsk(via: 'lesson' | 'return', title: string): Promise<void> {
  const N = load();
  if (!N) return;
  try {
    const perm = await N.getPermissionsAsync();
    if (perm.granted || perm.canAskAgain === false) return;

    let rec = { n: 0, last: '' };
    try { rec = { ...rec, ...JSON.parse((await AsyncStorage.getItem(ASK_KEY)) ?? '{}') }; } catch { /* 壞掉當作沒問過 */ }
    if (rec.n >= MAX_SOFT_ASKS) return;
    if (rec.last && Date.now() - Date.parse(`${rec.last}T00:00:00`) < SOFT_ASK_GAP_DAYS * 86400000) return;
    await AsyncStorage.setItem(ASK_KEY, JSON.stringify({ n: rec.n + 1, last: today() })).catch(() => {});

    const hour = await reminderHour();
    Alert.alert(
      title,
      `每天 ${hour}:00 跳一則，今天練過就不會吵你。`,
      [
        { text: '先不用', style: 'cancel', onPress: () => track('reminder_ask', { answer: 'later', n: rec.n + 1, via }) },
        {
          text: '好', onPress: async () => {
            track('reminder_ask', { answer: 'yes', n: rec.n + 1, via });
            try {
              if (!(await N.requestPermissionsAsync()).granted) { track('reminder_permission_denied'); return; }
              await scheduleNow(N);
            } catch { /* 下次冷啟動會補排 */ }
            finally { void reportStatus(); }
          },
        },
      ],
    );
  } catch { /* 問不了就算了，不影響畫面 */ }
}

/**
 * 「今天練到東西了」。完成課程、讀完讀物、練過一場 AI 會話都算。
 *
 * 記下日期之後把今天那一則取消掉（做法是整個重排，排程只有 7 則，重排很便宜）。
 * 沒給通知權限的人只記日期不排程。權限由完成頁的 `askReminderAfterLesson()` 問。
 */
export async function practicedToday() {
  try { await AsyncStorage.setItem(PRACTICED_KEY, today()); } catch { return; }
  const N = load();
  if (!N) return;
  try {
    if (!(await N.getPermissionsAsync()).granted) return;
    await scheduleAhead(N, await reminderHour());
  } catch { /* 下次冷啟動會補排 */ }
  finally { void reportStatus(); }
}

/**
 * 啟動時重排一次。
 *
 * 排程會被「重裝 App」「還原備份到新手機」清掉。每次冷啟動重排一次最省事，
 * 而且本機排程重排的成本是零。沒有權限就什麼都不做，不在這裡問（理由見 `ensureScheduled`）。
 * 以前在 App 裡關掉提醒的人（舊的 `reminder-on-v1 = 0`）不再被尊重：
 * 開關已經拿掉，留著那筆等於讓他永遠開不回來，要關請用系統設定。
 *
 * 改成一天一則之後，這裡還多擔一件事：**把排到 7 天後的那一段補滿**。
 * 不補的話，連開 App 一週的人會在第 8 天安靜地沒有提醒。
 */
export async function syncReminders() {
  listenTaps();
  await ensureScheduled();
  // 不放在 ensureScheduled 裡：那邊沒有原生模組就提早 return，舊 binary 的人會整個不回報
  void reportStatus();
}

// ---------- 回報給後台 ----------

/**
 * 把「這台手機的提醒狀態」寫到 `reminderStatus/{uid}`，後台才看得到有沒有發出去。
 *
 * ## 為什麼要手機自己講
 *
 * 提醒是本機排程（理由見檔頭），**後端從頭到尾沒有參與**：沒有發送紀錄、沒有送達回條。
 * 後台想知道「今天有沒有發」，唯一知道答案的是手機。所以回報三層，可信度由低到高：
 *
 * 1. **排了沒**（`perm`、`nextDay`）：權限有沒有給、下一則排在哪天。
 *    今天練過的人今天那則被取消掉了，那是刻意的，不是沒送到（`practiced`）
 * 2. **跳出來了**（`delivered`）：下次打開 App 時從通知中心讀回來的。
 *    **使用者在打開 App 之前就把通知滑掉的話讀不到**，所以這個數字只會偏低，不會偏高
 * 3. **點了**（`tapped`）：點通知打開 App。這是唯一百分之百確定他看到的
 *
 * 2、3 都要等他下次打開 App 才送得上來，今天晚上 8 點的那則，最快也要他點開那一刻才進後台。
 *
 * ## 為什麼不放進 users/{uid}
 *
 * 那份文件是整份 setDoc 覆蓋的（data.tsx 的 commit），另外塞的欄位下一次存檔就被洗掉。
 * 獨立一份也方便規則用 hasOnly 鎖欄位，和排行榜同一個做法。
 */
const SEEN_KEY = 'reminder-seen-v1';
/** 送達／點擊的日期留幾天。後台只畫兩週，留多了只是讓文件越來越肥 */
const KEEP_DAYS = 14;

type Seen = { delivered: string[]; tapped: string[] };

async function readSeen(): Promise<Seen> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? '{}');
    return { delivered: Array.isArray(v.delivered) ? v.delivered : [], tapped: Array.isArray(v.tapped) ? v.tapped : [] };
  } catch { return { delivered: [], tapped: [] }; }
}

/** 合併、去重、只留最近 KEEP_DAYS 天。通知中心被清掉之後還記得，所以要累積在手機上，不能每次重讀 */
function mergeDays(old: string[], add: string[]): string[] {
  const floor = dayString(new Date(Date.now() - KEEP_DAYS * 86400000));
  return [...new Set([...old, ...add])].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= floor).sort().slice(-KEEP_DAYS);
}

/**
 * 一則通知是「哪一天的提醒」。新排的帶 `data.day`；這次改版之前排的沒有，退回用跳出來的時間。
 * iOS 的 `date` 給的是**秒**、Android 是毫秒（expo-notifications 兩邊沒統一），小於 1e11 就當秒。
 */
function dayOfNotification(n: any): string | null {
  const day = n?.request?.content?.data?.day;
  if (typeof day === 'string') return day;
  const t = Number(n?.date);
  if (!Number.isFinite(t) || t <= 0) return null;
  return dayString(new Date(t < 1e11 ? t * 1000 : t));
}

/**
 * 處理過的那一次點擊。`getLastNotificationResponseAsync` 每次問都會回同一筆，
 * 而 reportStatus 一次啟動會跑好幾次——不擋的話同一次點擊會被記好幾次、
 * ゆい的對話也會被打開好幾次。存手機上，下次冷啟動才不會又拿舊的那筆跳進對話。
 */
const HANDLED_KEY = 'reminder-handled-v1';
let handled: string | null = null;
// 只讀一次，大家等同一個 promise：listener 和冷啟動那條可能同時進來，
// 各讀一次的話後回來的那個會把前一個剛記下的 id 蓋回舊值，兩邊都放行
let handledLoad: Promise<void> | null = null;

async function handleResponse(r: any) {
  const n = r?.notification;
  const id = `${n?.request?.identifier ?? ''}|${n?.date ?? ''}`;
  handledLoad ??= AsyncStorage.getItem(HANDLED_KEY).then(v => { handled = v; }, () => {});
  await handledLoad;
  // await 之後到這裡是同步的：比對和記下之間不會被另一個呼叫插隊
  if (id === handled) return;
  handled = id;
  AsyncStorage.setItem(HANDLED_KEY, id).catch(() => {});

  const data = n?.request?.content?.data;
  if (data?.kind === 'yui' && typeof data.ja === 'string') {
    const m = { id: String(data.id ?? ''), ja: data.ja, zh: typeof data.zh === 'string' ? data.zh : '' };
    track('inbox_open', { via: 'push' });
    if (yuiHandler) yuiHandler(m); else yuiPending = m;
  }
  await recordTap(n);
}

async function recordTap(n: any) {
  const day = dayOfNotification(n);
  if (!day) return;
  const seen = await readSeen();
  // 點得到就一定跳出來過：點完 iOS 會把它從通知中心拿掉，不補這筆的話「送達」會漏掉點過的人
  const next = { delivered: mergeDays(seen.delivered, [day]), tapped: mergeDays(seen.tapped, [day]) };
  try { await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* 忽略 */ }
  track('reminder_open', { day });
}

let listening = false;
/** App 開著（在背景）時點通知不會冷啟動，要靠 listener 才抓得到 */
function listenTaps() {
  if (listening) return;
  const N = load();
  if (!N?.addNotificationResponseReceivedListener) return;
  listening = true;
  try {
    N.addNotificationResponseReceivedListener((r: any) => { void handleResponse(r).then(reportStatus); });
  } catch { /* 忽略 */ }
}

let lastSent = '';
let waitingAuth = false;

async function reportStatus(): Promise<void> {
  const uid = auth.currentUser?.uid;
  // 冷啟動時常常還沒登入完：等登入那一刻再送一次，不然大多數冷啟動的回報都會漏掉
  if (!uid) {
    if (!waitingAuth) {
      waitingAuth = true;
      const off = auth.onAuthStateChanged(u => { if (u) { off(); waitingAuth = false; void reportStatus(); } });
    }
    return;
  }
  try {
    const N = load();
    let perm = 'unavailable', pending = 0, nextDay = '';
    let seen = await readSeen();
    if (N) {
      const p = await N.getPermissionsAsync();
      perm = p.granted ? 'granted' : p.canAskAgain === false ? 'denied' : 'undetermined';
      // 冷啟動是被通知點開的：listener 掛上之前就發生了，只能事後問
      const last = await N.getLastNotificationResponseAsync?.().catch(() => null);
      if (last) await handleResponse(last);
      const shown = await N.getPresentedNotificationsAsync?.().catch(() => []) ?? [];
      seen = await readSeen();
      seen = { ...seen, delivered: mergeDays(seen.delivered, shown.map(dayOfNotification).filter(Boolean)) };
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen)).catch(() => {});
      const all = await N.getAllScheduledNotificationsAsync?.().catch(() => []) ?? [];
      pending = all.length;
      const days: string[] = all.map((x: any) => x?.content?.data?.day).filter((d: any) => typeof d === 'string').sort();
      // 舊版排的沒有 day，那批只知道有幾則、不知道排在哪天（重排一次就會換成新的）
      nextDay = days[0] ?? '';
    }
    const body = {
      perm, pending, nextDay, hour: await reminderHour(),
      practiced: (await lastPracticedDay()) ?? '',
      delivered: seen.delivered, tapped: seen.tapped,
      os: `${Platform.OS} ${Platform.Version}`.slice(0, 40),
      app: String(Constants.expoConfig?.version ?? '?').slice(0, 40),
    };
    // 一次啟動裡會叫很多次（每完成一堂課都會），內容沒變就不寫，省得每堂課多一次寫入
    const key = JSON.stringify(body);
    if (key === lastSent) return;
    await setDoc(doc(db, 'reminderStatus', uid), { ...body, updatedAt: Date.now() });
    lastSent = key;
  } catch { /* 回報失敗不影響提醒本身 */ }
}
