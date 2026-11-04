import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T, Pill } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { scenarioById } from '../content/scenarios';
import { aiChat, aiReport, ChatMsg, ChatReply } from '../lib/ai';
import { speakJa, stopSpeech, cacheAudio, getSpeechRate } from '../lib/speech';
import { startListening, speechInputAvailable } from '../lib/stt';
import { StackProps } from '../navigation';
import { CHAT_XP } from '../lib/rank';

type Bubble =
  | { id: string; from: 'ai'; ja: string; reading?: string; zh: string }
  | { id: string; from: 'me'; text: string; correction?: ChatReply['correction'] };

const MAX_TURNS = 12;

export default function ChatScreen({ route, navigation }: StackProps<'Chat'>) {
  const t = useTheme();
  const d = useData();
  const scenario = scenarioById(route.params.scenarioId)!;
  const level = d.profile.startLevel;

  const [bubbles, setBubbles] = useState<Bubble[]>(scenario.opening ? [{ id: 'open', from: 'ai', ja: scenario.opening, zh: scenario.openingZh ?? '' }] : []);
  const [history, setHistory] = useState<ChatMsg[]>(scenario.opening ? [{ role: 'assistant', content: scenario.opening }] : []);
  const [hints, setHints] = useState<{ ja: string; zh: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [missionDone, setMissionDone] = useState(false);
  const [showZh, setShowZh] = useState<Record<string, boolean>>({});
  const list = useRef<FlatList<Bubble>>(null);
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const sendRef = useRef<(t: string) => void>(() => {});
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const voice = scenario.voice ?? 'female';
  /** 自己要跳走（結束並分析）時不要再攔截 */
  const leaving = useRef(false);

  /** 播放並在語音準備好之前，於喇叭圖示顯示轉圈 */
  async function play(id: string, ja: string, audio?: string) {
    setLoadingVoice(id);
    try {
      if (audio) await cacheAudio(ja, voice, audio);
      await speakJa(ja, voice);
    } finally {
      setLoadingVoice(v => (v === id ? null : v));
    }
  }
  const userTurns = history.filter(m => m.role === 'user').length;

  /**
   * 離開前先問一聲。
   * 原因：AI 的回覆是非同步的，直接退出時那一句（和它的語音）會在使用者
   * 已經切到別的畫面之後才回來，變成「人走了 AI 才開口」。
   * 攔在這裡，既能提醒進度不會留著，也有時間把播放和收音收乾淨。
   *
   * 用自己的返回鍵，不用 beforeRemove + preventDefault：native-stack 的
   * 原生返回鍵和滑動手勢是在原生層先把畫面移掉才通知 JS，攔不住——
   * 實測會先跳回上一頁，提示才疊在上面出現（還會噴 removed natively 警告）。
   * 所以關掉原生返回鍵和手勢，出口只留這一個。
   */
  function leave() {
    leaving.current = true;
    stopSpeech();
    stopRef.current?.();
    navigation.goBack();
  }

  function confirmLeave() {
    if (userTurns === 0 && !busy) return leave();
    stopSpeech();
    Alert.alert(
      busy ? '對方還在回覆' : '要離開這場對話嗎？',
      userTurns > 0
        ? '這場對話不會保留，也不會拿到分析和 XP。要先結束並分析嗎？'
        : '這場對話不會保留。',
      [
        { text: '繼續對話', style: 'cancel' },
        ...(userTurns > 0 ? [{ text: '結束並分析', onPress: () => { void finish(); } }] : []),
        { text: '離開', style: 'destructive' as const, onPress: leave },
      ],
    );
  }

  useEffect(() => {
    if (scenario.opening) play('open', scenario.opening);
    else openWithAI();
    return () => { stopSpeech(); stopRef.current?.(); };
  }, []);

  /** 沒有預設開場白的情境，由 AI 依角色先開口 */
  async function openWithAI() {
    setBusy(true);
    try {
      const r = await aiChat(scenario, level, [], { voice, rate: getSpeechRate() });
      d.setAiRemaining(r.remaining);
      setHistory([{ role: 'assistant', content: r.reply }]);
      setBubbles([{ id: 'open', from: 'ai', ja: r.reply, reading: r.reading || undefined, zh: r.replyZh }]);
      setHints(r.hints ?? []);
      play('open', r.reply, r.audio);
    } catch (e: any) {
      Alert.alert('無法開始會話', e.message, [{ text: '返回', onPress: () => navigation.goBack() }]);
    } finally { setBusy(false); }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: scenario.title,
      headerBackVisible: false,
      gestureEnabled: false,
      headerLeft: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={confirmLeave} hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={26} color={t.ink} />
          <T color={t.ink} style={{ fontSize: 17 }}>返回</T>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable accessibilityRole="button" onPress={finish} disabled={reporting || userTurns === 0} hitSlop={10}>
          {reporting ? <ActivityIndicator color={t.primary} />
            : <T variant="small" color={userTurns ? t.primary : t.faint} style={{ fontWeight: '800' }}>結束並分析</T>}
        </Pressable>
      ),
    });
  });

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy || history.length === 0) return;
    if (msg.length > 200) return Alert.alert('句子太長了', '一次請輸入 200 字以內');
    if (userTurns >= MAX_TURNS) return Alert.alert('這場會話已經很充實了', '按右上角「結束並分析」看看你的表現吧');
    const myId = `me-${Date.now()}`;
    const nextHistory: ChatMsg[] = [...history, { role: 'user', content: msg }];
    setBubbles(b => [...b, { id: myId, from: 'me', text: msg }]);
    setHistory(nextHistory);
    setInput(''); setHints([]); setBusy(true);
    try {
      const r = await aiChat(scenario, level, nextHistory, { voice, rate: getSpeechRate() });
      d.setAiRemaining(r.remaining);
      const aiId = `ai-${Date.now()}`;
      setHistory(h => [...h, { role: 'assistant', content: r.reply }]);
      setBubbles(b => [
        ...b.map(x => (x.id === myId && x.from === 'me' ? { ...x, correction: r.correction } : x)),
        { id: aiId, from: 'ai', ja: r.reply, reading: r.reading || undefined, zh: r.replyZh },
      ]);
      setHints(r.hints ?? []);
      play(aiId, r.reply, r.audio);
      if (r.missionComplete && !missionDone) setMissionDone(true);
    } catch (e: any) {
      // 失敗時把這句退回輸入框
      setBubbles(b => b.filter(x => x.id !== myId));
      setHistory(history);
      setInput(msg);
      Alert.alert('沒有送出', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (reporting || userTurns === 0) return;
    setReporting(true);
    try {
      leaving.current = true;
      const report = await aiReport(scenario, level, history);
      d.setAiRemaining(report.remaining);
      d.recordChat();
      d.addXp(CHAT_XP);
      if (route.params.lessonId) d.completeLesson(route.params.lessonId);
      navigation.replace('Report', { report, scenarioId: scenario.id, lessonId: route.params.lessonId });
    } catch (e: any) {
      leaving.current = false;
      Alert.alert('分析失敗', e.message);
    } finally {
      setReporting(false);
    }
  }

  sendRef.current = send;

  async function toggleMic() {
    if (listening) { stopRef.current?.(); return; }
    if (busy) return;
    try {
      setInput('');
      setListening(true);
      stopRef.current = await startListening({
        onPartial: text => setInput(text),
        onFinal: text => { setInput(text); if (text.trim()) sendRef.current(text); },
        onEnd: () => { setListening(false); stopRef.current = null; },
        onError: message => { setListening(false); Alert.alert('語音輸入', message); },
      });
    } catch (e: any) {
      setListening(false);
      Alert.alert('語音輸入', e?.message ?? '無法使用麥克風');
    }
  }

  const renderItem = ({ item }: { item: Bubble }) => {
    if (item.from === 'ai') {
      const open = showZh[item.id];
      return (
        <View style={{ alignSelf: 'flex-start', maxWidth: '86%', marginBottom: space.md }}>
          <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: radius.lg, borderTopLeftRadius: 6, padding: space.md }}>
            {item.reading ? <T variant="caption" color={t.faint} style={{ marginBottom: 2 }}>{item.reading}</T> : null}
            <T style={{ fontSize: 17, lineHeight: 26 }}>{item.ja}</T>
            {open ? <T variant="small" color={t.sub} style={{ marginTop: 6 }}>{item.zh}</T> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: space.lg, marginTop: 6, paddingLeft: 4 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="播放" onPress={() => play(item.id, item.ja)} hitSlop={8}
              style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              {loadingVoice === item.id ? <ActivityIndicator size="small" color={t.sub} />
                : <Ionicons name="volume-high-outline" size={18} color={t.sub} />}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setShowZh(s => ({ ...s, [item.id]: !open }))} hitSlop={8}>
              <T variant="caption" color={t.sub}>{open ? '隱藏翻譯' : '看翻譯'}</T>
            </Pressable>
            <SaveButton ja={item.ja} zh={item.zh} source={`AI：${scenario.title}`} compact />
          </View>
        </View>
      );
    }
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '86%', marginBottom: space.md }}>
        <View style={{ backgroundColor: t.primary, borderRadius: radius.lg, borderTopRightRadius: 6, padding: space.md }}>
          <T style={{ fontSize: 16, lineHeight: 24 }} color={t.onPrimary}>{item.text}</T>
        </View>
        {item.correction ? (
          <View style={{ backgroundColor: t.warningSoft, borderRadius: radius.md, padding: space.md, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="sparkles" size={14} color={t.warning} />
                <T variant="caption" color={t.warning}>更自然的說法</T>
              </View>
              <SaveButton ja={item.correction.corrected} zh={item.correction.explanation} source={`AI 糾正：${scenario.title}`} compact color={t.warning} />
            </View>
            <T style={{ fontWeight: '700', marginTop: 4 }}>{item.correction.corrected}</T>
            <T variant="small" color={t.sub} style={{ marginTop: 4, lineHeight: 19 }}>{item.correction.explanation}</T>
          </View>
        ) : null}
      </View>
    );
  };

  // 任務卡放在對話列表最上方，跟著捲動，不會蓋住訊息
  const missionCard = (
    <View style={{ padding: space.md, borderRadius: radius.md, marginBottom: space.lg, borderWidth: 1,
      borderColor: missionDone ? t.success : t.line, backgroundColor: missionDone ? t.successSoft : t.primarySoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={missionDone ? 'checkmark-circle' : 'flag'} size={16} color={missionDone ? t.success : t.primary} />
        <T variant="caption" color={missionDone ? t.success : t.primary}>{missionDone ? '任務完成！可以結束並看分析' : '你的任務'}</T>
      </View>
      <T variant="small" style={{ marginTop: 4, fontWeight: '600', lineHeight: 20 }}>{scenario.goal}</T>
      <T variant="caption" color={t.sub} style={{ marginTop: 2, lineHeight: 18 }}>{scenario.setting}</T>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
        <FlatList ref={list} data={bubbles} keyExtractor={b => b.id} renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: space.lg }}
          ListHeaderComponent={missionCard}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={t.sub} /><T variant="caption" color={t.sub}>對方正在回覆…</T>
            </View>
          ) : undefined} />

        {hints.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
            // 橫向 ScrollView 預設會被壓縮，固定不縮放才不會把兩行字擠在一起
            style={{ flexGrow: 0, flexShrink: 0 }}
            contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.sm, alignItems: 'center' }}>
            {missionDone ? <Pill icon="checkmark-circle" label="任務完成" color={t.success} bg={t.successSoft} /> : null}
            <Pill icon="bulb-outline" label="可以這樣說" color={t.sub} bg={t.surface2} />
            {hints.map(h => (
              <Pressable key={h.ja} accessibilityRole="button" onPress={() => setInput(h.ja)}
                style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8, maxWidth: 260 }}>
                <T variant="small" style={{ fontWeight: '600', lineHeight: 20 }} numberOfLines={1}>{h.ja}</T>
                <T variant="caption" color={t.faint} style={{ lineHeight: 17, marginTop: 2 }} numberOfLines={1}>{h.zh}</T>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {listening ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginHorizontal: space.lg, marginBottom: space.sm,
            backgroundColor: t.primarySoft, borderRadius: radius.md, padding: space.md }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary }} />
            <T variant="small" color={t.primary} style={{ flex: 1, fontWeight: '700' }}>正在聽…用日文說說看，說完會自動送出</T>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.surface }}>
          <Pressable accessibilityRole="button" accessibilityLabel={listening ? '停止收音' : '用說的'} onPress={toggleMic} disabled={busy}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
              backgroundColor: listening ? t.primary : t.primarySoft, opacity: busy ? 0.4 : 1 }}>
            <Ionicons name={listening ? 'stop' : 'mic'} size={22} color={listening ? t.onPrimary : t.primary} />
          </Pressable>
          <TextInput value={input} onChangeText={setInput} editable={!listening}
            placeholder={speechInputAvailable ? '按麥克風用說的，或輸入日文' : '輸入日文，不會的話用中文也可以'} placeholderTextColor={t.faint}
            multiline maxLength={200} accessibilityLabel="輸入回覆"
            style={{ flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: t.surface2, borderRadius: radius.md, paddingHorizontal: space.md, paddingTop: 12, paddingBottom: 12, fontSize: 16, color: t.ink }} />
          <Pressable accessibilityRole="button" accessibilityLabel="送出" onPress={() => send(input)} disabled={busy || listening || !input.trim()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: input.trim() && !busy && !listening ? t.primary : t.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-up" size={22} color={input.trim() && !busy && !listening ? t.onPrimary : t.faint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
