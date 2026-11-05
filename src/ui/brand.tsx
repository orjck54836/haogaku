import { ReactNode } from 'react';
import { View, Image, Text } from 'react-native';
import Svg, { Path, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme, space, radius, fonts, type, tintedShadow } from '../theme';

/** 皓學 Logo：assets/logo.png（建議 512×512 以上、透明背景 PNG） */
const LOGO = require('../../assets/logo.png');

export function Logo({ size = 40, rounded = false }: { size?: number; rounded?: boolean }) {
  return (
    <Image source={LOGO} accessibilityLabel="皓學" resizeMode="contain"
      style={{ width: size, height: size, borderRadius: rounded ? size / 2 : 0 }} />
  );
}

export function GoldRule({ width = 40, style }: { width?: number | `${number}%`; style?: object }) {
  const t = useTheme();
  return <View style={[{ width, height: 3, borderRadius: 2, backgroundColor: t.gold }, style]} />;
}

/**
 * 字標：深色殼上的品牌名。
 *
 * 靠左，而且是**兩行的 lockup**：中文名下面壓一行小假名。
 * 單獨一行「皓學日語」靠左之後右邊會空一大塊，整條頂列看起來像沒排完；
 * 補上假名之後字標本身有了高度，和右邊 44pt 的方案鈕在視覺上對得起來，
 * 而且假名小標是全 app 都在用的語彙（每個分頁標題上面都有一行）。
 *
 * logo 加了一圈極淡的白邊和陰影：酒紅深殼上，圓形白底 logo 的邊緣會糊進背景，
 * 一圈 1pt 的半透明白就能把它切出來。
 */
export function Wordmark({ onDark = true }: { onDark?: boolean }) {
  const t = useTheme();
  const fg = onDark ? '#FFFFFF' : t.ink;
  const sub = onDark ? 'rgba(255,255,255,0.5)' : t.faint;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{
        width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: onDark ? 'rgba(255,255,255,0.22)' : 'transparent',
        ...(onDark ? { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } } : null),
      }}>
        <Logo size={40} rounded />
      </View>
      <View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 19, color: fg, letterSpacing: 1.5, includeFontPadding: false }}>
          皓學日語
        </Text>
        {/* 假名用更寬的字距：日文小標排得開才像標示，擠在一起像註解 */}
        <Text style={{ fontFamily: fonts.serifRegular, fontSize: 9.5, color: sub, letterSpacing: 2.5, marginTop: 1, includeFontPadding: false, textAlign: 'center' }}>
          Haogaku
        </Text>
      </View>
    </View>
  );
}

/**
 * 深色殼上的頂列：左邊是字標，右邊是方案鈕。
 *
 * 字標靠左（原本置中）。置中的字標會和右邊的方案鈕形成兩個對稱的重量，
 * 看起來像兩個並列的東西；品牌名本來就該是這一條的起點，靠左才有主從。
 * 有返回鈕的頁面（方案頁）就把返回鈕排在字標前面，字標跟著往右移。
 */
export function TopBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {left}
      <Wordmark />
      {/* 把右邊的東西推到底：中間留白而不是用 space-between，
          左邊有返回鈕時字標才會緊跟著它，不會被拉開 */}
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

/**
 * 青海波紋樣。預設不在版面上使用——留給真的需要底紋的地方（例如登入頁的大色塊）。
 */
export function WavePattern({ color, opacity = 0.12 }: { color: string; opacity?: number }) {
  const r = 14;
  const wave = (cx: number, cy: number) => [r, r * 0.68, r * 0.36]
    .map(rr => `M ${cx - rr} ${cy} A ${rr} ${rr} 0 0 1 ${cx + rr} ${cy}`).join(' ');
  const d = [wave(r, r), wave(0, r * 2), wave(r * 2, r * 2), wave(r, r * 3)].join(' ');
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id="seigaiha" patternUnits="userSpaceOnUse" width={r * 2} height={r * 2}>
          <Path d={d} stroke={color} strokeWidth={1} fill="none" opacity={opacity} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#seigaiha)" />
    </Svg>
  );
}

/** 一般分頁的標題：重字重大標 */
export function BrandHeader({ title, subtitle, right, children }: {
  title: string; subtitle?: string; right?: ReactNode; children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
        <View style={{ flex: 1 }}>
          {subtitle ? <Text style={[type.small, { color: t.sub }]}>{subtitle}</Text> : null}
          <Text style={[type.display, { color: t.heading, marginTop: 4 }]}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** 各分頁標題：假名小標＋重字重大標 */
export function PageHeader({ title, ja, subtitle, right }: { title: string; ja?: string; subtitle?: string; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
        <View style={{ flex: 1 }}>
          {ja ? <Text style={[type.kana, { color: t.faint }]}>{ja}</Text> : null}
          <Text style={[type.display, { color: t.heading, marginTop: 2 }]}>{title}</Text>
        </View>
        {right}
      </View>
      {subtitle ? <Text style={[type.small, { color: t.sub, marginTop: space.sm }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function BrandFooter({ text = '皓學日語 · FORMA Global' }: { text?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: space.section, alignItems: 'center', gap: space.sm, opacity: 0.6 }}>
      <Logo size={26} />
      <Text style={{ fontSize: 11, color: t.faint }}>{text}</Text>
    </View>
  );
}

/** 酒紅大卡：版面上唯一鋪滿的飽和色塊 */
export function WineCard({ children, style, clip }: {
  children: ReactNode; style?: object;
  /** 卡內有鋪底照片時打開。不要自己在 style 下 overflow:'hidden'——那會連帶把陰影關掉 */
  clip?: boolean;
}) {
  const t = useTheme();
  // 陰影用酒紅自己的顏色：中性灰壓在飽和色下面會看起來髒。
  // 要裁圖就多包一層，因為 overflow:'hidden' 和陰影不能在同一個 View 上。
  return (
    <View style={{ ...tintedShadow(t.primary), borderRadius: radius.xl }}>
      <View style={[{ backgroundColor: t.primary, borderRadius: radius.xl, padding: space.xl },
        clip ? { overflow: 'hidden' as const } : null, style]}>
        {children}
      </View>
    </View>
  );
}
