import { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Pressable } from './Tap';
import { useTheme, space, radius, shadows, fonts } from '../theme';

/**
 * 編號卡：白卡左邊嵌一條上色的「しおり」（書籤）標著編號，右邊放內容。
 *
 * 用在「一條一條往下讀、順序有意義」的清單（日檢重點、主題頁的三堂課）。一般的 soft 卡整排長得一樣，
 * 滑下去分不出讀到第幾條；編號＋輪替的色調讓每一條有自己的位置。
 *
 * 整張是白卡、靠陰影浮起來（整體以白為主，不鋪底色）。卡片圓角 28、書籤內縮 6、書籤圓角 22，
 * 弧線同心，書籤才像嵌在卡裡，不是隨便貼上去的。
 * 編號用明體：書籤上的字是「印上去的」，和 UI 的系統字分開，也和日文內容同一套字。
 *
 * 色調只在酒紅／金／墨之間輪替，三色都是品牌色；書籤面積小，不會違反原則 4（一個畫面一塊飽和色）。
 * 漸層用 react-native-svg 的 LinearGradient——是真漸層，不是 CLAUDE.md 禁止的多層矩形。
 */
export const NUMBER_TONES = [
  { light: '#B4495A', dark: '#7A1C2A' }, // 酒紅
  { light: '#E8BF62', dark: '#B5801F' }, // 金
  { light: '#5E3A46', dark: '#2B1017' }, // 墨（深酒紅殼的那個墨，不用純黑）
];

const INSET = 6;
const INNER_R = radius.xl - INSET;

export function NumberedCard({ index, children, right, expanded, onPress, tapId, accessibilityLabel, done, compact }: {
  /** 從 0 起算；畫面顯示 01、02… */
  index: number;
  /** 標題列的內容（書籤右邊） */
  children: ReactNode;
  /** 標題列最右邊的小東西：「新」標籤、展開箭頭、播放鍵 */
  right?: ReactNode;
  /** 展開後的內容，放在標題列下面、橫跨整張卡：縮在書籤右邊的話，長文會被擠成一條窄欄 */
  expanded?: ReactNode;
  onPress?: () => void;
  tapId?: string;
  accessibilityLabel?: string;
  /** 完成了：書籤上的數字換成勾 */
  done?: boolean;
  /** 右邊有按鈕的列（主題頁的課程）用窄一號的書籤，文字才不會被擠到只剩幾個字 */
  compact?: boolean;
}) {
  const t = useTheme();
  const tone = NUMBER_TONES[index % NUMBER_TONES.length];

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: INSET, padding: INSET }}>
      <Bookmark n={index + 1} tone={tone} id={`nc${index}`} done={done} compact={compact} />
      <View style={{ flex: 1, justifyContent: 'center', minHeight: compact ? 60 : 68 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm,
          paddingLeft: space.sm + 2, paddingRight: compact ? space.sm : space.md, paddingVertical: space.md }}>
          <View style={{ flex: 1 }}>{children}</View>
          {right}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ backgroundColor: t.surface, borderRadius: radius.xl, ...shadows.md }}>
      {onPress ? (
        <Pressable tapId={tapId} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: !!expanded }} onPress={onPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          {header}
        </Pressable>
      ) : header}
      {expanded ? (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.lg }}>{expanded}</View>
      ) : null}
    </View>
  );
}

/**
 * 書籤：一條直的膠囊，上亮下暗，編號直接印在上面。
 * 高度跟著白面板走（父層 alignItems: stretch），標題換兩行時書籤一起拉長，不會變成一顆浮在中間的球。
 */
function Bookmark({ n, tone, id, done, compact }: {
  n: number; tone: { light: string; dark: string }; id: string; done?: boolean; compact?: boolean;
}) {
  return (
    <View style={{ width: compact ? 44 : 52, borderRadius: INNER_R, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tone.light} />
            <Stop offset="1" stopColor={tone.dark} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}g)`} />
      </Svg>
      {done ? <Ionicons name="checkmark-sharp" size={compact ? 20 : 22} color="#FFFFFF" /> : (
        <Text allowFontScaling={false}
          style={{ color: '#FFFFFF', fontFamily: fonts.serifMedium, fontSize: compact ? 17 : 20, letterSpacing: -0.3 }}>
          {String(n).padStart(2, '0')}
        </Text>
      )}
    </View>
  );
}
