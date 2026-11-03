import { useColorScheme } from 'react-native';
import { DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';

// 品牌色：紅白
const light = {
  bg: '#FFFFFF', surface: '#FFFFFF', surface2: '#F7F2F2',
  ink: '#1A1213', sub: '#6B5E60', faint: '#9C9092', line: '#EFE6E7',
  primary: '#C8102E', primarySoft: '#FDEBEE', onPrimary: '#FFFFFF',
  accent: '#E0283E', accentSoft: '#FDECEE',
  success: '#1E9E62', successSoft: '#E5F5ED',
  warning: '#C27A0E', warningSoft: '#FDF3E2',
  danger: '#C8102E', dangerSoft: '#FDEBEE',
  sign: '#C8102E',
  shadow: 'rgba(120, 16, 32, 0.07)',
};

const dark: typeof light = {
  bg: '#121011', surface: '#1C1819', surface2: '#272122', ink: '#F5EFEF', sub: '#B8ABAD', faint: '#7E7173', line: '#332B2C',
  primary: '#FF4D64', primarySoft: '#3A1A20', onPrimary: '#FFFFFF',
  accent: '#FF6275', accentSoft: '#3A1C22',
  success: '#45C98A', successSoft: '#143526',
  warning: '#F2B44A', warningSoft: '#3A2C12',
  danger: '#FF6B7D', dangerSoft: '#3A1A20',
  sign: '#E0283E',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useNavTheme(): NavTheme {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, background: t.bg, card: t.surface, text: t.ink, border: t.line, primary: t.primary },
  };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const type = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.4 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.2 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};
