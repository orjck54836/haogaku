/**
 * 預先替讀物的每一行標注「可點的詞」，存成 src/content/generated/reading-words.json。
 *
 * 用法（在專案根目錄）：
 *   ANTHROPIC_API_KEY=sk-ant-xxx npm run generate-reading-words
 *
 * 選項：
 *   --only=onigiri,escalator   只處理指定篇目
 *   --force                    已經標注過的也重做
 *   --model=sonnet             haiku、sonnet（預設）、opus，或完整模型名稱
 *   --dry                      不呼叫 AI，只測試流程
 *
 * **一篇一次呼叫**，不是一行一次：同一篇裡同一個詞要給一樣的中譯，
 * 分開問會出現「運ぶ＝搬運」和「運ぶ＝運送」在同一篇裡打架。
 */
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { readings } from '../src/content/readings';

const MODELS: Record<string, string> = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' };
const CONCURRENCY = 4;
const OUT = path.join(__dirname, '../src/content/generated/reading-words.json');

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}`))?.split('=')[1];
const only = arg('only')?.split(',');
const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry');
const MODEL = MODELS[arg('model') ?? 'sonnet'] ?? arg('model')!;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && !dry) {
  console.error('請先設定 ANTHROPIC_API_KEY（console.anthropic.com 發的 sk-ant-api03-，Claude Code 的登入憑證不能用）');
  process.exit(1);
}
const baseURL = arg('base-url') ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
const client = new Anthropic({ apiKey: apiKey ?? 'dry-run', baseURL });

type Word = { w: string; kana: string; zh: string };
const data: Record<string, Word[]> = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
// --dry 不寫檔：假內容進了檔案，下次沒加 --force 就會被當成「已標注」跳過
const save = () => { if (!dry) fs.writeFileSync(OUT, JSON.stringify(data)); };

const SYSTEM = `你是日語教材編輯，正在替台灣學習者標注文章裡的單字。

收到一篇文章的每一行日文，回傳每一行裡**值得點開查看的詞**。

規則：
1. **詞形要和原文一字不差**。活用形保持原樣（原文是「食べて」就寫「食べて」，不要還原成「食べる」）。
   這個欄位會被程式拿去原句裡比對定位，對不上就整個詞消失。
2. **實詞全部都要標**：名詞、代名詞、動詞、形容詞、副詞、連體詞、固定說法
   （「〜やすい」這類接尾也算）。**不要因為一個詞太簡單就跳過**——
   「日本」「人」「私」「彼」「少し」「同じ」「中」這種字也要標，
   學習者點不到的時候不會知道是「這個詞不重要」，只會覺得功能壞了。
   **不標的只有**：助詞（は・が・を・に・で・へ・と・も・の）、
   單獨的語尾（です・ます・ました）、標點符號。
3. 把上面的規則套下去，一行通常會有 3〜7 個詞。這是結果，不是上限——
   寧可多標，不要為了「看起來乾淨」刻意少標。
4. kana 是這個詞在這一句裡的平假名讀音（片假名詞就寫片假名本身）。
5. zh 是繁體中文意思，**兩到八個字**，寫這個詞在這句話裡的意思，不要列出所有義項。
   不要用「的」結尾的解釋句，直接給對應的中文詞。
6. 同一篇裡同一個詞形的 zh 要一致。

只回傳 JSON，不要任何說明文字：
{"lines":[{"i":0,"words":[{"w":"コンビニ","kana":"コンビニ","zh":"便利商店"}]}]}`;

/**
 * 這一行還有哪些地方點不到。
 *
 * 第一輪常常會漏掉「日本」「人」「私」這種太簡單的詞——模型自己判斷它們
 * 不值得解釋，但使用者看到的是「為什麼這個字點不動」。
 * 所以跑完要自己驗一次，把剩下**含漢字或片假名**的片段挑出來再問一輪。
 * 只看漢字和片假名：純平假名的殘段幾乎都是助詞和語尾，本來就不該可點。
 */
function gapsIn(line: string, ws: Word[]): string[] {
  const sorted = [...ws].sort((a, b) => b.w.length - a.w.length);
  const out: string[] = [];
  let plain = '', i = 0;
  const flush = () => {
    for (const chunk of plain.split(/[、。「」『』？！…・\s]/)) {
      if (chunk && /[一-龯゠-ヿ]/.test(chunk)) out.push(chunk);
    }
    plain = '';
  };
  while (i < line.length) {
    const hit = sorted.find(w => w.w && line.startsWith(w.w, i));
    if (hit) { flush(); i += hit.w.length; } else { plain += line[i]; i++; }
  }
  flush();
  return out;
}

function parse(text: string): { i: number; words: Word[] }[] {
  // 模型偶爾會包一層 ```json，剝掉再 parse
  const body = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  const obj = JSON.parse(body);
  if (!Array.isArray(obj?.lines)) throw new Error('回傳沒有 lines');
  return obj.lines;
}

type Job = { id: string; titleZh: string; lines: string[] };
const jobs: Job[] = [];
for (const r of readings) {
  if (only && !only.includes(r.id)) continue;
  if (!force && data[`${r.id}|0`]) continue;
  jobs.push({ id: r.id, titleZh: r.titleZh, lines: r.lines.map(l => l.ja) });
}

console.log(`模型：${MODEL}｜端點：${baseURL}`);
console.log(`共 ${jobs.length} 篇要標注（readings 全部 ${readings.length} 篇），同時 ${CONCURRENCY} 篇`);
let done = 0; const failed: string[] = [];

async function run(job: Job) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let lines: { i: number; words: Word[] }[];
      if (dry) {
        lines = job.lines.map((_, i) => ({ i, words: [{ w: 'テスト', kana: 'てすと', zh: '測試' }] }));
      } else {
        const res = await client.messages.create({
          model: MODEL, max_tokens: 4000, system: SYSTEM,
          messages: [{
            role: 'user',
            content: `文章：${job.titleZh}\n\n${job.lines.map((l, i) => `${i}. ${l}`).join('\n')}`,
          }],
        });
        const text = res.content.map(c => (c.type === 'text' ? c.text : '')).join('');
        lines = parse(text);
      }
      /**
       * **對不上原句的詞直接丟掉**。模型有時會把「食べて」還原成「食べる」，
       * 那個詞形在原句裡找不到，留著只是讓 JSON 變大，畫面上永遠配不到。
       * 寧可那一行少兩個詞，也不要在資料裡留永遠不會出現的東西。
       */
      const byLine = new Map<number, Word[]>();
      let kept = 0, dropped = 0;
      for (const { i, words } of lines) {
        const src = job.lines[i];
        if (src == null || !Array.isArray(words)) continue;
        const ok = words.filter(w => w?.w && w.kana && w.zh && src.includes(w.w));
        dropped += words.length - ok.length;
        kept += ok.length;
        byLine.set(i, ok);
      }

      /**
       * 補跑一輪。把第一輪漏掉的片段原樣丟回去，只問那幾個地方。
       * 一篇最多補一次：補完還點不到的多半是數字或符號，再問下去只是燒錢。
       */
      let added = 0;
      const missing = job.lines
        .map((l, i) => ({ i, l, gaps: gapsIn(l, byLine.get(i) ?? []) }))
        .filter(x => x.gaps.length);
      if (!dry && missing.length) {
        const res2 = await client.messages.create({
          model: MODEL, max_tokens: 3000, system: SYSTEM,
          messages: [{
            role: 'user',
            content: `下面每一行都有一段還沒標到的文字（放在「漏：」後面）。\n`
              + `**只補那幾段裡的實詞**，已經標過的不用重複。格式和之前一樣。\n\n`
              + missing.map(x => `${x.i}. ${x.l}\n   漏：${x.gaps.join('　')}`).join('\n'),
          }],
        });
        const text2 = res2.content.map(c => (c.type === 'text' ? c.text : '')).join('');
        for (const { i, words } of parse(text2)) {
          const src = job.lines[i];
          if (src == null || !Array.isArray(words)) continue;
          const have = new Set((byLine.get(i) ?? []).map(w => w.w));
          const ok = words.filter(w => w?.w && w.kana && w.zh && src.includes(w.w) && !have.has(w.w));
          if (ok.length) byLine.set(i, [...(byLine.get(i) ?? []), ...ok]);
          added += ok.length;
        }
      }

      for (const [i, ws] of byLine) if (ws.length) data[`${job.id}|${i}`] = ws;
      kept += added;
      save(); // 每篇存一次，中斷後重跑接得下去
      done++;
      console.log(`✓ [${done}/${jobs.length}] ${job.id}　${kept} 個詞`
        + `${added ? `（補跑補上 ${added} 個）` : ''}${dropped ? `（丟掉對不上的 ${dropped} 個）` : ''}`);
      return;
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        console.error(`\n金鑰被拒絕（${e.status}）：${e?.message ?? e}`);
        console.error(`目前送往：${baseURL}`);
        console.error('金鑰要是 console.anthropic.com → API keys 發的 sk-ant-api03-，且複製時沒有多餘空白。');
        process.exit(1);
      }
      console.warn(`… ${job.id} 第 ${attempt} 次失敗：${e?.message ?? e}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  failed.push(job.id);
}

(async () => {
  const queue = [...jobs];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await run(queue.shift()!);
  }));
  console.log(`\n完成 ${done} 篇，檔案：src/content/generated/reading-words.json`);
  if (failed.length) console.log(`失敗 ${failed.length} 篇，再執行一次就會補：\n${failed.join('\n')}`);
})();
