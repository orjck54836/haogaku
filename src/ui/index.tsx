import { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, Image, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, space, radius, type, fonts } from '../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ children, scroll = true, padded = true, edges = ['top'], shell }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; edges?: ('top' | 'bottom')[];
  /** 深色殼：首頁那種「黑底 → 彩卡 → 白面板」的版面用 */
  shell?: boolean;
}) {
  const t = useTheme();
  const pad = padded ? { padding: space.xl, paddingBottom: space.section * 2 } : undefined;
  // flexGrow 讓內容少的時候也撐滿整頁，Sheet 才不會只蓋一半、下面露出深色殼
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: shell ? t.shell : t.bg }} edges={edges}>
      {scroll ? <ScrollView contentContainerStyle={[{ flexGrow: 1 }, pad]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
        : <View style={[{ flex: 1 }, pad]}>{children}</View>}
    </SafeAreaView>
  );
}

/**
 * 白色面板，用大圓角往上疊住上面的彩色卡。
 * 這是整個版面的骨架——深色殼在最底，彩卡在中間，Sheet 蓋住彩卡下緣。
 */
export function Sheet({ children, style, overlap = 28, fill = true }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; overlap?: number;
  /** 內容少的時候也把剩下的高度吃滿（預設開）。關掉的話下面會露出深色殼 */
  fill?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[{
      backgroundColor: t.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
      marginTop: -overlap, paddingTop: space.xl, paddingHorizontal: space.xl, paddingBottom: space.section * 2,
      ...(fill ? { flexGrow: 1 } : null),
    }, style]}>
      {children}
    </View>
  );
}

const headingVariants = ['display', 'title', 'heading', 'numeral'];

export function T({ children, style, variant = 'body', color, numberOfLines }: {
  children: ReactNode; style?: StyleProp<TextStyle>; variant?: keyof typeof type; color?: string; numberOfLines?: number;
}) {
  const t = useTheme();
  const isHeading = headingVariants.includes(variant);
  const base = type[variant] as TextStyle;

  // variant 自帶 lineHeight。外面只放大 fontSize 卻沒跟著給 lineHeight 的話，
  // 字會被原本的行高切掉（46px 的假名擠在 22px 行高裡）。這種情況就把行高交還給系統。
  const over = StyleSheet.flatten(style) as TextStyle | undefined;
  const resolved: TextStyle = over?.fontSize != null && over?.lineHeight == null && base.lineHeight != null
    ? { ...base, lineHeight: undefined }
    : base;

  return <Text numberOfLines={numberOfLines} style={[resolved, { color: color ?? (isHeading ? t.heading : t.sub) }, style]}>{children}</Text>;
}

export function Rule({ strong, style }: { strong?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: 1, backgroundColor: strong ? t.lineStrong : t.line }, style]} />;
}

export function Eyebrow({ children, color, style }: { children: string; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[type.eyebrow, { color: color ?? t.faint }, style]}>{children.toUpperCase()}</Text>;
}

export function Figure({ value, unit, label, color }: { value: ReactNode; unit?: string; label?: string; color?: string }) {
  const t = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <T variant="numeral" color={color}>{value}</T>
        {unit ? <T variant="caption" color={t.faint}>{unit}</T> : null}
      </View>
      {label ? <T variant="caption" color={t.sub} style={{ marginTop: 1 }}>{label}</T> : null}
    </View>
  );
}

/** 卡片：大圓角、柔和陰影、不畫邊框 */
export function Card({ children, style, onPress, accessibilityLabel, raised, tone = 'surface' }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; raised?: boolean;
  /** surface：白卡（有陰影）／soft：淺灰磚（無陰影，用在面板內） */
  tone?: 'surface' | 'soft';
}) {
  const t = useTheme();
  const soft = tone === 'soft';
  const base: ViewStyle = {
    backgroundColor: soft ? t.surface2 : t.surface, borderRadius: radius.lg, padding: space.lg,
    ...(soft ? null : {
      shadowColor: t.shadow, shadowOpacity: 1, shadowRadius: raised ? 24 : 14,
      shadowOffset: { width: 0, height: raised ? 10 : 5 }, elevation: raised ? 4 : 2,
    }),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed }) => [base, style, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}>
      {children}
    </Pressable>
  );
}

/** 按鈕：一律 pill、字重 700 */
export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, size = 'lg' }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'dark' | 'danger' | 'outline' | 'gold';
  icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; size?: 'md' | 'lg';
}) {
  const t = useTheme();
  const map = {
    primary: { bg: t.primary, fg: t.onPrimary, border: 'transparent' },
    accent: { bg: t.primary, fg: t.onPrimary, border: 'transparent' },
    dark: { bg: t.shell, fg: '#FFFFFF', border: 'transparent' },
    secondary: { bg: t.surface2, fg: t.ink, border: 'transparent' },
    ghost: { bg: 'transparent', fg: t.primary, border: 'transparent' },
    danger: { bg: t.dangerSoft, fg: t.danger, border: 'transparent' },
    outline: { bg: 'transparent', fg: t.ink, border: t.lineStrong },
    gold: { bg: t.gold, fg: '#231A08', border: 'transparent' },
  }[variant];
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{
        backgroundColor: map.bg, borderColor: map.border, borderWidth: map.border === 'transparent' ? 0 : 1.5,
        borderRadius: radius.pill, paddingVertical: size === 'lg' ? 17 : 12, paddingHorizontal: 22,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.35 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}>
      {loading ? <ActivityIndicator color={map.fg} /> : <>
        {icon ? <Ionicons name={icon} size={size === 'lg' ? 18 : 16} color={map.fg} /> : null}
        <Text style={{ color: map.fg, fontSize: size === 'lg' ? 16 : 14, fontWeight: '700', letterSpacing: -0.2 }}>{label}</Text>
      </>}
    </Pressable>
  );
}

/** 圓形按鈕：卡片角落的 ↗、播放鍵那種 */
export function RoundButton({ icon, onPress, size = 46, bg, fg, accessibilityLabel }: {
  icon: IconName; onPress: () => void; size?: number; bg?: string; fg?: string; accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? '#FFFFFF',
        alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}>
      <Ionicons name={icon} size={size * 0.42} color={fg ?? t.ink} />
    </Pressable>
  );
}

/**
 * 淺灰圓角磚：參考圖 Create／Calculate／Receipts 那一排。
 * 給 kanji 就印明體漢字（和漢字章同一套語言），否則印 Ionicon。
 */
/** 鋪滿父層的絕對定位（遮罩用） */
const fill = { position: 'absolute' as const, top: 0, right: 0, bottom: 0, left: 0 };

/**
 * 鋪底照片用的樣式。
 * 一定要給 width/height，不能只下四邊的 inset——<Image> 有自己的內建尺寸，
 * 只給 inset 的話它會照內建尺寸放大，整張圖變成局部特寫。
 * （和當初 aspectRatio 下在 <Image> 上不生效是同一類問題。）
 */
const fillImage = { position: 'absolute' as const, top: 0, left: 0, width: '100%' as const, height: '100%' as const };

/**
 * 照片上壓的遮罩。
 * 不要用多層矩形去模擬漸層——邊界在實機上是三條看得見的灰帶。
 * 單層壓到 0.42，淺色照片（習字紙）上的白字也讀得到，字本身再加一點陰影。
 */
function Scrim({ opacity = 0.42 }: { opacity?: number }) {
  return <View style={{ ...fill, backgroundColor: `rgba(20,16,18,${opacity})` }} />;
}

export function IconTile({ icon, kanji, photo, photoScrim, label, onPress, accessibilityLabel }: {
  icon?: IconName; kanji?: string; label: string; onPress?: () => void; accessibilityLabel?: string;
  /** 有圖就整塊鋪滿照片，漢字壓在左下角當浮水印；沒圖就退回原本的淺色磚 */
  photo?: number;
  /** 遮罩濃度。預設 0.42 是給中間調的照片用的，淺色照片要再壓重一點才讀得到白字 */
  photoScrim?: number;
}) {
  const t = useTheme();
  const body = photo ? (
    <View style={{ height: 108, justifyContent: 'flex-end' }}>
      <Image source={photo} resizeMode="cover" style={fillImage} />
      <Scrim opacity={photoScrim} />
      <View style={{ padding: space.md, gap: 2 }}>
        {kanji ? (
          <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: '#FFFFFF', includeFontPadding: false,
            textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 }}>{kanji}</Text>
        ) : <Ionicons name={icon ?? 'ellipse'} size={24} color="#FFFFFF" />}
        <Text style={[type.small, { color: '#FFFFFF', fontWeight: '700',
          textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 }]} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  ) : (
    <View style={{ paddingVertical: space.xl, paddingHorizontal: space.sm, alignItems: 'center', gap: space.md }}>
      <View style={{ height: 30, justifyContent: 'center' }}>
        {kanji
          ? <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: t.ink, includeFontPadding: false }}>{kanji}</Text>
          : <Ionicons name={icon ?? 'ellipse'} size={28} color={t.ink} />}
      </View>
      <Text style={[type.small, { color: t.ink, fontWeight: '600' }]} numberOfLines={1}>{label}</Text>
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} disabled={!onPress}
      style={({ pressed }) => ({
        flex: 1, backgroundColor: photo ? t.shell : t.surface2, borderRadius: radius.lg, overflow: 'hidden',
        opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
      })}>
      {body}
    </Pressable>
  );
}

/** 舊名，維持相容。新版面請改用 IconTile 或 Seal */
export function IconBox({ name, color, bg, size = 44 }: { name: IconName; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.46} color={color} />
    </View>
  );
}

/** 狀態標籤：填色 pill */
export function Pill({ label, color, bg, icon }: { label: string; color: string; bg?: string; icon?: IconName }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg ?? t.surface2,
      borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 }}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={{ color, fontSize: 12, fontWeight: '700', letterSpacing: -0.1 }}>{label}</Text>
    </View>
  );
}

/** 圓形頭像：沒有圖就用名字第一個字 */
export function Avatar({ name, size = 40, onPress, bg, fg }: { name: string; size?: number; onPress?: () => void; bg?: string; fg?: string }) {
  const t = useTheme();
  const inner = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? t.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg ?? '#FFFFFF', fontSize: size * 0.4, fontWeight: '700' }}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  );
  if (!onPress) return inner;
  return <Pressable accessibilityRole="button" accessibilityLabel="我的" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>{inner}</Pressable>;
}

/**
 * 進度點：參考圖貨運追蹤那一條。
 * 完成的站是實心打勾、目前所在的站放一個圖示、沒走到的是空心圈，中間用虛線連起來。
 */
export function ProgressDots({ total, done, icon = 'walk', color, dim, size = 26 }: {
  total: number; done: number; icon?: IconName; color?: string; dim?: string; size?: number;
}) {
  const t = useTheme();
  const on = color ?? '#FFFFFF';
  const off = dim ?? 'rgba(255,255,255,0.35)';
  const items = Array.from({ length: total });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {items.map((_, i) => {
        const isDone = i < done;
        const isHere = i === done;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i === items.length - 1 ? 0 : 1 }}>
            {isHere && done < total ? (
              <Ionicons name={icon} size={size * 0.92} color={on} />
            ) : (
              <View style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: isDone ? on : 'transparent', borderWidth: isDone ? 0 : 2, borderColor: off,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {isDone ? <Ionicons name="checkmark" size={size * 0.56} color={t.shell} /> : null}
              </View>
            )}
            {i === items.length - 1 ? null : (
              <View style={{ flex: 1, height: 2, marginHorizontal: 6, borderRadius: 1, backgroundColor: isDone ? on : off, opacity: isDone ? 0.9 : 1 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

/** 進度條：圓頭、粗一點 */
export function ProgressBar({ value, color, height = 7, track }: { value: number; color?: string; height?: number; track?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, backgroundColor: track ?? t.surface2, borderRadius: height }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color ?? t.primary, borderRadius: height }} />
    </View>
  );
}

export function ProgressRing({ value, size = 76, stroke = 7, color, track, children }: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode;
}) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? t.surface2} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color ?? t.primary} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </Svg>
      {children}
    </View>
  );
}

/** 區塊標題：粗標題在左、「查看全部」在右 */
export function SectionTitle({ title, action, onAction, ja, right }: {
  title: string; action?: string; onAction?: () => void; ja?: string;
  /** 右邊放狀態（例如完成數）。要放可點的連結請用 action＋onAction */
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.section, marginBottom: space.lg }}>
      <View>
        {ja ? <T variant="kana" color={t.faint} style={{ marginBottom: 1 }}>{ja}</T> : null}
        <T variant="heading" style={{ fontSize: 19 }}>{title}</T>
      </View>
      {action ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
        <T variant="small" color={t.sub} style={{ fontWeight: '600' }}>{action}</T>
      </Pressable> : right}
    </View>
  );
}

/** 品牌主視覺：日本車站站名牌。這裡刻意保留明體與字距——站牌就是這樣排 */
export function StationSign({ kana, zh, bar, compact, barColor, photo }: {
  kana: string; zh: string; bar: string; compact?: boolean;
  /** 底色條的顏色。放在酒紅卡上時要換成深色，不然同色會整條看不見 */
  barColor?: string;
  /** 站名牌的底圖（通常是這一課所屬主題的照片）。沒給就維持白底黑字 */
  photo?: number;
}) {
  const t = useTheme();
  const pad = compact ? 18 : 28;
  // 有底圖時整組字要翻成白的，再壓一層深色遮罩——照片亮暗不一，不壓就會有幾張讀不到字
  const head = photo ? (
    // 高度要寫死：fillImage 的 height:'100%' 需要父層有確定高度，
    // 靠 padding 撐出來的 auto 高度算不出百分比，圖只會蓋住上半截。
    <View style={{ height: compact ? 132 : 172, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={photo} resizeMode="cover" style={fillImage} />
      <Scrim opacity={0.46} />
      {/* padding 要放在這層，不能放在外層：外層有左右 padding 的話，
          絕對定位的圖 width:'100%' 算的是內容區寬度，右邊會露出一條底色 */}
      <View style={{ paddingHorizontal: space.md, alignItems: 'center' }}>
        <Text style={{ fontSize: compact ? 28 : 36, fontFamily: fonts.serifRegular, letterSpacing: 4, color: '#FFFFFF',
          textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 }}
          numberOfLines={1} adjustsFontSizeToFit>{kana}</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 5, letterSpacing: 1 }}>{zh}</Text>
      </View>
    </View>
  ) : (
    <View style={{ paddingVertical: pad, paddingHorizontal: space.md, alignItems: 'center' }}>
      <Text style={{ fontSize: compact ? 28 : 36, fontFamily: fonts.serifRegular, letterSpacing: 4, color: t.heading }}
        numberOfLines={1} adjustsFontSizeToFit>{kana}</Text>
      <Text style={{ fontSize: 12, color: t.faint, marginTop: 5, letterSpacing: 1 }}>{zh}</Text>
    </View>
  );
  return (
    <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: t.surface }}>
      {head}
      <View style={{ backgroundColor: barColor ?? t.sign, paddingVertical: 9, alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{bar}</Text>
      </View>
    </View>
  );
}

export function Row({ icon, iconColor, iconBg, num, title, subtitle, right, onPress, disabled, leading }: {
  icon?: IconName; iconColor?: string; iconBg?: string; num?: number | string; leading?: ReactNode;
  title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || !onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: disabled ? 0.4 : pressed ? 0.65 : 1 })}>
      {leading}
      {num !== undefined ? (
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: t.sub }}>{num}</Text>
        </View>
      ) : null}
      {icon ? <IconBox name={icon} color={iconColor ?? t.primary} bg={iconBg ?? t.primarySoft} /> : null}
      <View style={{ flex: 1 }}>
        <T variant="heading" numberOfLines={1}>{title}</T>
        {subtitle ? <T variant="small" color={t.sub} numberOfLines={1} style={{ marginTop: 1 }}>{subtitle}</T> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={17} color={t.faint} /> : null)}
    </Pressable>
  );
}

export function Divider() {
  return <Rule />;
}

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface2, borderRadius: radius.pill, padding: 4 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center', backgroundColor: on ? t.shell : 'transparent' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: on ? '#FFFFFF' : t.sub }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
