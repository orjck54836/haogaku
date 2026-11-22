/**
 * ゆい主動傳來的訊息。
 *
 * ## 為什麼要做這個
 *
 * 通用的 AI 不會主動找你——每次都要你先開口，而且開口前得先想好要聊什麼。
 * 這裡反過來：上一場聊到的事（「週末要去看展」），隔天由ゆい用一則像 LINE 的訊息問你結果。
 * 使用者要做的只剩「回她」，不用想話題，這是 AI 會話門檻最高的那一步。
 *
 * ## 內容從哪來
 *
 * 後端每則 aiChat 回覆都順手帶一個 `followUp`（多約 50 個 output token，
 * 不到一則回覆成本的 5%），手機只留最後一則。不在離開時另外叫一次 AI，
 * 是因為離開的那一刻常常是滑掉 App，來不及等一次 API。
 *
 * 從沒聊過的人沒有 followUp 可用，改送「交朋友」情境本來就寫好的開場白（零成本），
 * 新手設定一完成就送，不等第一堂課——沒上完課就離開的人最多，等下去他們永遠看不到。
 *
 * ## 為什麼一次只留一則
 *
 * 舊的那則講的事已經被新的那場蓋過去了；而且堆成「3 則未讀」會變成待辦清單，
 * 待辦清單是讓人逃避的東西。
 */

export type InboxMsg = {
  id: string;
  ja: string;
  zh: string;
  /** 'welcome' 是第一次見面的開場白，'followup' 接上一場聊的事 */
  kind: 'welcome' | 'followup';
  /** 從哪個情境聊出來的。只給分析用，打開的一律是「交朋友」那場（ゆい本人） */
  from?: string;
  /** 什麼時候「送達」：在那之前首頁不顯示、通知也不會排在那之前 */
  deliverAt: number;
};

/** 打開訊息進的情境：ゆい是「交朋友」那個主題的角色 */
export const YUI_SCENARIO = 't-friends';

/**
 * 隔多久才送達。
 *
 * 聊完一離開就看到「你剛剛說的那個怎麼樣了？」很假——人才剛走。
 * 送在下一次每日提醒的時間，而且至少隔 12 小時：晚上 9 點聊完的人隔天晚上 8 點收到，
 * 正好和提醒是同一則，不會一天被叫兩次。
 */
const MIN_GAP_MS = 12 * 3600 * 1000;

export function nextDelivery(now: number, hour: number): number {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  while (d.getTime() < now + MIN_GAP_MS) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/**
 * 送達後幾天就不再顯示。
 * 「週末的展覽怎麼樣？」過了一週還掛在首頁，就從關心變成在催——而且看起來像系統壞掉。
 */
export const INBOX_TTL_MS = 4 * 86400 * 1000;

export function inboxVisible(m: InboxMsg | null | undefined, now = Date.now()): m is InboxMsg {
  return !!m && now >= m.deliverAt && now < m.deliverAt + INBOX_TTL_MS;
}

/** 聊天訊息的時間寫法：今天只寫幾點，昨天寫「昨天」，再往前寫日期 */
export function inboxTime(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const n = new Date(now);
  if (day(d) === day(n)) return hm;
  n.setDate(n.getDate() - 1);
  if (day(d) === day(n)) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 雲端讀回來的東西不一定長這樣（舊版、手動改過），壞掉的當作沒有 */
export function parseInbox(v: any): InboxMsg | null {
  if (!v || typeof v.ja !== 'string' || !v.ja || typeof v.deliverAt !== 'number') return null;
  return {
    id: String(v.id ?? v.deliverAt),
    ja: v.ja,
    zh: typeof v.zh === 'string' ? v.zh : '',
    kind: v.kind === 'welcome' ? 'welcome' : 'followup',
    ...(typeof v.from === 'string' ? { from: v.from } : {}),
    deliverAt: v.deliverAt,
  };
}
