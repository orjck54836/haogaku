import rawWords from './generated/reading-words.json';

/**
 * 讀物的行內點字查詞。
 *
 * ## 為什麼是預先標注，不是當場查
 *
 * 日文沒有空格，「點一個字」之前得先知道哪幾個字算一個詞。
 * 執行時斷詞有兩條路，兩條都不走：
 *
 * - **叫 AI 當場查**：要連網、有延遲，而且會扣使用者的 AI 每日次數。
 *   讀物是免費內容，點個字就扣額度等於把免費功能做成要付費（見 CLAUDE.md 的付費原則）。
 * - **字元類別啟發式**（漢字＋後面的平假名切一塊）：「食べにくい」會被切成
 *   「食べにくい」一整塊，「お願いします」切不出「お願い」，而且切出來也沒有詞義。
 *
 * 所以改成產生時一次做完（`npm run generate-reading-words`），結果進 bundle：
 * 點了立刻出現、離線可用、完全免費，而且詞義是審過的固定內容，不會每次查到不一樣的答案。
 * 代價是改了文章就要重跑那一篇。
 *
 * ## 不是每個字都可點
 *
 * 助詞（は・が・を）和語尾不標——點了只會得到「表示主題的助詞」這種
 * 讀了也不會用的答案，而且整行都是底線就沒有重點了。只標實詞。
 */
export type ReadingWord = {
  /** 文章裡實際出現的詞形，用來在原句裡定位。活用形保持原樣 */
  w: string;
  kana: string;
  zh: string;
};

/** key 是 `${readingId}|${行索引}`。行索引會隨文章改動而變，所以改文章要重跑整篇 */
const words = rawWords as Record<string, ReadingWord[]>;

export function wordsForLine(readingId: string, lineIndex: number): ReadingWord[] {
  return words[`${readingId}|${lineIndex}`] ?? [];
}

/** 這篇有沒有標注過。沒有的話畫面要安靜地退回純文字，不要顯示「載入中」 */
export function hasWords(readingId: string): boolean {
  return Object.keys(words).some(k => k.startsWith(`${readingId}|`));
}

export type Segment = { text: string; word?: ReadingWord };

/**
 * 把一行日文切成「可點的詞」和「中間的其他字」。
 *
 * **最長優先**：同一個位置可能同時配到「食べ」和「食べにくい」，取長的那個，
 * 不然長詞永遠被短詞吃掉前半，剩下的尾巴變成點不到的碎字。
 *
 * **一個詞可以在同一行出現很多次**，每一次都要可點：用位置掃描而不是
 * `indexOf` 找第一個，不然「あります。ありますか」只有前面那個有反應。
 */
export function segmentLine(line: string, ws: ReadingWord[]): Segment[] {
  if (!ws.length) return [{ text: line }];
  // 長的排前面，掃描時第一個配到的就是最長的，省掉逐一比長度
  const sorted = [...ws].sort((a, b) => b.w.length - a.w.length);
  const out: Segment[] = [];
  let plain = '';
  let i = 0;
  while (i < line.length) {
    const hit = sorted.find(w => w.w && line.startsWith(w.w, i));
    if (hit) {
      // 累積的普通文字要先收尾，不然順序會亂掉
      if (plain) { out.push({ text: plain }); plain = ''; }
      out.push({ text: hit.w, word: hit });
      i += hit.w.length;
    } else {
      plain += line[i];
      i++;
    }
  }
  if (plain) out.push({ text: plain });
  return out;
}

/**
 * 這篇文章裡這個詞的假名讀音，查不到回 undefined。
 *
 * 文末「帶走這些詞」那份清單的 `reading` 是**羅馬字**（hotondo），
 * 送去 TTS 會被當成英文唸，所以播放一律回頭查這裡的假名。
 */
export function kanaFor(readingId: string, ja: string): string | undefined {
  for (const [key, ws] of Object.entries(words)) {
    if (!key.startsWith(`${readingId}|`)) continue;
    const hit = ws.find(w => w.w === ja);
    if (hit?.kana) return hit.kana;
  }
  return undefined;
}
