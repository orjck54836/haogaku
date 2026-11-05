import type { IconName } from '../ui';

/**
 * 官方連結。
 *
 * 全部集中在這裡，不要散在畫面裡寫死——換一個網址要改三個檔案是遲早出錯的。
 * `url` 留空字串的項目會自動從畫面上消失，所以之後要加新平台（YouTube、
 * Threads⋯⋯）先補一筆、網址還沒有就留空，版面不會開天窗。
 *
 * LINE 用 `https://line.me/R/ti/p/@...` 這個形式：手機上會直接喚起 LINE App，
 * 沒裝的話才退回網頁版。用 `line://` 開頭的 scheme 在沒裝 LINE 的手機上會整個失敗。
 */

export type OfficialLink = {
  id: string;
  title: string;
  /** 副標：說清楚點進去會得到什麼，不要只寫平台名 */
  desc: string;
  url: string;
  icon: IconName;
  /**
   * 用圖片當磚塊，而不是 Ionicons。
   * 官網那一列放品牌 logo——globe-outline 是通用地球圖示，
   * 跟其他兩列的 LINE、IG 擺在一起看不出哪個才是「我們自己」。
   */
  image?: number;
  /** 磚塊的底色調，對應 ui/seal 的 Tone 家族 */
  tone: 'wine' | 'ink' | 'gold';
};

export const officialLinks: OfficialLink[] = [
  {
    id: 'site', title: '皓學官網', desc: '課程、師資與留學代辦服務',
    url: 'https://www.forma-global.com/study',
    icon: 'globe-outline', image: require('../../assets/logo.png'), tone: 'wine',
  },
  {
    id: 'line', title: 'LINE 官方帳號', desc: '問課程、問留學，真人回覆',
    url: 'https://line.me/R/ti/p/@forma_global',
    icon: 'chatbubbles-outline', tone: 'ink',
  },
  {
    id: 'ig', title: 'Instagram', desc: '每日一句、日本生活與學員心得',
    url: 'https://www.instagram.com/haogaku_japanese_agency/',
    icon: 'logo-instagram', tone: 'gold',
  },
];

/**
 * 法務與支援連結。
 *
 * 四頁都在官網（Nuxt）的 `pages/study/` 底下，跟官網一起部署，
 * 版面共用 `components/LegalPage.vue`。這個 repo 的 `public/` 裡還留著
 * 同內容的靜態版本（舊的 Firebase Hosting 網址），改條文時兩邊要一起改，
 * 或是直接把 Firebase 那份停掉、只留官網這份。
 * App Store 審查（Guideline 3.1.2）要求訂閱頁的條款與隱私權連結「點得開、
 * 而且真的是那份文件」，指向官網首頁會被退件——所以不要為了省事改回首頁。
 * 隱私權政策網址同時也是 App Store Connect 送審表單的必填欄位，填同一個。
 *
 * support 與 deleteAccount 這兩筆也是 App Store Connect 的必填欄位：
 * Support URL 不接受指向首頁，而有註冊帳號功能就必須提供對外可見的
 * 帳號刪除說明網址——App 內做得到不算，Apple 要的是一個公開網頁。
 *
 * 網址若再變動，改這裡就好，畫面不用動。
 */
export const legalLinks = {
  terms: 'https://www.forma-global.com/study/terms',
  privacy: 'https://www.forma-global.com/study/privacy',
  support: 'https://www.forma-global.com/study/support',
  deleteAccount: 'https://www.forma-global.com/study/delete-account',
};

export const linkById = (id: string) => officialLinks.find(l => l.id === id);

/** 有填網址的才拿去渲染 */
export const activeLinks = () => officialLinks.filter(l => l.url.trim().length > 0);
