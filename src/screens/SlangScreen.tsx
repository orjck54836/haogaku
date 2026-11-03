import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, Pill, RoundButton } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius, fonts } from '../theme';
import { slang, todaySlangIndex } from '../content/slang';
import { speakJa } from '../lib/speech';

export default function SlangScreen() {
  const t = useTheme();
  const todayIndex = todaySlangIndex();
  const [i, setI] = useState(todayIndex);
  const w = slang[i];
  return (
    <Screen edges={['bottom']}>
      <Card raised style={{ paddingVertical: space.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 52 個全部都能翻，所以只有真的是今天那一個才掛「今日」 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            {i === todayIndex
              ? <Pill icon="today" label="今日" color={t.primary} bg={t.primarySoft} />
              : null}
            <Pill label={`${i + 1} / ${slang.length}`} color={t.sub} />
          </View>
          <RoundButton icon="volume-high" size={42} bg={t.primary} fg="#FFFFFF"
            accessibilityLabel={`播放 ${w.word}`} onPress={() => speakJa(w.word)} />
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={`播放 ${w.word}`} onPress={() => speakJa(w.word)}
          style={({ pressed }) => ({ marginTop: space.lg, opacity: pressed ? 0.6 : 1 })}>
          {/* 明體大字：fontSize 放大時一定要一起給 lineHeight，不然會被 variant 的行高切掉 */}
          <T style={{ fontSize: 48, lineHeight: 62, fontFamily: fonts.serifRegular }} color={t.heading}>{w.word}</T>
          {/* 平假名在上、羅馬拼音在下。假名詞沒有 kana，就只剩羅馬拼音 */}
          {w.kana ? <T style={{ fontSize: 17, fontFamily: fonts.serifRegular }} color={t.primary}>{w.kana}</T> : null}
          <T variant="small" color={t.faint} style={{ marginTop: 2 }}>{w.reading}</T>
        </Pressable>

        <T variant="heading" style={{ marginTop: space.lg, fontSize: 19 }}>{w.meaning}</T>

        <Pressable accessibilityRole="button" accessibilityLabel={`播放例句 ${w.example}`} onPress={() => speakJa(w.example)}
          style={({ pressed }) => ({ backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.lg, marginTop: space.lg, opacity: pressed ? 0.75 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <T style={{ flex: 1, fontSize: 18, lineHeight: 28, fontFamily: fonts.serifRegular }} color={t.ink}>{w.example}</T>
            <Ionicons name="volume-high" size={19} color={t.primary} />
          </View>
          <T variant="small" color={t.sub} style={{ marginTop: 4 }}>{w.exampleZh}</T>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.lg }}>
          <Pill icon="pricetag" label={`適合：${w.when}`} color={t.primary} bg={t.primarySoft} />
          <SaveButton ja={w.word} zh={w.meaning} source="流行語" />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
        <Button label="上一個" variant="secondary" style={{ flex: 1 }} onPress={() => setI((i - 1 + slang.length) % slang.length)} />
        <Button label="下一個" style={{ flex: 1 }} onPress={() => setI((i + 1) % slang.length)} />
      </View>
      {i !== todayIndex
        ? <Button label="回到今日這一個" variant="ghost" style={{ marginTop: space.sm }} onPress={() => setI(todayIndex)} />
        : null}
    </Screen>
  );
}
