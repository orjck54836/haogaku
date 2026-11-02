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

export const aiChat = (scenario: Scenario, level: LevelId, messages: ChatMsg[]) =>
  call<ChatReply>('aiChat', { scenario: pick(scenario), level, messages });

export const aiReport = (scenario: Scenario, level: LevelId, messages: ChatMsg[]) =>
  call<ChatReport>('aiReport', { scenario: pick(scenario), level, messages });

export const aiCheck = (text: string, level: LevelId) => call<CheckResult>('aiCheck', { text, level });
