import { useMemo, useRef, useState } from 'react';
import { View, Image, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T, Card, Button, Pill, Rule, SectionTitle, RoundButton } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { readingById, genreLabels, readingLessonId } from '../content/readings';
import { wordsForLine, segmentLine, ReadingWord } from '../content/readingWords';
import { levelShort, levelJlpt } from '../content/curriculum';
import { readingXp } from '../lib/rank';
import { useReviewPrompt } from '../lib/useReviewPrompt';
import { photoFor } from '../ui/images';
import FollowInvite from '../ui/FollowInvite';
import { speakJa, stopSpeech } from '../lib/speech';
import { StackProps } from '../navigation';

/**
 * 讀物的閱讀畫面。
 *
 * 版面上的三個決定：
 * 1. **中譯預設收起來**。看得到翻譯就不會去猜，猜了才記得住。
 *    整篇可以一次打開（右上角），單行也可以點開——先猜再對答案。
 * 2. **一行一個點擊區**。點日文就唸那一行，不做整篇朗讀——
 *    學習者需要的是反覆聽某一句，不是聽一段廣播。
 * 3. 單字集中在文末，不做行內標記。行內塞收藏鈕會把日文排版切碎——
 *    所以行內的詞改成**點了才在底部出現一張小卡**，排版本身不動，
 *    收藏鈕也只在那張卡上（見 picked）。
 */
export default function ReadingScreen({ route, navigation }: StackProps<'Reading'>) {
  const t = useTheme();
  const d = useData();
  const insets = useSafeAreaInsets();
  const r = readingById(route.params.readingId)!;
  const lessonId = readingLessonId(r.id);
  const already = d.progress.completed.includes(lessonId);

  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [speaking, setSpeaking] = useState<number | null>(null);
  /** 點開的詞。帶行索引是因為同一個詞可能出現在好幾行，只有被點的那一個該亮起來 */
  const [picked, setPicked] = useState<{ i: number; word: ReadingWord } | null>(null);
  /**
   * 詞的點擊要吃掉整行的播放。
   *
   * 行是一個大的 Pressable（點了唸整句），詞是巢狀在裡面的 Text。
   * RN 的巢狀 Text onPress **不保證**會擋住外層 Pressable，兩個都觸發的話
   * 點一個詞會順便把整句唸出來。用時間戳記擋：詞剛被點過就略過那一次播放。
   */
  const wordTap = useRef(0);

  /** 斷詞結果和文章綁在一起，不必每次 render 重算（一篇 8〜12 行，每行都要掃一遍） */
  const segments = useMemo(
    () => r.lines.map((l, i) => segmentLine(l.ja, wordsForLine(r.id, i))),
    [r.id, r.lines],
  );
  const [justDone, setJustDone] = useState(false);
  const xp = readingXp(r.level);
  // reviewing：這次完成被評價詢問用掉了，底下就不掛 IG 邀請
  const { reviewing } = useReviewPrompt(justDone);
  const photo = photoFor(r.photo);
  // 重讀不再給 XP，但也不該讓按鈕消失（讀完想再按一次確認讀過是很自然的動作）
  const earned = useRef(0);

  function say(i: number, ja: string) {
    // 剛點過詞就不播：那一下的意圖是查意思，不是聽整句
    if (Date.now() - wordTap.current < 400) return;
    setSpeaking(i);
    stopSpeech();
    speakJa(ja);
  }

  function pickWord(i: number, word: ReadingWord) {
    wordTap.current = Date.now();
    // 再點同一個就收起來：小卡擋住了下面兩行，要有一個不用找關閉鈕的收法
    setPicked(p => (p && p.i === i && p.word.w === word.w ? null : { i, word }));
  }

  function finish() {
    if (!already) { d.addXp(xp); earned.current = xp; }
    d.completeLesson(lessonId);
    setJustDone(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['bottom']}>
      {/* 自繪的頂欄。沒有系統 header 是因為照片橫幅要頂到畫面最上緣，
          但純浮動的返回鈕撐不住：往下捲時日文會從它底下穿過去，
          還會和狀態列的時間疊在一起。所以這一條是**不透明**的，
          把狀態列的底也一起鋪掉；半透明的話捲動時白底內容會透出來變灰。
          zIndex 要給——ScrollView 在它之後渲染，不給就會被蓋掉。 */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        backgroundColor: t.shell, paddingTop: insets.top, paddingHorizontal: space.md, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 44 }}>
          <RoundButton icon="chevron-back" size={36} bg="rgba(255,255,255,0.14)" fg="#FFFFFF"
            accessibilityLabel="返回" onPress={() => navigation.goBack()} />
          <T variant="heading" color="#FFFFFF" numberOfLines={1} style={{ flex: 1 }}>{r.titleZh}</T>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: space.section }} showsVerticalScrollIndicator={false}>
        {/* 標題橫幅：日文明體大標壓在照片上 */}
        <View style={{ width: '100%', aspectRatio: 16 / 10, justifyContent: 'flex-end', backgroundColor: t.shell,
          marginTop: insets.top + 50 }}>
          {photo ? <>
            <Image source={photo} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,16,18,0.5)' }} />
          </> : null}
          <View style={{ padding: space.xl }}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: space.md }}>
              <Pill label={genreLabels[r.genre]} color="#231A08" bg={t.gold} />
              <Pill label={`${levelShort[r.level]} · ${levelJlpt[r.level]}`} color="#FFFFFF" bg="rgba(255,255,255,0.22)" />
            </View>
            <T style={{ fontSize: 13, fontFamily: fonts.serifRegular, letterSpacing: 2, color: 'rgba(255,255,255,0.8)' }}>
              {r.kana}
            </T>
            <T style={{ fontSize: 30, lineHeight: 42, fontFamily: fonts.serif, color: '#FFFFFF', marginTop: 2 }}>
              {r.title}
            </T>
            <T variant="small" color="rgba(255,255,255,0.82)" style={{ marginTop: 4 }}>{r.titleZh}</T>
          </View>
        </View>

        <View style={{ padding: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <T variant="small" color={t.sub} style={{ flex: 1 }}>{r.hook}</T>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: showAll }} hitSlop={8}
              onPress={() => { setShowAll(v => !v); setOpen({}); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name={showAll ? 'eye' : 'eye-off-outline'} size={17} color={t.primary} />
              <T variant="caption" color={t.primary} style={{ fontWeight: '700' }}>{showAll ? '中譯已開' : '顯示中譯'}</T>
            </Pressable>
          </View>

          {/* 行內點字沒有任何視覺標示（底線太吵），所以要有一句話告訴使用者這件事存在。
              放在文章正上方而不是頁尾：看到的時候正要開始讀，才用得上。
              沒有標注的舊文章不顯示，免得提示了卻點不動 */}
          {segments.some(s => s.some(x => x.word)) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: space.md }}>
              <Ionicons name="hand-left-outline" size={13} color={t.faint} />
              <T variant="caption" color={t.faint}>{'點日文裡的單字可以看意思'}</T>
            </View>
          ) : null}

          <View style={{ marginTop: space.xl, gap: space.lg }}>
            {r.lines.map((l, i) => {
              const shown = showAll || open[i];
              return (
                <Pressable key={i} accessibilityRole="button" accessibilityLabel={`播放：${l.ja}`}
                  onPress={() => say(i, l.ja)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    {/* 一行只有一個 <T>：拆成多個會在全形句號後面留下換行變成的半形空格 */}
                    <T style={{ flex: 1, fontSize: 19, lineHeight: 34, fontFamily: fonts.serifRegular }} color={t.heading}>
                      {segments[i].map((s, k) => {
                        if (!s.word) return s.text;
                        const on = picked?.i === i && picked.word.w === s.word.w;
                        return (
                          <Text key={k} suppressHighlighting accessibilityRole="button"
                            accessibilityLabel={`${s.text}：看意思`}
                            onPress={() => pickWord(i, s.word!)}
                            style={{
                              color: on ? '#FFFFFF' : t.heading,
                              backgroundColor: on ? t.primary : undefined,
                            }}>
                            {/* 可點的詞**不加底線**。實測平均有 53% 的字是可點的，
                                再淡的底線都會變成整行畫線，日文排版整個被切碎。
                                改成點了才反白，發現性交給上面那一行提示。 */}
                            {s.text}
                          </Text>
                        );
                      })}
                    </T>
                    <Ionicons name="volume-high-outline" size={16} color={speaking === i ? t.primary : t.faint}
                      style={{ marginTop: 9 }} />
                  </View>
                  {shown ? (
                    <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{l.zh}</T>
                  ) : (
                    <Pressable accessibilityRole="button" accessibilityLabel="看這一行的中譯" hitSlop={6}
                      onPress={() => setOpen(o => ({ ...o, [i]: true }))}>
                      <T variant="caption" color={t.faint} style={{ marginTop: 2 }}>看中譯</T>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </View>

          <SectionTitle title="帶走這些詞" ja="ことば" />
          <Card tone="soft" style={{ paddingVertical: space.xs }}>
            {r.words.map((w, i) => (
              <View key={w.ja}>
                {i > 0 ? <Rule /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`播放 ${w.ja}`} onPress={() => speakJa(w.ja)}
                    style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}>
                    <T style={{ fontSize: 18, lineHeight: 26, fontFamily: fonts.serifMedium }} color={t.heading}>{w.ja}</T>
                    <T variant="caption" color={t.faint} style={{ marginTop: 1 }}>{w.reading}</T>
                  </Pressable>
                  <T variant="small" color={t.sub} style={{ maxWidth: 130, textAlign: 'right' }}>{w.zh}</T>
                  <SaveButton ja={w.ja} zh={w.zh} source={`讀物・${r.titleZh}`} compact />
                </View>
              </View>
            ))}
          </Card>

          {/* 讀完的收穫：這篇真正要教的語法點，放在最後才不會先破壞閱讀 */}
          <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: t.goldSoft, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl }}>
            <Ionicons name="bulb-outline" size={19} color={t.warning} />
            <T variant="small" color={t.warning} style={{ flex: 1, lineHeight: 21 }}>{r.takeaway}</T>
          </View>

          {justDone ? (
            <View style={{ marginTop: space.xl, gap: space.sm }}>
              <View style={{ alignItems: 'center', gap: space.sm }}>
                <Pill icon="checkmark-circle" label={earned.current ? `+${earned.current} XP` : '已讀過，這次不重複給 XP'}
                  color={t.gold} bg={t.goldSoft} />
              </View>
              <FollowInvite placement="done" reviewing={reviewing} />
              <Button label="回讀物列表" variant="ghost" onPress={() => navigation.goBack()} />
            </View>
          ) : (
            <Button label={already ? '再讀一次就好' : `讀完了（+${xp} XP）`} icon="checkmark"
              style={{ marginTop: space.xl }} onPress={finish} />
          )}
        </View>
      </ScrollView>

      {/* 點開的詞。
          **浮在底部，不是 Modal**：查一個詞的時候原句要留在視線裡，
          全螢幕蓋掉的話使用者得先關掉才能把句子讀完，等於每查一個詞斷一次。
          位置固定在底部而不是跟著字跑，是因為跟著字跑時最後一行的卡會超出畫面。 */}
      {picked ? (
        <View style={{ position: 'absolute', left: space.md, right: space.md, bottom: insets.bottom + space.md }}>
          <Card raised style={{ padding: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 22, lineHeight: 32, fontFamily: fonts.serifMedium }} color={t.heading}>
                  {picked.word.w}
                </T>
                {/* 假名詞的讀音就是詞形本身，印第二次只是讓卡片多一行沒有資訊的字 */}
                {picked.word.kana && picked.word.kana !== picked.word.w ? (
                  <T variant="caption" color={t.faint} style={{ marginTop: 1 }}>{picked.word.kana}</T>
                ) : null}
                {/* 日中同形詞（災害、理由、電車…約佔一成）的中譯就是原文本身，
                    印出來等於同一個詞看三次。這種詞真正有價值的是讀音，
                    所以中文那一行收掉——但假名也被收掉時要留著，免得卡片只剩一個詞 */}
                {picked.word.zh !== picked.word.w || picked.word.kana === picked.word.w ? (
                  <T style={{ fontSize: 16, lineHeight: 24, marginTop: 6 }} color={t.sub}>{picked.word.zh}</T>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <RoundButton icon="volume-high" size={38} bg={t.primarySoft} fg={t.primary}
                  accessibilityLabel={`播放 ${picked.word.w}`}
                  onPress={() => { stopSpeech(); speakJa(picked.word.w); }} />
                <SaveButton ja={picked.word.w} zh={picked.word.zh} source={`讀物・${r.titleZh}`} compact />
                <RoundButton icon="close" size={38} bg={t.bg} fg={t.sub}
                  accessibilityLabel="關閉" onPress={() => setPicked(null)} />
              </View>
            </View>
          </Card>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
