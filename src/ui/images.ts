import type { CategoryId } from '../content/topics';

/**
 * 主題與分類的照片。
 *
 * 要加照片：把圖放到 assets/topics/<檔名>.jpg，然後在下面對應的 id 加一行 require。
 * 登記過的主題會在主題頁顯示橫幅照片、在主題卡上顯示縮圖；沒登記的自動退回
 * 單元編號（見 src/ui/seal.tsx 的 UnitBlock），所以少一張不會開天窗。
 *
 * 83 個主題全部有照片，另外加上五十音基礎（key 是 basics）。
 * 拍不到本體的（自我介紹、道謝、相槌⋯⋯）改用意象相近的物件：
 * 名片、封蠟信、耳機。動漫與宅文化用書櫃——拍不到不侵權的動漫畫面，
 * 但「書」這個意象是通的。取捨記在 CREDITS.md。
 *
 * 建議：寬 1000px、JPEG、單張 200KB 以內。
 * 版權請用自己拍的或有商用授權的圖——上架審查會看。
 * 每張圖的來源與授權記在 assets/topics/CREDITS.md，換圖時一起更新。
 */
export const topicPhotos: Partial<Record<string, number>> = {
  // 五十音基礎（不是生活主題，但共用同一套查表）
  basics: require('../../assets/topics/basics.jpg'),
  // 飲食
  ramen: require('../../assets/topics/ramen.jpg'),
  izakaya: require('../../assets/topics/izakaya.jpg'),
  cafe: require('../../assets/topics/cafe.jpg'),
  restaurant: require('../../assets/topics/restaurant.jpg'),
  supermarket: require('../../assets/topics/supermarket.jpg'),
  cooking: require('../../assets/topics/cooking.jpg'),
  konbini: require('../../assets/topics/konbini.jpg'),
  // 交通
  subway: require('../../assets/topics/subway.jpg'),
  shinkansen: require('../../assets/topics/shinkansen.jpg'),
  bus: require('../../assets/topics/bus.jpg'),
  taxi: require('../../assets/topics/taxi.jpg'),
  directions: require('../../assets/topics/directions.jpg'),
  airport: require('../../assets/topics/airport.jpg'),
  // 居住
  hotel: require('../../assets/topics/hotel.jpg'),
  renting: require('../../assets/topics/renting.jpg'),
  utilities: require('../../assets/topics/utilities.jpg'),
  garbage: require('../../assets/topics/garbage.jpg'),
  neighbors: require('../../assets/topics/neighbors.jpg'),
  repairs: require('../../assets/topics/repairs.jpg'),
  // 購物
  drugstore: require('../../assets/topics/drugstore.jpg'),
  clothes: require('../../assets/topics/clothes.jpg'),
  electronics: require('../../assets/topics/electronics.jpg'),
  taxfree: require('../../assets/topics/taxfree.jpg'),
  returns: require('../../assets/topics/returns.jpg'),
  secondhand: require('../../assets/topics/secondhand.jpg'),
  // 生活手續
  cityhall: require('../../assets/topics/cityhall.jpg'),
  bank: require('../../assets/topics/bank.jpg'),
  mobile: require('../../assets/topics/mobile.jpg'),
  post: require('../../assets/topics/post.jpg'),
  hairsalon: require('../../assets/topics/hairsalon.jpg'),
  lostfound: require('../../assets/topics/lostfound.jpg'),
  // 健康
  clinic: require('../../assets/topics/clinic.jpg'),
  pharmacy: require('../../assets/topics/pharmacy.jpg'),
  dentist: require('../../assets/topics/dentist.jpg'),
  emergency: require('../../assets/topics/emergency.jpg'),
  body: require('../../assets/topics/body.jpg'),
  gym: require('../../assets/topics/gym.jpg'),
  // 工作
  'baito-interview': require('../../assets/topics/baito-interview.jpg'),
  baito: require('../../assets/topics/baito.jpg'),
  'job-interview': require('../../assets/topics/job-interview.jpg'),
  horenso: require('../../assets/topics/horenso.jpg'),
  'business-phone': require('../../assets/topics/business-phone.jpg'),
  'business-email': require('../../assets/topics/business-email.jpg'),
  meeting: require('../../assets/topics/meeting.jpg'),
  nomikai: require('../../assets/topics/nomikai.jpg'),
  // 敬語
  'keigo-basics': require('../../assets/topics/keigo-basics.jpg'),
  sonkeigo: require('../../assets/topics/sonkeigo.jpg'),
  kenjougo: require('../../assets/topics/kenjougo.jpg'),
  'service-keigo': require('../../assets/topics/service-keigo.jpg'),
  'keigo-mistakes': require('../../assets/topics/keigo-mistakes.jpg'),
  elders: require('../../assets/topics/elders.jpg'),
  // 人際社交
  'self-intro': require('../../assets/topics/self-intro.jpg'),
  friends: require('../../assets/topics/friends.jpg'),
  invitations: require('../../assets/topics/invitations.jpg'),
  dating: require('../../assets/topics/dating.jpg'),
  'line-chat': require('../../assets/topics/line-chat.jpg'),
  'thanks-sorry': require('../../assets/topics/thanks-sorry.jpg'),
  compliments: require('../../assets/topics/compliments.jpg'),
  // 休閒娛樂
  anime: require('../../assets/topics/anime.jpg'),
  karaoke: require('../../assets/topics/karaoke.jpg'),
  onsen: require('../../assets/topics/onsen.jpg'),
  concert: require('../../assets/topics/concert.jpg'),
  sports: require('../../assets/topics/sports.jpg'),
  sightseeing: require('../../assets/topics/sightseeing.jpg'),
  matsuri: require('../../assets/topics/matsuri.jpg'),
  // 季節文化
  weather: require('../../assets/topics/weather.jpg'),
  hanami: require('../../assets/topics/hanami.jpg'),
  summer: require('../../assets/topics/summer.jpg'),
  newyear: require('../../assets/topics/newyear.jpg'),
  gifts: require('../../assets/topics/gifts.jpg'),
  holidays: require('../../assets/topics/holidays.jpg'),
  // 情緒表達
  happy: require('../../assets/topics/happy.jpg'),
  complain: require('../../assets/topics/complain.jpg'),
  comfort: require('../../assets/topics/comfort.jpg'),
  reactions: require('../../assets/topics/reactions.jpg'),
  opinions: require('../../assets/topics/opinions.jpg'),
  requests: require('../../assets/topics/requests.jpg'),
  // 道地口語
  slang: require('../../assets/topics/slang.jpg'),
  aizuchi: require('../../assets/topics/aizuchi.jpg'),
  onomatopoeia: require('../../assets/topics/onomatopoeia.jpg'),
  kansai: require('../../assets/topics/kansai.jpg'),
  idioms: require('../../assets/topics/idioms.jpg'),
  casual: require('../../assets/topics/casual.jpg'),
};

/** 分類的代表照片：主題沒有自己的照片時，退而用所屬分類的 */
export const categoryPhotos: Partial<Record<CategoryId, number>> = {
  // food: require('../../assets/topics/cat-food.jpg'),
};

/**
 * 介面本身要用的圖（不屬於任何主題）。
 * 首頁的三塊捷徑磚：五十音用 topicPhotos.basics，另外兩塊用這裡的。
 */
export const uiPhotos = {
  coach: require('../../assets/ui/coach.jpg'),
  review: require('../../assets/ui/review.jpg'),
};

/**
 * 登入頁的主視覺。
 * 目前用品牌 logo 當主視覺。想換成插畫就改成 require('../../assets/hero.png')，
 * 版面不用動（置中、最大 190pt）。設成 null 會退回漢字章排版，不會開天窗。
 */
export const heroImage: number | null = require('../../assets/logo.png');

/** 主題要用的照片：先找主題自己的，再找分類的，都沒有就回傳 null（改用印章） */
export function photoFor(topicId?: string, cat?: CategoryId): number | null {
  if (topicId && topicPhotos[topicId]) return topicPhotos[topicId]!;
  if (cat && categoryPhotos[cat]) return categoryPhotos[cat]!;
  return null;
}
