import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { LevelId, Scenario } from '../content/types';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export type ChatReply = {
  reply: string;
  reading: string;
  replyZh: string;
  correction: { corrected: string; explanation: string } | null;
  hints: { ja: string; zh: string }[];
  missionComplete: boolean;
  remaining: number;
  /** 回覆的語音（base64 MP3），後端產生失敗時沒有 */
  audio?: string;
};

export type ChatReport = {
  overall: number;
  scores: { grammar: number; vocabulary: number; politeness: number; fluency: number };
  missionComplete: boolean;
  summary: string;
  strengths: string[];
  improvements: { issue: string; better: string; explanation: string }[];
  keyPhrases: { ja: string; zh: string }[];
  remaining: number;
};

/**
 * 後端**只拿 id 查自己那份情境**（functions/src/scenarios.ts），送上去的角色和情境文字
 * 它一概不採用——改 client 也只能挑既有的 83 個主題，不能自創情境把 AI 當通用助理。
 * title 仍然送：已經上架的舊 build 沒送 id，後端靠標題反查，兩邊都留著才不會斷。
 */
type ScenarioInput = Pick<Scenario, 'id' | 'title'>;
const pick = (s: Scenario): ScenarioInput => ({ id: s.id, title: s.title });

function friendly(e: any): Error {
  const code: string = e?.code ?? '';
  // quota 旗標：畫面要分得出「額度用完」和「壞掉了」。前者不是失敗，
  // 會話照樣該算完成（見 ChatScreen 的 finish）；只比對訊息文字的話改一次文案就斷
  if (code.includes('resource-exhausted')) {
    return Object.assign(new Error(e.message || '今天的 AI 次數已用完，明天再來吧'), { quota: true });
  }
  if (code.includes('unauthenticated')) return new Error('請先登入再使用 AI 功能');
  if (code.includes('invalid-argument')) return new Error(e.message || '輸入內容有誤');
  return new Error('AI 暫時無法回應，請稍後再試');
}

async function call<T>(name: string, data: unknown): Promise<T> {
  try {
    const res = await httpsCallable(functions, name)(data);
    return res.data as T;
  } catch (e) {
    throw friendly(e);
  }
}

/**
 * 「這個學習者是誰」。後端會把它拼進 system prompt，AI 才不會每次都像初次見面。
 * 全部選填，沒填的欄位後端會整段略過。
 */
export type Learner = {
  jaName?: string;
  intro?: string;
  goal?: string;
  /** 最近幾場會話的摘要（見 lib/reports.ts 的 chatMemory） */
  recent?: string[];
  weak?: string[];
  /** 單字本裡還不熟的詞，後端會要求 AI 自然地用進對話 */
  words?: { ja: string; zh?: string }[];
  /** 一行學習進度（段位、連續天數、完成堂數） */
  progress?: string;
  /** 上一場沒做分析就離開的對話聊到哪 */
  lastTurn?: string;
};

/**
 * voice、rate 有給時，後端會把回覆的語音一起回傳，省掉一次往返。
 *
 * learner 每一次呼叫都要送：後端是無狀態的，不送就等於失憶。
 * 多出來的 input token 大約 150〜250 個，一次不到 NT$0.0001。
 */
export const aiChat = (
  scenario: Scenario, level: LevelId, messages: ChatMsg[],
  speech?: { voice: 'female' | 'male'; rate: number }, learner?: Learner,
) => call<ChatReply>('aiChat', { scenario: pick(scenario), level, messages, ...(speech ?? {}), learner });

export const aiReport = (scenario: Scenario, level: LevelId, messages: ChatMsg[]) =>
  call<ChatReport>('aiReport', { scenario: pick(scenario), level, messages });

export type WordExample = { ja: string; kana: string; zh: string };

export type ExampleResult = {
  /**
   * 查得到這個詞或用法嗎。false 時其他欄位都是空的，而且**後端已經把額度退回去**，
   * 所以畫面要說清楚「查無此字」，不要當成一般的產生失敗叫人重試。
   * 舊的快取沒有這個欄位，所以判斷一律用 `found === false`，不要用 `!found`
   */
  found?: boolean;
  /** 正規化後的詞條，可能和送上去的字不同（打中文會回對應的日文說法） */
  ja: string;
  kana: string;
  zh: string;
  examples: WordExample[];
  /** 命中雲端快取時沒有這個值：那一次不花錢，所以也沒扣額度 */
  remaining?: number;
  cached: boolean;
};

/** 手打的單字／句子交給 AI 補讀音、意思和例句 */
export const aiExample = (word: string, level: LevelId) =>
  call<ExampleResult>('aiExample', { word, level });

// ---------- AI 主題課程 ----------
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Step, GenKind } from '../content/types';
import type { Topic } from '../content/topics';

import bundledLessons from '../content/generated/lessons.json';

const bundled = bundledLessons as Record<string, Step[]>;
const levelFallback: Record<LevelId, LevelId[]> = { L2: ['L2', 'L3'], L3: ['L3', 'L2'] };

/** 隨 app 內建的課程（預先產生，立即開啟、離線可用） */
export function bundledLesson(topicId: string, kind: GenKind, level: LevelId): Step[] | null {
  for (const l of levelFallback[level]) {
    const steps = bundled[`${topicId}|${kind}|${l}`];
    if (steps?.length) return steps;
  }
  return null;
}

/** 取得主題課內容：內建課程 → 手機快取 → 雲端共用快取 → 最後才由 AI 產生 */
export async function aiLesson(topic: Topic, kind: GenKind, level: LevelId): Promise<Step[]> {
  const builtIn = bundledLesson(topic.id, kind, level);
  if (builtIn) return builtIn;
  const key = `lesson-v1-${topic.id}-${kind}-${level}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* 忽略 */ }
  const r = await call<{ steps: Step[] }>('aiLesson', { topicId: topic.id, title: topic.title, focus: topic.focus, kind, level });
  AsyncStorage.setItem(key, JSON.stringify(r.steps)).catch(() => {});
  return r.steps;
}

/** 背景預先載入（沒有內建的新主題用），失敗不影響 */
export function prefetchLesson(topic: Topic, kind: GenKind, level: LevelId) {
  if (bundledLesson(topic.id, kind, level)) return;
  aiLesson(topic, kind, level).catch(() => {});
}
