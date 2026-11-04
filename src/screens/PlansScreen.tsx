import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Sheet, T, Card, Button, Pill, Segmented, SectionTitle, Rule } from '../ui';
import { Seal } from '../ui/seal';
import { TopBar, WineCard } from '../ui/brand';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { plans, paidPlans, planById, freeForever, yearlySaving, yearlyPerMonth, Plan, PlanId } from '../content/plans';
import { StackProps } from '../navigation';

type Cycle = 'monthly' | 'yearly';

/**
 * 方案與付費。
 *
 * 版面上最重要的決定：**先講免費包含什麼，再講付費**。
 * 大部分 app 的付費頁把免費功能藏起來製造焦慮，但這個 app 的賣點
 * 本來就是「課程全部免費」——藏起來等於把自己最強的一點丟掉，
 * 而且使用者發現之後只會覺得被設計。
 *
 * 付費買的只有 AI 次數和語音次數，所以兩個方案的差別就用數字講清楚，
 * 不要用「進階功能」這種看不懂的詞。
 */
export default function PlansScreen({ navigation }: StackProps<'Plans'>) {
  const t = useTheme();
  const d = useData();
  const [cycle, setCycle] = useState<Cycle>('yearly');
  const current = planById(d.profile.plan);

  // 這一頁只回答「我該買哪個」。付款條件（扣多少、什麼時候扣、怎麼取消）
  // 交給購買頁去講——擠在比較表裡會把它們壓掉，而那正是審查在看的東西。
  // 目前選的週期一起帶過去，使用者不用到了購買頁再選一次。
  const subscribe = (p: Plan) => navigation.navigate('Purchase', { planId: p.id, cycle });

  return (
    <Screen shell padded={false}>
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        <TopBar left={
          <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} hitSlop={12}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>} />

        <WineCard style={{ marginTop: space.lg }}>
          <T variant="small" color="rgba(255,255,255,0.72)">りょうきん</T>
          <T variant="title" color="#FFFFFF" style={{ marginTop: 2 }}>課程永遠免費</T>
          {/* JSX 裡的換行會被當成一個半形空格，接在全形句號後面會留下一個缺口，
              所以一句話一個 T，不要靠原始碼換行排版 */}
          <T variant="small" color="rgba(255,255,255,0.82)" style={{ marginTop: space.md, lineHeight: 21 }}>
            83 個主題、249 堂課、11 篇讀物、五十音、單字複習、排行榜——全部不用付錢。
          </T>
          <T variant="small" color="rgba(255,255,255,0.82)" style={{ marginTop: 4, lineHeight: 21 }}>
            付費買的只有一樣東西：AI 和語音的每日用量。
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
            <Pill icon="checkmark-circle" label={`目前：${current.name}方案`} color="#FFFFFF" bg="rgba(255,255,255,0.16)" />
          </View>
        </WineCard>
      </View>

      <Sheet>
        {/* 先把免費的攤開。付費頁藏免費功能是常見做法，但這個 app 不需要 */}
        <T variant="heading" style={{ fontSize: 19 }}>免費就有的</T>
        <T variant="caption" color={t.sub} style={{ marginTop: 2, marginBottom: space.lg }}>
          不用付錢，也不會過期
        </T>
        <View style={{ gap: space.sm }}>
          {freeForever.map(f => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.successSoft,
                alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={16} color={t.success} />
              </View>
              <T variant="body" color={t.ink} style={{ flex: 1 }}>{f.label}</T>
            </View>
          ))}
        </View>

        <SectionTitle title="AI 用量方案" ja="プラン"
          right={<T variant="caption" color={t.faint}>可隨時取消</T>} />

        <Segmented<Cycle> value={cycle} onChange={setCycle} options={[
          { value: 'monthly', label: '月繳' },
          { value: 'yearly', label: `年繳省 ${yearlySaving(paidPlans[0])}%` },
        ]} />

        <View style={{ gap: space.lg, marginTop: space.xl }}>
          {plans.map(p => (
            <PlanCard key={p.id} plan={p} cycle={cycle} current={p.id === d.profile.plan}
              onPress={p.monthly ? () => subscribe(p) : undefined} />
          ))}
        </View>

        {/* 額度的單位要講清楚，不然「60 次」看不出是多少 */}
        <View style={{ backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl, gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Ionicons name="information-circle-outline" size={18} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 21 }}>
              {'AI 次數：每一則 AI 回覆、每一份會話分析、每一次句子健檢各算一次。一場完整的情境會話大約用掉 10〜15 次。'}
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Ionicons name="volume-high-outline" size={18} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 21 }}>
              語音次數：播過一次的句子會存在手機裡，重複播放不計次。
            </T>
          </View>
        </View>

        <T variant="caption" color={t.faint} style={{ marginTop: space.lg, lineHeight: 18 }}>
          {'訂閱會透過 App Store 收費，可以在「設定 → Apple ID → 訂閱」隨時取消。取消後仍可使用到該期結束，課程與讀物不受影響。'}
        </T>
      </Sheet>
    </Screen>
  );
}

function PlanCard({ plan, cycle, current, onPress }: {
  plan: Plan; cycle: Cycle; current: boolean; onPress?: () => void;
}) {
  const t = useTheme();
  const free = plan.monthly === 0;
  const yearly = cycle === 'yearly' && plan.yearly > 0;
  // 年繳顯示「每月多少」才比得出來，總價放小字在下面
  const price = free ? 0 : yearly ? yearlyPerMonth(plan) : plan.monthly;
  // 「無限」是最貴的那階，給它金色邊框當視覺重心
  const featured = plan.id === 'pro';

  return (
    <Card tone="soft" style={{
      borderWidth: featured ? 2 : 0, borderColor: featured ? t.gold : 'transparent',
      ...(current ? { borderWidth: 2, borderColor: t.primary } : null),
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Seal kanji={plan.kanji} size={46} tone={featured ? 'gold' : free ? 'soft' : 'wine'} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T variant="heading" style={{ fontSize: 18 }}>{plan.name}</T>
            {current ? <Pill label="使用中" color={t.primary} bg="#FFFFFF" /> : null}
          </View>
          <T style={{ fontSize: 11, fontFamily: fonts.serifRegular, letterSpacing: 1, marginTop: 1 }} color={t.faint}>
            {plan.kana}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {free ? (
            <T style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6 }} color={t.ink}>免費</T>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <T variant="caption" color={t.sub}>NT$</T>
                <T style={{ fontSize: 26, fontWeight: '800', letterSpacing: -1 }} color={t.ink}>{price}</T>
                <T variant="caption" color={t.sub}>/月</T>
              </View>
              {yearly ? <T variant="caption" color={t.faint}>年繳 NT${plan.yearly}</T> : null}
            </>
          )}
        </View>
      </View>

      <T variant="small" color={t.sub} style={{ marginTop: space.md }}>{plan.tagline}</T>

      <View style={{ marginVertical: space.lg }}><Rule /></View>

      <View style={{ gap: 7 }}>
        {plan.perks.map(x => (
          <View key={x} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
            <Ionicons name="checkmark" size={15} color={free ? t.sub : t.primary} style={{ marginTop: 3 }} />
            <T variant="small" color={t.ink} style={{ flex: 1, lineHeight: 20 }}>{x}</T>
          </View>
        ))}
      </View>

      {onPress ? (
        <Button label={`選擇${plan.name}`} variant={featured ? 'gold' : 'primary'} size="md"
          style={{ marginTop: space.lg }} onPress={onPress} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: space.lg }}>
          <Ionicons name="checkmark-circle" size={15} color={t.success} />
          <T variant="caption" color={t.success} style={{ fontWeight: '700' }}>不用做任何事，已經是你的</T>
        </View>
      )}
    </Card>
  );
}
