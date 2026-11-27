import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/Tap';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, Pill, ProgressBar, FolderTabs, SectionTitle } from '../ui';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { today } from '../lib/date';
import { speakJa } from '../lib/speech';
import { StackProps } from '../navigation';
import { NumberedCard } from '../ui/NumberedCard';
import { JlptLevel, jlptLevels, jlptLevelDesc, jlptSections, jlptTypes, pointsOf, questionsOf, isNewJlpt } from '../content/jlpt';

/**
 * 日檢考前專區的首頁：上面選級數，下面是這一級的測驗和重點整理。
 *
 * 測驗卡排在重點整理上面：內容還少的時候，重點一級只有三四條、一下就讀完，
 * 「做題目」才是每天回來的理由。
 */
export default function JlptScreen({ navigation }: StackProps<'Jlpt'>) {
  const t = useTheme();
  const d = useData();
  // 預設級數跟著使用者選的程度走：初級（N5〜N4）從 N5、進階（N3〜N2）從 N3
  const [lv, setLv] = useState<JlptLevel>(d.profile.startLevel === 'L3' ? 'N3' : 'N5');
  const [open, setOpen] = useState<string | null>(null);
  const now = today();

  const qs = questionsOf(lv);
  const points = pointsOf(lv);
  const answered = qs.filter(q => q.id in d.progress.jlpt);
  const right = qs.filter(q => d.progress.jlpt[q.id] === true).length;
  const wrong = answered.length - right;
  const fresh = qs.filter(q => isNewJlpt(q.added, now)).length + points.filter(p => isNewJlpt(p.added, now)).length;

  return (
    <Screen edges={['bottom']}>
      <T variant="caption" color={t.faint}>にほんごのうりょくしけん</T>
      <T variant="display" style={{ fontSize: 30, lineHeight: 38, marginTop: 2 }}>日檢考前專區</T>
      {/* 一句話一個 <T>：原始碼換行會變成半形空格 */}
      <T variant="small" color={t.sub} style={{ marginTop: space.sm }}>{'重點整理＋模擬題，每天持續新增。'}</T>

      <View style={{ marginTop: space.xl }}>
        <FolderTabs items={jlptLevels.map(id => ({
          key: id, label: id, sub: `${questionsOf(id).length} 題`, on: id === lv,
          onPress: () => { setLv(id); setOpen(null); },
        }))} />
      </View>

      <Card raised style={{ marginTop: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <T variant="heading" style={{ fontSize: 19 }}>{lv} 模擬測驗</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 3 }}>{jlptLevelDesc[lv]}</T>
          </View>
          {fresh ? <Pill icon="sparkles" label={`新增 ${fresh}`} color={t.primary} bg={t.primarySoft} /> : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: space.lg }}>
          <T variant="numeral" color={t.heading}>{right}</T>
          <T variant="small" color={t.faint}>/ {qs.length} 題答對</T>
        </View>
        <View style={{ marginTop: space.sm }}>
          <ProgressBar value={qs.length ? right / qs.length : 0} />
        </View>

        <Button label={answered.length ? '再做一次' : '開始測驗'} icon="create-outline" style={{ marginTop: space.lg }}
          tapId="日檢開始測驗" disabled={!qs.length}
          onPress={() => navigation.navigate('JlptQuiz', { level: lv, wrongOnly: false })} />
        {/* 有錯題才出現：沒錯過的人看到一顆按了沒東西的按鈕，會以為壞掉 */}
        {wrong ? <Button label={`只練錯題（${wrong}）`} variant="secondary" style={{ marginTop: space.sm }}
          tapId="日檢只練錯題"
          onPress={() => navigation.navigate('JlptQuiz', { level: lv, wrongOnly: true })} /> : null}
      </Card>

      {/* 分項練習：正式考試是分科計分的，常常只有一科拖分，要能單獨練那一科 */}
      <SectionTitle title="分項練習" ja="かもくべつ" />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {jlptSections.map(sec => {
          const n = questionsOf(lv, sec);
          const types = [...new Set(n.map(q => jlptTypes[q.type].label))];
          return (
            <Card key={sec} tone="soft" tapId={`日檢分項 ${sec}`} accessibilityLabel={`${sec} ${n.length} 題`}
              onPress={n.length ? () => navigation.navigate('JlptQuiz', { level: lv, wrongOnly: false, section: sec }) : undefined}
              style={{ flex: 1, padding: space.md, opacity: n.length ? 1 : 0.45 }}>
              <T variant="heading" style={{ fontSize: 15 }}>{sec}</T>
              <T variant="caption" color={t.primary} style={{ marginTop: 2, fontWeight: '700' }}>{n.length} 題</T>
              <T variant="caption" color={t.faint} style={{ marginTop: space.xs }} numberOfLines={2}>{types.join('・') || '準備中'}</T>
            </Card>
          );
        })}
      </View>

      <SectionTitle title="重點整理" ja="ポイント" right={<T variant="small" color={t.faint}>{points.length} 條</T>} />
      {points.length ? (
        <View style={{ gap: space.md }}>
          {points.map((p, i) => {
            const on = open === p.id;
            return (
              <NumberedCard key={p.id} index={i} tapId="日檢重點展開" accessibilityLabel={`${p.pattern} ${p.meaning}`}
                onPress={() => setOpen(on ? null : p.id)}
                right={<>
                  {isNewJlpt(p.added, now) ? <Pill label="新" color="#FFFFFF" bg={t.primary} /> : null}
                  <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={18} color={t.faint} />
                </>}
                expanded={on ? (
                  <View style={{ gap: space.sm }}>
                    <T variant="small" color={t.ink} style={{ lineHeight: 21 }}>{p.note}</T>
                    {p.examples.map(e => (
                      <Pressable key={e.ja} tapId="日檢播放例句" accessibilityRole="button" accessibilityLabel={`播放例句 ${e.ja}`}
                        onPress={() => speakJa(e.ja)}
                        style={({ pressed }) => ({ backgroundColor: t.surface2, borderRadius: radius.md, padding: space.md, opacity: pressed ? 0.75 : 1 })}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                          <T style={{ flex: 1, fontSize: 16, lineHeight: 25, fontFamily: fonts.serifRegular }} color={t.ink}>{e.ja}</T>
                          <Ionicons name="volume-high" size={17} color={t.primary} />
                        </View>
                        <T variant="caption" color={t.sub} style={{ marginTop: 2 }}>{e.zh}</T>
                      </Pressable>
                    ))}
                  </View>
                ) : null}>
                <T style={{ fontSize: 18, lineHeight: 26, fontFamily: fonts.serifMedium }} color={t.ink}>{p.pattern}</T>
                <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{p.meaning}</T>
              </NumberedCard>
            );
          })}
        </View>
      ) : <T variant="small" color={t.faint}>這一級的重點整理還在準備中。</T>}
    </Screen>
  );
}
