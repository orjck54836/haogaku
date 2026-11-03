import { useState } from 'react';
import { View, Alert, Platform, Pressable, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Row, Divider, SectionTitle, Rule, Avatar, RoundButton } from '../ui';
import { useTheme, space, fonts, radius } from '../theme';
import { useAuth, providerLabels } from '../state/auth';
import { useData, Goal } from '../state/data';
import { levelLabels } from '../content/curriculum';
import { LevelId } from '../content/types';
import { speakJa, setSpeechRate } from '../lib/speech';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStack } from '../navigation';
import { BrandFooter } from '../ui/brand';
import { topicPhotos, uiPhotos } from '../ui/images';

const goalLabel: Record<Goal, string> = { travel: '去日本旅行', study: '留學或打工度假', work: '日商工作', hobby: '興趣' };
/** 四個目標各配一張看得懂的照片：機場、區役所（留學手續）、會議室、KTV */
const goalPhoto: Record<Goal, number> = {
  travel: topicPhotos.airport!, study: topicPhotos.cityhall!,
  work: topicPhotos.meeting!, hobby: topicPhotos.karaoke!,
};

/** 設定列的小圖。44pt 方形，和主題卡的縮圖同一種圓角比例 */
function RowPhoto({ source }: { source: number }) {
  return <Image source={source} resizeMode="cover" style={{ width: 44, height: 44, borderRadius: 13 }} />;
}
const paces = [30, 50, 80];
const levelIds: LevelId[] = ['L1', 'L2', 'L3', 'L4'];
const rates = [{ v: 1.0, l: '標準' }, { v: 0.85, l: '慢' }, { v: 1.15, l: '快' }];

export default function ProfileScreen() {
  const t = useTheme();
  const a = useAuth();
  const d = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const name = d.profile.nickname || a.user?.displayName || (a.isGuest ? '訪客' : a.user?.email?.split('@')[0]) || '學習者';
  const levelTitle = levelLabels[d.profile.startLevel];

  // 這台機器能用的登入方式。Apple 登入只在 iOS 出現
  type Linkable = 'apple.com' | 'google.com';
  const options: Linkable[] = Platform.OS === 'ios' ? ['apple.com', 'google.com'] : ['google.com'];
  const link: Record<Linkable, () => Promise<void>> = { 'apple.com': a.signInApple, 'google.com': a.signInGoogle };
  // Apple 可能只給隱私信箱、也可能完全不給 email，所以沒有 email 時退回提供者名稱
  const identity = a.isGuest ? '訪客帳號'
    : a.linked.find(p => p.email)?.email
      ?? (a.linked.length ? a.linked.map(p => p.label).join('・') : '已登入');

  async function run(key: string, fn: () => Promise<void>, failTitle = '操作失敗') {
    setBusy(key);
    try { await fn(); } catch (e: any) { Alert.alert(failTitle, e?.message ?? '請稍後再試'); }
    finally { setBusy(null); }
  }

  function confirmSignOut() {
    const msg = a.isGuest ? '訪客帳號登出後，學習紀錄將無法找回。建議先綁定帳號。' : '下次登入同一個帳號就能接續學習。';
    Alert.alert('登出？', msg, [{ text: '取消', style: 'cancel' }, { text: '登出', style: 'destructive', onPress: () => run('out', a.signOut) }]);
  }

  function confirmUnlink(id: Linkable) {
    const label = providerLabels[id];
    const rest = a.linked.filter(p => p.id !== id).map(p => p.label).join('、');
    Alert.alert(`解除 ${label} 綁定？`, `解除後就不能再用 ${label} 登入這個帳號，之後請用 ${rest} 登入。學習紀錄不會受影響。`, [
      { text: '取消', style: 'cancel' },
      { text: '解除綁定', style: 'destructive', onPress: () => run(id === 'apple.com' ? 'apple' : 'google', () => a.unlinkProvider(id), '解除失敗') },
    ]);
  }

  function confirmDelete() {
    // 綁了 Apple 的帳號在刪除前要重新驗證一次，才能撤銷 Apple token（App Store 要求）
    const extra = a.hasProvider('apple.com') ? '\n\n為了撤銷 Apple 授權，接下來會請你再用 Apple 登入一次確認。'
      : a.hasProvider('google.com') ? '\n\n為了確認是你本人，接下來會請你再用 Google 登入一次。' : '';
    Alert.alert('刪除帳號？', `帳號與所有學習紀錄、單字本都會永久刪除，無法復原。${extra}`, [
      { text: '取消', style: 'cancel' },
      { text: '永久刪除', style: 'destructive', onPress: () => run('del', a.deleteAccount, '無法刪除') },
    ]);
  }

  const cycleLevel = () => {
    const next = levelIds[(levelIds.indexOf(d.profile.startLevel) + 1) % levelIds.length];
    d.setProfile({ startLevel: next });
  };

  /** 一個登入方式：已綁定顯示帳號，沒綁定才給綁定入口 */
  function ProviderRow({ id }: { id: Linkable }) {
    const p = a.linked.find(x => x.id === id);
    const key = id === 'apple.com' ? 'apple' : 'google';
    const icon = id === 'apple.com' ? 'logo-apple' : 'logo-google';
    return (
      <Pressable accessibilityRole="button"
        accessibilityLabel={p ? `${providerLabels[id]} 已綁定` : `綁定 ${providerLabels[id]}`}
        accessibilityState={{ disabled: !!p }}
        onPress={p ? undefined : () => run(key, link[id], '綁定失敗')}
        disabled={!!p || busy === key}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg, opacity: pressed ? 0.6 : 1 })}>
        <Ionicons name={icon} size={19} color={p ? t.ink : t.faint} />
        <View style={{ flex: 1 }}>
          <T>{providerLabels[id]}</T>
          <T variant="small" color={t.sub} numberOfLines={1} style={{ marginTop: 1 }}>
            {p ? p.email ?? '已綁定這個帳號' : '還沒綁定'}
          </T>
        </View>
        {busy === key ? <T variant="caption" color={t.faint}>處理中…</T>
          : p ? <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark" size={15} color={t.success} />
                <T variant="caption" color={t.success}>已綁定</T>
              </View>
              {a.linked.length > 1 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`解除綁定 ${providerLabels[id]}`} hitSlop={8}
                  onPress={() => confirmUnlink(id)}>
                  <T variant="caption" color={t.primary}>解除</T>
                </Pressable>
              ) : null}
            </View>
          : <T variant="small" color={t.primary}>綁定</T>}
      </Pressable>
    );
  }

  return (
    <Screen>
      <View style={{ borderRadius: radius.xl, backgroundColor: t.shell, padding: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Avatar name={name} size={64} bg={t.gold} fg="#231A08" />
          <View style={{ flex: 1 }}>
            <T variant="title" color="#FFFFFF" numberOfLines={1}>{name}</T>
            {d.profile.jaName ? <Text style={{ fontFamily: fonts.serifMedium, fontSize: 13, color: t.gold, marginTop: 2 }}>{d.profile.jaName}</Text> : null}
            <T variant="caption" color="rgba(255,255,255,0.6)" style={{ marginTop: 2 }} numberOfLines={1}>{identity}</T>
          </View>
          <RoundButton icon="create-outline" size={40} bg="rgba(255,255,255,0.14)" fg="#FFFFFF"
            accessibilityLabel="編輯個人資料" onPress={() => nav.navigate('EditProfile')} />
        </View>
        {d.profile.intro ? (
          <T variant="small" color="rgba(255,255,255,0.75)" style={{ marginTop: space.lg }}>{d.profile.intro}</T>
        ) : null}
      </View>

      <SectionTitle title="登入方式" ja="ログイン" />
      {a.isGuest ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: t.gold, paddingLeft: space.md, marginBottom: space.lg }}>
          <T variant="heading">綁定帳號，保存學習紀錄</T>
          <T variant="small" color={t.sub} style={{ marginTop: 4 }}>
            訪客紀錄只存在這台手機。綁定後換手機或重裝也能接續，AI 每日次數也會增加。
          </T>
        </View>
      ) : null}
      <View>
        {options.map((id, i) => (
          <View key={id}>
            {i > 0 ? <Rule /> : null}
            <ProviderRow id={id} />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.section }}>
        {[
          { n: d.streak(), l: '連續天數', icon: 'flame' as const, c: t.accent },
          { n: d.progress.xp, l: '總 XP', icon: 'star' as const, c: t.warning },
          { n: d.progress.completed.length, l: '完成課程', icon: 'checkmark-done' as const, c: t.success },
          { n: d.progress.chats, l: 'AI 會話', icon: 'sparkles' as const, c: t.primary },
        ].map(s => (
          <Card key={s.l} tone="soft" style={{ flex: 1, alignItems: 'center', padding: space.md }}>
            <Ionicons name={s.icon} size={18} color={s.c} />
            <T style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 }} color={t.ink}>{s.n}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 2 }} numberOfLines={1}>{s.l}</T>
          </Card>
        ))}
      </View>

      <SectionTitle title="學習設定" />
      <Card tone="soft" style={{ paddingVertical: space.xs }}>
        <Row leading={<RowPhoto source={goalPhoto[d.profile.goal]} />} title="學習目標" subtitle={goalLabel[d.profile.goal]} onPress={() => nav.navigate('EditProfile')} />
        <Divider />
        <Row leading={<RowPhoto source={topicPhotos.invitations!} />} title="每日目標" subtitle={`${d.profile.dailyGoal} XP · 點一下切換`}
          onPress={() => d.setProfile({ dailyGoal: paces[(paces.indexOf(d.profile.dailyGoal) + 1) % paces.length] })} />
        <Divider />
        <Row leading={<RowPhoto source={uiPhotos.coach} />} title="語音速度"
          subtitle={`${rates.find(r => r.v === d.profile.speechRate)?.l ?? '標準'} · 點一下切換`}
          onPress={() => {
            const i = rates.findIndex(r => r.v === d.profile.speechRate);
            const next = rates[(i + 1) % rates.length];
            d.setProfile({ speechRate: next.v });
            setSpeechRate(next.v);
            speakJa(next.l === '慢' ? 'ゆっくり話します。' : next.l === '快' ? '少し速く話します。' : '普通の速さで話します。');
          }} />
        <Divider />
        <Row leading={<RowPhoto source={topicPhotos.basics!} />} title="日語程度" subtitle={`${levelTitle} · 點一下切換`} onPress={cycleLevel} />
      </Card>

      <SectionTitle title="帳號" />
      <Card tone="soft" style={{ paddingVertical: space.xs }}>
        <Row icon="log-out-outline" iconColor={t.sub} iconBg="#FFFFFF" title="登出" onPress={confirmSignOut} />
        <Divider />
        <Row icon="trash-outline" iconColor={t.danger} iconBg={t.dangerSoft} title="刪除帳號" subtitle="永久刪除帳號與學習紀錄" onPress={confirmDelete} />
      </Card>

      <BrandFooter text="皓學日語 v2.0 · FORMA Global" />
    </Screen>
  );
}
