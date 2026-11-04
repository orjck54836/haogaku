import { useState } from 'react';
import { View, Pressable, Alert, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T, Card, Button, Pill, Rule, RoundButton } from '../ui';
import { Seal } from '../ui/seal';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { planById, yearlySaving, yearlyPerMonth, YEARLY_AVAILABLE, IAP_AVAILABLE, PlanId } from '../content/plans';
import { topicPhotos } from '../ui/images';
import { legalLinks } from '../content/links';
import { track } from '../lib/analytics';
import { StackProps } from '../navigation';

type Cycle = 'monthly' | 'yearly';

/** 和方案比較頁用同一組照片，從那一頁點進來才接得起來 */
const planPhoto: Record<PlanId, number> = {
  free: topicPhotos.hanami!, plus: topicPhotos.shinkansen!, pro: topicPhotos.matsuri!,
};

/** 自繪頂欄的高度：上 padding ＋ 內容 44 ＋ 下 padding。內容要讓開這麼多 */
const HEADER_H = space.sm + 44 + 6;

/**
 * 購買頁。
 *
 * 和方案比較頁（PlansScreen）分開：那一頁回答「我該買哪個」，
 * 這一頁回答「我要付多少、什麼時候扣、怎麼取消」。混在一起的話，
 * 比較的資訊會把付款條件擠掉，而付款條件正是審查在看的東西。
 *
 * ## 版面是照 App Store 審查要求排的
 *
 * Guideline 3.1.2 要求自動續訂訂閱在**購買當下**就看得到這五件事，
 * 不能藏在另一個頁面裡：
 *   1. 訂閱名稱　2. 期間長度　3. 每期價格　4. 服務條款　5. 隱私權政策
 * 這裡全部排在按鈕上方同一個畫面，不用捲動也看得到前三項。
 * 少一項就是退件，所以不要為了版面好看把它們拿掉。
 *
 * ## 還沒接金流
 *
 * `purchase()` 現在只跳說明。真的要收費得：
 *   1. 在 App Store Connect／Google Play 建好 plans.ts 裡那四個 productId
 *   2. 用 IAP 套件發起購買、拿到收據
 *   3. **在 Cloud Functions 驗證收據**，把方案寫進 users/{uid}
 *   4. 後端 LIMITS 改成讀那個值
 * 第 3 步不能省：profile.plan 存在手機上，前端說了不算。
 */
export default function PurchaseScreen({ route, navigation }: StackProps<'Purchase'>) {
  const t = useTheme();
  const d = useData();
  const plan = planById(route.params.planId);
  // 年繳還沒開放（見 plans.ts 的 YEARLY_AVAILABLE），只能是月繳
  const [cycle, setCycle] = useState<Cycle>(YEARLY_AVAILABLE ? (route.params.cycle ?? 'monthly') : 'monthly');
  const [busy, setBusy] = useState(false);

  const yearly = YEARLY_AVAILABLE && cycle === 'yearly';
  const total = yearly ? plan.yearly : plan.monthly;
  const periodLabel = yearly ? '年' : '月';
  const trial = plan.trialDays ?? 0;

  async function purchase() {
    setBusy(true);
    // 漏斗的最後一步。接了金流之後，這裡和實際成交的差距就是流失
    track('purchase_tap', { plan: plan.id, cycle, price: total });
    try {
      // TODO：發起 IAP 購買，成功後把收據送到 Cloud Functions 驗證。
      // 驗證通過才由後端寫入方案——這裡絕對不要直接 setProfile({ plan })。
      Alert.alert(
        '訂閱尚未開放',
        `你選擇的是「${plan.name}」${periodLabel}繳方案，NT$${total}。\n\n`
        + '付款功能還在跟 App Store 的審核流程一起準備，開放後會在這裡通知你。'
        + '在那之前，所有課程與讀物都是免費的，AI 也有每日免費額度可以用。',
        [{ text: '知道了' }],
      );
    } finally {
      setBusy(false);
    }
  }

  function restore() {
    // TODO：接 IAP 的 restorePurchases，把收據重新送驗。
    // Apple 要求訂閱型 app 一定要提供「還原購買」，不提供會退件。
    Alert.alert('還原購買', '目前還沒有可以還原的訂閱。付款功能開放後，換手機或重裝 App 都可以從這裡找回訂閱。');
  }

  const open = (url: string) => Linking.openURL(url).catch(() => {
    Alert.alert('打不開連結', url);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['bottom']}>
      {/* 頂欄壓在內容上方。
          這裡**不能**用 safe-area 的 top inset：modal 本來就從狀態列底下一段距離開始，
          再加一次 inset 會在標題上方多出一條空的深色帶。 */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        backgroundColor: t.shell, paddingTop: space.sm, paddingHorizontal: space.md, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 44 }}>
          <RoundButton icon="close" size={36} bg="rgba(255,255,255,0.14)" fg="#FFFFFF"
            accessibilityLabel="關閉" onPress={() => navigation.goBack()} />
          <T variant="heading" color="#FFFFFF" style={{ flex: 1 }}>訂閱{plan.name}方案</T>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: HEADER_H + space.xl,
        paddingBottom: space.section }} showsVerticalScrollIndicator={false}>

        {/* 1. 訂閱名稱。照片橫幅：整頁都是條款和數字，沒有一張圖會像一份表單 */}
        <View style={{ height: 136, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: t.shell }}>
          <Image source={planPhoto[plan.id]} resizeMode="cover"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.shell, opacity: 0.8 }} />
          <View style={{ flex: 1, justifyContent: 'center', gap: space.md, paddingHorizontal: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Seal kanji={plan.kanji} size={54} tone={plan.id === 'pro' ? 'gold' : 'soft'} />
              <View style={{ flex: 1 }}>
                <T variant="title" style={{ fontSize: 23 }} color="#FFFFFF">{plan.name}方案</T>
                <T style={{ fontSize: 12, fontFamily: fonts.serifRegular, letterSpacing: 1, marginTop: 1 }} color="rgba(255,255,255,0.7)">
                  {plan.kana}
                </T>
              </View>
            </View>
            <T variant="small" color="rgba(255,255,255,0.82)">{plan.tagline}</T>
          </View>
        </View>

        {/* 2. 期間長度 ＋ 3. 每期價格。兩個選項並排，差價一眼看得出來 */}
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <CycleOption label="月繳" sub={`NT$${plan.monthly} / 月`} note="隨時取消"
            on={!yearly} onPress={() => setCycle('monthly')} />
          {/* 年繳的格子留著但不能點：直接拿掉的話，之後上線會像憑空多出一個選項，
              現在先讓人知道有這條路，只是還沒開 */}
          {YEARLY_AVAILABLE ? (
            <CycleOption label="年繳" sub={`NT$${plan.yearly} / 年`} note={`約每月 NT$${yearlyPerMonth(plan)}`}
              badge={`省 ${yearlySaving(plan)}%`} on={yearly} onPress={() => setCycle('yearly')} />
          ) : (
            <CycleOption label="年繳" sub="日後推出" note="先以月繳為主" on={false} disabled />
          )}
        </View>

        {/* 這個方案買到什麼 */}
        <Card tone="soft" style={{ marginTop: space.xl }}>
          <T variant="caption" color={t.faint}>這個方案包含</T>
          <View style={{ gap: 7, marginTop: space.md }}>
            {plan.perks.map(x => (
              <View key={x} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                <Ionicons name="checkmark" size={15} color={t.primary} style={{ marginTop: 3 }} />
                <T variant="small" color={t.ink} style={{ flex: 1, lineHeight: 20 }}>{x}</T>
              </View>
            ))}
          </View>
          <View style={{ marginVertical: space.md }}><Rule /></View>
          <T variant="caption" color={t.sub} style={{ lineHeight: 18 }}>
            {'課程、讀物、五十音、單字複習、排行榜本來就免費，訂閱不影響這些。'}
          </T>
        </Card>

        {/* 總計：付款當下最重要的一行，獨立出來放大 */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
          marginTop: space.xl, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: t.line }}>
          <View>
            <T variant="caption" color={t.sub}>
              {trial ? `${trial} 天後開始收費` : '立即開始'}
            </T>
            <T variant="heading" style={{ marginTop: 2 }}>每{periodLabel}扣款</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <T variant="caption" color={t.sub}>NT$</T>
            <T style={{ fontSize: 32, fontWeight: '800', letterSpacing: -1.2 }} color={t.ink}>{total}</T>
            <T variant="caption" color={t.sub}>/{periodLabel}</T>
          </View>
        </View>

        {trial ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md,
            backgroundColor: t.goldSoft, borderRadius: radius.lg, padding: space.md }}>
            <Ionicons name="gift-outline" size={18} color={t.warning} />
            <T variant="small" color={t.warning} style={{ flex: 1, lineHeight: 20 }}>
              {`前 ${trial} 天免費。試用期間隨時取消就不會收費。`}
            </T>
          </View>
        ) : null}

        {/* 金流還沒接時不留任何可以按的付款動作（見 plans.ts 的 IAP_AVAILABLE）：
            有完整的訂閱介面、按下去卻只跳一個「尚未開放」，審查會當成未完成功能退件。
            「還原購買」也一起收起來——沒有東西可買，就沒有東西可還原。 */}
        {IAP_AVAILABLE ? <>
          <Button label={busy ? '處理中' : trial ? `開始 ${trial} 天免費試用` : `訂閱 NT$${total}/${periodLabel}`}
            variant={plan.id === 'pro' ? 'gold' : 'primary'} loading={busy} disabled={busy}
            style={{ marginTop: space.xl }} onPress={purchase} />

          <Pressable accessibilityRole="button" onPress={restore} hitSlop={10}
            style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: space.md, opacity: pressed ? 0.6 : 1 })}>
            <T variant="small" color={t.primary} style={{ fontWeight: '600' }}>還原購買</T>
          </Pressable>
        </> : (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center',
            backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl }}>
            <Ionicons name="time-outline" size={18} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 20 }}>
              {'付費方案還在準備中。開放後這裡會出現訂閱按鈕，在那之前課程、讀物與每日免費 AI 額度都照常使用。'}
            </T>
          </View>
        )}

        {/* 4. 服務條款 ＋ 5. 隱私權政策。審查要求「可以點而且真的打得開」 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginTop: space.sm }}>
          <Pressable accessibilityRole="link" onPress={() => open(legalLinks.terms)} hitSlop={8}>
            <T variant="caption" color={t.sub} style={{ textDecorationLine: 'underline' }}>服務條款</T>
          </Pressable>
          <T variant="caption" color={t.faint}>·</T>
          <Pressable accessibilityRole="link" onPress={() => open(legalLinks.privacy)} hitSlop={8}>
            <T variant="caption" color={t.sub} style={{ textDecorationLine: 'underline' }}>隱私權政策</T>
          </Pressable>
        </View>

        {/* 自動續訂的揭露文字。這段是 Apple 明列要寫的，不要縮短 */}
        <T variant="caption" color={t.faint} style={{ marginTop: space.lg, lineHeight: 18 }}>
          {`訂閱會自動續訂。除非在當期結束前至少 24 小時取消，否則系統會在到期前 24 小時內以 NT$${total} 扣款。`}
        </T>
        <T variant="caption" color={t.faint} style={{ marginTop: 6, lineHeight: 18 }}>
          {'付款會在確認購買時由你的 Apple ID 帳戶收取。購買後可以在「設定 → Apple ID → 訂閱」管理或取消訂閱。'}
        </T>
        {trial ? (
          <T variant="caption" color={t.faint} style={{ marginTop: 6, lineHeight: 18 }}>
            {'如果在免費試用結束前取消，不會產生任何費用；試用期未使用完的部分在購買訂閱後即失效。'}
          </T>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** 計費週期的選項列。整列可點，不用去瞄一個小圓鈕 */
function CycleOption({ label, sub, note, badge, on, onPress, disabled }: {
  label: string; sub: string; note?: string; badge?: string; on: boolean; onPress?: () => void; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on, disabled }}
      accessibilityLabel={`${label}，${sub}`} onPress={onPress} disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: space.md,
        borderRadius: radius.lg, padding: space.lg,
        borderWidth: 2, borderColor: on ? t.primary : t.line,
        backgroundColor: on ? t.primarySoft : 'transparent',
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}>
      <Ionicons name={disabled ? 'time-outline' : on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? t.primary : t.faint} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T variant="heading">{label}</T>
          {badge ? <Pill label={badge} color="#231A08" bg={t.gold} /> : null}
        </View>
        <T variant="small" color={t.ink} style={{ marginTop: 2 }}>{sub}</T>
      </View>
      {note ? <T variant="caption" color={t.sub}>{note}</T> : null}
    </Pressable>
  );
}
