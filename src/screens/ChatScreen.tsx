import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T, Pill } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { scenarioById } from '../content/scenarios';
import { lessonRef } from '../content/curriculum';
import { aiChat, aiReport, ChatMsg, ChatReply } from '../lib/ai';
import { speakJa, stopSpeech } from '../lib/speech';
import { StackProps } from '../navigation';

type Bubble =
  | { id: string; from: 'ai'; ja: string; reading?: string; zh: string }
  | { id: string; from: 'me'; text: string; correction?: ChatReply['correction'] };

const MAX_TURNS = 12;

export default function ChatScreen({ route, navigation }: StackProps<'Chat'>) {
  const t = useTheme();
  const d = useData();
  const scenario = scenarioById(route.params.scenarioId)!;
  const level = route.params.lessonId ? lessonRef(route.params.lessonId)?.level.id ?? scenario.level : scenario.level;

  const [bubbles, setBubbles] = useState<Bubble[]>([{ id: 'open', from: 'ai', ja: scenario.opening, zh: scenario.openingZh }]);
  const [history, setHistory] = useState<ChatMsg[]>([{ role: 'assistant', content: scenario.opening }]);
  const [hints, setHints] = useState<{ ja: string; zh: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [missionDone, setMissionDone] = useState(false);
  const [showZh, setShowZh] = useState<Record<string, boolean>>({});
  const list = useRef<FlatList<Bubble>>(null);
  const userTurns = history.filter(m => m.role === 'user').length;

  useEffect(() => { speakJa(scenario.opening); return () => stopSpeech(); }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: scenario.title,
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
    if (!msg || busy) return;
    if (msg.length > 200) return Alert.alert('句子太長了', '一次請輸入 200 字以內');
    if (userTurns >= MAX_TURNS) return Alert.alert('這場會話已經很充實了', '按右上角「結束並分析」看看你的表現吧');
    const myId = `me-${Date.now()}`;
    const nextHistory: ChatMsg[] = [...history, { role: 'user', content: msg }];
    setBubbles(b => [...b, { id: myId, from: 'me', text: msg }]);
    setHistory(nextHistory);
    setInput(''); setHints([]); setBusy(true);
    try {
      const r = await aiChat(scenario, level, nextHistory);
      d.setAiRemaining(r.remaining);
      setHistory(h => [...h, { role: 'assistant', content: r.reply }]);
      setBubbles(b => [
        ...b.map(x => (x.id === myId && x.from === 'me' ? { ...x, correction: r.correction } : x)),
        { id: `ai-${Date.now()}`, from: 'ai', ja: r.reply, reading: r.reading || undefined, zh: r.replyZh },
      ]);
      setHints(r.hints ?? []);
      speakJa(r.reply);
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
      const report = await aiReport(scenario, level, history);
      d.setAiRemaining(report.remaining);
      d.recordChat();
      d.addXp(30);
      if (route.params.lessonId) d.completeLesson(route.params.lessonId);
      navigation.replace('Report', { report, scenarioId: scenario.id, lessonId: route.params.lessonId });
    } catch (e: any) {
      Alert.alert('分析失敗', e.message);
    } finally {
      setReporting(false);
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
            <Pressable accessibilityRole="button" accessibilityLabel="播放" onPress={() => speakJa(item.ja)} hitSlop={8}>
              <Ionicons name="volume-high-outline" size={18} color={t.sub} />
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
        <View style={{ marginHorizontal: space.lg, marginTop: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: missionDone ? t.successSoft : t.primarySoft }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={missionDone ? 'checkmark-circle' : 'flag'} size={16} color={missionDone ? t.success : t.primary} />
            <T variant="caption" color={missionDone ? t.success : t.primary}>{missionDone ? '任務完成！可以結束並看分析' : '你的任務'}</T>
          </View>
          <T variant="small" style={{ marginTop: 4, fontWeight: '600' }}>{scenario.goal}</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 2 }}>{scenario.setting}</T>
        </View>

        <FlatList ref={list} data={bubbles} keyExtractor={b => b.id} renderItem={renderItem}
          contentContainerStyle={{ padding: space.lg }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={t.sub} /><T variant="caption" color={t.sub}>對方正在回覆…</T>
            </View>
          ) : undefined} />

        {hints.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.sm }}>
            <View style={{ justifyContent: 'center' }}><Pill icon="bulb-outline" label="可以這樣說" color={t.sub} bg={t.surface2} /></View>
            {hints.map(h => (
              <Pressable key={h.ja} accessibilityRole="button" onPress={() => setInput(h.ja)}
                style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8, maxWidth: 260 }}>
                <T variant="small" style={{ fontWeight: '600' }} numberOfLines={1}>{h.ja}</T>
                <T variant="caption" color={t.faint} numberOfLines={1}>{h.zh}</T>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.surface }}>
          <TextInput value={input} onChangeText={setInput} placeholder="用日文回覆，不會的話用中文也可以" placeholderTextColor={t.faint}
            multiline maxLength={200} accessibilityLabel="輸入回覆"
            style={{ flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: t.surface2, borderRadius: radius.md, paddingHorizontal: space.md, paddingTop: 12, paddingBottom: 12, fontSize: 16, color: t.ink }} />
          <Pressable accessibilityRole="button" accessibilityLabel="送出" onPress={() => send(input)} disabled={busy || !input.trim()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: input.trim() && !busy ? t.primary : t.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-up" size={22} color={input.trim() && !busy ? t.onPrimary : t.faint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
