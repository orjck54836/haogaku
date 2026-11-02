import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, ProgressBar, Pill, IconName } from '../ui';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { levels, isUnlocked, levelProgress, nextLesson } from '../content/curriculum';
import { Lesson, LevelId } from '../content/types';
import { RootStack } from '../navigation';

const kindIcon: Record<Lesson['kind'], IconName> = { kana: 'text-outline', vocab: 'albums-outline', scene: 'chatbubbles-outline', ai: 'sparkles' };
const kindLabel: Record<Lesson['kind'], string> = { kana: '假名', vocab: '單字', scene: '情境', ai: 'AI 會話' };

export default function CourseScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress, profile } = useData();
  const [levelId, setLevelId] = useState<LevelId>(nextLesson(progress.completed, profile.startLevel).level.id);
  const level = levels.find(l => l.id === levelId)!;
  const lp = levelProgress(levelId, progress.completed);
  const current = nextLesson(progress.completed, profile.startLevel).lesson.id;

  function open(l: Lesson) {
    if (l.kind === 'ai') nav.navigate('Chat', { scenarioId: l.scenarioId!, lessonId: l.id });
    else nav.navigate('Lesson', { lessonId: l.id });
  }

  return (
    <Screen>
      <T variant="title">課程</T>
      <T variant="small" color={t.sub} style={{ marginTop: 4 }}>從五十音一路到職場敬語</T>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.lg, marginHorizontal: -space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.sm }}>
        {levels.map(l => {
          const on = l.id === levelId;
          const p = levelProgress(l.id, progress.completed);
          return (
            <Pressable key={l.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setLevelId(l.id)}
              style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5,
                borderColor: on ? t.primary : t.line, backgroundColor: on ? t.primary : t.surface }}>
              <T style={{ fontWeight: '800', fontSize: 14 }} color={on ? t.onPrimary : t.ink}>
                {l.title}{p.done === p.total ? ' ✓' : ''}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={{ marginTop: space.lg, backgroundColor: t.primarySoft, borderColor: t.primarySoft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T variant="heading">{level.title}</T>
          <Pill label={level.jlpt} color={t.primary} bg={t.surface} />
        </View>
        <T variant="small" color={t.sub} style={{ marginTop: 4 }}>{level.description}</T>
        <View style={{ marginTop: space.md }}>
          <ProgressBar value={lp.done / lp.total} track={t.surface} />
          <T variant="caption" color={t.sub} style={{ marginTop: 6 }}>已完成 {lp.done} / {lp.total} 課</T>
        </View>
      </Card>

      {level.units.map((u, ui) => (
        <View key={u.id} style={{ marginTop: space.xxl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T variant="caption" color={t.primary}>單元 {ui + 1}</T>
              <T variant="heading" style={{ marginTop: 2 }}>{u.title}</T>
              <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{u.description}</T>
            </View>
            {u.hasKanaChart ? (
              <Pressable accessibilityRole="button" onPress={() => nav.navigate('KanaChart')} hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="grid-outline" size={16} color={t.primary} />
                <T variant="small" color={t.primary} style={{ fontWeight: '700' }}>五十音表</T>
              </Pressable>
            ) : null}
          </View>

          <View style={{ marginTop: space.md, gap: space.sm }}>
            {u.lessons.map(l => {
              const done = progress.completed.includes(l.id);
              const open_ = isUnlocked(l.id, progress.completed, profile.startLevel);
              const isCurrent = l.id === current;
              const status = done ? { icon: 'checkmark-circle' as IconName, color: t.success }
                : !open_ ? { icon: 'lock-closed' as IconName, color: t.faint }
                : { icon: 'play-circle' as IconName, color: isCurrent ? t.accent : t.primary };
              return (
                <Pressable key={l.id} accessibilityRole="button" accessibilityState={{ disabled: !open_ }} disabled={!open_} onPress={() => open(l)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
                    backgroundColor: t.surface, borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? t.accent : t.line,
                    opacity: !open_ ? 0.5 : pressed ? 0.8 : 1,
                  })}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: l.kind === 'ai' ? t.accentSoft : t.surface2 }}>
                    <Ionicons name={kindIcon[l.kind]} size={20} color={l.kind === 'ai' ? t.accent : t.sub} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '700' }} numberOfLines={1}>{l.title}</T>
                    <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={1}>
                      {kindLabel[l.kind]} · {l.minutes} 分鐘 · {l.subtitle}
                    </T>
                  </View>
                  <Ionicons name={status.icon} size={26} color={status.color} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
