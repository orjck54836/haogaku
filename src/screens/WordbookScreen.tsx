import { View, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Sheet, T, Card, Button, Rule, RoundButton, SectionTitle } from '../ui';
import { TopBar, WineCard } from '../ui/brand';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { speakJa } from '../lib/speech';
import { RootStack } from '../navigation';

export default function WordbookScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const d = useData();
  const due = d.dueWords().length;
  const mastered = d.words.filter(w => w.box >= 3).length;

  function confirmRemove(ja: string) {
    Alert.alert('從單字本移除？', ja, [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: () => d.removeWord(ja) },
    ]);
  }

  return (
    <Screen shell padded={false}>
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        <TopBar />

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

        {d.words.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: space.section }}>
            <Ionicons name="bookmark-outline" size={44} color={t.faint} />
            <T variant="heading" style={{ marginTop: space.md }}>開始收藏單字</T>
            <T variant="small" color={t.sub} style={{ marginTop: space.sm, textAlign: 'center', lineHeight: 20 }}>
              在課程、AI 會話、分析報告裡{'\n'}看到不認識的字，按書籤就會存到這裡
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
                </View>
              ))}
            </Card>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
