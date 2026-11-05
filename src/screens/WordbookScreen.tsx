import { useState } from 'react';
import { View, Pressable, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Sheet, T, Card, Button, Rule, RoundButton, SectionTitle } from '../ui';
import { TopBar, WineCard } from '../ui/brand';
import { PlanButton } from '../ui/PlanButton';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { speakJa } from '../lib/speech';
import { aiExample } from '../lib/ai';
import { RootStack } from '../navigation';

export default function WordbookScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const d = useData();
  const due = d.dueWords().length;
  const mastered = d.words.filter(w => w.box >= 3).length;
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState('');     // 正在產生的詞條（空字串＝閒置）
  const [open, setOpen] = useState<string | null>(null);   // 展開例句的詞條，一次只開一個

  /**
   * 手打新增。
   *
   * 詞條用**後端回來的 `ja`**，不是使用者打的字：他可能打了中文或不自然的寫法，
   * 後端會收斂成像樣的日文詞條（見 functions 的 aiExample）。
   */
  async function add() {
    const word = input.trim();
    if (!word || busy) return;
    setBusy(word);
    try {
      const r = await aiExample(word, d.profile.startLevel);
      // 查無此字：後端已經把額度退回去了，所以這裡不能說成「產生失敗、請重試」——
      // 重試只會再查一次同樣查不到的字，而且下一次就未必退得了額度
      if (r.found === false) {
        Alert.alert('查無此單字或用法', `「${word}」在日文裡找不到這個說法。\n檢查一下拼寫，或換個說法再試。`);
        return;
      }
      if (d.addWord({ ja: r.ja, kana: r.kana, zh: r.zh, source: '自己新增', examples: r.examples })) {
        setInput('');
        setOpen(r.ja);
        if (r.remaining !== undefined) d.setAiRemaining(r.remaining);
      } else {
        // 打中文時特別容易遇到：使用者看不出自己輸入的字會收斂成哪個詞條
        Alert.alert('已經在單字本裡了', r.ja === word ? r.ja : `${word} → ${r.ja}`);
        setInput('');
      }
    } catch (e: any) {
      // 例句失敗不該讓輸入白打一場，但沒有讀音和意思的詞條價值有限，所以問一次再存
      Alert.alert('產生例句失敗', `${e?.message ?? '請稍後再試'}`, [
        { text: '取消', style: 'cancel' },
        { text: '仍要收藏', onPress: () => { if (d.addWord({ ja: word, source: '自己新增' })) setInput(''); } },
      ]);
    } finally {
      setBusy('');
    }
  }

  /** 收藏成功但例句沒產出來的那幾筆，補一次 */
  async function retry(ja: string) {
    if (busy) return;
    setBusy(ja);
    try {
      const r = await aiExample(ja, d.profile.startLevel);
      if (r.found === false) {
        Alert.alert('查無此單字或用法', `「${ja}」在日文裡找不到這個說法。長按可以從單字本移除。`);
        return;
      }
      d.fillWord(ja, { kana: r.kana, zh: r.zh, examples: r.examples });
      setOpen(ja);
      if (r.remaining !== undefined) d.setAiRemaining(r.remaining);
    } catch (e: any) {
      Alert.alert('產生例句失敗', e?.message ?? '請稍後再試');
    } finally {
      setBusy('');
    }
  }

  function confirmRemove(ja: string) {
    Alert.alert('從單字本移除？', ja, [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: () => d.removeWord(ja) },
    ]);
  }

  return (
    <Screen shell padded={false}>
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        <TopBar right={<PlanButton />} />

        <WineCard style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <T variant="small" color="rgba(255,255,255,0.72)">たんごちょう</T>
              <T variant="title" color="#FFFFFF" style={{ marginTop: 2 }}>單字本</T>
            </View>
            {due ? <RoundButton icon="repeat" accessibilityLabel={`開始複習 ${due} 個單字`}
              onPress={() => nav.navigate('Review')} /> : null}
          </View>

          {/* 三個數字橫排，和首頁的「今日目標」同一種讀法 */}
          <View style={{ flexDirection: 'row', marginTop: space.xl }}>
            {[{ n: d.words.length, l: '收藏' }, { n: due, l: '待複習' }, { n: mastered, l: '已熟記' }].map((s, i) => (
              <View key={s.l} style={{ flex: 1, alignItems: 'center',
                borderLeftWidth: i ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.18)' }}>
                <T variant="numeral" color="#FFFFFF">{s.n}</T>
                <T variant="caption" color="rgba(255,255,255,0.72)" style={{ marginTop: 2 }}>{s.l}</T>
              </View>
            ))}
          </View>
        </WineCard>
      </View>

      <Sheet>
        <Button label={due ? `開始複習（${due}）` : '今天沒有要複習的單字'} icon="repeat"
          disabled={!due} onPress={() => nav.navigate('Review')} />

        {/* 自己加單字：放在複習按鈕下面、列表上面。列表空的時候也要在，
            不然新使用者看到的是一個「請去別的畫面收藏」的死路 */}
        <SectionTitle title="自己加單字" ja="じぶんで" />
        <Card tone="soft">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <TextInput value={input} onChangeText={setInput} maxLength={60}
              placeholder="日文或中文都可以" placeholderTextColor={t.faint}
              editable={!busy} returnKeyType="done" onSubmitEditing={add}
              accessibilityLabel="要新增的單字或句子"
              style={{
                flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line,
                borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 11,
                fontSize: 16, color: t.ink, fontFamily: fonts.serifRegular,
              }} />
            {/* 44pt 圓形：和 TopBar 的元件同一個尺寸，Pill 塞不進這個寬度 */}
            {busy === input.trim() && busy
              ? <View style={{ width: 44, alignItems: 'center' }}><ActivityIndicator color={t.primary} /></View>
              : <RoundButton icon="sparkles" size={44} accessibilityLabel="產生例句並收藏"
                  onPress={add} />}
          </View>
          <T variant="caption" color={t.faint} style={{ marginTop: space.sm, lineHeight: 18 }}>
            {'AI 會補上讀音、中文意思和一句例句。打中文會換成對應的日文說法。'}
          </T>
        </Card>

        {d.words.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: space.section }}>
            <Ionicons name="bookmark-outline" size={44} color={t.faint} />
            <T variant="heading" style={{ marginTop: space.md }}>開始收藏單字</T>
            <T variant="small" color={t.sub} style={{ marginTop: space.sm, textAlign: 'center', lineHeight: 20 }}>
              上面可以自己打字新增{'\n'}課程和 AI 會話裡按書籤也會存到這裡
            </T>
          </View>
        ) : (
          <>
            <SectionTitle title="收藏的單字" ja="ことば"
              right={<T variant="small" color={t.faint}>長按可移除</T>} />
            <Card tone="soft" style={{ paddingVertical: space.xs }}>
              {d.words.map((w, i) => (
                <View key={w.ja}>
                  {i > 0 ? <Rule /> : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`播放 ${w.ja}`}
                    onPress={() => speakJa(w.ja)} onLongPress={() => confirmRemove(w.ja)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ flex: 1 }}>
                      {/* 日文用明體，和課程內頁、流行語同一種排法 */}
                      <T style={{ fontSize: 19, lineHeight: 28, fontFamily: fonts.serifMedium }} color={t.heading}>{w.ja}</T>
                      {/* 假名詞的讀音就是詞形本身，再印一次只是佔一行（和 slang 同一條規則） */}
                      {w.kana && w.kana !== w.ja
                        ? <T variant="caption" color={t.faint} style={{ marginTop: 1, fontFamily: fonts.serifRegular }}>{w.kana}</T>
                        : null}
                      {w.zh ? <T variant="small" color={t.sub} style={{ marginTop: 2 }} numberOfLines={2}>{w.zh}</T> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        {[0, 1, 2, 3].map(b => (
                          <View key={b} style={{ width: 16, height: 4, borderRadius: radius.pill, backgroundColor: b < w.box ? t.success : '#FFFFFF' }} />
                        ))}
                        <T variant="caption" color={t.faint} numberOfLines={1} style={{ flex: 1, marginLeft: space.xs }}>{w.source}</T>
                      </View>
                    </View>
                    <RoundButton icon="volume-high" size={38} bg="#FFFFFF" fg={t.primary}
                      accessibilityLabel={`播放 ${w.ja}`} onPress={() => speakJa(w.ja)} />
                  </Pressable>

                  {/* 例句的開關和列表都在 Pressable 外面：
                      包在裡面的話點例句會連帶觸發整列的「播放單字」 */}
                  {w.examples?.length ? (
                    <Pressable accessibilityRole="button" onPress={() => setOpen(open === w.ja ? null : w.ja)}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingBottom: space.md, opacity: pressed ? 0.6 : 1 })}>
                      {/* 只有一句時數字沒有資訊，寫出來反而像在強調「只有一句」 */}
                      <T variant="caption" color={t.primary}>
                        {open === w.ja ? '收起例句' : w.examples.length > 1 ? `例句 ${w.examples.length}` : '例句'}
                      </T>
                      <Ionicons name={open === w.ja ? 'chevron-up' : 'chevron-down'} size={12} color={t.primary} />
                    </Pressable>
                  ) : w.source === '自己新增' ? (
                    busy === w.ja
                      ? <View style={{ flexDirection: 'row', paddingBottom: space.md }}><ActivityIndicator size="small" color={t.primary} /></View>
                      : <Pressable accessibilityRole="button" onPress={() => retry(w.ja)}
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4,
                            paddingBottom: space.md, opacity: pressed ? 0.6 : 1 })}>
                          <Ionicons name="sparkles-outline" size={12} color={t.primary} />
                          <T variant="caption" color={t.primary}>產生例句</T>
                        </Pressable>
                  ) : null}

                  {open === w.ja && w.examples?.length ? (
                    <View style={{ paddingBottom: space.md, gap: space.md }}>
                      {w.examples.map((ex, j) => (
                        <Pressable key={j} accessibilityRole="button" accessibilityLabel={`播放例句 ${ex.ja}`}
                          onPress={() => speakJa(ex.ja)}
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start',
                            gap: space.sm, opacity: pressed ? 0.6 : 1 })}>
                          <View style={{ width: 3, alignSelf: 'stretch', borderRadius: radius.pill, backgroundColor: t.line }} />
                          <View style={{ flex: 1 }}>
                            <T style={{ fontSize: 16, lineHeight: 25, fontFamily: fonts.serifRegular }} color={t.heading}>{ex.ja}</T>
                            {ex.kana ? <T variant="caption" color={t.faint} style={{ marginTop: 1, fontFamily: fonts.serifRegular }}>{ex.kana}</T> : null}
                            {ex.zh ? <T variant="small" color={t.sub} style={{ marginTop: 3 }}>{ex.zh}</T> : null}
                          </View>
                          <Ionicons name="volume-medium-outline" size={16} color={t.faint} style={{ marginTop: 4 }} />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </Card>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
