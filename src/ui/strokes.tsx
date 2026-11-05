import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, PanResponder, Pressable, GestureResponderEvent } from 'react-native';
import Svg, { Path, Circle, Line, Rect, G, Defs, Mask, Text as SvgText } from 'react-native-svg';
import { T } from './index';
import { useTheme, space, radius, fonts } from '../theme';
import type { Stroke, KanaStrokes } from '../content/kanaStrokes';
import { judgeStroke, strokeLength, reasonText } from '../lib/handwriting';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const BOX = 100;
/** 遮罩筆畫的粗細：要蓋得住明體最粗的地方，又不能寬到提前露出旁邊那一筆 */
const MASK_W = 22;

/**
 * 手標的折線補成曲線（Catmull-Rom 轉三次貝茲）。
 * 資料端只存折線，渲染端負責看起來圓滑——這樣補字的時候不用畫控制點。
 */
export function smoothPath(pts: Stroke) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  if (pts.length === 2) return `${d} L${pts[1][0]} ${pts[1][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * 遮罩專用：把筆畫兩端各往外延長一點再補曲線。
 * 手標的骨架幾乎都比字形短一截（收筆的撇、捺在字形上會再帶出去一段），
 * 不延長的話每一筆的頭尾都會留下一小塊沒被蓋到的淡色。
 * 只用在遮罩，判定仍然用原始座標——延長過的線會讓起點判定失準。
 */
export function maskPath(pts: Stroke) {
  if (pts.length < 2) return smoothPath(pts);
  // 收筆端給得比起筆端多：撇、捺、挑這類筆畫在字形上會再帶出一段尖尾，
  // 起筆端則是切齊的，延太多反而會蓋到隔壁那一筆
  const ext = (a: [number, number], b: [number, number], by: number): [number, number] => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [b[0] + ((b[0] - a[0]) / d) * by, b[1] + ((b[1] - a[1]) / d) * by];
  };
  const n = pts.length;
  return smoothPath([ext(pts[1], pts[0], 4), ...pts, ext(pts[n - 2], pts[n - 1], 10)]);
}

const rawPath = (pts: Stroke) =>
  pts.length < 2 ? '' : pts.reduce((d, p, i) => d + (i ? ` L${p[0]} ${p[1]}` : `M${p[0]} ${p[1]}`), '');

/**
 * 字形本體用內建的明體畫，不用我們自己的折線。
 * 折線只拿來當遮罩——手標的線條粗細均一、轉折也不對，當字形看就是「不像」；
 * 當遮罩的話只要落在骨架上就夠，字還是真的那個字。
 */
function Glyph({ char, fill, mask }: { char: string; fill: string; mask?: string }) {
  return (
    <SvgText x={50} y={80.4} fontSize={80} fontFamily={fonts.serifMedium} fill={fill} textAnchor="middle" mask={mask}>
      {char}
    </SvgText>
  );
}

/** 小字按鈕。圓角一律 pill（theme 原則 1），不要在這裡出現小圓角 */
function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}
      style={({ pressed }) => ({ alignSelf: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm,
        borderRadius: radius.pill, backgroundColor: pressed ? t.primarySoft : 'transparent' })}>
      <T variant="caption" color={t.primary} style={{ fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}

/** 田字格。沒有裝漸層套件，格線一律單層平光的細線 */
function Grid({ color }: { color: string }) {
  return (
    <G stroke={color} strokeWidth={0.8} strokeDasharray="3 4">
      <Line x1={50} y1={2} x2={50} y2={98} />
      <Line x1={2} y1={50} x2={98} y2={50} />
    </G>
  );
}

const maskStrokeProps = { stroke: '#FFFFFF', strokeWidth: MASK_W, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

/**
 * 筆順播放。字形是明體，遮罩一筆一筆用 strokeDashoffset 推開。
 * useNativeDriver 一定是 false——react-native-svg 的屬性走不了原生驅動。
 */
export function StrokePlayer({ char, data, size = 200 }: { char: string; data: KanaStrokes; size?: number }) {
  const t = useTheme();
  const [index, setIndex] = useState(0);
  const prog = useRef(new Animated.Value(0)).current;
  const paths = useMemo(() => data.strokes.map(smoothPath), [data]);
  const maskPaths = useMemo(() => data.strokes.map(maskPath), [data]);
  // 多留 8%：補成曲線後實際長度比折線長一點，不留的話尾端會露出一小段沒畫到
  const lengths = useMemo(() => data.strokes.map(s => strokeLength(s) * 1.08 + 2), [data]);

  useEffect(() => { setIndex(0); }, [data]);

  useEffect(() => {
    if (index >= data.strokes.length) return;
    prog.setValue(0);
    const anim = Animated.timing(prog, {
      toValue: 1,
      duration: 300 + lengths[index] * 7,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    const timer = setTimeout(() => {
      anim.start(({ finished }) => {
        if (finished) setTimeout(() => setIndex(i => i + 1), 260);
      });
    }, index === 0 ? 260 : 0);
    return () => { clearTimeout(timer); anim.stop(); };
  }, [index, data]);

  const replay = () => (index === 0 ? prog.setValue(0) : setIndex(0));
  const current = data.strokes[index];

  return (
    <View>
      <View style={{ width: size, height: size, backgroundColor: t.surface2, borderRadius: radius.lg, overflow: 'hidden' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
          <Defs>
            <Mask id="play" maskUnits="userSpaceOnUse" x="0" y="0" width={BOX} height={BOX}>
              <Rect x="0" y="0" width={BOX} height={BOX} fill="#000000" />
              {maskPaths.slice(0, index).map((d, i) => <Path key={i} d={d} {...maskStrokeProps} />)}
              {index < paths.length && (
                <AnimatedPath
                  d={maskPaths[index]} {...maskStrokeProps}
                  strokeDasharray={`${lengths[index]} ${lengths[index]}`}
                  strokeDashoffset={prog.interpolate({ inputRange: [0, 1], outputRange: [lengths[index], 0] })}
                />
              )}
            </Mask>
          </Defs>
          <Grid color={t.lineStrong} />
          <Glyph char={char} fill={t.lineStrong} />
          <Glyph char={char} fill={t.ink} mask={index < paths.length ? 'url(#play)' : undefined} />
          {current && (
            <G>
              <Circle cx={current[0][0]} cy={current[0][1]} r={7} fill={t.primary} />
              <SvgText x={current[0][0]} y={current[0][1] + 3.2} fontSize={9} fontWeight="700" fill={t.onPrimary} textAnchor="middle">
                {index + 1}
              </SvgText>
            </G>
          )}
        </Svg>
      </View>
      <T variant="caption" color={t.sub} style={{ marginTop: space.md, textAlign: 'center', minHeight: 34 }}>
        {index < data.tips.length ? `${index + 1}. ${data.tips[index]}` : `共 ${data.strokes.length} 筆`}
      </T>
      <TextButton label="重播" onPress={replay} />
    </View>
  );
}

/**
 * 手寫板。判定在 `lib/handwriting.ts`，這裡只負責收點和顯示結果。
 * 寫錯的那一筆不留下來——留著會疊成一團，看不出來自己現在寫到第幾筆。
 */
export function WritingPad({ char, data, size = 260, onDone }: {
  char: string; data: KanaStrokes; size?: number; onDone?: () => void;
}) {
  const t = useTheme();
  const [done, setDone] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke>([]);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke>([]);

  useEffect(() => { reset(); }, [data]);
  const reset = () => {
    doneRef.current = []; currentRef.current = [];
    setDone([]); setCurrent([]); setError(null);
  };

  // locationX/Y 是相對於這個 View 的，換算成和筆畫資料同一個 100 格座標
  const toBox = (e: GestureResponderEvent): [number, number] => {
    const { locationX, locationY } = e.nativeEvent;
    return [(locationX / size) * BOX, (locationY / size) * BOX];
  };

  /**
   * 收筆。release 和 terminate 都要走這裡——
   * 手寫板外面只要有會捲動的容器，responder 被搶走時就只會收到 terminate，
   * 不處理的話那一筆會永遠留在畫面上、也不會判定。
   */
  const finish = (user: Stroke) => {
    currentRef.current = [];
    setCurrent([]);
    const ref = data.strokes[doneRef.current.length];
    if (!ref) return;
    const v = judgeStroke(user, ref);
    if (!v.ok) { setError(reasonText[v.reason]); return; }
    doneRef.current = [...doneRef.current, user];
    setDone(doneRef.current);
    if (doneRef.current.length === data.strokes.length) onDone?.();
  };

  const pan = useMemo(() => PanResponder.create({
    // capture：不讓外層先一步接走手勢，否則寫到一半整頁會跟著捲
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => {
      setError(null);
      currentRef.current = [toBox(e)];
      setCurrent(currentRef.current);
    },
    onPanResponderMove: e => {
      const p = toBox(e);
      const last = currentRef.current[currentRef.current.length - 1];
      // 1 格以內的抖動不收，手指停在原地也會一直進 move 事件
      if (last && Math.hypot(last[0] - p[0], last[1] - p[1]) < 1) return;
      currentRef.current = [...currentRef.current, p];
      setCurrent(currentRef.current);
    },
    onPanResponderRelease: () => finish(currentRef.current),
    onPanResponderTerminate: () => finish(currentRef.current),
  }), [data, size]);

  const finished = done.length === data.strokes.length;
  const next = data.strokes[done.length];

  return (
    <View>
      <View
        {...pan.panHandlers}
        style={{ width: size, height: size, backgroundColor: t.surface2, borderRadius: radius.lg, overflow: 'hidden' }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} pointerEvents="none">
          <Defs>
            {/* 寫對的筆畫從淡字形裡「點亮」成墨色，讓使用者看到自己補完了哪幾筆 */}
            <Mask id="pad" maskUnits="userSpaceOnUse" x="0" y="0" width={BOX} height={BOX}>
              <Rect x="0" y="0" width={BOX} height={BOX} fill="#000000" />
              {done.map((_, i) => <Path key={i} d={maskPath(data.strokes[i])} {...maskStrokeProps} />)}
            </Mask>
          </Defs>
          <Grid color={t.lineStrong} />
          <Glyph char={char} fill={t.line} />
          {done.length > 0 && <Glyph char={char} fill={t.lineStrong} mask="url(#pad)" />}
          {done.map((s, i) => (
            <Path key={`d${i}`} d={rawPath(s)} stroke={t.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          {current.length > 1 && (
            <Path d={rawPath(current)} stroke={t.primary} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
          {!finished && next && current.length === 0 && (
            <G>
              <Circle cx={next[0][0]} cy={next[0][1]} r={7} fill={t.primary} opacity={0.9} />
              <SvgText x={next[0][0]} y={next[0][1] + 3.2} fontSize={9} fontWeight="700" fill={t.onPrimary} textAnchor="middle">
                {done.length + 1}
              </SvgText>
            </G>
          )}
        </Svg>
      </View>
      <View style={{ marginTop: space.md, minHeight: 36, alignItems: 'center' }}>
        {finished ? (
          <T variant="heading" color={t.success}>寫完了，筆順正確</T>
        ) : error ? (
          <T variant="small" color={t.danger}>{error}，再寫一次</T>
        ) : (
          <T variant="small" color={t.sub}>照紅點寫第 {done.length + 1} 筆，共 {data.strokes.length} 筆</T>
        )}
      </View>
      <TextButton label={finished ? '再寫一次' : '清除'} onPress={reset} />
    </View>
  );
}
