import { DefaultTheme, Theme as NavTheme } from '@react-navigation/native';

// 皓學日語的設計語言：圓潤、飽滿、重字。
//
// 四個原則，改任何樣式前先讀：
// 1. 圓角要大。卡片 lg(24)／xl(28)，按鈕和標籤一律 pill。不要出現小圓角。
// 2. 層次靠「殼」：深色底 → 彩色大卡 → 白色面板用大圓角往上疊蓋住它。
//    不要用髮絲線切版面，用色塊和圓角。
// 3. 標題用重字重（800）＋負字距。中日文混排時負字距給 -0.3 就好，不要像拉丁文那麼緊。
// 4. 一個畫面只有一塊飽和色鋪滿。其餘是白、淺灰、黑。
// 5. 卡片靠陰影浮起來，不靠邊框。陰影一律從 `shadows`／`tintedShadow` 拿，不要在畫面裡自己調。
//
// App 固定淺色（app.config.ts 也設 userInterfaceStyle: 'light'）。
const light = {
  // 面板：白為主，淺灰當圖示磚的底
  bg: '#FFFFFF', surface: '#FFFFFF', surface2: '#F3F0EC', cream: '#F8F3EA',

  // 深色殼：首頁最上層的底，讓酒紅大卡浮起來。
  // 用深酒紅而不是純黑——黑不在皓學的品牌色裡（酒紅、米白、金），
  // 同色系的深淺對比也比「黑＋酒紅」更沉穩。想要更亮的版面就把它換成 cream。
  shell: '#2B1017', onShell: '#FFFFFF',

  // 墨
  ink: '#141012', heading: '#141012', sub: '#6F6568', faint: '#A49A9C',

  // 線：這套設計幾乎不用線，留著給表單和分隔
  line: '#EDE8E2', lineStrong: '#D9D1CA',

  // 品牌酒紅：大面積鋪滿用
  primary: '#8A2432', primarySoft: '#F7EBEC', onPrimary: '#FFFFFF',

  gold: '#D9A441', goldSoft: '#FBF2E0',

  success: '#1F7A4C', successSoft: '#E4F3EA',
  warning: '#9A6410', warningSoft: '#FBF2E0',
  danger: '#B8261B', dangerSoft: '#FBE9E7',

  sign: '#8A2432',
  // 偏暖的墨色，不用純黑——純黑壓在米白底上會變成灰，跟 cream／酒紅不同家
  shadow: 'rgba(43, 16, 23, 0.13)',

  // 舊 token，等同 primary（保留以免其他畫面編譯失敗，新程式請用 primary）
  accent: '#8A2432', accentSoft: '#F7EBEC',
};

/**
 * 字體。
 * UI 全部用系統字（iOS 是 SF Pro ＋ 蘋方），重字重時最接近參考的現代感，而且不佔 bundle。
 * 明體只留給「日文內容本身」——例句、假名、站名牌。日文用明體看起來才對。
 */
export const fonts = {
  serif: 'NotoSerifTC_700Bold',
  serifMedium: 'NotoSerifTC_500Medium',
  serifRegular: 'NotoSerifTC_400Regular',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return light;
}

const navTheme: NavTheme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, background: light.bg, card: light.surface, text: light.heading, border: light.line, primary: light.primary },
};

export function useNavTheme(): NavTheme {
  return navTheme;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, section: 36 };

// 圓角：大。sm 都已經 12 了——想用更小的圓角時，先回去讀原則 1
export const radius = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 };

export const type = {
  /** 大標：重、緊、大。參考圖的「Delivered. On Time.」就是這個份量 */
  display: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 42 },
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.6, lineHeight: 32 },
  heading: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 23 },
  body: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '500' as const, lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 17 },
  /** 小眉標：全大寫拉丁 */
  eyebrow: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.4 },
  /** 日文小標：明體 */
  kana: { fontSize: 12, fontFamily: fonts.serifMedium, letterSpacing: 1 },
  /** 大數字：重字重、負字距 */
  numeral: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1.2 },
};

/**
 * 陰影：卡片的立體感全部從這裡拿，不要在畫面裡自己寫 shadowRadius。
 *
 * 四級的差別是「離底多遠」，不是「多黑」——顏色固定用品牌的深酒紅墨
 * （純黑在米白底上會灰掉，偏暖的墨才跟 cream／酒紅同一家）。
 * sm 給磚和列，md 是卡片預設，lg 給浮在深色殼上的大卡，xl 給 Modal／置頂面板。
 *
 * 兩個實際踩過的點：
 * - `overflow: 'hidden'` 會把 iOS 的陰影一起關掉（masksToBounds）。
 *   要裁圖又要陰影時，陰影下在**外層 wrapper**，裁切留給內層。
 * - Android 只認 elevation，而且 elevation 同時決定陰影和疊放層級，
 *   所以數字刻意壓小，避免卡片蓋掉本來該在上面的東西。
 */
export const shadows = {
  sm: { shadowColor: light.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  md: { shadowColor: light.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  lg: { shadowColor: light.shadow, shadowOpacity: 1, shadowRadius: 26, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  xl: { shadowColor: light.shadow, shadowOpacity: 1, shadowRadius: 34, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
};

/**
 * 彩色卡片用自己的顏色當陰影，濃度再加重。
 * 中性灰陰影壓在飽和色塊下面會看起來髒（像蒙了一層灰），同色系才乾淨。
 */
export function tintedShadow(color: string, level: 'md' | 'lg' | 'xl' = 'lg') {
  // 0.22 是實機調出來的上限，再高就從「影子」變成一圈粉紅光暈
  return { ...shadows[level], shadowColor: color, shadowOpacity: 0.22, shadowRadius: shadows[level].shadowRadius * 0.7 };
}
