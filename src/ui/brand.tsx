import { ReactNode } from 'react';
import { View, Image, Text } from 'react-native';
import Svg, { Path, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme, space, radius, fonts, type } from '../theme';

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
 * 原本是描邊 pill，拿掉外框了——頂列的左右已經各有一顆圓形元件，
 * 中間再框一個會變成三個互相競爭的形狀；字標本來就該是最輕的那個。
 * 外框一拿掉就沒有東西幫它撐出存在感，所以 logo 和字一起放大。
 */
export function Wordmark({ onDark = true }: { onDark?: boolean }) {
  const t = useTheme();
  const fg = onDark ? '#FFFFFF' : t.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      {/* logo 仍然比字高一點點，看得出是圖標而不是另一個字 */}
      <Logo size={30} />
      <Text style={{ fontFamily: fonts.serif, fontSize: 19, color: fg, letterSpacing: 1 }}>皓學日語</Text>
    </View>
  );
}

/**
 * 深色殼上的頂列：左邊圓鈕、中間字標、右邊頭像。
 * children 放右邊的東西（通常是頭像）。
 */
export function TopBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.sm }}>
      <View style={{ width: 44, alignItems: 'flex-start' }}>{left}</View>
      <Wordmark />
      <View style={{ width: 44, alignItems: 'flex-end' }}>{right}</View>
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
export function WineCard({ children, style }: { children: ReactNode; style?: object }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.primary, borderRadius: radius.xl, padding: space.xl }, style]}>
      {children}
    </View>
  );
}
