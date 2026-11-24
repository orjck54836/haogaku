import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Pressable } from '../ui/Tap';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, Pill, ProgressBar } from '../ui';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { track } from '../lib/analytics';
import { StackProps } from '../navigation';
import { JlptQuestion, questionsOf, jlptTypes } from '../content/jlpt';

/** 一次最多 10 題：題庫長大以後一次做完整級會太長，做到一半離開的人最多 */
const PER_ROUND = 10;

function shuffle<X>(xs: X[]): X[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Item = { q: JlptQuestion; choices: string[] };

/**
 * 題目文字：［］裡的畫底線、★ 上色。
 * 括號本身不顯示——正式考試是畫底線，不是框起來；留著括號會多一層考場上沒有的提示。
 */
function QText({ text, color, accent, size }: { text: string; color: string; accent: string; size: number }) {
  const parts = text.split(/(［[^］]*］|★)/).filter(Boolean);
  return (
    <Text style={{ fontSize: size, lineHeight: size * 1.6, fontFamily: fonts.serifMedium, color }}>
      {parts.map((p, k) => p === '★'
        ? <Text key={k} style={{ color: accent, fontWeight: '800' }}>★</Text>
        : p.startsWith('［')
          ? <Text key={k} style={{ textDecorationLine: 'underline', textDecorationColor: accent }}>{p.slice(1, -1)}</Text>
          : p)}
    </Text>
  );
}

export default function JlptQuizScreen({ route, navigation }: StackProps<'JlptQuiz'>) {
  const t = useTheme();
  const d = useData();
  const { level, wrongOnly, section } = route.params;

  // 題目和選項順序在進來時決定一次。放在 render 裡算的話，每答一題畫面重繪、選項就跟著跳位
  const items = useMemo<Item[]>(() => {
    const pool = questionsOf(level, section).filter(q => !wrongOnly || d.progress.jlpt[q.id] === false);
    // 沒做過的排前面：題庫每天只加幾題，新題混在舊題裡抽，常常抽不到
    const fresh = shuffle(pool.filter(q => !(q.id in d.progress.jlpt)));
    const seen = shuffle(pool.filter(q => q.id in d.progress.jlpt));
    // choices[0] 是正解（見 content/jlpt.ts），這裡打亂才顯示
    return [...fresh, ...seen].slice(0, PER_ROUND).map(q => ({ q, choices: shuffle(q.choices) }));
  }, []);

  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);

  if (!items.length) {
    return (
      <Screen edges={['bottom']}>
        <T variant="title">沒有題目</T>
        <T variant="small" color={t.sub} style={{ marginTop: space.sm }}>{'錯題都練完了，回去做一次完整測驗吧。'}</T>
        <Button label="回專區" style={{ marginTop: space.xl }} onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  if (done) {
    const pct = Math.round((score / items.length) * 100);
    return (
      <Screen edges={['bottom']}>
        <T variant="caption" color={t.faint}>けっか</T>
        <T variant="display" style={{ marginTop: 2 }}>{score} / {items.length}</T>
        <T variant="heading" color={t.sub} style={{ marginTop: space.sm }}>
          {pct >= 80 ? '這一級很穩了' : pct >= 50 ? '有基礎，錯的再看一次解析' : '先回去讀重點整理再來'}
        </T>
        {xp ? <View style={{ flexDirection: 'row', marginTop: space.lg }}>
          <Pill icon="flash" label={`+${xp} XP`} color="#231A08" bg={t.gold} />
        </View> : null}
        {/* 沒拿到 XP 要講原因，不然重做一次答全對卻 +0 看起來像壞掉 */}
        {!xp && score ? <T variant="caption" color={t.faint} style={{ marginTop: space.md }}>{'XP 只在第一次答對時給。'}</T> : null}
        <Button label="回專區" style={{ marginTop: space.xl }} onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const { q, choices } = items[i];
  const answer = q.choices[0];
  const meta = jlptTypes[q.type];
  // 用法、讀解的選項是整句，字級跟單字題一樣大的話一個選項會折成三四行
  const long = choices.some(c => c.length > 12);
  const answeredNow = picked !== null;

  function pick(c: string) {
    if (answeredNow) return;
    const ok = c === answer;
    setPicked(c);
    if (ok) setScore(s => s + 1);
    // 一題一存：做到一半離開，前面答的也要算數
    const gain = d.answerJlpt(q.id, ok);
    if (gain) setXp(x => x + gain);
  }

  function next() {
    if (i + 1 >= items.length) {
      track('jlpt_quiz_finish', { level, wrongOnly, section: section ?? 'all', total: items.length, score });
      setDone(true);
      return;
    }
    setI(i + 1);
    setPicked(null);
  }

  return (
    <Screen edges={['bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}><ProgressBar value={(i + (answeredNow ? 1 : 0)) / items.length} /></View>
        <T variant="caption" color={t.faint}>{i + 1} / {items.length}</T>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xl }}>
        <Pill label={level} color={t.primary} bg={t.primarySoft} />
        <Pill label={meta.label} color={t.sub} />
      </View>
      {/* 題型說明用中文：正式考試是日文指示，但這裡要先讓人知道「這一型在考什麼」 */}
      <T variant="small" color={t.sub} style={{ marginTop: space.md }}>{meta.ask}</T>
      {q.passage ? (
        <Card tone="soft" style={{ marginTop: space.md }}>
          <T style={{ fontSize: 16, lineHeight: 28, fontFamily: fonts.serifRegular }} color={t.ink}>{q.passage}</T>
        </Card>
      ) : null}
      <View style={{ marginTop: space.md }}>
        {/* 用法題的 q 只有一個詞，放大當標題；其他題是整句 */}
        <QText text={q.q} color={t.ink} accent={t.primary} size={q.type === 'usage' ? 28 : q.passage ? 18 : 21} />
      </View>

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        {choices.map(c => {
          const isAns = c === answer;
          const isPicked = c === picked;
          // 答完之後：正解一律標綠，選錯的那個標紅，其他淡掉
          const bg = !answeredNow ? t.surface2 : isAns ? t.successSoft : isPicked ? t.dangerSoft : t.surface2;
          const fg = !answeredNow ? t.ink : isAns ? t.success : isPicked ? t.danger : t.faint;
          return (
            <Pressable key={c} tapId="日檢選項" accessibilityRole="button" accessibilityLabel={c}
              onPress={() => pick(c)} disabled={answeredNow}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.sm,
                backgroundColor: bg, borderRadius: radius.lg, paddingVertical: long ? space.md : space.lg, paddingHorizontal: space.xl,
                opacity: pressed ? 0.75 : 1 })}>
              <T style={{ flex: 1, fontSize: long ? 15 : 18, lineHeight: long ? 23 : 26, fontFamily: fonts.serifRegular }} color={fg}>{c}</T>
              {answeredNow && isAns ? <Ionicons name="checkmark-circle" size={22} color={t.success} /> : null}
              {answeredNow && isPicked && !isAns ? <Ionicons name="close-circle" size={22} color={t.danger} /> : null}
            </Pressable>
          );
        })}
      </View>

      {answeredNow ? <>
        <Card tone="soft" style={{ marginTop: space.lg }}>
          <T variant="heading" color={picked === answer ? t.success : t.danger}>{picked === answer ? '答對了' : `正解：${answer}`}</T>
          <T variant="small" color={t.ink} style={{ marginTop: space.sm, lineHeight: 21 }}>{q.explain}</T>
        </Card>
        <Button label={i + 1 >= items.length ? '看結果' : '下一題'} style={{ marginTop: space.lg }} onPress={next} />
      </> : null}
    </Screen>
  );
}
