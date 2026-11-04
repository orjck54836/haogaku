import { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { T } from './index';
import { useTheme, space } from '../theme';
import type { Word } from '../state/data';

/**
 * 成長曲線：單字累積量。
 *
 * 不需要新增任何儲存欄位——Word 本來就存了 savedAt，
 * 把收藏時間排序後一路累加就是曲線。歷史資料也因此直接有圖，
 * 不用等使用者從今天開始重新累積。
 *
 * 畫法上的兩個決定：
 * 1. 寬度用 onLayout 量，不用 Dimensions。這張圖放在 Sheet 和 Card 裡，
 *    父層有左右 padding，拿螢幕寬度算會超出去。
 * 2. 面積用單層平光填色（opacity 0.12），不疊矩形模擬漸層——
 *    邊界在實機上會變成看得見的灰帶。
 */

export type Point = { label: string; value: number };

/**
 * 把單字清單換成「每天的累積總數」。
 * days 給 0 表示全部（從第一個單字那天畫到今天）。
 */
export function cumulativeWords(words: Word[], days: number): Point[] {
  const DAY = 86400000;
  const midnight = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const todayMid = midnight(Date.now());

  const saved = words.filter(w => typeof w.savedAt === 'number').sort((a, b) => a.savedAt - b.savedAt);
  if (!saved.length) return [];

  const firstMid = midnight(saved[0].savedAt);
  // 全部：從第一筆那天起算。只有一天資料時也至少畫兩格，不然曲線退化成一個點
  const span = days > 0 ? days : Math.max(2, Math.round((todayMid - firstMid) / DAY) + 1);
  const start = todayMid - (span - 1) * DAY;

  // start 之前就收藏的算進起點，曲線才是「累積」而不是「區間新增」
  let running = saved.filter(w => midnight(w.savedAt) < start).length;
  const perDay = new Map<number, number>();
  for (const w of saved) {
    const m = midnight(w.savedAt);
    if (m < start) continue;
    perDay.set(m, (perDay.get(m) ?? 0) + 1);
  }

  const out: Point[] = [];
  for (let i = 0; i < span; i++) {
    const m = start + i * DAY;
    running += perDay.get(m) ?? 0;
    const d = new Date(m);
    out.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, value: running });
  }
  return out;
}

export default function GrowthChart({ points, height = 150, color, emptyText = '還沒有收藏單字' }: {
  points: Point[]; height?: number; color?: string; emptyText?: string;
}) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const line = color ?? t.primary;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  // 量到寬度前先佔住高度，不然圖出現時整個版面會往下跳一次
  if (!points.length || w < 40) {
    return (
      <View onLayout={onLayout} style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        {points.length ? null : <T variant="small" color={t.faint}>{emptyText}</T>}
      </View>
    );
  }

  // padRight 要大於今天那一點的半徑（5.5），不然圓會被 Svg 的右邊界切掉一半
  const padTop = 10, padBottom = 22, padRight = 8;
  const h = height - padTop - padBottom;
  const max = Math.max(...points.map(p => p.value), 1);
  const x = (i: number) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - padRight));
  const y = (v: number) => padTop + h - (v / max) * h;

  const lineD = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const areaD = `${lineD} L ${x(points.length - 1).toFixed(1)} ${padTop + h} L ${x(0).toFixed(1)} ${padTop + h} Z`;

  const last = points[points.length - 1];
  // x 軸只標頭尾和中間，30 格全標會疊成一團黑
  const ticks = [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        {/* 基準線：最高點那一條。只畫一條，多了就變表格 */}
        <Line x1={0} y1={padTop} x2={w - padRight} y2={padTop} stroke={t.line} strokeWidth={1} />
        <Path d={areaD} fill={line} fillOpacity={0.12} />
        <Path d={lineD} stroke={line} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* 今天這一點：實心加白圈，和線本身分得開 */}
        <Circle cx={x(points.length - 1)} cy={y(last.value)} r={5.5} fill="#FFFFFF" />
        <Circle cx={x(points.length - 1)} cy={y(last.value)} r={3.5} fill={line} />
      </Svg>
      {/* 刻度用絕對定位貼在對應的 x，不用 space-between——格子不等寬時會對不上 */}
      <View style={{ height: 14, marginTop: -padBottom + 6 }}>
        {ticks.map(i => (
          <T key={i} variant="caption" color={t.faint}
            style={{ position: 'absolute', left: Math.min(Math.max(x(i) - 18, 0), w - 40), width: 40, textAlign: i === 0 ? 'left' : i === points.length - 1 ? 'right' : 'center', fontSize: 11 }}>
            {points[i].label}
          </T>
        ))}
      </View>
    </View>
  );
}

/** 曲線上方的那一組數字：總數＋這段期間的增加量 */
export function GrowthStat({ points, unit = '個單字' }: { points: Point[]; unit?: string }) {
  const t = useTheme();
  const total = points.length ? points[points.length - 1].value : 0;
  const gained = points.length ? total - points[0].value : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
      <T variant="numeral" color={t.ink}>{total}</T>
      <T variant="small" color={t.faint}>{unit}</T>
      {gained > 0 ? <T variant="small" color={t.success} style={{ fontWeight: '700' }}>＋{gained}</T> : null}
    </View>
  );
}
