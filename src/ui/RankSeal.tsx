import { View, Text } from 'react-native';
import { fonts } from '../theme';

/**
 * 段位章：越高段越「重」。
 *
 * 原本十段共用同一顆酒紅章，Lv.1 和 Lv.10 只差中間那個字——
 * 天干對大部分人說不出高低，看起來就像沒升級。
 * 所以高低交給**看得出來的東西**，一段只多加一樣，十段疊上去才分得出層次：
 *
 *   Lv.1–2  灰：還沒上色，留白給後面
 *   Lv.3–4  酒紅（品牌色）→ 加內框
 *   Lv.5–6  深酒紅＋金字 → 加外圈金環
 *   Lv.7–8  金底 → 加金色光暈
 *   Lv.9–10 墨底金字＋雙內框 → 雙外環、四角金點
 *
 * 金是最後才出現的顏色：前面用掉了，後面就沒有東西能更貴。
 * 沒有漸層套件（見 CLAUDE.md），「豐富」全部靠框、環、光暈疊出來，不模擬漸層。
 *
 * 外環畫在 size 之內、不往外長：同一個 size 換不同段位，排版不會跳。
 */

const GOLD = '#D9A441';
const WINE = '#8A2432';

type Tier = {
  face: string;
  fg: string;
  /** 內框：貼著面內緣的細線，數量 0〜2 */
  inner?: { color: string; count: 1 | 2 };
  /** 外環：面外面隔一道縫的環，數量 0〜2 */
  outer?: { color: string; count: 1 | 2 };
  /** 金色光暈的強度 0〜1 */
  glow?: number;
  /** 四角金點，只給最高段 */
  dots?: boolean;
};

const tiers: Record<number, Tier> = {
  1: { face: '#B3A9AB', fg: '#FFFFFF' },
  2: { face: '#7A6F72', fg: '#FFFFFF' },
  3: { face: WINE, fg: '#FFFFFF' },
  4: { face: WINE, fg: '#FFFFFF', inner: { color: 'rgba(255,255,255,0.55)', count: 1 } },
  // 不用 shell 色（#2B1017）：「我的」那條段位列壓在 shell 底上，同色會整顆消失
  5: { face: '#5C1622', fg: GOLD, inner: { color: GOLD, count: 1 } },
  6: { face: '#5C1622', fg: GOLD, inner: { color: GOLD, count: 1 }, outer: { color: GOLD, count: 1 } },
  7: { face: GOLD, fg: '#231A08', inner: { color: WINE, count: 1 }, outer: { color: GOLD, count: 1 } },
  8: { face: GOLD, fg: '#231A08', inner: { color: WINE, count: 1 }, outer: { color: GOLD, count: 1 }, glow: 0.45 },
  9: { face: '#141012', fg: GOLD, inner: { color: GOLD, count: 2 }, outer: { color: GOLD, count: 1 }, glow: 0.6 },
  10: { face: '#141012', fg: GOLD, inner: { color: GOLD, count: 2 }, outer: { color: GOLD, count: 2 }, glow: 0.8, dots: true },
};

export function RankSeal({ n, kanji, size = 48 }: { n: number; kanji: string; size?: number }) {
  const tier = tiers[Math.min(10, Math.max(1, n))];
  const r = size * 0.3;

  // 線寬跟著尺寸走：38pt 的小章和 58pt 的大章用同一個數字，小的會糊成一團
  const line = Math.max(1, size * 0.028);
  const gap = Math.max(1.5, size * 0.04);
  const ringCount = tier.outer?.count ?? 0;
  // 每一圈外環吃掉 line + gap，面跟著縮
  const inset = ringCount * (line + gap);
  const face = size - inset * 2;

  // 光暈不是卡片陰影（不往下偏、不用 theme 的暖墨色），所以不從 shadows 拿：
  // 它要的是一圈往四周散的金光，偏移給 0
  const glow = tier.glow ? {
    shadowColor: GOLD, shadowOpacity: tier.glow, shadowRadius: size * 0.2,
    shadowOffset: { width: 0, height: 0 },
  } : null;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, glow]}>
      {Array.from({ length: ringCount }, (_, i) => {
        const at = i * (line + gap);
        return (
          <View key={`o${i}`} pointerEvents="none" style={{
            position: 'absolute', top: at, left: at, width: size - at * 2, height: size - at * 2,
            borderRadius: Math.max(0, r - at), borderWidth: line, borderColor: tier.outer!.color,
          }} />
        );
      })}

      <View style={{
        width: face, height: face, borderRadius: Math.max(0, r - inset), backgroundColor: tier.face,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {Array.from({ length: tier.inner?.count ?? 0 }, (_, i) => {
          const at = gap + i * (line + gap * 0.7);
          return (
            <View key={`i${i}`} pointerEvents="none" style={{
              position: 'absolute', top: at, left: at, width: face - at * 2, height: face - at * 2,
              borderRadius: Math.max(0, r - inset - at), borderWidth: line * (i === 0 ? 1 : 0.7),
              borderColor: tier.inner!.color, opacity: i === 0 ? 1 : 0.6,
            }} />
          );
        })}

        {tier.dots ? [[0, 0], [0, 1], [1, 0], [1, 1]].map(([y, x]) => {
          const d = Math.max(2.5, size * 0.06);
          // 點落在雙內框的圓角內側，再往外會壓到框線
          const off = face * 0.2 - d / 2;
          return (
            <View key={`d${y}${x}`} pointerEvents="none" style={{
              position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: GOLD,
              top: y ? undefined : off, bottom: y ? off : undefined,
              left: x ? undefined : off, right: x ? off : undefined,
            }} />
          );
        }) : null}

        <Text style={{
          fontFamily: fonts.serif, fontSize: face * 0.46, color: tier.fg, includeFontPadding: false,
        }}>{kanji}</Text>
      </View>
    </View>
  );
}
