/**
 * 預先產生所有主題課，存成 src/content/generated/lessons.json，隨 app 一起發佈。
 *
 * 用法（在專案根目錄）：
 *   ANTHROPIC_API_KEY=sk-ant-xxx npx tsx scripts/generate-lessons.ts
 *
 * 選項：
 *   --only=ramen,cafe     只產生指定主題
 *   --levels=L2,L3        只產生指定程度（預設 L1〜L4 全部）
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
const levels = (arg('levels')?.split(',') ?? ['L1', 'L2', 'L3', 'L4']) as Level[];
const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry');
const modelArg = arg('model') ?? 'sonnet';
const MODEL = MODELS[modelArg] ?? modelArg;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && !dry) {
  console.error('請先設定 ANTHROPIC_API_KEY，例如：ANTHROPIC_API_KEY=sk-ant-xxx npx tsx scripts/generate-lessons.ts');
  process.exit(1);
}
const client = new Anthropic({ apiKey: apiKey ?? 'dry-run' });

const data: Record<string, unknown[]> = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(data));

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

console.log(`模型：${MODEL}｜共 ${jobs.length} 堂要產生（已存在 ${Object.keys(data).length} 堂），同時 ${CONCURRENCY} 個`);
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
