/**
 * 只用到 client.messages.create()，所以這裡不綁定某一份 SDK 的 Anthropic class。
 * 根目錄和 functions/ 各裝了一份 @anthropic-ai/sdk，直接用 class 當型別的話，
 * 兩邊的私有欄位（#private）對不起來，scripts/generate-lessons.ts 會編不過。
 */
export type AnthropicLike = { messages: { create(params: any): Promise<any> } };

type Msg = { role: 'user' | 'assistant'; content: string };

export type AskOptions = {
  model: string;
  system: string;
  messages: Msg[];
  maxTokens: number;
  effort: 'low' | 'medium' | 'high';
  schema?: Record<string, unknown>;   // 結構化輸出：保證回傳合法 JSON
  /**
   * 這次用掉的 token。成本要算得準只能靠它——
   * 「次數 × 平均單價」會被長對話和長課程拉掉，歷史愈久偏差愈大。
   * 做成 callback 而不是改回傳值，是因為 scripts/generate-lessons.ts 也在用這支，
   * 改回傳的形狀那邊要跟著改，而它根本不需要這個數字。
   */
  onUsage?: (u: { inTok: number; outTok: number }) => void;
};

function parseJSON(text: string): any {
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI 回覆格式錯誤');
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * 呼叫 Claude 並取得 JSON。
 * 關閉「回答前思考」並降低投入程度，回覆才會快；若模型不支援某個設定，自動退回較簡單的設定再試。
 */
export async function askJSON(client: AnthropicLike, o: AskOptions): Promise<any> {
  const base = { model: o.model, max_tokens: o.maxTokens, system: o.system, messages: o.messages };
  const attempts: Record<string, unknown>[] = [
    { ...base, thinking: { type: 'disabled' }, output_config: { effort: o.effort, ...(o.schema ? { format: { type: 'json_schema', schema: o.schema } } : {}) } },
    { ...base, thinking: { type: 'disabled' }, output_config: { effort: o.effort } },
    { ...base, output_config: { effort: 'low' } },
    base,
  ];
  let lastError: unknown;
  for (const params of attempts) {
    try {
      const res = await client.messages.create(params as any);
      const text = res.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
      // 先回報用量再解析：解析失敗會退到下一種設定再打一次，但這次的 token 已經花掉了，
      // 不記的話帳面成本會比帳單少一截，而且少的剛好是出問題的那些次
      o.onUsage?.({ inTok: Number(res.usage?.input_tokens) || 0, outTok: Number(res.usage?.output_tokens) || 0 });
      return parseJSON(text);
    } catch (e: any) {
      lastError = e;
      // 參數不支援（400）或格式錯誤 → 換下一種設定；其他錯誤（金鑰、額度、網路）直接回報
      if (e?.status && e.status !== 400) throw e;
      console.warn('askJSON attempt failed, trying simpler settings:', e?.message ?? e);
    }
  }
  throw lastError;
}

// ---------- 各功能的 JSON 結構 ----------

const str = { type: 'string' };
const obj = (properties: Record<string, unknown>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
});
const arr = (items: unknown) => ({ type: 'array', items });

export const chatSchema = obj({
  reply: str, reading: str, replyZh: str,
  correction: { anyOf: [{ type: 'null' }, obj({ corrected: str, explanation: str })] },
  hints: arr(obj({ ja: str, zh: str })),
  missionComplete: { type: 'boolean' },
});

export const reportSchema = obj({
  overall: { type: 'integer' },
  scores: obj({ grammar: { type: 'integer' }, vocabulary: { type: 'integer' }, politeness: { type: 'integer' }, fluency: { type: 'integer' } }),
  missionComplete: { type: 'boolean' },
  summary: str,
  strengths: arr(str),
  improvements: arr(obj({ issue: str, better: str, explanation: str })),
  keyPhrases: arr(obj({ ja: str, zh: str })),
});

export const lessonSchema = obj({
  steps: arr({
    anyOf: [
      obj({ type: { type: 'string', enum: ['learn'] }, ja: str, reading: str, zh: str, note: str }),
      obj({
        type: { type: 'string', enum: ['choice'] }, label: str, line: str, lineZh: str, question: str,
        options: arr(obj({ text: str, sub: str, hint: str })), answer: { type: 'integer' }, explain: str,
      }),
    ],
  }),
});
