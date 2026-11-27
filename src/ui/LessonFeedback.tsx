import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from './Tap';
import { T } from './index';
import { useTheme, space, radius } from '../theme';
import { track } from '../lib/analytics';

/**
 * 課程完成頁的「這堂課怎麼樣？」，一鍵答完。
 *
 * ## 為什麼不靠商店評論
 *
 * 完成頁的星星有三分之一以上是 3 星以下，但每一顆都是送去商店的撰寫頁，
 * 幾乎沒有人真的寫——我們只知道有人不滿意，不知道是哪一堂、哪裡不好。
 * 這裡問的是**這一堂課**，答案連同課程 id 進後台（lessonStats 的 `fb`），
 * 和逐步漏斗擺在一起看，才知道人是因為太難還是太無聊走掉的。
 *
 * ## 和星星的界線
 *
 * 這不是 App 的評分，也**不決定任何人被帶去哪裡**：四個答案都只是記下來、說聲謝謝。
 * 拿它來決定要不要推商店評分（答「剛好」才給星星）就變成 review gating，
 * 那是 StarReview 檔頭寫的紅線。兩張卡各自獨立顯示，誰也不看誰的答案。
 */
const OPTIONS = [
  { value: 'easy', label: '太簡單' },
  { value: 'right', label: '剛剛好' },
  { value: 'hard', label: '有點難' },
  { value: 'lost', label: '看不懂' },
] as const;

export default function LessonFeedback({ lessonId, first }: { lessonId: string; first: boolean }) {
  const t = useTheme();
  const [picked, setPicked] = useState<string | null>(null);

  function pick(v: string) {
    if (picked) return;
    setPicked(v);
    track('lesson_feedback', { lesson: lessonId, answer: v, first });
  }

  return (
    <View style={{ backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.lg, gap: space.md, alignItems: 'center' }}>
      <T variant="heading" style={{ fontSize: 16 }}>{picked ? '收到，謝謝你！' : '這堂課怎麼樣？'}</T>
      {/* 答完不收起來：四顆留著、選的那顆亮著，他才看得到自己剛剛按了什麼 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm }}>
        {OPTIONS.map(o => {
          const on = picked === o.value;
          return (
            <Pressable key={o.value} tapId={`課後回饋 ${o.label}`} accessibilityRole="button" accessibilityState={{ selected: on }}
              onPress={() => pick(o.value)} disabled={!!picked && !on}
              style={({ pressed }) => ({
                paddingVertical: 10, paddingHorizontal: space.lg, borderRadius: radius.pill,
                backgroundColor: on ? t.primary : t.surface, borderWidth: 1.5, borderColor: on ? t.primary : t.line,
                opacity: picked && !on ? 0.45 : pressed ? 0.7 : 1,
              })}>
              <T style={{ fontWeight: '700', fontSize: 14 }} color={on ? t.onPrimary : t.ink}>{o.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
