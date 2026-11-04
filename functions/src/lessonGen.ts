import { askJSON, lessonSchema, AnthropicLike } from './claude';

// 主題課的產生邏輯：後端（aiLesson）和預先產生腳本（scripts/generate-lessons.ts）共用

export type Level = 'L2' | 'L3';
export type GenKind = 'basic' | 'native' | 'practice';

const LEVEL_LESSON: Record<Level, string> = {
  L2: 'N5〜N4：實用短句，reading 提供完整平假名',
  L3: 'N3〜N2：自然的生活會話，可以加入常體與口語，reading 只標較難的漢字讀音（可整句平假名）',
};

const KANA = /[\u3040-\u30ff]/;  // 有假名才是日文台詞（純中文的情境描述不朗讀）
const cut = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** 檢查並整理產生的內容；不合格時丟出錯誤 */
export function cleanSteps(raw: any, kind: GenKind = 'basic'): any[] {
  const learn: any[] = [];
  const choice: any[] = [];
  for (const x of Array.isArray(raw) ? raw : []) {
    if (x?.type === 'learn') {
      const ja = cut(x.ja, 60), zh = cut(x.zh, 80);
      if (!ja || !zh) continue;
      learn.push({ type: 'learn', ja, reading: cut(x.reading, 90) || undefined, zh, note: cut(x.note, 140) || undefined });
    } else if (x?.type === 'choice') {
      const opts = (Array.isArray(x.options) ? x.options : []).slice(0, 4)
        .map((o: any) => ({ text: cut(o?.text, 60), sub: cut(o?.sub, 40) || undefined, hint: cut(o?.hint, 70) || undefined }))
        .filter((o: any) => o.text);
      const answer = Number(x.answer);
      if (opts.length < 2 || !(answer >= 0 && answer < opts.length) || !cut(x.question, 80)) continue;
      const correct = opts[answer];
      const shuffled = [...opts].sort(() => Math.random() - 0.5); // 避免答案總在同一個位置
      const line = cut(x.line, 90);
      choice.push({
        type: 'choice', label: cut(x.label, 20) || '情境', line, lineZh: cut(x.lineZh, 90) || undefined,
        speak: KANA.test(line) ? line : undefined,
        question: cut(x.question, 80), options: shuffled, answer: shuffled.indexOf(correct), explain: cut(x.explain, 160),
      });
    }
  }
  const practice = kind === 'practice';
  if (learn.length < (practice ? 1 : 3) || choice.length < (practice ? 5 : 3)) throw new Error('課程產生失敗，內容不足');
  const steps = practice ? [...learn.slice(0, 3), ...choice.slice(0, 8)] : [...learn.slice(0, 6), ...choice.slice(0, 6)];
  return JSON.parse(JSON.stringify(steps)); // JSON 不存 undefined
}

function lessonPrompt(title: string, focus: string, kind: GenKind, level: Level) {
  const purpose = {
    basic: '這堂是「基本說法」：這個情境中最實用、最常用的句子與單字，讓學習者馬上能在日本用上。',
    native: '這堂是「道地說法」：日本人在這個情境實際會說的自然口語、省略說法和語感差異，以及台灣人容易說得太課本或不自然的地方。不要用過時或只出現在課本的說法。',
    practice: '這堂是「情境練習」：模擬學習者在這個情境中從頭到尾實際會遇到的對話流程，練習聽懂對方說的話、選出最自然的回應。',
  }[kind];
  const structure = kind === 'practice'
    ? '1. 先 2 個 learn（這個情境最關鍵、最容易聽不懂的句子），再 8 個 choice。8 題要依照實際發生的順序排列，像一段完整的經歷；大部分題目的 line 是對方說的日文台詞。'
    : '1. 先 5 個 learn（教學卡），再 5 個 choice（練習題），choice 只考 learn 教過的內容。';
  return `你是資深的日語教師，熟悉現代日本人的日常用語，正在為台灣學習者設計手機上 3〜4 分鐘的小課程。
主題：${title}
涵蓋內容：${focus}
學習者程度：${LEVEL_LESSON[level]}
${purpose}

要求：
${structure}
2. learn：ja 是一句或一個詞（日文），reading 是讀音，zh 是繁體中文意思，note 是使用時機、語感或文化小提醒（20〜50 字）。
3. choice 題型要混合：在這個情境該說哪一句、對方這樣說是什麼意思、哪個說法比較自然。
   line 是題目情境：日文台詞（店員、朋友說的話）或用繁體中文描述的情境。lineZh 是日文台詞的中文翻譯（line 是中文時留空）。
   每題 3 個 options，text 是選項（日文或中文），sub 是日文選項的中文意思，hint 說明錯誤選項為什麼不對。answer 是正確選項的索引。
   explain 用一兩句說明重點。
4. 日文必須正確、自然、符合現代日本的實際用法。中文一律使用繁體中文（台灣用語）。

只輸出一個 JSON 物件，不要有任何其他文字：
{"steps":[{"type":"learn","ja":"","reading":"","zh":"","note":""},{"type":"choice","label":"店員","line":"","lineZh":"","question":"","options":[{"text":"","sub":"","hint":""}],"answer":0,"explain":""}]}`;
}

export async function generateLesson(client: AnthropicLike, model: string, title: string, focus: string, kind: GenKind, level: Level,
  onUsage?: (u: { inTok: number; outTok: number }) => void) {
  const r = await askJSON(client, {
    model, maxTokens: 6000, effort: 'medium', schema: lessonSchema, onUsage,
    system: lessonPrompt(title, focus, kind, level),
    messages: [{ role: 'user', content: `請設計「${title}」的${{ basic: '基本說法', native: '道地說法', practice: '情境練習' }[kind]}課程。` }],
  });
  return cleanSteps(r?.steps, kind);
}
