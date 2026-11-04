import { useMemo, useState } from 'react';
import { View, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, ProgressBar, Pill, IconName } from '../ui';
import { useTheme, space, radius, fonts } from '../theme';
import { useData, Word } from '../state/data';
import { slang } from '../content/slang';
import { speakJa } from '../lib/speech';
import { StackProps } from '../navigation';
import { REVIEW_XP } from '../lib/rank';

type Mode = 'card' | 'choice' | 'write';

const MODES: { id: Mode; icon: IconName; title: string; desc: string; needsZh: boolean }[] = [
  { id: 'card', icon: 'albums-outline', title: '字卡', desc: '看日文想意思，翻面自己對答案', needsZh: false },
  { id: 'choice', icon: 'list-outline', title: '選擇', desc: '看中文，從四個選項選出正確的日文', needsZh: true },
  { id: 'write', icon: 'create-outline', title: '默寫', desc: '看中文，自己打出日文——記得最牢的練法', needsZh: true },
];

/** 比對默寫答案：空白和句尾標點不算錯 */
const normalize = (s: string) => s.trim().replace(/[\s　]/g, '').replace(/[。、.,!！?？]/g, '');

export default function ReviewScreen({ navigation }: StackProps<'Review'>) {
  const t = useTheme();
  const d = useData();
  const due = useMemo(() => d.dueWords(), []);
  const [mode, setMode] = useState<Mode | null>(null);

  if (!due.length) return <Done known={0} total={0} onClose={() => navigation.goBack()} />;
  if (!mode) return <ModePicker due={due} onPick={setMode} onClose={() => navigation.goBack()} />;
  return <Session mode={mode} due={due} allWords={d.words} onClose={() => navigation.goBack()} onAgain={() => setMode(null)} />;
}

/** 先選練法。沒有中文翻譯的單字只能用字卡，所以選項會標出各自能練幾個 */
function ModePicker({ due, onPick, onClose }: { due: Word[]; onPick: (m: Mode) => void; onClose: () => void }) {
  const t = useTheme();
  const withZh = due.filter(w => w.zh).length;
  return (
    <Screen edges={['bottom']}>
      <T variant="caption" color={t.faint}>ふくしゅう</T>
      <T variant="display" style={{ fontSize: 30, lineHeight: 38, marginTop: 2 }}>今天要複習 {due.length} 個</T>
      <T variant="small" color={t.sub} style={{ marginTop: space.sm }}>選一種練法。同一批字換個方式練，記得比較牢。</T>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {MODES.map(m => {
          const n = m.needsZh ? withZh : due.length;
          const off = n === 0;
          return (
            <Card key={m.id} tone="soft" onPress={off ? undefined : () => onPick(m.id)}
              accessibilityLabel={`${m.title}：${m.desc}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: off ? 0.45 : 1 }}>
              <View style={{ width: 46, height: 46, borderRadius: radius.sm, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={m.icon} size={22} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="heading">{m.title}</T>
                <T variant="caption" color={t.sub} style={{ marginTop: 3 }}>{m.desc}</T>
              </View>
              {off ? <T variant="caption" color={t.faint}>需要翻譯</T>
                : <Pill label={`${n} 個`} color={t.sub} />}
            </Card>
          );
        })}
      </View>

      <Button label="先不練" variant="ghost" style={{ marginTop: space.xl }} onPress={onClose} />
    </Screen>
  );
}

function Session({ mode, due, allWords, onClose, onAgain }: {
  mode: Mode; due: Word[]; allWords: Word[]; onClose: () => void; onAgain: () => void;
}) {
  const t = useTheme();
  const d = useData();
  // 選擇和默寫要有中文當題目，沒翻譯的字只能用字卡
  const queue = useMemo(() => (mode === 'card' ? due : due.filter(w => w.zh)), [mode]);
  const [i, setI] = useState(0);
  const [known, setKnown] = useState(0);
  const [shown, setShown] = useState(false);   // 字卡翻面／默寫已對答案
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const w = queue[i];

  /**
   * 選擇題的四個選項：正解＋三個誘答。
   * 誘答先用單字本裡的其他字（同一批內容比較像真的在考），不夠再拿流行語來補——
   * 單字本只有兩三個字的時候，不補就只剩兩個選項，等於送分。
   */
  const options = useMemo(() => {
    if (mode !== 'choice' || !w) return [];
    const mine = allWords.filter(x => x.ja !== w.ja).map(x => x.ja);
    const filler = slang.map(x => x.word).filter(x => x !== w.ja);
    const picks: string[] = [];
    for (const pool of [mine, filler]) {
      const bag = [...pool].sort(() => Math.random() - 0.5);
      for (const c of bag) {
        if (picks.length >= 3) break;
        if (!picks.includes(c)) picks.push(c);
      }
    }
    return [w.ja, ...picks].sort(() => Math.random() - 0.5);
  }, [mode, w?.ja]);

  function grade(ok: boolean) {
    d.reviewWord(w.ja, ok);
    d.addXp(ok ? REVIEW_XP.known : REVIEW_XP.forgot);
    if (ok) setKnown(n => n + 1);
  }

  function next() {
    setShown(false); setPicked(null); setTyped('');
    setI(i + 1);
  }

  if (!w) return <Done known={known} total={queue.length} onClose={onClose} onAgain={onAgain} />;

  const correct = mode === 'write' ? normalize(typed) === normalize(w.ja) : picked !== null && options[picked] === w.ja;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll={false} edges={['bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}><ProgressBar value={i / queue.length} color={t.success} /></View>
          <T variant="caption" color={t.sub}>{i + 1} / {queue.length}</T>
          <Pill label={MODES.find(m => m.id === mode)!.title} color={t.primary} bg={t.primarySoft} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: space.lg }} keyboardShouldPersistTaps="handled">
          {mode === 'card' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="翻面"
              onPress={() => { setShown(true); speakJa(w.ja); }}>
              <Card style={{ alignItems: 'center', paddingVertical: space.section }}>
                <T style={{ fontSize: 32, lineHeight: 48, fontFamily: fonts.serifMedium, textAlign: 'center' }} color={t.heading}>{w.ja}</T>
                {shown ? <>
                  <T variant="heading" color={t.sub} style={{ marginTop: space.lg, textAlign: 'center' }}>{w.zh ?? '（沒有翻譯）'}</T>
                  <T variant="caption" color={t.faint} style={{ marginTop: space.md }}>來自：{w.source}</T>
                </> : <T variant="small" color={t.faint} style={{ marginTop: space.lg }}>點一下看意思</T>}
              </Card>
            </Pressable>
          ) : (
            <>
              {/* 選擇和默寫都是「看中文想日文」，題目長一樣 */}
              <Card tone="soft" style={{ alignItems: 'center', paddingVertical: space.xxl }}>
                <T variant="caption" color={t.faint}>這句日文怎麼說？</T>
                <T variant="heading" style={{ fontSize: 20, lineHeight: 30, marginTop: space.sm, textAlign: 'center' }}>{w.zh}</T>
              </Card>

              {mode === 'choice' ? (
                <View style={{ marginTop: space.lg, gap: space.sm }}>
                  {options.map((o, n) => {
                    const isRight = picked !== null && o === w.ja;
                    const isBad = picked === n && o !== w.ja;
                    return (
                      <Pressable key={o + n} accessibilityRole="button" disabled={picked !== null}
                        onPress={() => { setPicked(n); setShown(true); grade(o === w.ja); speakJa(w.ja); }}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: space.lg,
                          backgroundColor: isRight ? t.successSoft : isBad ? t.dangerSoft : t.surface2,
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <T style={{ flex: 1, fontSize: 18, lineHeight: 26, fontFamily: fonts.serifMedium }} color={t.heading}>{o}</T>
                        {isRight ? <Ionicons name="checkmark-circle" size={22} color={t.success} /> : null}
                        {isBad ? <Ionicons name="close-circle" size={22} color={t.danger} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={{ marginTop: space.lg }}>
                  <TextInput value={typed} onChangeText={setTyped} editable={!shown}
                    placeholder="用日文打出來" placeholderTextColor={t.faint}
                    autoCorrect={false} autoCapitalize="none" accessibilityLabel="默寫答案"
                    onSubmitEditing={() => { if (!shown && typed.trim()) { setShown(true); grade(normalize(typed) === normalize(w.ja)); speakJa(w.ja); } }}
                    style={{
                      backgroundColor: t.surface2, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: 16,
                      fontSize: 20, fontFamily: fonts.serifMedium, color: t.heading,
                    }} />
                  {shown ? (
                    <View style={{ marginTop: space.md, backgroundColor: correct ? t.successSoft : t.dangerSoft, borderRadius: radius.lg, padding: space.lg }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={18} color={correct ? t.success : t.danger} />
                        <T variant="small" color={correct ? t.success : t.danger} style={{ fontWeight: '700' }}>
                          {correct ? '答對了' : '正解'}
                        </T>
                      </View>
                      <T style={{ fontSize: 22, lineHeight: 32, fontFamily: fonts.serifMedium, marginTop: 4 }} color={t.heading}>{w.ja}</T>
                    </View>
                  ) : null}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* 底部按鈕：字卡自己評分，選擇和默寫作答後直接下一題 */}
        {mode === 'card' ? (
          shown ? (
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button label="還不熟" variant="secondary" style={{ flex: 1 }} onPress={() => { grade(false); next(); }} />
              <Button label="記得" style={{ flex: 1 }} onPress={() => { grade(true); next(); }} />
            </View>
          ) : <Button label="看答案" variant="dark" onPress={() => { setShown(true); speakJa(w.ja); }} />
        ) : shown ? (
          <Button label={i + 1 < queue.length ? '下一個' : '看結果'} onPress={next} />
        ) : mode === 'write' ? (
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button label="想不起來" variant="secondary" style={{ flex: 1 }}
              onPress={() => { setShown(true); grade(false); speakJa(w.ja); }} />
            <Button label="對答案" style={{ flex: 1 }} disabled={!typed.trim()}
              onPress={() => { setShown(true); grade(normalize(typed) === normalize(w.ja)); speakJa(w.ja); }} />
          </View>
        ) : <Button label="選一個答案" disabled onPress={() => {}} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Done({ known, total, onClose, onAgain }: { known: number; total: number; onClose: () => void; onAgain?: () => void }) {
  const t = useTheme();
  return (
    <Screen scroll={false} edges={['bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={total ? 'checkmark' : 'cafe-outline'} size={48} color={t.primary} />
        </View>
        <T variant="display" style={{ fontSize: 28, lineHeight: 36, marginTop: space.xl }}>
          {total ? '複習完成' : '今天沒有要複習的'}
        </T>
        {total ? <T color={t.sub} style={{ marginTop: space.sm }}>記得 {known} 個，共 {total} 個</T>
          : <T color={t.sub} style={{ marginTop: space.sm }}>收藏新單字後會自動排進複習</T>}
      </View>
      {onAgain && total ? <Button label="換一種練法再來一次" variant="secondary" style={{ marginBottom: space.sm }} onPress={onAgain} /> : null}
      <Button label="完成" onPress={onClose} />
    </Screen>
  );
}
