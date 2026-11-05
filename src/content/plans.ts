import type { IconName } from '../ui';

/**
 * 付費方案。
 *
 * 原則一條：**沒有用到 AI 的東西一律免費**。
 * 課程內容、83 個主題、讀物、五十音、單字本與間隔複習、流行語、
 * 排行榜、等級——這些的邊際成本是零（內容早就產好了，
 * 排行榜一天寫幾次 Firestore），收費只會把人擋在門外。
 *
 * 要收費的只有兩樣**每用一次就付一次錢**的東西：
 *   1. Claude API（AI 會話、會話分析、課程即時生成）
 *   2. Google 神經語音（Chirp3-HD 朗讀）
 *
 * ## 定價怎麼來的
 *
 * 文字 AI 便宜，但沒有想像中那麼便宜：會話用 claude-haiku-5-5（$0.10 / $0.50 per MTok），
 * 一次回覆約 3000 input（系統提示＋最近 12 則歷史）＋ 吃滿 700 output ≈ **NT$0.0205**。
 * 一份會話分析是 **NT$0.0425**（input 吃整份逐字稿，output 上限 2000），**是一則回覆的兩倍**。
 *
 * **語音仍然是最大宗**。Chirp3-HD 按字元計價（約 US$30 / 1M 字元），
 * 一句日文約 30 字 ≈ NT$0.029，和一則 AI 回覆差不多，但語音額度給得比 AI 多一個量級。
 * （手機會把播過的音檔存起來，重播不計，所以實際用量比上限低很多。）
 *
 * ## 真正入袋的錢比月費少三成
 *
 * **Apple 抽 30%，而且台灣的定價是含 5% 營業稅的。** NT$150 實際入袋只有 **NT$100**。
 * 這一條以前漏算，整張毛利表因此高估了一倍以上。
 * 申請 App Store 小型企業方案（年營收 100 萬美元以下）抽成降到 15%，入袋會變成 NT$121——
 * 不用改任何程式，是目前投報率最高的一件事。
 *
 * ## 用好用滿的真實損益（每月，匯率 NT$31.5）
 *
 *   方案   AI 文字   語音              成本    入袋    利潤
 *   訪客   3.1      3k 字 Neural2     4.6     0       -4.6
 *   免費   6.1      8k 字 Neural2     10.2    0       -10.2
 *   標準   36.9     40k 字 HD         74.7    100     +25.3
 *   無限   92.1     100k 字 HD        186.6   233.3   +46.7
 *
 * 付費方案用好用滿還是賺，但毛利是 **25%／20%**，不是原本寫的 65%。
 * 免費和訪客用滿一定虧——這是獲客成本，不是錯誤，但要知道它多少：
 * **1 個標準訂戶的淨利只養得起 2.5 個「天天用滿」的免費使用者。**
 *
 * 常駐實例（functions 的 minInstances: 1）約 NT$300〜600/月是固定成本，
 * 要 **12〜24 個標準訂戶**才打平（抽 30% 時）。
 *
 * ## 會話分析為什麼要另外限次
 *
 * 分析和會話共用同一個 aiPerDay 的桶，但成本是兩倍。
 * 把次數全部拿去產分析的話，標準方案一個月的成本是 NT$114（虧 14），無限是 NT$286（虧 53）——
 * 而且不需要惡意，一個很認真複盤的人就做得到。
 * 所以 reportsPerDay 另外加一道上限（免費 3／標準 10／無限 20），會話本身完全不受影響。
 *
 * 上面都是**依單價推的估算**，不是實際帳單。上架後拿真實的
 * Firebase 和 Google Cloud 帳單回來校正一次，特別是語音那一欄。
 *
 * ## 分析紀錄的份數例外
 *
 * perks 寫的「會話分析保留 N 份」是**真的有實作**的，額度在 lib/reports.ts 的
 * RETENTION。它不走後端是因為它不花 API 錢，存的是使用者自己那份 Firestore 文件；
 * 改 client 多留幾份，撐大的也只有他自己的文件。改數字要兩邊一起改。
 *
 * 真正的額度在後端（functions/src/index.ts 的 PLAN_ALLOWANCE），這裡只負責顯示。
 * 兩邊的數字要一起改，不然畫面會承諾後端不給的東西。
 *
 * 這裡的數字是**依單價推的估算**，不是實際帳單。上架前拿真實的
 * Firebase 和 Google Cloud 帳單回來校正一次，特別是語音那一欄。
 *
 * ## 還沒做的事
 *
 * 這個檔案只定義方案和畫面要顯示什麼。**真正的解鎖還沒接**：
 * 要接 App Store / Google Play 的訂閱，並且**在 Cloud Functions 驗證收據**
 * 之後才能放寬 functions/src/index.ts 的 LIMITS。
 * 絕對不能讓前端的 profile.plan 直接決定額度——那等於改個 client 就免費升級。
 */

export type PlanId = 'free' | 'plus' | 'pro';

export type Plan = {
  id: PlanId;
  name: string;
  /** 日文副標，和全 app 的視覺語言一致 */
  kana: string;
  /** 一句話說明這個方案適合誰 */
  tagline: string;
  /** 月費（新台幣）。0 代表免費 */
  monthly: number;
  /** 年繳總價。0 代表沒有年繳 */
  yearly: number;
  /** 每天的 AI 次數（每則回覆、每份分析各算一次） */
  aiPerDay: number;
  /**
   * 每天最多幾份會話分析（也從 aiPerDay 扣，這是額外的第二道上限）。
   * 一份分析的成本是一則回覆的兩倍，不另外設限的話，
   * 把次數全拿去產分析會讓標準方案做到虧錢。
   * 真正的上限在 functions 的 PLAN_ALLOWANCE，這裡只負責顯示，要一起改。
   */
  reportsPerDay: number;
  /**
   * 每月可以朗讀的字元數（手機有快取，重播不計）。
   * 算字元不算次數，因為 Google 就是按字元收費——
   * 播一個 5 字的單字和一句 60 字的例句，成本差 12 倍。
   * 額度要和成本同一個單位，最壞情況才守得住。
   */
  ttsCharsPerMonth: number;
  /** 高品質音色（Chirp3-HD）。免費方案用 Neural2，成本約一半 */
  hdVoice?: boolean;
  /** 這個方案多出來的東西，條列在卡片上 */
  perks: string[];
  icon: IconName;
  /** 印在方案卡上的漢字章 */
  kanji: string;
  /** 免費試用天數。0 或未填代表沒有試用 */
  trialDays?: number;
  /**
   * App Store Connect 裡的產品 ID。
   * 兩個方案 × 兩種週期共四個，要先在 App Store Connect 和 Google Play
   * 建好同名的訂閱項目，IAP 才找得到。
   */
  productId?: { monthly: string; yearly: string };
};

export const plans: Plan[] = [
  {
    id: 'free', name: '免費', kana: 'フリー', kanji: '學',
    tagline: '所有課程與讀物，永久免費',
    monthly: 0, yearly: 0,
    aiPerDay: 10, reportsPerDay: 3, ttsCharsPerMonth: 8_000,
    icon: 'leaf-outline',
    perks: [
      '83 個生活主題・249 堂課',
      '30 篇日文讀物',
      '五十音、敬語、流行語',
      '單字本與間隔複習',
      '排行榜與等級',
      '每天 10 次 AI 會話',
      '每月約 260 句雲端朗讀',
      '會話分析保留最近 3 份',
    ],
  },
  {
    id: 'plus', name: '標準', kana: 'スタンダード', kanji: '進',
    tagline: '每天練一場會話，夠用',
    monthly: 150, yearly: 1280,
    aiPerDay: 60, reportsPerDay: 10, ttsCharsPerMonth: 40_000, hdVoice: true,
    trialDays: 7,
    productId: { monthly: 'haogaku.japanese.plus.monthly', yearly: 'haogaku.japanese.plus.yearly' },
    icon: 'flash-outline',
    perks: [
      '每天 60 次 AI（約 4〜6 場完整會話）',
      '每月約 1,330 句朗讀，用最自然的 HD 音色',
      '會話分析保留最近 20 份',
    ],
  },
  {
    id: 'pro', name: '無限', kana: 'プロ', kanji: '極',
    tagline: '整天泡在日文裡的人',
    monthly: 350, yearly: 2930,
    aiPerDay: 150, reportsPerDay: 20, ttsCharsPerMonth: 100_000, hdVoice: true,
    trialDays: 7,
    productId: { monthly: 'haogaku.japanese.pro.monthly', yearly: 'haogaku.japanese.pro.yearly' },
    icon: 'infinite-outline',
    perks: [
      '每天 150 次 AI（約 12 場完整會話）',
      '每月約 3,330 句朗讀，用最自然的 HD 音色',
      '會話分析保留完整歷史（200 份）',
    ],
  },
];

/**
 * 年繳先關起來。
 *
 * 語音是按字元計價的，這裡的定價是**依成本結構推的估算，還沒拿真實帳單校正過**。
 * 年繳等於先收 12 個月的錢，萬一單位成本抓錯，要嘛整年虧著跑，
 * 要嘛去動已經收錢的訂閱——兩個都很難收拾。
 * 先只開月繳，跑幾個月真實用量、對過 Google Cloud 和 Firebase 的帳單，
 * 確認每人每月成本之後再把這個打開。
 *
 * 打開的時候：這個值改成 true 就好，年繳的價錢和 productId 都還留著。
 */
export const YEARLY_AVAILABLE = false;

/**
 * 訂閱是否真的買得到。
 *
 * true = 畫面會出現付款鈕，`src/lib/iap.ts` 會真的向 App Store 發起購買。
 *
 * **要是 true，App Store Connect 裡就必須有下面那些 productId 的訂閱商品，
 * 而且狀態要是「準備送審」以上。** 商品不存在的話 `fetchProducts` 會回空陣列，
 * 購買頁會顯示「這個方案目前買不到」——審查員看到的就是一個壞掉的付費功能
 * （Guideline 2.1）。所以改這個值之前先確認：
 *
 *   1. App Store Connect →「App 內購買」建好 `haogaku.japanese.plus.monthly`
 *      和 `haogaku.japanese.pro.monthly`，兩個放同一個訂閱群組
 *      （年繳那兩個等 YEARLY_AVAILABLE 打開再建）
 *   2. 「協議、稅務與銀行業務」的付費 App 協議已經生效
 *   3. Cloud Functions 的 `verifyPurchase` 已部署，三個 APPLE_IAP_* secret 都設好
 *
 * 另外 Expo Go 沒有 ExpoIap 原生模組，在 Expo Go 裡不管這個值是什麼都買不到，
 * 畫面會說明原因。要實測購買得用 dev build 或 TestFlight ＋ 沙盒測試帳號。
 */
export const IAP_AVAILABLE = true;

/**
 * 還沒綁定帳號的訪客額度（免費方案的一半）。
 *
 * 不列進 `plans` 是因為它不是一個「可以選的方案」，是還沒登入的暫時狀態；
 * 混進方案比較表會多出一欄沒人需要選的東西。但規則頁必須寫出來——
 * 訪客看到的次數和免費方案不一樣，沒講清楚就是爭議。
 *
 * 真正的數字在 functions/src/index.ts 的 GUEST_ALLOWANCE，這裡只負責顯示，要一起改。
 */
export const guestLimits = { aiPerDay: 5, reportsPerDay: 1, ttsCharsPerMonth: 3_000 };

/**
 * 一句日文的平均字數，把「字數」換算成使用者有感的「句數」。
 * 單純寫 40,000 字元沒有人換算得出來那是多少。
 */
export const CHARS_PER_SENTENCE = 30;

/**
 * 朗讀字數約等於幾句。
 *
 * **無條件捨去到十位**，不是四捨五入：規則頁上的數字只能比實際的少，不能比實際的多。
 * 算出 266 句卻寫 270，就是一句我們兌現不了的承諾。
 * 捨去到百位會讓免費方案從 260 掉到 200，和方案卡上寫的對不起來——
 * 兩頁寫不同的數字，正是使用者會拿來質疑的地方。
 */
export const sentencesOf = (chars: number) =>
  Math.floor(chars / CHARS_PER_SENTENCE / 10) * 10;

export const planById = (id: PlanId) => plans.find(p => p.id === id) ?? plans[0];

/** 付費方案（免費以外的），給方案比較畫面用 */
export const paidPlans = plans.filter(p => p.monthly > 0);

/** 年繳相對月繳省下的百分比，印在「年繳」那個頁籤上 */
export function yearlySaving(p: Plan): number {
  if (!p.monthly || !p.yearly) return 0;
  return Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
}

/** 年繳攤成每月多少錢 */
export const yearlyPerMonth = (p: Plan) => Math.round(p.yearly / 12);

/**
 * 免費就有的東西。
 * 這份清單是給付費頁開頭用的——先講清楚不用付錢也能學完整套，
 * 再講付費多了什麼。把免費的部分藏起來只會讓人覺得被設計。
 */
export const freeForever: { icon: IconName; label: string }[] = [
  { icon: 'grid-outline', label: '83 個生活主題、249 堂課' },
  { icon: 'book-outline', label: '30 篇日文讀物' },
  { icon: 'language-outline', label: '五十音與敬語' },
  { icon: 'bookmark-outline', label: '單字本與間隔複習' },
  { icon: 'trophy-outline', label: '排行榜與等級' },
  { icon: 'sparkles-outline', label: '流行語每日一則' },
];
