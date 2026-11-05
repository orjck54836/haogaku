import { useEffect, useState } from 'react';
import { View, Alert, Platform, Pressable, Text, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Row, Divider, SectionTitle, Rule, Avatar, RoundButton, Segmented } from '../ui';
import { useTheme, space, fonts, radius, shadows, tintedShadow } from '../theme';
import { useAuth, providerLabels } from '../state/auth';
import { useData, Goal, goalLabel } from '../state/data';
import { levelShort, levelJlpt } from '../content/curriculum';
import { isReadingLesson, readings } from '../content/readings';
import { speakJa, setSpeechRate } from '../lib/speech';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStack } from '../navigation';
import { BrandFooter } from '../ui/brand';
import { topicPhotos, uiPhotos } from '../ui/images';
import { RankRow } from '../ui/RankCard';
import { Seal } from '../ui/seal';
import { rankState } from '../lib/rank';
import OfficialLinks from '../ui/OfficialLinks';
import { planById } from '../content/plans';
import { legalLinks } from '../content/links';
import { loadAnalyticsChoice, setAnalyticsEnabled } from '../lib/analytics';
import {
  remindersSupported, remindersEnabled, reminderHour, enableReminders, disableReminders, DEFAULT_HOUR,
} from '../lib/reminders';

/** 四個目標各配一張看得懂的照片：機場、區役所（留學手續）、會議室、KTV */
const goalPhoto: Record<Goal, number> = {
  travel: topicPhotos.airport!, study: topicPhotos.cityhall!,
  work: topicPhotos.meeting!, hobby: topicPhotos.karaoke!,
};

/** 個人資料卡的底圖：明治神宮的大鳥居。累積到一個階段才走得過去，和卡片上那些數字講的是同一件事 */
const statsPhoto = topicPhotos.newyear!;

/** 設定列的小圖。44pt 方形，和主題卡的縮圖同一種圓角比例 */
function RowPhoto({ source }: { source: number }) {
  return <Image source={source} resizeMode="cover" style={{ width: 44, height: 44, borderRadius: 13 }} />;
}
const paces = [30, 50, 80];
const rates = [{ v: 1.0, l: '標準' }, { v: 0.85, l: '慢' }, { v: 1.15, l: '快' }];

export default function ProfileScreen() {
  const t = useTheme();
  const a = useAuth();
  const d = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const plan = planById(d.profile.plan);

  // 提醒和分析的開關狀態存在手機（AsyncStorage），不是 profile：
  // 訪客也要能設定，而且這兩件事和學習紀錄無關，不該為了它們多寫一次雲端
  const [reminderOn, setReminderOn] = useState(false);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [analyticsOn, setAnalyticsOn] = useState(true);
  // 「這個 build 有沒有通知模組」在 effect 裡問，不要在 render 的判斷式裡問：
  // 探測如果丟出錯誤，在 render 裡就是整頁白掉，在 effect 裡最多是這一列不出現
  const [canRemind, setCanRemind] = useState(false);
  useEffect(() => {
    remindersEnabled().then(setReminderOn);
    reminderHour().then(setHour);
    loadAnalyticsChoice().then(setAnalyticsOn);
    try { setCanRemind(remindersSupported()); } catch { setCanRemind(false); }
  }, []);

  async function toggleReminder() {
    if (reminderOn) { await disableReminders(); setReminderOn(false); return; }
    const ok = await enableReminders(hour);
    setReminderOn(ok);
    // 排不成功時開關要彈回去，並且說清楚是權限的問題——
    // 顯示「已開啟」卻永遠不跳，使用者只會覺得這個 App 壞了
    if (!ok) Alert.alert('打不開提醒', '請到「設定 → 通知 → 皓學日語」允許通知，再回來開啟一次。');
  }
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const name = d.profile.nickname || a.user?.displayName || (a.isGuest ? '訪客' : a.user?.email?.split('@')[0]) || '學習者';

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

  /** 開不起來就說一句，不要讓人點了沒反應以為是當掉 */
  const openUrl = (url: string) => Linking.openURL(url).catch(() =>
    Alert.alert('打不開連結', '請確認網路連線，或稍後再試。'));

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
      {/* 個人資料、段位、四個數字併成同一張卡。
          原本是三塊分開的（深色大頭卡 → 段位區塊 → 深色數字塊），中間還夾著排行榜，
          但它們講的都是同一件事：這個人現在練到哪。分三塊只是讓這一頁變長，
          而且兩塊深色中間夾一塊酒紅，層次反而亂掉。
          底圖鋪照片＋單層平光遮罩（不疊多層假漸層，實機會看到灰帶）。 */}
      {/* 陰影下在外層：同一個 View 上 overflow:'hidden' 會把 iOS 陰影一起關掉 */}
      <View style={{ borderRadius: radius.xl, ...shadows.lg }}>
      <View style={{ borderRadius: radius.xl, backgroundColor: t.shell, overflow: 'hidden' }}>
        <Image source={statsPhoto} resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.shell, opacity: 0.88 }} />

        <View style={{ padding: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Avatar name={name} photo={d.profile.photo} size={64} bg={t.gold} fg="#231A08" />
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

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />

        {/* 段位和日語程度並排標著名字。這兩個最容易被搞混——
            一個是 XP 換來的成就，一個是使用者自己選的難度，不標的話會以為是同一條 */}
        <View style={{ paddingHorizontal: space.xl, paddingVertical: space.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md }}>
            <T variant="caption" color="rgba(255,255,255,0.55)" style={{ letterSpacing: 1 }}>段位</T>
            <T variant="caption" color="rgba(255,255,255,0.55)">
              {`日語程度 ${levelShort[d.profile.startLevel]}（${levelJlpt[d.profile.startLevel]}）`}
            </T>
          </View>
          <RankRow xp={d.progress.xp} onDark />
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />

        <View style={{ flexDirection: 'row', paddingVertical: space.lg, paddingHorizontal: space.sm }}>
          {[
            { n: d.streak(), l: '連續天數', icon: 'flame' as const },
            { n: `Lv.${rankState(d.progress.xp).rank.n}`, l: '等級', icon: 'star' as const },
            // 讀物也記在 completed 裡，但它不是課，不該灌水這個數字
            { n: d.progress.completed.filter(id => !isReadingLesson(id)).length, l: '完成課程', icon: 'checkmark-done' as const },
            { n: d.progress.chats, l: 'AI 會話', icon: 'sparkles' as const },
          ].map((x, i) => (
            <View key={x.l} style={{ flex: 1, alignItems: 'center',
              borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: 'rgba(255,255,255,0.14)' }}>
              <Ionicons name={x.icon} size={16} color={t.gold} />
              <T style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginTop: 5 }} color="#FFFFFF">{x.n}</T>
              <T variant="caption" color="rgba(255,255,255,0.68)" style={{ marginTop: 2 }} numberOfLines={1}>{x.l}</T>
            </View>
          ))}
        </View>
      </View>
      </View>

      {/* 排行榜入口。原本只是段位標題右邊的一行小字，使用者反映會整個滑過去，
          所以改成整張酒紅卡——這一頁上唯一的飽和色塊，掃過去不可能錯過 */}
      <Pressable accessibilityRole="button" accessibilityLabel="查看學習排行榜"
        onPress={() => nav.navigate('Leaderboard')}
        style={({ pressed }) => ({
          marginTop: space.md, backgroundColor: t.primary, borderRadius: radius.xl,
          padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md,
          opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.99 : 1 }],
          // 入口卡要浮起來才看得出可以點；陰影用酒紅自己的顏色，灰影壓在飽和色下面會髒
          ...tintedShadow(t.primary),
        })}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trophy" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="heading" color="#FFFFFF">學習排行榜</T>
          <T variant="caption" color="rgba(255,255,255,0.75)" style={{ marginTop: 1 }}>
            {d.profile.leaderboard ? '看看你在其他學員之中排第幾' : '你目前沒有參加，點進去可以加入'}
          </T>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
      </Pressable>

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

      <SectionTitle title="方案" ja="プラン"
        right={<T variant="caption" color={t.faint}>課程永遠免費</T>} />
      <View style={{ borderRadius: radius.xl, ...shadows.lg }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`方案，目前是${plan.name}`}
        onPress={() => nav.navigate('Plans')}
        style={({ pressed }) => ({
          borderRadius: radius.xl, overflow: 'hidden', backgroundColor: t.shell,
          borderWidth: 2, borderColor: t.gold,
          opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }],
        })}>
        <Image source={topicPhotos.gifts!} resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.shell, opacity: 0.82 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
          <Seal kanji={plan.kanji} size={48} tone={plan.id === 'free' ? 'soft' : 'gold'} />
          <View style={{ flex: 1 }}>
            <T variant="caption" color={t.gold} style={{ fontWeight: '700', letterSpacing: 0.5 }}>
              {`目前：${plan.name}`}
            </T>
            <T variant="heading" color="#FFFFFF" style={{ fontSize: 18, marginTop: 2 }}>
              {plan.id === 'free' ? '想要更多 AI 次數？' : '查看或更換方案'}
            </T>
            <T variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 3, lineHeight: 18 }}>
              {plan.id === 'free'
                ? '課程與讀物永遠免費，付費只買 AI 和語音的每日用量'
                : plan.tagline}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
        </View>
      </Pressable>
      </View>

      <SectionTitle title="學習設定" />
      <Card tone="soft" style={{ paddingVertical: space.xs }}>
        <Row leading={<RowPhoto source={goalPhoto[d.profile.goal]} />} title="學習目標" subtitle={goalLabel[d.profile.goal]} onPress={() => nav.navigate('EditProfile')} />
        <Divider />
        <Row leading={<RowPhoto source={topicPhotos.invitations!} />} title="每日目標" subtitle={`${d.profile.dailyGoal} XP · 點一下切換`}
          onPress={() => d.setProfile({ dailyGoal: paces[(paces.indexOf(d.profile.dailyGoal) + 1) % paces.length] })} />
        <Divider />
        <Row leading={<RowPhoto source={topicPhotos.friends!} />} title="排行榜"
          subtitle={d.profile.leaderboard ? '參加中，暱稱、大頭照與 XP 會公開 · 點一下退出' : '未參加 · 點一下加入'}
          right={<Ionicons name={d.profile.leaderboard ? 'toggle' : 'toggle-outline'} size={30}
            color={d.profile.leaderboard ? t.primary : t.faint} />}
          onPress={() => {
            // 退出時順手說明資料會被刪掉——不然使用者不知道自己還在不在榜上
            const on = !d.profile.leaderboard;
            d.setProfile({ leaderboard: on });
            if (!on) Alert.alert('已退出排行榜', '你在排行榜上的資料會在下次同步時刪除，學習紀錄不受影響。');
          }} />
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
        {/* 沒有通知原生模組的 build（例如還沒重 build 的 dev client）就整列不顯示：
            顯示一個打開也不會有作用的開關，比沒有這個功能更糟 */}
        {canRemind ? <>
          <Divider />
          {/* 用 cafe 而不是 coach：coach 已經給了上一列的「語音速度」，
              兩列並排同一張縮圖會讓人以為是同一個設定的兩個開關 */}
          <Row leading={<RowPhoto source={topicPhotos.cafe!} />} title="每日提醒"
            subtitle={reminderOn ? `每天 ${hour}:00 提醒一次 · 點一下關閉` : '關閉中 · 點一下開啟'}
            right={<Ionicons name={reminderOn ? 'toggle' : 'toggle-outline'} size={30}
              color={reminderOn ? t.primary : t.faint} />}
            onPress={toggleReminder} />
        </> : null}
        <Divider />
        <Row leading={<RowPhoto source={topicPhotos.gifts!} />} title="使用狀況分析"
          subtitle={analyticsOn ? '協助改善 App · 不含會話內容與個人資料' : '已關閉 · 點一下開啟'}
          right={<Ionicons name={analyticsOn ? 'toggle' : 'toggle-outline'} size={30}
            color={analyticsOn ? t.primary : t.faint} />}
          onPress={() => { const on = !analyticsOn; setAnalyticsOn(on); setAnalyticsEnabled(on); }} />
      </Card>

      {/* 技術支援與法務頁。Support URL 和帳號刪除說明是 App Store Connect 的必填欄位，
          網頁存在就能送審，但使用者在 App 裡找不到的話等於沒有——真的要聯絡時
          才不必回去翻官網。網址一律讀 links.ts，不要在這裡寫死。 */}
      <SectionTitle title="說明與支援" ja="サポート" />
      <Card tone="soft" style={{ paddingVertical: space.xs }}>
        <Row icon="help-buoy-outline" iconColor={t.sub} iconBg="#FFFFFF" title="技術支援"
          subtitle="常見問題與聯絡方式" onPress={() => openUrl(legalLinks.support)} />
        <Divider />
        <Row icon="document-text-outline" iconColor={t.sub} iconBg="#FFFFFF" title="服務條款"
          onPress={() => openUrl(legalLinks.terms)} />
        <Divider />
        <Row icon="lock-closed-outline" iconColor={t.sub} iconBg="#FFFFFF" title="隱私權政策"
          onPress={() => openUrl(legalLinks.privacy)} />
      </Card>

      <SectionTitle title="帳號" />
      <Card tone="soft" style={{ paddingVertical: space.xs }}>
        <Row icon="log-out-outline" iconColor={t.sub} iconBg="#FFFFFF" title="登出" onPress={confirmSignOut} />
        <Divider />
        <Row icon="trash-outline" iconColor={t.danger} iconBg={t.dangerSoft} title="刪除帳號" subtitle="永久刪除帳號與學習紀錄" onPress={confirmDelete} />
        <Divider />
        {/* 刪除是不可復原的，說明頁排在動作下面讓人按下去之前還有機會先看清楚 */}
        <Row icon="information-circle-outline" iconColor={t.sub} iconBg="#FFFFFF" title="刪除帳號說明"
          subtitle="會移除哪些資料、訂閱要另外取消" onPress={() => openUrl(legalLinks.deleteAccount)} />
      </Card>

      <SectionTitle title="追蹤皓學" ja="フォロー"
        right={<T variant="caption" color={t.faint}>課程・留學代辦</T>} />
      <OfficialLinks />

      <BrandFooter text="皓學日語 v1.0.0 · FORMA Global" />
    </Screen>
  );
}
