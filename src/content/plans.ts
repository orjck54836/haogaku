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
 * 文字 AI 便宜得出乎意料：會話用 claude-haiku-5-5（$0.10 / $0.50 per MTok），
 * 一次回覆連同情境和歷史大約 2000 input + 500 output，約 NT$0.015。
 * 一天 60 次、一個月 1800 次也才 NT$30 上下。
 *
 * **真正的成本是語音**。Chirp3-HD 按字元計價（約 US$30 / 1M 字元），
 * 一句日文約 30 字 ≈ NT$0.029，是一則 AI 回覆（NT$0.008）的四倍。
 * 所以語音才是分級的主軸，AI 次數反而可以給得大方。
 * （手機會把播過的音檔存起來，重播不計，所以實際用量比上限低很多。）
 *
 * ## 額度是照「最壞情況也要賺」訂的
 *
 * 舊版的語音額度是「每天 600 次」，乘上 30 天是 NT$520 的成本，
 * 而月費只有 NT$150——用好用滿的人會讓你每月賠 NT$380。
 * 現在改成每月字元，每個方案的最壞月成本都壓在月費的 45% 以下：
 *
 *   方案   AI 文字   語音              最壞成本   月費    毛利
 *   免費   NT$2.4    8k 字 Neural2     NT$6.5     0       —
 *   標準   NT$14     40k 字 HD         NT$52      150     65%
 *   無限   NT$36     100k 字 HD        NT$132     320     59%
 *
 * 常駐實例（functions 的 minInstances: 1）約 NT$300〜600/月是固定成本，
 * 和用量無關：**約 5 個標準方案訂戶就打平**，之後每一個都是淨賺。
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
    aiPerDay: 10, ttsCharsPerMonth: 8_000,
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
    aiPerDay: 60, ttsCharsPerMonth: 40_000, hdVoice: true,
    trialDays: 7,
    productId: { monthly: 'haogaku.plus.monthly', yearly: 'haogaku.plus.yearly' },
    icon: 'flash-outline',
    perks: [
      '每天 60 次 AI（約 4〜6 場完整會話）',
      '每月約 1,300 句朗讀，用最自然的 HD 音色',
      '會話分析保留最近 20 份',
    ],
  },
  {
    id: 'pro', name: '無限', kana: 'プロ', kanji: '極',
    tagline: '整天泡在日文裡的人',
    monthly: 320, yearly: 2680,
    aiPerDay: 150, ttsCharsPerMonth: 100_000, hdVoice: true,
    trialDays: 7,
    productId: { monthly: 'haogaku.pro.monthly', yearly: 'haogaku.pro.yearly' },
    icon: 'infinite-outline',
    perks: [
      '每天 150 次 AI（約 12 場完整會話）',
      '每月約 3,300 句朗讀，用最自然的 HD 音色',
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
