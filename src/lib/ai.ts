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

export type CheckResult = {
  natural: boolean;
  corrected: string;
  explanation: string;
  politeness: string;
  alternatives: { ja: string; zh: string; nuance: string }[];
  remaining: number;
};

type ScenarioInput = Pick<Scenario, 'title' | 'role' | 'setting' | 'goal'>;
const pick = (s: Scenario): ScenarioInput => ({ title: s.title, role: s.role, setting: s.setting, goal: s.goal });

function friendly(e: any): Error {
  const code: string = e?.code ?? '';
  if (code.includes('resource-exhausted')) return new Error(e.message || '今天的 AI 次數已用完，明天再來吧');
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

/** voice、rate 有給時，後端會把回覆的語音一起回傳，省掉一次往返 */
export const aiChat = (scenario: Scenario, level: LevelId, messages: ChatMsg[], speech?: { voice: 'female' | 'male'; rate: number }) =>
  call<ChatReply>('aiChat', { scenario: pick(scenario), level, messages, ...(speech ?? {}) });

export const aiReport = (scenario: Scenario, level: LevelId, messages: ChatMsg[]) =>
  call<ChatReport>('aiReport', { scenario: pick(scenario), level, messages });

export const aiCheck = (text: string, level: LevelId) => call<CheckResult>('aiCheck', { text, level });

// ---------- AI 主題課程 ----------
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Step, GenKind } from '../content/types';
import type { Topic } from '../content/topics';

import bundledLessons from '../content/generated/lessons.json';

const bundled = bundledLessons as Record<string, Step[]>;
const levelFallback: Record<LevelId, LevelId[]> = { L1: ['L1', 'L2', 'L3'], L2: ['L2', 'L1', 'L3'], L3: ['L3', 'L2', 'L4'], L4: ['L4', 'L3', 'L2'] };

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
