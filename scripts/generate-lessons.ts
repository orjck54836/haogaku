/**
 * 預先產生所有主題課，存成 src/content/generated/lessons.json，隨 app 一起發佈。
 *
 * 用法（在專案根目錄）：
 *   ANTHROPIC_API_KEY=sk-ant-xxx npx tsx scripts/generate-lessons.ts
 *
 * 選項：
 *   --only=ramen,cafe     只產生指定主題
 *   --levels=L2,L3        只產生指定程度（預設兩階全部）
 *   --force               已經產生過的也重新產生
 *   --model=sonnet        使用的模型：haiku、sonnet（預設）、opus，或完整模型名稱
 *   --dry                 不呼叫 AI，只測試流程
 */
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { generateLesson, GenKind, Level } from '../functions/src/lessonGen';
import { topics } from '../src/content/topics';

const MODELS: Record<string, string> = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' };
const CONCURRENCY = 5;
const OUT = path.join(__dirname, '../src/content/generated/lessons.json');

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}`))?.split('=')[1];
const only = arg('only')?.split(',');
const levels = (arg('levels')?.split(',') ?? ['L2', 'L3']) as Level[];
const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry');
const modelArg = arg('model') ?? 'sonnet';
const MODEL = MODELS[modelArg] ?? modelArg;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && !dry) {
  console.error('請先設定 ANTHROPIC_API_KEY，例如：ANTHROPIC_API_KEY=sk-ant-xxx npx tsx scripts/generate-lessons.ts');
  process.exit(1);
}
/**
 * 端點。SDK 本來就會讀環境變數 ANTHROPIC_BASE_URL，這裡照舊尊重它
 * （有人會刻意走自己的 gateway），但一定要把實際用的端點印出來——
 * 送錯地方時回來的是 401 invalid x-api-key，看起來很像金鑰打錯。
 */
const baseURL = arg('base-url') ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
const client = new Anthropic({ apiKey: apiKey ?? 'dry-run', baseURL });

const data: Record<string, unknown[]> = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
// --dry 不能寫檔：假內容（テスト／測試）混進 lessons.json 之後，
// 下次跑沒有 --force 就會被當成「已產生」跳過，等於把那幾堂課變成空殼。
const save = () => { if (!dry) fs.writeFileSync(OUT, JSON.stringify(data)); };

type Job = { key: string; title: string; focus: string; kind: GenKind; level: Level };
const jobs: Job[] = [];
for (const t of topics) {
  if (only && !only.includes(t.id)) continue;
  for (const kind of ['basic', 'native', 'practice'] as GenKind[]) {
    for (const level of levels) {
      const key = `${t.id}|${kind}|${level}`;
      if (!force && data[key]) continue;
      jobs.push({ key, title: t.title, focus: t.focus, kind, level });
    }
  }
}

console.log(`模型：${MODEL}｜端點：${baseURL}`);
console.log(`共 ${jobs.length} 堂要產生（已存在 ${Object.keys(data).length} 堂），同時 ${CONCURRENCY} 個`);
let done = 0, failed: string[] = [];

async function run(job: Job) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const steps = dry
        ? [{ type: 'learn', ja: 'テスト', zh: '測試' }]
        : await generateLesson(client, MODEL, job.title, job.focus, job.kind, job.level);
      data[job.key] = steps;
      save(); // 每完成一堂就存檔，中斷後重跑會從沒做完的繼續
      done++;
      console.log(`✓ [${done}/${jobs.length}] ${job.key}`);
      return;
    } catch (e: any) {
      // 認證失敗重試幾次都一樣，而且 249 堂 × 3 次 = 幾百個注定失敗的請求。直接中止。
      if (e?.status === 401 || e?.status === 403) {
        console.error(`\n金鑰被拒絕（${e.status}）：${e?.message ?? e}`);
        console.error(`目前送往：${baseURL}`);
        console.error('檢查順序：');
        console.error('  1. 金鑰是 console.anthropic.com → API keys 發的，開頭是 sk-ant-api03-');
        console.error('     （Claude Code 的登入憑證不是 API 金鑰，不能拿來用）');
        console.error('  2. 複製時沒有多出空白或換行');
        console.error('  3. 上面那個端點是你要的（走 gateway 請加 --base-url=）');
        process.exit(1);
      }
      console.warn(`… ${job.key} 第 ${attempt} 次失敗：${e?.message ?? e}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  failed.push(job.key);
}

(async () => {
  const queue = [...jobs];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await run(queue.shift()!);
  }));
  console.log(`\n完成 ${done} 堂，檔案：src/content/generated/lessons.json`);
  if (failed.length) console.log(`失敗 ${failed.length} 堂，再執行一次就會補產生：\n${failed.join('\n')}`);
})();
