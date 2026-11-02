import { useColorScheme } from 'react-native';
import { DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';

const light = {
  bg: '#F5F7FB', surface: '#FFFFFF', surface2: '#EEF1F7',
  ink: '#0F1B2D', sub: '#5B677A', faint: '#8A94A6', line: '#E4E8F0',
  primary: '#2F5BEA', primarySoft: '#E8EEFF', onPrimary: '#FFFFFF',
  accent: '#E8577A', accentSoft: '#FDECF0',
  success: '#14A06A', successSoft: '#E3F6EE',
  warning: '#C97A0A', warningSoft: '#FDF3E1',
  danger: '#D23B3B', dangerSoft: '#FCEBEB',
  sign: '#14A06A',
  shadow: 'rgba(15, 27, 45, 0.08)',
};

const dark: typeof light = {
  bg: '#0B111A', surface: '#141C28', surface2: '#1B2433',
  ink: '#EEF2F7', sub: '#A0ACBD', faint: '#6F7B8D', line: '#243042',
  primary: '#7B97FF', primarySoft: '#1C2747', onPrimary: '#0B111A',
  accent: '#F07C98', accentSoft: '#3A1F2A',
  success: '#3CCB8E', successSoft: '#12372A',
  warning: '#F2B44A', warningSoft: '#3A2C12',
  danger: '#F07272', dangerSoft: '#3A1818',
  sign: '#2DB87A',
  shadow: 'rgba(0, 0, 0, 0.4)',
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
