import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Rule, Button, IconBox } from '../ui';
import { PageHeader } from '../ui/brand';
import { useTheme, space, radius } from '../theme';
import { plans, guestLimits, sentencesOf, CHARS_PER_SENTENCE } from '../content/plans';
import { StackProps } from '../navigation';

/**
 * 次數的完整規則。
 *
 * 為什麼要單獨一頁：方案頁上那三行小字只講得完「一次是什麼」，
 * 講不完「什麼時候不算、什麼時候補、升級當下會發生什麼事」。
 * 而**沒講到的那幾條，正是事後會變成爭議的那幾條**——
 * 使用者覺得自己被多扣了一次，我們拿不出一句可以指給他看的話。
 *
 * 寫法上兩條自律：
 * 1. **不用內部詞彙。**「額度」「快取」「字元」「降級」使用者都不講這些，
 *    寫成「次數」「別人查過的」「字數」「換成手機內建的聲音」。
 * 2. **數字一律從 plans.ts 讀**，不要寫死在句子裡。
 *    畫面寫 60 而後端給 50，白紙黑字的承諾就變成客訴。
 */
export default function QuotaScreen({ navigation }: StackProps<'Quota'>) {
  const t = useTheme();
  const [free, plus, pro] = plans;

  return (
    // 這一頁有系統 header，再吃一次 top 的 safe area 會在標題上方多出一大塊空白
    <Screen edges={[]}>
      <PageHeader ja="ルール" title="次數怎麼算"
        subtitle="AI 相關的功能有每天的次數限制，其他功能全部免費、沒有限制。下面是完整規則。" />

      <Section icon="remove-circle-outline" tone="wine" title="這三種情況會用掉一次">
        <Line>跟 AI 教練說一句話，它回你一句，算一次。</Line>
        <Line>一場會話結束後的分析報告，算一次。</Line>
        <Line>在單字本自己打一個新的單字或句子，請 AI 補上讀音、意思和例句，算一次。</Line>
        <Note>一場完整的情境會話大約會用掉 10〜15 次。</Note>
      </Section>

      <Section icon="document-text-outline" tone="ink" title="分析報告每天另外有份數上限">
        <Line>
          {'分析報告除了算一次之外，每天還有自己的份數上限。產分析要讀完整場對話，比一般的回覆吃力得多。'}
        </Line>
        <Row label="還沒登入（訪客）" value="要登入" />
        <Row label={`${free.name}（登入後）`} value={`每天 ${free.reportsPerDay} 份`} />
        <Row label={plus.name} value={`每天 ${plus.reportsPerDay} 份`} />
        <Row label={pro.name} value={`每天 ${pro.reportsPerDay} 份`} last />
        <Line>
          <B>份數用完不影響會話。</B>
          {'你照樣可以繼續跟 AI 教練練習，只是當天不會再產生新的分析報告。已經產生過的分析隨時都看得到。'}
        </Line>
      </Section>

      <Section icon="checkmark-circle-outline" tone="green" title="這些情況不會用掉">
        <Line>
          <B>別人已經查過的單字不算。</B>
          像「ありがとう」這種很多人查的字，第一個查的人用掉一次，之後所有人都不用再花。
        </Line>
        <Line>
          <B>查不到的字會還給你。</B>
          打錯、亂打，或日文裡根本沒有那個說法時，我們會把剛剛扣掉的那一次還回去。
        </Line>
        <Line>
          <B>同一場會話重聽、重看不算。</B>
          已經產生過的內容你想看幾次都可以，只有「產生新的內容」才算。
        </Line>
        <Line>
          <B>課程、讀物、五十音、單字複習、排行榜、等級、學習紀錄，通通不算。</B>
          這些功能沒有用到 AI，永遠免費，也沒有任何次數限制。
        </Line>
      </Section>

      <Section icon="refresh-outline" tone="wine" title="次數什麼時候補回來">
        <Line>
          <B>每天台灣時間半夜 12 點自動補滿。</B>不用做任何事，也不用重開 App。
        </Line>
        <Line>
          <B>沒用完的不會留到隔天。</B>每天都是重新開始的完整次數，不會累積。
        </Line>
      </Section>

      <Section icon="list-outline" tone="ink" title="每個身分有多少次">
        <Row label="還沒登入（訪客）" value={`每天 ${guestLimits.aiPerDay} 次`} />
        <Row label={`${free.name}（登入後）`} value={`每天 ${free.aiPerDay} 次`} />
        <Row label={plus.name} value={`每天 ${plus.aiPerDay} 次`} />
        <Row label={pro.name} value={`每天 ${pro.aiPerDay} 次`} last />
        <Note>
          訪客的次數比較少，是因為訪客的紀錄換一台手機就會不見。登入之後次數會變多，學習紀錄也才存得住。
        </Note>
      </Section>

      <Section icon="volume-high-outline" tone="wine" title="朗讀是分開算的">
        <Line>
          <B>朗讀和 AI 次數互不影響</B>，用完其中一個，另一個照樣可以用。
        </Line>
        <Line>
          <B>朗讀算的是字數，不是次數</B>，而且是<B>每個月</B>補一次，不是每天。唸一個單字和唸一整句話的成本差很多，用字數算對你比較公平。一句日文大約 {CHARS_PER_SENTENCE} 個字。
        </Line>
        <Row label={`${free.name}`} value={`每月約 ${sentencesOf(free.ttsCharsPerMonth)} 句`} />
        <Row label={plus.name} value={`每月約 ${sentencesOf(plus.ttsCharsPerMonth)} 句`} />
        <Row label={pro.name} value={`每月約 ${sentencesOf(pro.ttsCharsPerMonth)} 句`} last />
        <Note>
          {'還沒登入的訪客用的是手機內建的日文聲音。登入之後才有我們合成的自然語音。'}
        </Note>
        <Line>
          <B>聽過的句子存在手機裡，重複播放不算。</B>所以實際上能聽的比上面的數字更多。
        </Line>
        <Line>
          <B>字數用完不會不能聽。</B>會自動換成手機內建的日文聲音繼續唸給你聽，只是聽起來沒有那麼自然，不是故障。
        </Line>
      </Section>

      <Section icon="card-outline" tone="green" title="升級、取消、到期">
        <Line>
          <B>付款完成的當下，當天的次數立刻補滿。</B>
          就算你是因為次數用完才決定升級的，也不會把已經用掉的次數帶過去——你買到的是完整的一天。
        </Line>
        <Line>
          <B>隨時可以取消</B>，在手機的「設定 → 你的 Apple ID → 訂閱」裡操作。
        </Line>
        <Line>
          <B>取消之後，付過錢的那段期間還是可以用到最後一天</B>，不會馬上停掉。
        </Line>
        <Line>
          <B>到期後會回到免費方案</B>
          {`，次數變回每天 ${free.aiPerDay} 次。你的單字本、學習紀錄、等級和已經完成的課程`}
          <B>完全不受影響</B>
          {'，一樣都在。'}
        </Line>
        <Line>
          訂閱是透過 App Store 收費的，退費也要向 Apple 申請，我們這邊沒有辦法代為處理。
        </Line>
      </Section>

      <View style={{ marginTop: space.section }}><Rule /></View>
      <T variant="small" color={t.sub} style={{ marginTop: space.lg, lineHeight: 21 }}>
        {'規則如果有調整，我們會在 App 裡先說明再生效，不會默默改掉已經寫在這一頁上的內容。'}
      </T>

      <Button label="查看方案" variant="primary" size="lg"
        style={{ marginTop: space.xl }} onPress={() => navigation.navigate('Plans')} />
    </Screen>
  );
}

/** 一個規則段落。標題用圖示色塊分類，底下是逐條的句子 */
function Section({ icon, title, tone, children }: {
  icon: Parameters<typeof IconBox>[0]['name']; title: string;
  tone: 'wine' | 'green' | 'ink'; children: React.ReactNode;
}) {
  const t = useTheme();
  const map = {
    wine: { fg: t.primary, bg: t.primarySoft },
    green: { fg: t.success, bg: t.successSoft },
    ink: { fg: t.heading, bg: t.surface2 },
  }[tone];
  return (
    <Card tone="soft" style={{ marginTop: space.xl, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconBox name={icon} color={map.fg} bg={map.bg} size={38} />
        <T variant="heading" style={{ flex: 1 }}>{title}</T>
      </View>
      <View style={{ gap: space.md }}>{children}</View>
    </Card>
  );
}

/**
 * 一條規則。
 * 一句一個 <T>，不靠原始碼換行排版——多行的 JSX 文字，
 * 換行會被當成一個半形空格，接在全形句號後面會留下看得見的缺口。
 */
function Line({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: t.faint, marginTop: 8 }} />
      <T variant="small" color={t.ink} style={{ flex: 1, lineHeight: 23 }}>{children}</T>
    </View>
  );
}

/** 句子裡要強調的部分。整句都粗體等於沒有重點 */
function B({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <T variant="small" color={t.heading} style={{ fontWeight: '800', lineHeight: 23 }}>{children}</T>;
}

/** 補充說明：比規則本身弱一階，才看得出哪些是規則、哪些是舉例 */
function Note({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: space.md }}>
      <T variant="caption" color={t.sub} style={{ lineHeight: 20 }}>{children}</T>
    </View>
  );
}

/** 數字那種「誰有多少」的對照列 */
function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line }}>
      <T variant="small" color={t.ink} style={{ flex: 1 }}>{label}</T>
      <T variant="small" color={t.heading} style={{ fontWeight: '800' }}>{value}</T>
    </View>
  );
}
