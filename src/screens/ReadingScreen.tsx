import { useRef, useState } from 'react';
import { View, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T, Card, Button, Pill, Rule, SectionTitle, RoundButton } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { readingById, genreLabels, readingLessonId } from '../content/readings';
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
 * 3. 單字集中在文末，不做行內標記。行內塞收藏鈕會把日文排版切碎。
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
  const [justDone, setJustDone] = useState(false);
  const xp = readingXp(r.level);
  // reviewing：這次完成被評價詢問用掉了，底下就不掛 IG 邀請
  const { reviewing } = useReviewPrompt(justDone);
  const photo = photoFor(r.photo);
  // 重讀不再給 XP，但也不該讓按鈕消失（讀完想再按一次確認讀過是很自然的動作）
  const earned = useRef(0);

  function say(i: number, ja: string) {
    setSpeaking(i);
    stopSpeech();
    speakJa(ja);
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

          <View style={{ marginTop: space.xl, gap: space.lg }}>
            {r.lines.map((l, i) => {
              const shown = showAll || open[i];
              return (
                <Pressable key={i} accessibilityRole="button" accessibilityLabel={`播放：${l.ja}`}
                  onPress={() => say(i, l.ja)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    <T style={{ flex: 1, fontSize: 19, lineHeight: 34, fontFamily: fonts.serifRegular }} color={t.heading}>
                      {l.ja}
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
    </SafeAreaView>
  );
}
