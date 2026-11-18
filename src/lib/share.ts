import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { track } from './analytics';
import { appStoreProviderToken } from '../content/links';

/**
 * 分享到 Threads。
 *
 * 目前行銷只有 Threads 一個管道，而用戶自己發的貼文是唯一「不用我們親自發」的成長方式，
 * 所以分享鈕直接指名 Threads，不做系統分享面板：面板要多一步選 App，
 * 而且台灣這群人在 Threads 上最活躍。
 *
 * 用網頁的 intent 網址，不用 `barcelona://` 這類 scheme：scheme 沒有公開文件，
 * 哪天改了就靜靜壞掉；https 的版本有裝 App 會被 universal link 接走，沒裝就開網頁版，
 * 兩種情況都發得出去。也不需要原生模組，可以直接用 EAS Update 推出去。
 */

/**
 * 帶行銷活動參數的 App Store 連結。
 *
 * `ct` 讓 App Store Connect 的 App Analytics 把下載依來源分開算，
 * 這樣才看得出 Threads 上哪一種貼文真的帶來安裝，而不是只看按讚數。
 * 但 Apple 要 `pt`（provider token）和 `ct` 一起出現才會歸因；
 * `pt` 還沒填的時候照樣帶 `ct`，不影響連結本身能不能開。
 */
export function storeLink(campaign: string): string {
  const base = (Constants.expoConfig?.ios as { appStoreUrl?: string } | undefined)?.appStoreUrl
    ?? 'https://apps.apple.com/tw/app/id6830791694';
  const q = [appStoreProviderToken ? `pt=${appStoreProviderToken}` : '', `ct=${campaign}`, 'mt=8']
    .filter(Boolean).join('&');
  return `${base}?${q}`;
}

/** `where` 同時是 GA4 的參數和 App Store 的 ct，兩邊對得起來 */
export type ShareWhere = 'share-slang' | 'share-lesson';

export function shareToThreads(text: string, where: ShareWhere) {
  const body = `${text}\n\n${storeLink(where)}`;
  track('share_threads', { where });
  Linking.openURL(`https://www.threads.com/intent/post?text=${encodeURIComponent(body)}`).catch(() => {});
}
