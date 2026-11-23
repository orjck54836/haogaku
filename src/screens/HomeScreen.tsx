import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Text, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen, Sheet, T, Card, IconTile, RoundButton, Pill, ProgressDots, ProgressBar,
  SectionTitle, StationSign, Rule,
} from '../ui';
import { TopBar, WineCard, BrandFooter } from '../ui/brand';
import { TopicThumb } from '../ui/seal';
import ReviewCard from '../ui/ReviewCard';
import { PlanButton } from '../ui/PlanButton';
import { photoFor, uiPhotos } from '../ui/images';
import { useTheme, space, radius, fonts, type } from '../theme';
import { useData } from '../state/data';
import { nextLesson, lessonRef, recommendedTopics, topicProgress, collectionOf, collectionMeta } from '../content/curriculum';
import { categories } from '../content/topics';
import { slang, todaySlangIndex } from '../content/slang';
import { readings, todayReadingIndex, readingLessonId, genreLabels } from '../content/readings';
import { RootStack } from '../navigation';
import { useAuth } from '../state/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BindCard from '../ui/BindCard';
import StreakCard from '../ui/StreakCard';
import YuiMessage, { useYuiInbox } from '../ui/YuiMessage';
import { YUI_SCENARIO } from '../lib/inbox';
import { consumeFirstLesson } from '../lib/firstRun';
import { isReadingLesson } from '../content/readings';

/** 「新手三步」被按掉了。存手機不存 profile：理由同 follow.ts，這是提示狀態不是學習成果 */
const STARTER_HIDDEN_KEY = 'starter-hidden-v1';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'こんばんは' : h < 11 ? 'おはよう' : h < 18 ? 'こんにちは' : 'こんばんは';
}

export default function HomeScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const d = useData();
  const { progress, profile } = d;
  const a = useAuth();
  const name = profile.nickname || a.user?.displayName || '';

  const resumeRef = progress.resume ? lessonRef(progress.resume.lessonId) : undefined;
  const next = resumeRef ?? nextLesson(progress.completed, profile.goal, profile.startLevel);
  const due = d.dueWords().length;
  const recs = recommendedTopics(profile.goal, profile.startLevel, progress.completed, 8);
  const chatTopic = recs[0];
  const w = slang[todaySlangIndex()];
  const todayRead = readings[todayReadingIndex()];
  // 讀物的排序：今日那篇排第一，其餘按原順序接在後面，已讀過的往後丟
  const readList = [todayRead, ...readings.filter(r => r.id !== todayRead.id)]
    .sort((a, b) => Number(progress.completed.includes(readingLessonId(a.id)))
      - Number(progress.completed.includes(readingLessonId(b.id))));
  /**
   * 非主題的課屬於哪一個集合。
   *
   * 以前這裡寫死成 'basics'：那時候非主題課只有五十音，所以沒出過事。
   * 多了文法和擬聲擬態語之後，寫死會讓這兩個集合的課
   * 配上五十音的照片和「基礎」兩個字。
   */
  const coll = next.topic ? undefined : collectionOf(next.lesson.id) ?? 'basics';
  const cat = next.topic ? categories.find(c => c.id === next.topic!.cat)?.title
    : coll ? collectionMeta[coll].title : '基礎';
  const tp = topicProgress(next.topic?.id ?? coll ?? 'basics', progress.completed);
  const goTab = (screen: string) => (nav as any).navigate('Tabs', { screen });
  const yui = useYuiInbox();

  const open = () => next.lesson.kind === 'ai'
    ? nav.navigate('Chat', { scenarioId: next.lesson.scenarioId!, lessonId: next.lesson.id })
    : nav.navigate('Lesson', { lessonId: next.lesson.id });

  // 剛走完新手設定：直接進第一堂課（理由見 lib/firstRun.ts）
  useEffect(() => {
    if (consumeFirstLesson()) open();
    // 只在掛載時看一次。open 每次 render 都是新的，放進依賴會變成每次 render 都檢查
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 新手三步。首頁的入口太多，新的人不知道先做哪個，所以把「留下來的人都做過的事」
   * 排成三步，做完一步打一個勾：
   * 1. 完成第一堂課——有了 XP，後面的綁定才有東西可以保存
   * 2. 收藏一個單字——單字本是讓人隔天回來的理由（有東西到期要複習）
   * 3. 訪客：綁定帳號；已登入：試一場 AI 會話
   *
   * 第 3 步訪客和登入者不同。當初是因為訪客的 AI 每天只有 1 次；提到 5 次之後
   * 仍然讓訪客先綁定——綁定是唯一保得住紀錄的事，而 AI 已經由ゆい的訊息帶進去了。
   * 舊理由留著備查：1 次的時候
   * 叫他去試一場會話，第二句就撞到「試用次數已用完」，那是反效果。
   * 三步都做完就自己消失；也可以按「先不用」收起來，不做成擋不掉的東西。
   */
  const [starterHidden, setStarterHidden] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(STARTER_HIDDEN_KEY).then(v => setStarterHidden(v === '1')).catch(() => setStarterHidden(false));
  }, []);
  const lessonsDone = progress.completed.filter(id => !isReadingLesson(id)).length;
  const starter = [
    { done: lessonsDone > 0, title: '完成第一堂課', sub: `${next.lesson.title} · 約 ${next.lesson.minutes} 分鐘`, onPress: open },
    { done: d.words.length > 0, title: '收藏一個單字', sub: '課程裡每句旁邊的書籤點一下，就會進單字本', onPress: open },
    a.isGuest
      ? { done: false, title: '綁定帳號', sub: '保存學習紀錄，換手機也找得回來', onPress: undefined }
      : { done: d.progress.chats > 0, title: '試一場 AI 會話',
          sub: chatTopic ? `推薦：${chatTopic.title}` : '和 AI 用日語聊一段',
          onPress: () => chatTopic ? nav.navigate('Chat', { scenarioId: `t-${chatTopic.id}` }) : goTab('AI') },
  ];
  const starterLeft = starter.filter(x => !x.done).length;
  const showStarter = !starterHidden && starterLeft > 0;
  const hideStarter = () => {
    setStarterHidden(true);
    AsyncStorage.setItem(STARTER_HIDDEN_KEY, '1').catch(() => {});
  };

  return (
    <Screen shell padded={false}>
      {/* 深色殼：頂列＋酒紅大卡 */}
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        {/* 左邊不放漢堡：它去的「單字複習」下面的白面板已經有一格，重複的入口只是噪音 */}
        <TopBar right={<PlanButton />} />

        {/* ゆい的訊息排在「下一站」上面：一則別人傳來的未讀訊息，比 App 推薦的下一課更讓人想點 */}
        {yui.msg ? (
          <View style={{ marginTop: space.lg }}>
            <YuiMessage msg={yui.msg} where="home" onDismiss={yui.hide}
              onOpen={() => nav.navigate('Chat', { scenarioId: YUI_SCENARIO, opener: { ja: yui.msg!.ja, zh: yui.msg!.zh } })} />
          </View>
        ) : null}

        <WineCard style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <T variant="small" color="rgba(255,255,255,0.72)">
                {greeting()}{name ? `，${name}` : ''}
              </T>
              <T variant="title" color="#FFFFFF" style={{ marginTop: 2 }} numberOfLines={1}>
                {resumeRef ? '上次的課程' : '下一站'}
              </T>
            </View>
            <RoundButton icon="arrow-forward" accessibilityLabel={resumeRef ? '繼續學習' : '開始這一課'} onPress={open} />
          </View>

          <View style={{ marginTop: space.lg }}>
            {/* 站名牌鋪這一課所屬主題的照片。五十音沒有 topic，用 basics 這個假 id 去查 */}
            <StationSign compact kana={next.group} zh={cat ?? ''} bar={next.lesson.title} barColor={t.shell}
              photo={photoFor(next.topic?.id ?? (coll ? collectionMeta[coll].photoKey : 'basics'), next.topic?.cat) ?? undefined} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.lg, marginBottom: space.md }}>
            <T variant="caption" color="rgba(255,255,255,0.72)">{next.lesson.subtitle}</T>
            <T variant="caption" color="rgba(255,255,255,0.72)">約 {next.lesson.minutes} 分鐘</T>
          </View>
          {/* 點太多會擠成一團（五十音單元有 11 堂），超過 6 站就改用進度條 */}
          {tp.total <= 6
            ? <ProgressDots total={tp.total} done={tp.done} icon="walk" />
            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={tp.done / tp.total} color="#FFFFFF" track="rgba(255,255,255,0.28)" />
                </View>
                <T variant="caption" color="rgba(255,255,255,0.8)">{tp.done}/{tp.total}</T>
              </View>}
        </WineCard>
      </View>

      {/* 白色面板，大圓角往上疊住酒紅卡 */}
      <Sheet>
        {/* 新手三步排在白面板最上面：它是新的人唯一該看的東西，放在推薦下面會被當成又一個區塊。
            出現時取代「今日計畫」：兩張都在叫你「完成一堂課」，並排只會讓人以為是兩件事 */}
        {/* SectionTitle 自帶區塊間距，放在面板頂端會多出一大段空白，用負邊距抵掉 */}
        {showStarter ? <View style={{ marginTop: -space.section, marginBottom: space.lg }}>
          <SectionTitle title={`新手三步 · 還剩 ${starterLeft} 步`} ja="はじめの一歩" action="先不用" onAction={hideStarter} />
          <Card tone="soft" style={{ paddingVertical: space.sm }}>
            {starter.map((x, i) => (
              <View key={x.title}>
                {i > 0 ? <Rule /> : null}
                <PlanRow n={String(i + 1)} title={x.title} sub={x.sub} done={x.done}
                  onPress={x.done ? undefined : x.onPress} />
              </View>
            ))}
          </Card>
          {/* 綁定那一步直接給按鈕，不導去「我的」：多一頁就多一層流失。
              等第一堂課完成才出現——還沒有 XP 的時候叫人保存紀錄，他沒有東西可以保存 */}
          {a.isGuest && lessonsDone > 0 ? <BindCard placement="home" style={{ marginTop: space.md }} /> : null}
        </View> : null}
        {/* 連續學習和簽到排在圖示磚上面：它是「明天為什麼要回來」的答案，要在第一屏 */}
        <View style={{ marginBottom: space.lg }}>
          <StreakCard />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          {/* 習字紙是淺色的，遮罩要比另外兩張重，不然白字浮不出來 */}
          <IconTile kanji="音" label="五十音" photo={photoFor('basics') ?? undefined} photoScrim={0.56}
            onPress={() => nav.navigate('Topic', { topicId: 'basics' })} />
          <IconTile kanji="話" label="AI 教練" photo={uiPhotos.coach} onPress={() => goTab('AI')} />
          <IconTile kanji="覚" label={due ? `複習 ${due}` : '複習'} photo={uiPhotos.review}
            onPress={() => nav.navigate('Review')} />
        </View>

        <SectionTitle title="為你推薦" ja="おすすめ" action="所有主題" onAction={() => goTab('Course')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }}
          contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md, paddingVertical: 4 }}>
          {recs.map(r => {
            const p = topicProgress(r.id, progress.completed);
            return (
              <Card key={r.id} onPress={() => nav.navigate('Topic', { topicId: r.id })} accessibilityLabel={r.title}
                style={{ width: 176 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TopicThumb topicId={r.id} title={r.title} cat={r.cat} size={44} />
                  <Pill label={p.done ? `${p.done}/${p.total}` : '未開始'} color={p.done ? t.primary : t.sub} />
                </View>
                <T variant="heading" style={{ marginTop: space.md }} numberOfLines={1}>{r.title}</T>
                <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>{r.focus}</T>
              </Card>
            );
          })}
        </ScrollView>

        {showStarter ? null : <>
        <SectionTitle title="今日計畫" ja="きょうの予定" />
        <Card tone="soft" style={{ paddingVertical: space.sm }}>
          {/* 課名本身常常已經含單元名（平假名：あ行），再接一次會變「平假名・平假名：…」 */}
          <PlanRow n="1" title="完成一堂課"
            sub={next.lesson.title.startsWith(next.group) ? next.lesson.title : `${next.group}・${next.lesson.title}`}
            onPress={open} />
          <Rule />
          <PlanRow n="2" title={due ? `複習 ${due} 個單字` : '單字都複習完了'}
            sub={due ? '間隔複習，記得更久' : '收藏新單字會出現在這裡'}
            onPress={due ? () => nav.navigate('Review') : undefined} done={!due} />
          {chatTopic ? <>
            <Rule />
            <PlanRow n="3" title="AI 實戰會話" sub={`推薦：${chatTopic.title}`}
              onPress={() => nav.navigate('Chat', { scenarioId: `t-${chatTopic.id}` })} />
          </> : null}
        </Card>
        </>}

        {/* 讀物。課程是一句一句練，讀物是一次讀一段——
            放在流行語前面，因為它需要的時間比較長，該在使用者還有耐心的位置 */}
        {/* 夾在兩段內容中間：頁尾會被整個滑過去（方案入口和排行榜都踩過） */}
        <ReviewCard placement="list" style={{ marginTop: space.section }} />

        <SectionTitle title="日文小品" ja="よみもの" action={`全部 ${readings.length} 篇`}
          onAction={() => goTab('Readings')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }}
          contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md, paddingVertical: 4 }}>
          {readList.slice(0, 6).map(r => {
            const read = progress.completed.includes(readingLessonId(r.id));
            const photo = photoFor(r.photo);
            return (
              <Card key={r.id} onPress={() => nav.navigate('Reading', { readingId: r.id })}
                accessibilityLabel={r.titleZh} style={{ width: 208, padding: space.sm }}>
                <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden',
                  justifyContent: 'flex-end', backgroundColor: t.shell }}>
                  {photo ? <>
                    <Image source={photo} resizeMode="cover"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,16,18,0.44)' }} />
                  </> : null}
                  <View style={{ position: 'absolute', top: space.sm, left: space.sm, flexDirection: 'row', gap: 4 }}>
                    {r.id === todayRead.id ? <Pill icon="today" label="今日" color="#231A08" bg={t.gold} /> : null}
                    {read ? <Pill icon="checkmark" label="讀過" color="#FFFFFF" bg="rgba(31,122,76,0.92)" /> : null}
                  </View>
                  <View style={{ padding: space.md }}>
                    {/* 和讀物列表同一個理由：長標題縮字級，不要截成「…」 */}
                    <Text style={{ fontSize: 18, fontFamily: fonts.serif, color: '#FFFFFF' }}
                      numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{r.title}</Text>
                  </View>
                </View>
                <View style={{ paddingHorizontal: space.xs, paddingTop: space.md, paddingBottom: space.xs }}>
                  <T variant="heading" numberOfLines={1}>{r.titleZh}</T>
                  <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>{r.hook}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
                    <Pill label={genreLabels[r.genre]} color={t.primary} bg={t.primarySoft} />
                    <T variant="caption" color={t.faint}>{r.minutes} 分鐘</T>
                  </View>
                </View>
              </Card>
            );
          })}
        </ScrollView>

        {/* 流行語一共 100 個、每天換一個。標題講總量，「今日」掛在卡片上，
            這樣點進去看到全部的數量才不會覺得跟標題對不起來 */}
        <SectionTitle title="流行語" ja="はやりことば" action={`全部 ${slang.length} 個`} onAction={() => nav.navigate('Slang')} />
        <Card onPress={() => nav.navigate('Slang')} accessibilityLabel={`今日的流行語 ${w.word}`} raised>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              {/* Pill 要包一層 row，不然在直向容器裡會被拉成整行寬 */}
              <View style={{ flexDirection: 'row' }}>
                <Pill icon="today" label="今日" color={t.primary} bg={t.primarySoft} />
              </View>
              <T style={{ fontSize: 30, fontFamily: fonts.serifRegular, color: t.heading, lineHeight: 40, marginTop: space.sm }}>{w.word}</T>
              {w.kana ? <T style={{ fontSize: 15, fontFamily: fonts.serifRegular }} color={t.primary}>{w.kana}</T> : null}
              <T variant="caption" color={t.faint}>{w.reading}</T>
            </View>
            <RoundButton icon="arrow-forward" size={40} bg={t.surface2} onPress={() => nav.navigate('Slang')} accessibilityLabel="看更多流行語" />
          </View>
          <T variant="body" color={t.ink} style={{ marginTop: space.md, fontWeight: '600' }}>{w.meaning}</T>
          <View style={{ backgroundColor: t.surface2, borderRadius: radius.sm, padding: space.md, marginTop: space.md }}>
            <T style={{ fontFamily: fonts.serifRegular, fontSize: 15, color: t.ink }}>{w.example}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 3 }}>{w.exampleZh}</T>
          </View>
        </Card>

        <BrandFooter />
      </Sheet>
    </Screen>
  );
}

/** 今日計畫的一列 */
function PlanRow({ n, title, sub, onPress, done }: { n: string; title: string; sub: string; onPress?: () => void; done?: boolean }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={!onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: pressed ? 0.65 : 1 })}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: done ? t.successSoft : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        {done ? <Ionicons name="checkmark" size={16} color={t.success} />
          : <Text style={{ fontSize: 13, fontWeight: '700', color: t.sub }}>{n}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <T variant="heading" color={t.ink} numberOfLines={1}>{title}</T>
        <T variant="caption" color={t.sub} numberOfLines={1} style={{ marginTop: 1 }}>{sub}</T>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={17} color={t.faint} /> : null}
    </Pressable>
  );
}

