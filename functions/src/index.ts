import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createHash } from 'crypto';
import { generateLesson, GenKind } from './lessonGen';
import { askJSON, chatSchema, reportSchema, checkSchema } from './claude';

initializeApp();
const db = getFirestore();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const MODEL = 'claude-haiku-5-5';          // 會話用：便宜、快速
const LESSON_MODEL = 'claude-sonnet-5-5';  // 課程內容用：品質優先（每個主題只產生一次）
const LIMITS = { guest: 30, member: 60 };  // 每人每天 AI 對話次數（台灣時間換日）

const opts = { region: 'asia-east1', secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '256MiB' as const, maxInstances: 20 };
// 會話是最常用、最在意速度的功能：保留 1 個常駐實例，避免冷啟動多等 2～4 秒（每月約 NT$100～300 常駐費）
const chatOpts = { ...opts, memory: '512MiB' as const, minInstances: 1 };

type Level = 'L1' | 'L2' | 'L3' | 'L4';
const LEVEL_GUIDE: Record<Level, string> = {
  L1: '零基礎（N5 以下）：只用最基本的單字和です・ます體，每句 15 字以內',
  L2: 'N5〜N4：簡單句子與常用旅行表達，用です・ます體',
  L3: 'N3〜N2：自然的生活會話，可以用常體與敬體混合，符合角色身分',
  L4: 'N2〜N1：商務場合，正確使用尊敬語與謙讓語',
};

type Msg = { role: 'user' | 'assistant'; content: string };
type ScenarioIn = { title: string; role: string; setting: string; goal: string };

// ---------- 共用工具 ----------

function requireUser(req: CallableRequest) {
  if (!req.auth) throw new HttpsError('unauthenticated', '請先登入');
  const provider = (req.auth.token.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
  return { uid: req.auth.uid, guest: provider === 'anonymous' };
}

const str = (v: unknown, max: number, field: string) => {
  if (typeof v !== 'string' || !v.trim()) throw new HttpsError('invalid-argument', `缺少 ${field}`);
  if (v.length > max) throw new HttpsError('invalid-argument', `${field} 太長了`);
  return v.trim();
};

function parseLevel(v: unknown): Level {
  return v === 'L1' || v === 'L2' || v === 'L3' || v === 'L4' ? v : 'L2';
}

function parseScenario(v: any): ScenarioIn {
  return {
    title: str(v?.title, 40, '情境名稱'),
    role: str(v?.role, 80, '角色'),
    setting: str(v?.setting, 200, '情境'),
    goal: str(v?.goal, 200, '任務'),
  };
}

function parseMessages(v: unknown, allowEmpty = false): Msg[] {
  if (!Array.isArray(v) || (!allowEmpty && v.length === 0) || v.length > 40) throw new HttpsError('invalid-argument', '對話內容有誤');
  return v.map((m: any) => {
    if (m?.role !== 'user' && m?.role !== 'assistant') throw new HttpsError('invalid-argument', '對話內容有誤');
    return { role: m.role, content: str(m.content, 300, '訊息') };
  });
}

const taipeiDate = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);

/** 扣一次額度，回傳今天剩餘次數 */
async function useQuota(uid: string, guest: boolean) {
  const limit = guest ? LIMITS.guest : LIMITS.member;
  const ref = db.doc(`usage/${uid}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const today = taipeiDate();
    const data = snap.data();
    const count = data && data.date === today ? (data.count as number) : 0;
    if (count >= limit) {
      throw new HttpsError('resource-exhausted', guest ? '今天的試用次數已用完，綁定帳號可以獲得更多次數' : '今天的 AI 次數已用完，明天再來吧');
    }
    tx.set(ref, { date: today, count: count + 1 });
    return limit - count - 1;
  });
}

async function askClaude(system: string, messages: Msg[], maxTokens: number, schema: Record<string, unknown>): Promise<any> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
  try {
    return await askJSON(client, { model: MODEL, system, messages, maxTokens, effort: 'low', schema });
  } catch (e) {
    console.error('Claude request failed', e);
    throw new HttpsError('internal', 'AI 暫時無法回應，請再試一次');
  }
}

const arr = <T>(v: unknown, n: number, f: (x: any) => T | null): T[] =>
  (Array.isArray(v) ? v : []).map(f).filter((x): x is T => x !== null).slice(0, n);
const s = (v: unknown) => (typeof v === 'string' ? v : '');
const score = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

// ---------- AI 情境會話 ----------

export const aiChat = onCall(chatOpts, async req => {
  const { uid, guest } = requireUser(req);
  const scenario = parseScenario(req.data?.scenario);
  const level = parseLevel(req.data?.level);
  const history = parseMessages(req.data?.messages, true);
  if (history.length && history[history.length - 1].role !== 'user') throw new HttpsError('invalid-argument', '對話內容有誤');

  const remaining = await useQuota(uid, guest);

  const system = `你是「皓學日語」app 的日語會話教練，正在和台灣的日語學習者進行角色扮演。

角色：${scenario.role}
情境：${scenario.setting}
學習者的任務：${scenario.goal}
學習者程度：${LEVEL_GUIDE[level]}

規則：
1. 你只扮演上述角色，用自然的日語回應，每次 1〜2 句，難度符合學習者程度。
2. 檢查學習者「最後一句」：如果有文法、用詞或禮貌程度不自然的地方，在 correction 寫出更自然的日文和簡短的繁體中文說明；完全沒問題就填 null。如果學習者用中文回答，在 correction 示範這句話的日文說法。
3. hints 提供 2〜3 句學習者下一句可以說的日文，附繁體中文意思，難度符合程度。
4. 學習者完成任務時，missionComplete 設為 true，並以角色身分自然地收尾。
5. 不回應與這個情境或學日語無關的要求；學習者離題時，以角色身分自然地拉回情境。
6. 所有中文一律使用繁體中文（台灣用語）。

只輸出一個 JSON 物件，不要有任何其他文字：
{"reply":"日文回覆","reading":"${level === 'L1' || level === 'L2' ? '回覆的完整平假名讀音' : '空字串'}","replyZh":"繁體中文翻譯","correction":null,"hints":[{"ja":"","zh":""}],"missionComplete":false}
correction 有內容時格式為 {"corrected":"更自然的日文","explanation":"繁體中文說明"}`;

  // Claude 的對話必須由 user 開始，前面補一句開場
  const messages: Msg[] = history.length
    ? [{ role: 'user', content: '（對話開始）' }, ...history.slice(-12)]
    : [{ role: 'user', content: '（對話開始。請以角色身分先自然地開口，correction 填 null。）' }];
  if (messages[1]?.role === 'user') messages.splice(1, 0, { role: 'assistant', content: '……' });

  const r = await askClaude(system, messages, 700, chatSchema);
  const c = r?.correction;
  const reply = s(r?.reply) || 'すみません、もう一度お願いします。';

  // 有指定聲音時，直接把回覆的語音一起產生，手機不必再呼叫一次 aiSpeak
  let audio: string | undefined;
  if (req.data?.voice === 'female' || req.data?.voice === 'male') {
    try {
      await useTtsQuota(uid, guest);
      audio = (await synthesize(reply, req.data.voice, clampRate(req.data?.rate))) ?? undefined;
    } catch (e) {
      console.warn('aiChat TTS skipped', e);   // 語音失敗不影響文字回覆，手機會自己再要一次
    }
  }

  return {
    reply,
    reading: s(r?.reading),
    replyZh: s(r?.replyZh),
    correction: c && s(c.corrected) ? { corrected: s(c.corrected), explanation: s(c.explanation) } : null,
    hints: arr(r?.hints, 3, h => (s(h?.ja) ? { ja: s(h.ja), zh: s(h?.zh) } : null)),
    missionComplete: r?.missionComplete === true,
    remaining,
    ...(audio ? { audio } : {}),
  };
});

// ---------- 會話分析報告 ----------

export const aiReport = onCall(opts, async req => {
  const { uid, guest } = requireUser(req);
  const scenario = parseScenario(req.data?.scenario);
  const level = parseLevel(req.data?.level);
  const history = parseMessages(req.data?.messages);
  if (!history.some(m => m.role === 'user')) throw new HttpsError('invalid-argument', '還沒有對話內容');

  const remaining = await useQuota(uid, guest);

  const transcript = history.map(m => `${m.role === 'user' ? '學習者' : scenario.role}：${m.content}`).join('\n');
  const system = `你是專業的日語教師，負責分析台灣學習者在角色扮演會話中的表現。
情境：${scenario.title}（${scenario.setting}）
學習者的任務：${scenario.goal}
學習者程度：${LEVEL_GUIDE[level]}

依學習者的程度給予公平、具體、鼓勵性的評價，只評學習者說的話。所有說明使用繁體中文（台灣用語）。
只輸出一個 JSON 物件，不要有任何其他文字：
{"overall":0-100,"scores":{"grammar":0-100,"vocabulary":0-100,"politeness":0-100,"fluency":0-100},"missionComplete":true或false,"summary":"1〜2 句總評","strengths":["做得好的地方，最多 3 點"],"improvements":[{"issue":"學習者原本說的句子或問題","better":"更好的日文說法","explanation":"為什麼"}],"keyPhrases":[{"ja":"這個情境值得記住的日文句子","zh":"中文意思"}]}
improvements 最多 3 項，keyPhrases 3〜5 句。`;

  const r = await askClaude(system, [{ role: 'user', content: `以下是會話紀錄：\n${transcript}` }], 2000, reportSchema);
  return {
    overall: score(r?.overall),
    scores: {
      grammar: score(r?.scores?.grammar), vocabulary: score(r?.scores?.vocabulary),
      politeness: score(r?.scores?.politeness), fluency: score(r?.scores?.fluency),
    },
    missionComplete: r?.missionComplete === true,
    summary: s(r?.summary),
    strengths: arr(r?.strengths, 3, x => (s(x) ? s(x) : null)),
    improvements: arr(r?.improvements, 3, x => (s(x?.better) ? { issue: s(x?.issue), better: s(x.better), explanation: s(x?.explanation) } : null)),
    keyPhrases: arr(r?.keyPhrases, 5, x => (s(x?.ja) ? { ja: s(x.ja), zh: s(x?.zh) } : null)),
    remaining,
  };
});

// ---------- 句子健檢 ----------

export const aiCheck = onCall(opts, async req => {
  const { uid, guest } = requireUser(req);
  const text = str(req.data?.text, 200, '句子');
  const level = parseLevel(req.data?.level);

  const remaining = await useQuota(uid, guest);

  const system = `你是專業的日語教師，幫台灣學習者檢查他寫的日文。學習者程度：${LEVEL_GUIDE[level]}。
如果輸入不是日文（例如中文），把它當成「想表達的意思」，示範自然的日文說法。
只處理日文學習相關內容。所有說明使用繁體中文（台灣用語）。
只輸出一個 JSON 物件，不要有任何其他文字：
{"natural":true或false,"corrected":"最自然的日文（原句已經自然就照抄）","explanation":"具體說明哪裡要改、為什麼；自然的話說明好在哪裡","politeness":"常體／丁寧語／敬語 其中之一，並用幾個字說明適用場合","alternatives":[{"ja":"其他說法","zh":"中文意思","nuance":"語氣或使用場合的差異"}]}
alternatives 1〜3 項。`;

  const r = await askClaude(system, [{ role: 'user', content: text }], 1200, checkSchema);
  return {
    natural: r?.natural === true,
    corrected: s(r?.corrected) || text,
    explanation: s(r?.explanation),
    politeness: s(r?.politeness),
    alternatives: arr(r?.alternatives, 3, x => (s(x?.ja) ? { ja: s(x.ja), zh: s(x?.zh), nuance: s(x?.nuance) } : null)),
    remaining,
  };
});

// ---------- 自然語音（Google Cloud Text-to-Speech） ----------

const TTS_LIMITS = { guest: 150, member: 600 }; // 每人每天產生語音的次數（手機有快取，重複播放不計）
// 依序嘗試：最自然的 Chirp 3 HD → Neural2 → WaveNet
const VOICES = {
  female: ['ja-JP-Chirp3-HD-Aoede', 'ja-JP-Neural2-B', 'ja-JP-Wavenet-A'],
  male: ['ja-JP-Chirp3-HD-Charon', 'ja-JP-Neural2-C', 'ja-JP-Wavenet-C'],
};
const workingVoice: Partial<Record<'female' | 'male', string>> = {};
let ttsClient: TextToSpeechClient | null = null;

async function useTtsQuota(uid: string, guest: boolean) {
  const limit = guest ? TTS_LIMITS.guest : TTS_LIMITS.member;
  const ref = db.doc(`ttsUsage/${uid}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const today = taipeiDate();
    const data = snap.data();
    const count = data && data.date === today ? (data.count as number) : 0;
    if (count >= limit) throw new HttpsError('resource-exhausted', '今天的語音次數已用完');
    tx.set(ref, { date: today, count: count + 1 });
  });
}

const clampRate = (v: unknown) => Math.max(0.7, Math.min(1.3, Number(v) || 1));

/** 產生日文語音（base64 MP3），依序嘗試可用的聲音；全部失敗回傳 null */
async function synthesize(text: string, voice: 'female' | 'male', rate: number): Promise<string | null> {
  ttsClient ??= new TextToSpeechClient();
  const known = workingVoice[voice];
  const candidates = known ? [known, ...VOICES[voice].filter(v => v !== known)] : VOICES[voice];
  for (const name of candidates) {
    try {
      const [res] = await ttsClient.synthesizeSpeech({
        input: { text },
        voice: { languageCode: 'ja-JP', name },
        audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
      });
      if (!res.audioContent) continue;
      workingVoice[voice] = name;
      return typeof res.audioContent === 'string' ? res.audioContent : Buffer.from(res.audioContent).toString('base64');
    } catch (e) {
      console.warn(`TTS voice ${name} failed`, e);
    }
  }
  return null;
}

export const aiSpeak = onCall({ region: 'asia-east1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }, async req => {
  const { uid, guest } = requireUser(req);
  const text = str(req.data?.text, 300, '文字');
  const voice: 'female' | 'male' = req.data?.voice === 'male' ? 'male' : 'female';

  await useTtsQuota(uid, guest);
  const audio = await synthesize(text, voice, clampRate(req.data?.rate));
  if (!audio) throw new HttpsError('unavailable', '語音暫時無法產生');
  return { audio };
});

// ---------- AI 主題課程（後備：只有沒預先產生的新主題才會用到） ----------

export const aiLesson = onCall({ ...opts, timeoutSeconds: 120 }, async req => {
  requireUser(req);
  const topicId = str(req.data?.topicId, 40, '主題');
  if (!/^[a-z0-9-]+$/.test(topicId)) throw new HttpsError('invalid-argument', '主題有誤');
  const title = str(req.data?.title, 40, '主題名稱');
  const focus = str(req.data?.focus, 200, '主題內容');
  const kind: GenKind = req.data?.kind === 'native' || req.data?.kind === 'practice' ? req.data.kind : 'basic';
  const level = parseLevel(req.data?.level);

  // 快取依主題內容雜湊：內容一樣就共用，別人送不同內容也不會覆蓋到正式課程
  const hash = createHash('sha1').update(`${title}|${focus}`).digest('hex').slice(0, 8);
  const ref = db.doc(`lessons/${topicId}_${kind}_${level}_${hash}`);
  const cached = await ref.get();
  if (cached.exists) return { steps: cached.data()!.steps };

  let steps: any[];
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    steps = await generateLesson(client, LESSON_MODEL, title, focus, kind, level);
  } catch (e) {
    console.error('aiLesson failed', e);
    throw new HttpsError('internal', '課程產生失敗，請再試一次');
  }
  await ref.set({ steps, topicId, title, kind, level, createdAt: Date.now(), reviewed: false });
  return { steps };
});
