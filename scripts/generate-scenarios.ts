/**
 * 把 src/content/topics.ts 的情境設定抄一份給 Cloud Functions。
 *
 * 跑法：`npx tsx scripts/generate-scenarios.ts`。
 * **不要為了順手加進 package.json 的 scripts**——Expo 的 fingerprint 把 scripts
 * 整段算進 runtimeVersion，加一行就讓指紋變掉，已經上架的 binary 從此收不到
 * 任何 EAS Update（而且畫面上什麼錯都不會有，只是更新靜靜地不下載）。
 *
 * 原因：aiChat 的 role／setting／goal 以前是**手機送什麼就用什麼**，
 * 改個 client 就能把「便利商店店員」換成通用助理，整支 API 變成免費的 Claude 代理。
 * 後端自己有一份之後，手機只送 topicId，情境文字一律從這份查——
 * 送上來的 scenario 連看都不看。
 *
 * 不用 import 共用是因為 functions/ 是另一個 tsconfig＋另一包 node_modules，
 * 跨目錄 import 會把整個 src/（含 react-native）拖進部署。抄一份、改完重跑。
 */
import { writeFileSync } from 'fs';
import { topics } from '../src/content/topics';

const body = topics
  .map(t => `  ${JSON.stringify(t.id)}: ${JSON.stringify({ title: t.title, role: t.role, setting: t.setting, goal: t.goal })},`)
  .join('\n');

writeFileSync(
  'functions/src/scenarios.ts',
  `// 自動產生，不要手改：npm run generate-scenarios（來源 src/content/topics.ts）
export type ScenarioDef = { title: string; role: string; setting: string; goal: string };

export const SCENARIOS: Record<string, ScenarioDef> = {
${body}
};

/**
 * 舊版 App 只送 scenario 不送 topicId，用標題反查。
 * 標題是畫面上的字、不是 key，但舊 App 送上來的標題一定來自同一份 topics，
 * 所以查得到就是合法情境；查不到就當非法——這條只為已經裝在手機上的 build 留的。
 */
export const SCENARIO_BY_TITLE: Record<string, string> = Object.fromEntries(
  Object.entries(SCENARIOS).map(([id, s]) => [s.title, id]),
);
`,
);
console.log(`functions/src/scenarios.ts：${topics.length} 個情境`);
