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
  /** 磚塊的底色調，對應 ui/seal 的 Tone 家族 */
  tone: 'wine' | 'ink' | 'gold';
};

export const officialLinks: OfficialLink[] = [
  {
    id: 'site', title: '皓學官網', desc: '課程、師資與留學代辦服務',
    url: 'https://www.forma-global.com/study',
    icon: 'globe-outline', tone: 'wine',
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

export const linkById = (id: string) => officialLinks.find(l => l.id === id);

/** 有填網址的才拿去渲染 */
export const activeLinks = () => officialLinks.filter(l => l.url.trim().length > 0);
