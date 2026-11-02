import { View, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, Divider } from '../ui';
import { useTheme, space } from '../theme';
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
    <Screen>
      <T variant="title">單字本</T>
      <T variant="small" color={t.sub} style={{ marginTop: 4 }}>收藏的單字會用間隔複習幫你記牢</T>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        {[{ n: d.words.length, l: '收藏' }, { n: due, l: '待複習' }, { n: mastered, l: '已熟記' }].map(s => (
          <Card key={s.l} style={{ flex: 1, alignItems: 'center', paddingVertical: space.md }}>
            <T style={{ fontSize: 22, fontWeight: '800' }}>{s.n}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 2 }}>{s.l}</T>
          </Card>
        ))}
      </View>
      <Button label={due ? `開始複習（${due}）` : '今天沒有要複習的單字'} icon="repeat" style={{ marginTop: space.md }}
        disabled={!due} onPress={() => nav.navigate('Review')} />

      {d.words.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: space.xxl * 2 }}>
          <Ionicons name="bookmark-outline" size={44} color={t.faint} />
          <T variant="heading" style={{ marginTop: space.md }}>開始收藏單字</T>
          <T variant="small" color={t.sub} style={{ marginTop: space.sm, textAlign: 'center', lineHeight: 20 }}>
            在課程、AI 會話、分析報告裡{'\n'}看到不認識的字，按書籤就會存到這裡
          </T>
        </View>
      ) : (
        <Card style={{ marginTop: space.xl, paddingVertical: space.xs }}>
          {d.words.map((w, i) => (
            <View key={w.ja}>
              {i > 0 ? <Divider /> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={`播放 ${w.ja}`} onPress={() => speakJa(w.ja)} onLongPress={() => confirmRemove(w.ja)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 17, fontWeight: '700' }}>{w.ja}</T>
                  {w.zh ? <T variant="small" color={t.sub} style={{ marginTop: 2 }} numberOfLines={2}>{w.zh}</T> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    {[0, 1, 2, 3].map(b => (
                      <View key={b} style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: b < w.box ? t.success : t.surface2 }} />
                    ))}
                    <T variant="caption" color={t.faint} numberOfLines={1} style={{ flex: 1 }}>  {w.source}</T>
                  </View>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`移除 ${w.ja}`} onPress={() => confirmRemove(w.ja)} hitSlop={12}>
                  <Ionicons name="trash-outline" size={18} color={t.faint} />
                </Pressable>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
