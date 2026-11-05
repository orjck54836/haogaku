import type { Stroke } from '../content/kanaStrokes';

/**
 * 手寫判定。純幾何，不用模型也不打 API——
 * 假名筆畫少、形狀差異大，比「起點 / 方向 / 形狀」三件事就夠，
 * 不值得為此扣 AI 額度，也不該讓沒網路的人寫不了字。
 *
 * 判定目標是「有照筆順在動筆」，不是書法評分，所以容許值調得鬆。
 * 太嚴的話手指在手機上本來就畫不準，使用者會覺得是 App 在刁難。
 */

export type StrokeVerdict =
  | { ok: true }
  /** 錯在哪要講得出來，只說「錯了」使用者不知道要改什麼 */
  | { ok: false; reason: 'start' | 'direction' | 'shape' | 'tooShort' };

/** 重新取樣成固定點數，手指取樣密度和參考點數都不一樣，不統一就比不了 */
function resample(points: Stroke, n = 16): Stroke {
  if (points.length < 2) return Array.from({ length: n }, () => points[0] ?? [0, 0]);
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = dist(points[i - 1], points[i]);
    segs.push(d);
    total += d;
  }
  if (total === 0) return Array.from({ length: n }, () => points[0]);

  const out: Stroke = [points[0]];
  const step = total / (n - 1);
  let seg = 0;
  let walked = 0;
  for (let i = 1; i < n - 1; i++) {
    const target = step * i;
    while (seg < segs.length - 1 && walked + segs[seg] < target) { walked += segs[seg]; seg++; }
    const r = segs[seg] === 0 ? 0 : (target - walked) / segs[seg];
    const a = points[seg], b = points[seg + 1];
    out.push([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]);
  }
  out.push(points[points.length - 1]);
  return out;
}

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function strokeLength(points: Stroke) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

/** 整筆的大方向夾角（度）。抓的是逆著寫——「あ」第二筆從下往上畫形狀一樣，但是錯的 */
function headingDiff(a: Stroke, b: Stroke) {
  const va = [a[a.length - 1][0] - a[0][0], a[a.length - 1][1] - a[0][1]];
  const vb = [b[b.length - 1][0] - b[0][0], b[b.length - 1][1] - b[0][1]];
  const ma = Math.hypot(va[0], va[1]), mb = Math.hypot(vb[0], vb[1]);
  // 短到幾乎沒有方向的筆（「ウ」的點）就不用方向判定，否則會被雜訊判錯
  if (ma < 12 || mb < 12) return 0;
  const cos = (va[0] * vb[0] + va[1] * vb[1]) / (ma * mb);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/**
 * 比一筆。座標都已經換算成 0〜100 的方格。
 * 容許值全部集中在這裡，調手感只改這幾個數字。
 */
export function judgeStroke(user: Stroke, ref: Stroke): StrokeVerdict {
  if (strokeLength(user) < 8) return { ok: false, reason: 'tooShort' };

  const u = resample(user), r = resample(ref);

  if (dist(u[0], r[0]) > 34) return { ok: false, reason: 'start' };
  if (headingDiff(u, r) > 62) return { ok: false, reason: 'direction' };

  const mean = u.reduce((sum, p, i) => sum + dist(p, r[i]), 0) / u.length;
  if (mean > 22) return { ok: false, reason: 'shape' };
  return { ok: true };
}

export const reasonText: Record<Exclude<StrokeVerdict, { ok: true }>['reason'], string> = {
  start: '起筆的位置不對',
  direction: '筆畫的方向反了',
  shape: '形狀再靠近一點',
  tooShort: '這一筆太短了',
};
