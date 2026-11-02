import { useState } from 'react';
import { View, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, Row, Divider, SectionTitle } from '../ui';
import { useTheme, space } from '../theme';
import { useAuth } from '../state/auth';
import { useData, Goal } from '../state/data';
import { levels } from '../content/curriculum';
import { LevelId } from '../content/types';

const goalLabel: Record<Goal, string> = { travel: '去日本旅行', study: '留學或打工度假', work: '日商工作', hobby: '興趣' };
const paces = [30, 50, 80];
const levelIds: LevelId[] = ['L1', 'L2', 'L3', 'L4'];

export default function ProfileScreen() {
  const t = useTheme();
  const a = useAuth();
  const d = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const name = a.user?.displayName || (a.isGuest ? '訪客' : a.user?.email?.split('@')[0]) || '學習者';
  const levelTitle = levels.find(l => l.id === d.profile.startLevel)?.title;

  async function run(key: string, fn: () => Promise<void>, failTitle = '操作失敗') {
    setBusy(key);
    try { await fn(); } catch (e: any) { Alert.alert(failTitle, e?.message ?? '請稍後再試'); }
    finally { setBusy(null); }
  }

  function confirmSignOut() {
    const msg = a.isGuest ? '訪客帳號登出後，學習紀錄將無法找回。建議先綁定帳號。' : '下次登入同一個帳號就能接續學習。';
    Alert.alert('登出？', msg, [{ text: '取消', style: 'cancel' }, { text: '登出', style: 'destructive', onPress: () => run('out', a.signOut) }]);
  }

  function confirmDelete() {
    Alert.alert('刪除帳號？', '帳號與所有學習紀錄、單字本都會永久刪除，無法復原。', [
      { text: '取消', style: 'cancel' },
      { text: '永久刪除', style: 'destructive', onPress: () => run('del', a.deleteAccount, '無法刪除') },
    ]);
  }

  const cycleLevel = () => {
    const next = levelIds[(levelIds.indexOf(d.profile.startLevel) + 1) % levelIds.length];
    d.setProfile({ startLevel: next });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 24, fontWeight: '800' }} color={t.primary}>{name.slice(0, 1).toUpperCase()}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title">{name}</T>
          <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{a.isGuest ? '訪客帳號' : a.user?.email ?? 'Apple 帳號'}</T>
        </View>
      </View>

      {a.isGuest ? (
        <Card style={{ marginTop: space.xl, backgroundColor: t.warningSoft, borderColor: t.warningSoft }}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Ionicons name="cloud-upload-outline" size={20} color={t.warning} />
            <T variant="heading" color={t.warning}>綁定帳號，保存學習紀錄</T>
          </View>
          <T variant="small" color={t.sub} style={{ marginTop: 6, lineHeight: 20 }}>換手機或重裝也能接續進度，AI 每日次數也會增加。</T>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {Platform.OS === 'ios' ? <Button size="md" label="綁定 Apple" icon="logo-apple" variant="dark" loading={busy === 'apple'} onPress={() => run('apple', a.signInApple, '綁定失敗')} /> : null}
            <Button size="md" label="綁定 Google" icon="logo-google" variant="secondary" loading={busy === 'google'} onPress={() => run('google', a.signInGoogle, '綁定失敗')} />
          </View>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        {[
          { n: d.streak(), l: '連續天數', icon: 'flame' as const, c: t.accent },
          { n: d.progress.xp, l: '總 XP', icon: 'star' as const, c: t.warning },
          { n: d.progress.completed.length, l: '完成課程', icon: 'checkmark-done' as const, c: t.success },
          { n: d.progress.chats, l: 'AI 會話', icon: 'sparkles' as const, c: t.primary },
        ].map(s => (
          <Card key={s.l} style={{ flex: 1, alignItems: 'center', padding: space.md }}>
            <Ionicons name={s.icon} size={18} color={s.c} />
            <T style={{ fontSize: 18, fontWeight: '800', marginTop: 4 }}>{s.n}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 2 }} numberOfLines={1}>{s.l}</T>
          </Card>
        ))}
      </View>

      <SectionTitle title="學習設定" />
      <Card style={{ paddingVertical: space.xs }}>
        <Row icon="flag-outline" iconColor={t.primary} iconBg={t.primarySoft} title="學習目標" subtitle={goalLabel[d.profile.goal]} right={<View />} />
        <Divider />
        <Row icon="speedometer-outline" iconColor={t.success} iconBg={t.successSoft} title="每日目標" subtitle={`${d.profile.dailyGoal} XP · 點一下切換`}
          onPress={() => d.setProfile({ dailyGoal: paces[(paces.indexOf(d.profile.dailyGoal) + 1) % paces.length] })} />
        <Divider />
        <Row icon="layers-outline" iconColor={t.accent} iconBg={t.accentSoft} title="起始程度" subtitle={`${levelTitle} · 點一下切換`} onPress={cycleLevel} />
      </Card>

      <SectionTitle title="帳號" />
      <Card style={{ paddingVertical: space.xs }}>
        <Row icon="log-out-outline" iconColor={t.sub} iconBg={t.surface2} title="登出" onPress={confirmSignOut} />
        <Divider />
        <Row icon="trash-outline" iconColor={t.danger} iconBg={t.dangerSoft} title="刪除帳號" subtitle="永久刪除帳號與學習紀錄" onPress={confirmDelete} />
      </Card>

      <T variant="caption" color={t.faint} style={{ textAlign: 'center', marginTop: space.xxl }}>皓學日語 v2.0 · FORMA Global</T>
    </Screen>
  );
}
