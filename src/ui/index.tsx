import { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, space, radius, type } from '../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ children, scroll = true, padded = true, edges = ['top'] }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; edges?: ('top' | 'bottom')[];
}) {
  const t = useTheme();
  const pad = padded ? { padding: space.xl, paddingBottom: space.xxl * 2 } : undefined;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={edges}>
      {scroll ? <ScrollView contentContainerStyle={pad} showsVerticalScrollIndicator={false}>{children}</ScrollView>
        : <View style={[{ flex: 1 }, pad]}>{children}</View>}
    </SafeAreaView>
  );
}

export function T({ children, style, variant = 'body', color, numberOfLines }: {
  children: ReactNode; style?: StyleProp<TextStyle>; variant?: keyof typeof type; color?: string; numberOfLines?: number;
}) {
  const t = useTheme();
  return <Text numberOfLines={numberOfLines} style={[type[variant], { color: color ?? t.ink }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress, accessibilityLabel }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface, borderRadius: radius.lg, padding: space.lg,
    borderWidth: 1, borderColor: t.line,
    shadowColor: t.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed }) => [base, style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, size = 'lg' }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'dark' | 'danger';
  icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; size?: 'md' | 'lg';
}) {
  const t = useTheme();
  const map = {
    primary: { bg: t.primary, fg: t.onPrimary, border: t.primary },
    accent: { bg: t.accent, fg: '#FFFFFF', border: t.accent },
    dark: { bg: t.ink, fg: t.bg, border: t.ink },
    secondary: { bg: t.surface, fg: t.ink, border: t.line },
    ghost: { bg: 'transparent', fg: t.primary, border: 'transparent' },
    danger: { bg: t.dangerSoft, fg: t.danger, border: t.dangerSoft },
  }[variant];
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{
        backgroundColor: map.bg, borderColor: map.border, borderWidth: 1, borderRadius: radius.md,
        paddingVertical: size === 'lg' ? 16 : 11, paddingHorizontal: 18,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      }, style]}>
      {loading ? <ActivityIndicator color={map.fg} /> : <>
        {icon ? <Ionicons name={icon} size={size === 'lg' ? 20 : 17} color={map.fg} /> : null}
        <Text style={{ color: map.fg, fontSize: size === 'lg' ? 16 : 14, fontWeight: '700' }}>{label}</Text>
      </>}
    </Pressable>
  );
}

export function IconBox({ name, color, bg, size = 40 }: { name: IconName; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Pill({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: IconName }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color, height = 6, track }: { value: number; color?: string; height?: number; track?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, backgroundColor: track ?? t.surface2, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color ?? t.primary, borderRadius: height }} />
    </View>
  );
}

export function ProgressRing({ value, size = 76, stroke = 8, color, track, children }: {
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

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md }}>
      <T variant="heading">{title}</T>
      {action ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}><T variant="small" color={t.primary} style={{ fontWeight: '700' }}>{action}</T></Pressable> : null}
    </View>
  );
}

/** 品牌主視覺：日本車站站名牌 */
export function StationSign({ kana, zh, bar, compact }: { kana: string; zh: string; bar: string; compact?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ borderWidth: 2, borderColor: t.ink, borderRadius: 10, overflow: 'hidden', backgroundColor: t.surface }}>
      <View style={{ paddingVertical: compact ? 12 : 20, alignItems: 'center' }}>
        <Text style={{ fontSize: compact ? 26 : 34, fontWeight: '800', letterSpacing: 3, color: t.ink }} numberOfLines={1} adjustsFontSizeToFit>{kana}</Text>
        <Text style={{ fontSize: 13, color: t.sub, marginTop: 2 }}>{zh}</Text>
      </View>
      <View style={{ backgroundColor: t.sign, paddingVertical: 7, alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{bar}</Text>
      </View>
    </View>
  );
}

export function Row({ icon, iconColor, iconBg, title, subtitle, right, onPress, disabled }: {
  icon: IconName; iconColor: string; iconBg: string; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || !onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}>
      <IconBox name={icon} color={iconColor} bg={iconBg} />
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '700' }} numberOfLines={1}>{title}</T>
        {subtitle ? <T variant="small" color={t.sub} numberOfLines={1} style={{ marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null)}
    </Pressable>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.line }} />;
}

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface2, borderRadius: radius.md, padding: 4 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center', backgroundColor: on ? t.surface : 'transparent' }}>
            <Text style={{ fontSize: 14, fontWeight: on ? '800' : '500', color: on ? t.ink : t.sub }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
