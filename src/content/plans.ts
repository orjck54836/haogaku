import type { IconName } from '../ui';

/**
 * 付費方案。
 *
 * 原則一條：**沒有用到 AI 的東西一律免費**。
 * 課程內容、83 個主題、讀物、五十音、單字本與間隔複習、流行語、
 * 排行榜、等級、成長曲線——這些的邊際成本是零（內容早就產好了，
 * 排行榜一天寫幾次 Firestore），收費只會把人擋在門外。
 *
 * 要收費的只有兩樣**每用一次就付一次錢**的東西：
 *   1. Claude API（AI 會話、會話分析、句子健檢、課程即時生成）
 *   2. Google 神經語音（Chirp3-HD 朗讀）
 *
 * ## 定價怎麼來的
 *
 * 文字 AI 便宜得出乎意料：會話用 claude-haiku-5-5（$0.10 / $0.50 per MTok），
 * 一次回覆連同情境和歷史大約 2000 input + 500 output，約 NT$0.015。
 * 一天 60 次、一個月 1800 次也才 NT$30 上下。
 *
 * **真正的成本是語音**。Chirp3-HD 是按字元計價的高級音色，
 * 一個月幾十萬字元就會跑到三位數台幣，比 AI 文字高一個量級。
 * 所以語音次數才是分級的主軸，AI 次數反而可以給得大方。
 * （手機會把播過的音檔存起來，重播不計次，所以實際用量比上限低很多。）
 *
 * 這裡的數字是**依成本結構推的估算**，不是實際帳單。上架前拿真實的
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
  /** 每天產生語音的次數（手機有快取，重播不計） */
  ttsPerDay: number;
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
    aiPerDay: 10, ttsPerDay: 100,
    icon: 'leaf-outline',
    perks: [
      '83 個生活主題・249 堂課',
      '11 篇日文讀物',
      '五十音、敬語、流行語',
      '單字本與間隔複習',
      '排行榜、等級、成長曲線',
      '每天 10 次 AI・100 次語音',
    ],
  },
  {
    id: 'plus', name: '標準', kana: 'スタンダード', kanji: '進',
    tagline: '每天練一場會話，夠用',
    monthly: 150, yearly: 1280,
    aiPerDay: 60, ttsPerDay: 600,
    trialDays: 7,
    productId: { monthly: 'haogaku.plus.monthly', yearly: 'haogaku.plus.yearly' },
    icon: 'flash-outline',
    perks: [
      '每天 60 次 AI（約 4〜6 場完整會話）',
      '每天 600 次語音朗讀',
      '會話分析與句子健檢不限用途',
      '新主題課程優先生成',
    ],
  },
  {
    id: 'pro', name: '無限', kana: 'プロ', kanji: '極',
    tagline: '整天泡在日文裡的人',
    monthly: 320, yearly: 2680,
    aiPerDay: 300, ttsPerDay: 2000,
    trialDays: 7,
    productId: { monthly: 'haogaku.pro.monthly', yearly: 'haogaku.pro.yearly' },
    icon: 'infinite-outline',
    perks: [
      '每天 300 次 AI',
      '每天 2000 次語音朗讀',
      '會話分析保留完整歷史',
      '搶先試用新功能',
    ],
  },
];

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
  { icon: 'book-outline', label: '11 篇日文讀物' },
  { icon: 'language-outline', label: '五十音與敬語' },
  { icon: 'bookmark-outline', label: '單字本與間隔複習' },
  { icon: 'trophy-outline', label: '排行榜與等級' },
  { icon: 'trending-up-outline', label: '成長曲線' },
];
