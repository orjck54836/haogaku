import { useEffect, useState } from 'react';
import { View, Pressable, Alert, Linking, Image, ActivityIndicator } from 'react-native';
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
import { iapSupported, fetchPrices, purchaseSubscription, restoreSubscription, recoverPurchase, VerifyFailed } from '../lib/iap';
import { useAuth } from '../state/auth';
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
 * ## 金流
 *
 * 購買走 `src/lib/iap.ts`（expo-iap／StoreKit 2），拿到 transactionId 之後送到
 * Cloud Functions 的 `verifyPurchase`，**由後端跟 Apple 查證後寫 entitlements/{uid}**。
 * 這裡絕對不要把 `setProfile({ plan })` 當成「買到了」——profile.plan 存在手機上，
 * 前端說了不算，它只是驗證成功之後順手更新的顯示值。
 *
 * 目前只賣月繳（見 plans.ts 的 YEARLY_AVAILABLE）。
 *
 * 價格以 App Store 回的 displayPrice 為準，問不到才退回 plans.ts 的數字：
 * 別的國家看到的是當地幣別和當地定價，寫死 NT$ 會變成價格標示不實。
 */
export default function PurchaseScreen({ route, navigation }: StackProps<'Purchase'>) {
  const t = useTheme();
  const d = useData();
  const a = useAuth();
  const plan = planById(route.params.planId);
  // 年繳還沒開放（見 plans.ts 的 YEARLY_AVAILABLE），只能是月繳
  const [cycle, setCycle] = useState<Cycle>(YEARLY_AVAILABLE ? (route.params.cycle ?? 'monthly') : 'monthly');
  const [busy, setBusy] = useState(false);
  /**
   * 商店回的售價，和這台手機到底買不買得到。
   *
   * **在 effect 裡問一次存進 state**，不要寫在 render 的判斷式裡：
   * iap.ts 要載原生模組，在 render 裡丟錯是整頁白掉（見 CLAUDE.md）。
   * null 代表還在問，'' 代表問不到（Expo Go、離線、或商品還沒在 ASC 建好）。
   */
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const [canBuy, setCanBuy] = useState<boolean | null>(null);

  /**
   * 已經在用這個方案：按鈕要鎖住，不是讓他按了被 StoreKit 擋。
   *
   * **用後端的 entitlement，不要用 `profile.plan`。** 同一個訂閱群組裡降級是排程的：
   * 按下標準版之後這一期結束前 Apple 仍然認為他是高級版，兩個值會不一樣，
   * 拿本機那個去判斷就會放他按下去，然後被 StoreKit 回「你已經訂閱這個項目」。
   */
  const owned = d.entitlement.plan === plan.id && plan.monthly > 0;
  /**
   * 已經排好、還沒生效的方案變更。
   *
   * 降級（高級→標準）和取消都只會改 `nextPlan`，`plan` 要到這一期結束才跟著變。
   * 這件事一定要寫在畫面上：使用者記得自己按過標準版，畫面卻一直說他是高級版，
   * 再按一次高級版還會被擋——不解釋的話就是「這個 App 壞了」。
   */
  const ent = d.entitlement;
  const pending = ent.plan !== 'free' && ent.nextPlan !== ent.plan ? ent.nextPlan : null;
  const pendingDate = ent.expiresAt ? new Date(ent.expiresAt).toLocaleDateString('zh-TW') : '';
  const yearly = YEARLY_AVAILABLE && cycle === 'yearly';
  const total = yearly ? plan.yearly : plan.monthly;
  const periodLabel = yearly ? '年' : '月';
  const trial = plan.trialDays ?? 0;
  const sku = plan.productId?.[yearly ? 'yearly' : 'monthly'];
  /** 畫面上的價格一律用這個：商店問得到就用商店的，問不到才退回我們寫死的 */
  const priceText = storePrice || `NT$${total}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!IAP_AVAILABLE || !sku || !iapSupported()) {
        if (alive) { setCanBuy(false); setStorePrice(''); }
        return;
      }
      try {
        const prices = await fetchPrices([sku]);
        if (!alive) return;
        const hit = prices.find(x => x.productId === sku);
        // 商品還沒在 App Store Connect 建好時會查無此商品，這時不該讓人按下去
        setStorePrice(hit?.price ?? '');
        setCanBuy(!!hit);
      } catch {
        if (alive) { setStorePrice(''); setCanBuy(false); }
      }
    })();
    return () => { alive = false; };
  }, [sku]);

  /**
   * 開通成功之後的收尾。
   *
   * `setProfile` 只是先把畫面跟上，**再 `refreshPlan()` 重讀一次 entitlements**：
   * 權威在後端，而且這樣才蓋得掉「本地顯示值和後端不一致」的情況——
   * 之前只做 setProfile，一旦那一步沒跑到（例如走了錯誤分支），
   * 首頁右上角就會一直停在免費版，重開 App 才會好。
   */
  async function done(nextPlan: PlanId) {
    d.setProfile({ plan: nextPlan });
    track('purchase_done', { plan: nextPlan, cycle });
    await d.refreshPlan();
    // 升級當下後端會把今天用掉的 AI 次數歸零（resetQuotaOnUpgrade），
    // 不重讀一次的話右上角那顆鈕會停在免費版剩下的數字
    await d.refreshQuota();
    Alert.alert('訂閱完成', `${planById(nextPlan).name}已經開通，AI 和語音額度立刻生效。`,
      [{ text: '開始用', onPress: () => navigation.goBack() }]);
  }

  async function purchase() {
    if (!sku || owned) return;
    // 訪客帳號換一台手機就沒了，訂閱綁在上面等於買了會不見。後端也會再擋一次
    if (a.isGuest) {
      Alert.alert('請先綁定帳號',
        '訂閱會綁在你的帳號上。先用 Apple 或 Google 綁定，換手機或重裝才找得回來。',
        [{ text: '知道了' }]);
      return;
    }
    setBusy(true);
    // 漏斗的最後一步：這裡和實際成交的差距就是流失
    track('purchase_tap', { plan: plan.id, cycle, price: total });
    try {
      const res = await purchaseSubscription(sku);
      if (!res.active) throw new Error('verify-inactive');
      await done(res.plan);
    } catch (e: any) {
      // 在 Apple 的付款表單上按取消不是錯誤，不要跳視窗罵他
      const code = String(e?.code ?? e?.message ?? '');
      if (/cancel/i.test(code)) return;
      /**
       * 等核准不是失敗。
       *
       * Ask to Buy（兒童帳號）和銀行二次驗證會讓交易停在 pending：表單關了、
       * 錢還沒扣、訂閱還沒生效。原本會落到下面那句「沒有扣款」——對一個
       * 正在等家長按同意的人，那句話會讓他以為要重買一次，於是排出第二筆交易。
       */
      /**
       * StoreKit 說「你已經訂閱這個項目」。
       *
       * 多半是排程中的降級還沒生效：他按過標準版，但這一期還是高級版，
       * 所以再買高級版會被擋。這不是失敗，而且**他要的東西已經在手上了**——
       * 重讀一次資格再把實際狀況講給他聽，不要丟一句「購買沒有完成」。
       */
      if (/already[-\s]?owned|already.*subscri/i.test(code)) {
        const now = await d.refreshPlan();
        Alert.alert('你已經有這個訂閱了',
          `這組 Apple ID 目前是${planById(now).name}。如果你剛改過方案，變更會在這一期結束後生效，不用重新購買。`,
          [{ text: '知道了', onPress: () => navigation.goBack() }]);
        return;
      }
      if (/pending|deferred/i.test(code)) {
        Alert.alert('等待核准',
          '這筆訂閱需要核准（例如家長同意或銀行驗證）。核准完成後方案會自動開通，不用重新購買。',
          [{ text: '知道了' }]);
        return;
      }
      console.warn('purchase failed', e);
      /**
       * 失敗不代表沒成交。
       *
       * 監聽逾時、驗證時斷線、交易被延後——這幾種情況 Apple 那邊都可能已經扣了款。
       * 先問一次 StoreKit 名下有沒有有效訂閱，有就當成買到了，
       * 不然使用者會看到 Apple 說成功、我們說失敗，而且方案標記一直是免費版。
       */
      const saved = await recoverPurchase();
      if (saved?.active) {
        await done(saved.plan);
        return;
      }
      /**
       * 驗證那一步失敗 ≠ 沒有扣款。
       *
       * Apple 的付款已經完成、交易也還留在佇列裡（沒驗過就不會 finishTransaction），
       * 卡住的是我們跟 Apple 查證那一段。這時候說「沒有扣款」是錯的，
       * 而且會讓他再買一次——實際踩過的是後端的 App Store 金鑰被回 401。
       * 交易留著，之後冷啟動或按「還原購買」會自動補驗，不用重買。
       */
      if (e instanceof VerifyFailed) {
        Alert.alert('付款完成了，但還沒開通',
          '你的付款已經送出，是我們這邊確認訂閱時出了問題。不要重複購買——修好之後重開 App 或按「還原購買」就會自動開通。',
          [{ text: '知道了' }]);
        return;
      }
      Alert.alert('購買沒有完成',
        '沒有扣款。如果你確定已經付過，請按「還原購買」，或稍後再試一次。',
        [{ text: '知道了' }]);
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    try {
      const res = await restoreSubscription();
      if (res) {
        d.setProfile({ plan: res.plan });
        await d.refreshPlan();
        await d.refreshQuota();
        Alert.alert('已還原', `找回了${planById(res.plan).name}。`,
          [{ text: '好', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('沒有可以還原的訂閱',
          '這組 Apple ID 名下沒有有效的訂閱。如果你用的是另一組 Apple ID，請先到「設定」切換。');
      }
    } catch (e) {
      console.warn('restore failed', e);
      Alert.alert('還原失敗', e instanceof VerifyFailed
        ? '找得到你的訂閱，但確認的時候出了問題。稍後再試一次，或聯絡我們。'
        : '請確認網路之後再試一次。');
    } finally {
      setBusy(false);
    }
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
          <T variant="heading" color="#FFFFFF" style={{ flex: 1 }}>訂閱{plan.name}</T>
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
              <View style={{ flex: 1 }}>
                <T variant="title" style={{ fontSize: 23 }} color="#FFFFFF">{plan.name}</T>
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
          <CycleOption label="月繳" sub={`${priceText} / 月`} note="隨時取消"
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
          <T variant="caption" color={t.faint}>方案包含</T>
          <View style={{ gap: 7, marginTop: space.md }}>
            {plan.perks.map(x => (
              <View key={x} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                <Ionicons name="checkmark" size={15} color={t.primary} style={{ marginTop: 3 }} />
                <T variant="small" color={t.ink} style={{ flex: 1, lineHeight: 20 }}>{x}</T>
              </View>
            ))}
          </View>
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
            {/* displayPrice 本身就含幣別（NT$150、US$4.99、¥700），
                不要再自己在前面拼一個 NT$ */}
            <T style={{ fontSize: 32, fontWeight: '800', letterSpacing: -1.2 }} color={t.ink}>{priceText}</T>
            <T variant="caption" color={t.sub}>/{periodLabel}</T>
          </View>
        </View>

        {trial ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md,
            backgroundColor: t.goldSoft, borderRadius: radius.lg, padding: space.md }}>
            <Ionicons size={18} color={t.warning} />
            <T variant="small" color={t.warning} style={{ flex: 1, lineHeight: 20 }}>
              {`前 ${trial} 天免費。試用期間可隨時取消。`}
            </T>
          </View>
        ) : null}

        {/*
          付款動作只在「真的買得到」的時候出現。

          買不到的情況有三種，但對使用者來說只有一句話的差別，所以共用一個說明框：
            - Expo Go（沒有 ExpoIap 原生模組）
            - 商品還沒在 App Store Connect 建好，或還在審核中
            - 離線

          **不要在買不到的時候留一顆按得下去的訂閱鈕。** 有完整的訂閱介面、
          按下去卻跳一個錯誤，審查會當成未完成的功能退件（Guideline 2.1）。
          「還原購買」跟著一起收起來——沒有東西可買就沒有東西可還原。
        */}
        {/* 排程中的變更：講清楚現在是什麼、什麼時候換、以及「再按一次沒有用」 */}
        {pending ? (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start',
            backgroundColor: t.goldSoft, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl }}>
            <Ionicons name="time-outline" size={18} color={t.warning} style={{ marginTop: 1 }} />
            <T variant="small" color={t.warning} style={{ flex: 1, lineHeight: 20 }}>
              {pending === 'free'
                ? `已經取消自動續訂。${planById(ent.plan).name}可以用到 ${pendingDate}。`
                : `已經排定改成${planById(pending).name}，${pendingDate} 生效。在那之前你還是${planById(ent.plan).name}，不用重新購買。`}
            </T>
          </View>
        ) : null}

        {owned ? (
          /* 從別處（例如還原購買完）繞回這一頁時，方案可能已經是這個了。
             再讓他按下去只會被 StoreKit 當重複訂閱擋掉 */
          <Button label={pending && pending !== ent.plan ? '使用中（已排定變更）' : '使用中'}
            variant="secondary" size="lg" disabled onPress={() => {}} />
        ) : canBuy === null ? (
          <View style={{ alignItems: 'center', paddingVertical: space.xl, marginTop: space.md }}>
            <ActivityIndicator color={t.primary} />
          </View>
        ) : canBuy ? <>
          <Button label={busy ? '處理中' : trial ? `開始 ${trial} 天免費試用` : `訂閱 ${priceText}/${periodLabel}`}
            variant={plan.id === 'pro' ? 'gold' : 'primary'} loading={busy} disabled={busy}
            style={{ marginTop: space.xl }} onPress={purchase} />

          <Pressable accessibilityRole="button" onPress={busy ? undefined : restore} hitSlop={10}
            style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: space.md, opacity: pressed ? 0.6 : 1 })}>
            <T variant="small" color={t.primary} style={{ fontWeight: '600' }}>還原購買</T>
          </Pressable>
        </> : (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center',
            backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl }}>
            <Ionicons name="time-outline" size={18} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 20 }}>
              {'這個版本暫時無法購買。課程、讀物與每日免費 AI 額度都照常使用，稍後再回來看看。'}
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
          {`訂閱會自動續訂。除非在當期結束前至少 24 小時取消，否則系統會在到期前 24 小時內以 ${priceText} 扣款。`}
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
