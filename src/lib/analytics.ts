import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, Platform } from 'react-native';
import Constants from 'expo-constants';
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
 * Expo Go 和實機都能跑，不必重 build——代價是所有事件都要自己埋，
 * **連 session 和互動時間都要自己算**（見下面的 SESSION），裝置和地區也要自己帶。
 *
 * ## 為什麼經過 Cloud Functions 而不是直接打 GA4
 *
 * MP 要帶 api_secret。放進 app 等於公開，任何人都能往你的報表灌假資料。
 * 放在後端的 secret 裡，手機只送事件本身。
 *
 * ## 批次送
 *
 * 一次呼叫一個事件的話，每一次點擊都是一次 Function invocation。
 * 這裡攢到 8 筆或 30 秒才送一次，送失敗就丟掉：
 * 行為分析掉幾筆沒關係，為了它重試反而更貴。
 */

type Event = { name: string; params?: Record<string, string | number | boolean> };

const CID_KEY = 'ga4-cid-v1';
const OPTOUT_KEY = 'ga4-optout-v1';
const MAX_BATCH = 8;
const FLUSH_MS = 30_000;
/** 閒置多久算新的一段 session。30 分鐘是 GA4 自己的預設，跟著它報表才對得起來 */
const SESSION_GAP_MS = 30 * 60_000;

let cid: string | null = null;
let queue: Event[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = true;

/**
 * 用戶屬性（GA4 的 user_properties）：程度、方案、學習目標、是不是訪客。
 *
 * 這幾個是報表上「拆給廣告商看」的維度——「想去日本旅行的人佔幾成」
 * 是直接談得出價錢的數字，只有事件計數的話這題答不出來。
 * 每次送都整份帶上：MP 不會記得上一次送過什麼，沒帶的那批事件就沒有這些屬性。
 */
let userProps: Record<string, string> = {};

export function setUserProps(props: Record<string, string>) {
  userProps = { ...userProps, ...props };
}

/**
 * 裝置資訊。MP 是從我們的 Cloud Functions 送出去的，不帶的話 GA4 看到的
 * 「裝置」「作業系統」全是 (not set)——它只看得到伺服器，看不到手機。
 * 地區也是同一個問題，那個在後端用使用者的 IP 補（ip_override），手機這邊拿不到。
 */
let device: Record<string, string> | null = null;
function deviceInfo() {
  if (device) return device;
  const { width, height, scale } = Dimensions.get('screen');
  let language = '';
  try { language = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase(); } catch { /* 拿不到就不帶 */ }
  device = {
    category: Platform.OS === 'ios' && (Platform as any).isPad ? 'tablet' : 'mobile',
    operating_system: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS,
    operating_system_version: String(Platform.Version),
    // GA4 的解析度是實體像素，Dimensions 給的是 pt
    screen_resolution: `${Math.round(width * scale)}x${Math.round(height * scale)}`,
    ...(language ? { language } : {}),
  };
  return device;
}

/** 版號放用戶屬性：「哪一版開始流失」要能拆 */
const appVersion = String(Constants.expoConfig?.version ?? '?').slice(0, 36);

/**
 * SESSION：MP 不會幫你分 session。
 *
 * 每個事件都要自己帶 `session_id` 和 `engagement_time_msec`，少了這兩個，
 * GA4 會把人算成「沒有互動」——使用者參與、留存、歷程探索這幾張報表會接近空白，
 * 只剩事件計數。這是手動埋點最常見、而且最晚才發現的坑（報表要跑幾天才看得出來）。
 *
 * engagement_time_msec 是「距離上一個事件過了多久」，GA4 用它累加互動時間，
 * 所以這裡記上一次送事件的時間，而不是每次都填一個假的固定值。
 */
let sessionId = 0;
let lastEventAt = 0;

function sessionParams() {
  const now = Date.now();
  // 冷啟動或閒置超過 30 分鐘：開新的一段
  if (!sessionId || now - lastEventAt > SESSION_GAP_MS) {
    sessionId = Math.floor(now / 1000);
    lastEventAt = now;
    return { session_id: sessionId, engagement_time_msec: 1 };
  }
  const delta = now - lastEventAt;
  lastEventAt = now;
  // 上限 30 秒：背景放一小時再回來的話，那段時間不是「在看」
  return { session_id: sessionId, engagement_time_msec: Math.min(delta, 30_000) };
}

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
    await httpsCallable(functions, 'track')({
      clientId: await clientId(), events, device: deviceInfo(), userProps: { ...userProps, app_version: appVersion },
    });
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
  // 不要自己補 session_start：那是 GA4 的保留名稱，MP 送上去會被丟掉
  // （debug 端點回 NAME_RESERVED，正式端點則是一聲不吭）。
  // GA4 看 session_id 自己就會切出工作階段，帶好 session_id 就夠了
  queue.push({ name, params: { ...sessionParams(), ...params } });
  if (queue.length >= MAX_BATCH) { flush(); return; }
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

/**
 * 畫面瀏覽。GA4 的歷程報表是靠 screen_view 串起來的，
 * 只送自訂事件的話「使用者在哪一頁流失」這題永遠答不出來。
 */
export function trackScreen(name: string) {
  track('screen_view', { screen_name: name });
}

/**
 * 關掉追蹤。選擇會存起來，下次啟動就不必再問——
 * 存在手機而不是 Firestore，因為訪客也要能關，而且關掉的人不該為了這件事多一次寫入。
 */
export async function setAnalyticsEnabled(on: boolean) {
  enabled = on;
  if (!on) { queue = []; if (timer) { clearTimeout(timer); timer = null; } }
  try { await AsyncStorage.setItem(OPTOUT_KEY, on ? '0' : '1'); } catch { /* 忽略 */ }
}

export function analyticsEnabled() { return enabled; }

/** 啟動時讀回使用者的選擇。要在送出第一個事件之前呼叫 */
export async function loadAnalyticsChoice() {
  try { enabled = (await AsyncStorage.getItem(OPTOUT_KEY)) !== '1'; } catch { /* 預設開 */ }
  return enabled;
}

/** 畫面切到背景時先送一次，不然最後那幾筆會跟著 app 一起消失 */
export const flushAnalytics = flush;
