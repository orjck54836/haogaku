import { ReactNode, useEffect, useState } from 'react';
import { View, Text, LayoutAnimation } from 'react-native';
import { Pressable } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { useTheme, space, radius, fonts } from '../theme';
import { today } from '../lib/date';
import { jlptPoints, jlptQuestions, isNewJlpt } from '../content/jlpt';

/**
 * 首頁右下角的日檢專區浮標：一顆發粉紫光的玻璃球，有新題時往左攤開兩行字，右上角一顆 ✕。
 *
 * 專區只有一張卡片的時候排在首頁第三屏，大部分人滑不到那裡；浮在畫面上，捲到哪都看得到。
 * 分頁已經滿六格，加不進去（見 CLAUDE.md）。
 *
 * 用一句話而不是只放圖示：一顆只有圖示的圓鈕，沒人猜得出點下去會到「日檢」。
 * 球上直接寫「JLPT專區」：收起來時只剩這顆球，要一眼看得出去哪裡（原本蓋「合格」印章，看不出是什麼）。
 *
 * 平常只露出球，酒紅的那段字收起來：整條膠囊一直攤開會蓋住首頁一大塊。
 * 有新題目時，進首頁攤開幾秒報一次再收回去——讓人知道這顆球是什麼，又不會一直擋著。
 * 收起來時點球直接進專區，不是先展開：多一步就是多一次流失。
 * 動畫用 LayoutAnimation（RN 內建），不為了一顆按鈕裝動畫套件。
 *
 * ✕ 只關這一次開 App 的期間（存在模組變數，不寫進儲存）——
 * 浮標會蓋住內容，要讓人關得掉；但永久關掉的話，下次有新題目他也看不到了。
 * 和ゆい訊息的「稍後」同一個做法。
 */
let closedThisSession = false;

/**
 * 玻璃球的配色：中心是深梅色、往外漸亮，邊緣一圈粉紫的光。
 * 顏色從酒紅往粉紫推一點，球體才有「透光」的感覺；直接用 primary 會變成一顆實心紅球。
 */
const ORB = { core: '#1E1219', mid: '#3B1A2B', rim: '#8E4A6E', edge: '#E3B2CC', glow: '#C77DA0' };

/**
 * 漸層用 react-native-svg 的 RadialGradient 畫：它是真的漸層，不是 CLAUDE.md 禁止的「多層矩形疊出來的假漸層」，
 * 不會有灰帶。這個專案沒裝漸層套件，但 svg 本來就在用（進度環）。
 */
function Orb({ size, children }: { size: number; children: ReactNode }) {
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center',
      borderRadius: radius.pill,
      // 外圈的光暈靠同色陰影，offset 歸零才會四周平均地亮，不像一般陰影只往下掉
      shadowColor: ORB.glow, shadowOpacity: 0.75, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8 }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          {/* 中心略往下：參考圖的亮邊在上緣比較明顯，像光從上面打下來 */}
          <RadialGradient id="orb" cx="50%" cy="56%" r="50%">
            <Stop offset="0" stopColor={ORB.core} />
            <Stop offset="0.55" stopColor={ORB.mid} />
            <Stop offset="0.86" stopColor={ORB.rim} />
            <Stop offset="1" stopColor={ORB.edge} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill="url(#orb)" />
        {/* 一圈細亮邊，讓球的輪廓在白底上也收得住 */}
        <Circle cx={r} cy={r} r={r - 0.75} fill="none" stroke={ORB.edge} strokeOpacity={0.7} strokeWidth={1.5} />
      </Svg>
      {children}
    </View>
  );
}
/** 這次開 App 已經攤開報過了。切分頁回首頁會重新 mount，不記的話每次回來都攤開一次 */
let announcedThisSession = false;

const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

export default function JlptFab({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const [closed, setClosed] = useState(closedThisSession);
  const [open, setOpen] = useState(false);
  const now = today();
  const fresh = [...jlptPoints, ...jlptQuestions].some(x => isNewJlpt(x.added, now));

  useEffect(() => {
    if (!fresh || announcedThisSession || closedThisSession) return;
    announcedThisSession = true;
    // 晚一點才攤開：首頁剛出來時一堆東西在進場，同時動會被忽略
    const a = setTimeout(() => { animate(); setOpen(true); }, 800);
    const b = setTimeout(() => { animate(); setOpen(false); }, 4800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [fresh]);

  if (closed) return null;
  const SEAL = 66;

  return (
    // 上、右留空間給 ✕：RN 在 iOS 上不把父層外框以外的點擊送給子元件，凸出去的那一塊會點不到。
    // box-none 讓留白的地方不擋到下面的內容
    <View pointerEvents="box-none" style={{ position: 'absolute', right: space.lg - 6, bottom: space.lg, paddingTop: 14, paddingRight: 6 }}>
      <Pressable tapId="日檢浮標" accessibilityRole="button" accessibilityLabel="JLPT 日檢專區" onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: open ? t.shell : 'transparent', borderRadius: radius.pill,
          borderWidth: open ? 1 : 0, borderColor: ORB.rim,
          paddingLeft: open ? 22 : 0, paddingRight: open ? 5 : 0, paddingVertical: open ? 5 : 0, gap: space.md,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          // 攤開時整條膠囊和球同一圈粉紫光。收起來時這層是透明的，
          // iOS 會沿著子元件描陰影，和球自己那層疊成兩圈，所以只在攤開時給
          ...(open ? { shadowColor: ORB.glow, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 } : null),
        })}>
        {open ? <View>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.3, lineHeight: 21 }}>
            {fresh ? '日檢今天有新題' : '日檢考前'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '800', letterSpacing: -0.3, lineHeight: 21 }}>
            {'從這裡開始！'}
          </Text>
        </View> : null}
        {/* 球比膠囊本體高一點，上下凸出去——像從膠囊裡探出頭 */}
        <View style={{ marginVertical: open ? -10 : 0 }}>
          <Orb size={SEAL}>
            {/* 「JLPT專區」六個字擠一行要縮到 8pt 才放得下，拆兩行才讀得到。
                字重放輕：參考圖球上只有一個細線勾勾，粗字會把玻璃感壓掉 */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF', letterSpacing: 1, lineHeight: 15 }}>JLPT</Text>
            <Text style={{ fontFamily: fonts.serifMedium, fontSize: 13, color: 'rgba(255,255,255,0.9)', letterSpacing: 2, lineHeight: 17 }}>專區</Text>
          </Orb>
        </View>
      </Pressable>

      <Pressable tapId="日檢浮標關閉" accessibilityRole="button" accessibilityLabel="關閉日檢浮標" hitSlop={8}
        onPress={() => { closedThisSession = true; setClosed(true); }}
        style={({ pressed }) => ({
          position: 'absolute', top: 0, right: 0, width: 26, height: 26, borderRadius: radius.pill,
          backgroundColor: ORB.core, borderWidth: 1.5, borderColor: ORB.edge,
          alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
        })}>
        <Ionicons name="close" size={15} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
