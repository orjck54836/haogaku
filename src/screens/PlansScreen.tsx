import { useEffect } from 'react';
import { View, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Sheet, T, Card, Button, Pill, SectionTitle, Rule } from '../ui';
import { track } from '../lib/analytics';
import { TopBar, WineCard } from '../ui/brand';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { plans, planById, freeForever, YEARLY_AVAILABLE, IAP_AVAILABLE, Plan, PlanId } from '../content/plans';
import { topicPhotos } from '../ui/images';
import { StackProps } from '../navigation';

/**
 * 每個方案一張照片。
 * 三張淺灰卡疊在一起全是字，分不出哪個是哪個；照片一鋪，
 * 免費／標準／無限在捲動時各自有一個記得住的樣子。
 */
const planPhoto: Record<PlanId, number> = {
  free: topicPhotos.hanami!, plus: topicPhotos.shinkansen!, pro: topicPhotos.matsuri!,
};

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
  // 付費漏斗的第一步：有多少人真的走到方案頁
  useEffect(() => { track('plans_view'); }, []);

  const t = useTheme();
  const d = useData();
  const current = planById(d.profile.plan);

  // 這一頁只回答「我該買哪個」。付款條件（扣多少、什麼時候扣、怎麼取消）
  // 交給購買頁去講——擠在比較表裡會把它們壓掉，而那正是審查在看的東西。
  // 年繳還沒開（見 plans.ts 的 YEARLY_AVAILABLE），一律帶月繳過去。
  const subscribe = (p: Plan) => navigation.navigate('Purchase', { planId: p.id, cycle: 'monthly' });

  return (
    <Screen shell padded={false}>
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        <TopBar left={
          <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} hitSlop={12}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>} />

        <WineCard clip style={{ marginTop: space.lg }}>
          {/* 底圖只當質感，上面壓單層平光遮罩（不疊多層假漸層，實機上會看到灰帶） */}
          <Image source={topicPhotos.sightseeing!} resizeMode="cover"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.primary, opacity: 0.86 }} />
          <T variant="small" color="rgba(255,255,255,0.72)">りょうきん</T>
          <T variant="title" color="#FFFFFF" style={{ marginTop: 2 }}>課程永遠免費</T>
          {/* JSX 裡的換行會被當成一個半形空格，接在全形句號後面會留下一個缺口，
              所以一句話一個 T，不要靠原始碼換行排版 */}
          <T variant="small" color="rgba(255,255,255,0.82)" style={{ marginTop: space.md, lineHeight: 21 }}>
            83 個主題、249 堂課、30 篇讀物、五十音、單字複習、排行榜——全部不用付錢。
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

        {/* 還沒接金流時先把話講在前面：先讓人看完方案再按到不能點的鈕，是最差的順序 */}
        {!IAP_AVAILABLE ? (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center',
            backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.md }}>
            <Ionicons name="time-outline" size={17} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 20 }}>
              {'付費方案還在準備中，目前所有人都是免費方案。下面是開放後的內容。'}
            </T>
          </View>
        ) : null}

        {!YEARLY_AVAILABLE && IAP_AVAILABLE ? (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center',
            backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.md }}>
            <Ionicons name="calendar-outline" size={17} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 20 }}>{'目前只開放月繳，年繳日後推出。'}</T>
          </View>
        ) : null}

        <View style={{ gap: space.lg, marginTop: space.xl }}>
          {plans.map(p => (
            <PlanCard key={p.id} plan={p} current={p.id === d.profile.plan}
              onPress={p.monthly && IAP_AVAILABLE ? () => subscribe(p) : undefined} />
          ))}
        </View>

        {/* 額度的單位要講清楚，不然「60 次」看不出是多少 */}
        <View style={{ backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl, gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Ionicons name="information-circle-outline" size={18} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 21 }}>
              {'AI 次數：每一則 AI 回覆、每一份會話分析各算一次。一場完整的情境會話大約用掉 10〜15 次。'}
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Ionicons name="volume-high-outline" size={18} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 21 }}>
              {'語音用字數計算（一句日文約 30 字）。播過的句子會存在手機裡，重複播放不計。'}
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Ionicons name="phone-portrait-outline" size={18} color={t.sub} />
            <T variant="small" color={t.sub} style={{ flex: 1, lineHeight: 21 }}>
              {'字數用完不會不能聽——會自動改用手機內建的日文語音，只是沒有雲端音色自然。'}
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

function PlanCard({ plan, current, onPress }: {
  plan: Plan; current: boolean; onPress?: () => void;
}) {
  const t = useTheme();
  const free = plan.monthly === 0;
  // 「無限」是最貴的那階，給它金色邊框當視覺重心
  const featured = plan.id === 'pro';

  return (
    <Card tone="soft" style={{
      padding: 0, overflow: 'hidden',
      borderWidth: featured ? 2 : 0, borderColor: featured ? t.gold : 'transparent',
      ...(current ? { borderWidth: 2, borderColor: t.primary } : null),
    }}>
      {/* 照片橫幅：名稱和價錢直接疊在照片上。
          不放漢字章——「免／標／無」單字看不出意思，和旁邊寫全名的標題打對台。
          照片一定要給 width/height，只下四邊 inset 會照圖片內建尺寸放大成局部特寫 */}
      <View style={{ height: 112, backgroundColor: t.shell }}>
        <Image source={planPhoto[plan.id]} resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: t.shell, opacity: free ? 0.72 : 0.8 }} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T variant="heading" style={{ fontSize: 18 }} color="#FFFFFF">{plan.name}</T>
              {current ? <Pill label="使用中" color="#FFFFFF" bg="rgba(255,255,255,0.22)" /> : null}
            </View>
            <T style={{ fontSize: 11, fontFamily: fonts.serifRegular, letterSpacing: 1, marginTop: 1 }} color="rgba(255,255,255,0.7)">
              {plan.kana}
            </T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {free ? (
              <T style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6 }} color="#FFFFFF">免費</T>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <T variant="caption" color="rgba(255,255,255,0.75)">NT$</T>
                <T style={{ fontSize: 26, fontWeight: '800', letterSpacing: -1 }} color="#FFFFFF">{plan.monthly}</T>
                <T variant="caption" color="rgba(255,255,255,0.75)">/月</T>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ padding: space.lg }}>
      <T variant="small" color={t.sub}>{plan.tagline}</T>

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
      ) : plan.monthly ? (
        <Button label="日後推出" variant="secondary" size="md" disabled
          style={{ marginTop: space.lg }} onPress={() => {}} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: space.lg }}>
          <Ionicons name="checkmark-circle" size={15} color={t.success} />
          <T variant="caption" color={t.success} style={{ fontWeight: '700' }}>不用做任何事，已經是你的</T>
        </View>
      )}
      </View>
    </Card>
  );
}
