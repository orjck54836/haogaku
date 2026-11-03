import { Slang } from './types';
import { today } from '../lib/date';

/**
 * 流行語。依「反應附和 → 程度 → 心情 → 評價人 → 追星 → 拍照社群 → 訊息縮寫 → 生活」分組，
 * 同一類的排在一起，從頭翻也讀得順。
 *
 * kana 是平假名讀音，只有含漢字的詞才標——本來就寫成假名的（やばい、エモい）
 * 詞形本身就是讀音，再標一次只是重複。reading 一律是羅馬拼音。
 *
 * 收錄標準：現在的日本年輕人**真的在說**的。
 * 過時的（なう、マジ卍）和只在特定圈子用的不收——學起來用出去會尷尬。
 */
export const slang: Slang[] = [
  { word: 'それな', reading: 'sore na', meaning: '真的！對啊！', example: '「暑すぎない？」「それな」', exampleZh: '「也太熱了吧？」「真的！」', when: '跟朋友聊天' },
  { word: 'あーね', reading: 'ā ne', meaning: '喔～這樣啊（輕鬆版的なるほど）', example: '「寝坊した」「あーね」', exampleZh: '「睡過頭了」「喔～這樣」', when: '附和、聽朋友講事情' },
  { word: 'わかりみ', reading: 'wakarimi', meaning: '超懂、很有共鳴', example: 'わかりみが深い。', exampleZh: '太懂了。', when: '附和、同意' },
  { word: 'マジで', reading: 'maji de', meaning: '真的假的／真的', example: 'マジで？安すぎる！', exampleZh: '真的假的？也太便宜！', when: '驚訝、確認' },
  { word: 'ウケる', reading: 'ukeru', meaning: '好好笑', example: 'それ、ウケる！', exampleZh: '那個好好笑！', when: '朋友間開玩笑' },
  { word: 'ワロタ', reading: 'warota', meaning: '笑了、笑死（網路用語）', example: 'その返信ワロタ。', exampleZh: '那個回覆笑死。', when: '留言、傳訊息' },
  { word: '草', kana: 'くさ', reading: 'kusa', meaning: '笑死（網路用語）', example: 'その動画、草。', exampleZh: '那個影片笑死。', when: '傳訊息、留言' },
  { word: 'ドン引き', kana: 'ドンびき', reading: 'don biki', meaning: '傻眼、倒彈', example: 'それはドン引きだわ。', exampleZh: '那個真的傻眼。', when: '聽到誇張的事' },
  { word: 'やばい', reading: 'yabai', meaning: '超扯／超讚（好壞都能用）', example: 'このラーメン、やばい！', exampleZh: '這拉麵也太好吃了吧！', when: '讚美食物、驚訝' },
  { word: 'めっちゃ', reading: 'meccha', meaning: '超級、非常', example: 'めっちゃおいしい！', exampleZh: '超好吃！', when: '強調程度（關西來的，現在全國都說）' },
  { word: 'ガチ', reading: 'gachi', meaning: '認真的、超級', example: 'ガチでうまい。', exampleZh: '真的超好吃。', when: '強調程度' },
  { word: '鬼〜', kana: 'おに〜', reading: 'oni-', meaning: '超級〜（接在形容詞前）', example: 'このパン鬼うまい。', exampleZh: '這麵包超好吃。', when: '年輕人之間強調' },
  { word: '秒で', kana: 'びょうで', reading: 'byō de', meaning: '一瞬間、秒', example: 'チケット秒で売り切れた。', exampleZh: '票秒殺。', when: '搶票、搶購' },
  { word: '神', kana: 'かみ', reading: 'kami', meaning: '神級、超棒', example: 'この曲、神。', exampleZh: '這首歌是神曲。', when: '大力稱讚' },
  { word: '微妙', kana: 'びみょう', reading: 'bimyō', meaning: '有點不怎麼樣、說不上來', example: '味は微妙だった。', exampleZh: '味道有點微妙。', when: '委婉地說不好' },
  { word: 'エモい', reading: 'emoi', meaning: '很有感覺、很觸動', example: 'この夜景、エモい。', exampleZh: '這夜景好有感覺。', when: '看風景、拍照' },
  { word: 'しんどい', reading: 'shindoi', meaning: '累死了、吃不消', example: '今日マジしんどい。', exampleZh: '今天真的累死了。', when: '下班後、抱怨' },
  { word: 'だるい', reading: 'darui', meaning: '懶洋洋、提不起勁', example: 'なんか体がだるい。', exampleZh: '身體懶懶的。', when: '不舒服、不想動' },
  { word: 'めんどい', reading: 'mendoi', meaning: '麻煩死了', example: '準備がめんどい。', exampleZh: '準備好麻煩。', when: '抱怨' },
  { word: '無理', kana: 'むり', reading: 'muri', meaning: '不行了、受不了', example: 'もう無理！', exampleZh: '我不行了！', when: '太累、拒絕' },
  { word: 'うざい', reading: 'uzai', meaning: '煩人', example: 'この虫、うざい。', exampleZh: '這蟲好煩。', when: '抱怨' },
  { word: '詰んだ', kana: 'つんだ', reading: 'tsunda', meaning: '完蛋了、沒救了', example: '財布忘れた、詰んだ。', exampleZh: '錢包忘了帶，完蛋。', when: '出狀況' },
  { word: 'チル', reading: 'chiru', meaning: '放鬆、耍廢（chill）', example: '今日は家でチルする。', exampleZh: '今天在家耍廢。', when: '週末、聊計畫' },
  { word: 'イケメン', reading: 'ikemen', meaning: '帥哥', example: '店員さんイケメンだった。', exampleZh: '店員好帥。', when: '聊天、八卦' },
  { word: 'チャラい', reading: 'charai', meaning: '輕浮、花', example: 'あの人ちょっとチャラいよね。', exampleZh: '那個人有點輕浮吧。', when: '評論別人' },
  { word: 'ダサい', reading: 'dasai', meaning: '土、俗', example: 'この服ダサくない？', exampleZh: '這衣服不會很土嗎？', when: '逛街、挑衣服' },
  { word: '痛い', kana: 'いたい', reading: 'itai', meaning: '尷尬、讓人受不了', example: 'ちょっと痛い人かも。', exampleZh: '可能有點尷尬的人。', when: '評論別人（偏負面）' },
  { word: 'KY', kana: 'ケーワイ', reading: 'kei wai', meaning: '不會看氣氛（空気読めない）', example: 'それKYだよ。', exampleZh: '你那樣很不會看氣氛。', when: '朋友吐槽' },
  { word: 'マウント', reading: 'maunto', meaning: '炫耀壓過別人', example: 'すぐマウント取ってくる。', exampleZh: '老愛炫耀壓人。', when: '抱怨人際' },
  { word: '神対応', kana: 'かみたいおう', reading: 'kami taiō', meaning: '超貼心的應對', example: '店員さん神対応だった。', exampleZh: '店員超貼心。', when: '稱讚服務' },
  { word: '塩対応', kana: 'しおたいおう', reading: 'shio taiō', meaning: '冷淡的應對', example: 'ちょっと塩対応だったな。', exampleZh: '有點冷淡耶。', when: '抱怨服務' },
  { word: '推し', kana: 'おし', reading: 'oshi', meaning: '最支持的偶像或角色', example: '私の推しはこの子！', exampleZh: '我推的是這個人！', when: '逛周邊、動漫店' },
  { word: '推し活', kana: 'おしかつ', reading: 'oshikatsu', meaning: '追星活動', example: '週末は推し活。', exampleZh: '週末要去追星。', when: '聊興趣' },
  { word: '尊い', kana: 'とうとい', reading: 'tōtoi', meaning: '太美好了、好可貴', example: '推しが尊い。', exampleZh: '我推太美好了。', when: '追星、看動漫' },
  { word: '沼', kana: 'ぬま', reading: 'numa', meaning: '坑（陷進去出不來）', example: 'これは沼だわ。', exampleZh: '這個會入坑。', when: '興趣、追星' },
  { word: '聖地巡礼', kana: 'せいちじゅんれい', reading: 'seichi junrei', meaning: '聖地巡禮', example: '聖地巡礼してきた。', exampleZh: '去聖地巡禮了。', when: '動漫旅行' },
  { word: '地雷', kana: 'じらい', reading: 'jirai', meaning: '雷、踩雷', example: 'あの店、地雷だった。', exampleZh: '那家店是地雷。', when: '評價店家' },
  { word: '映える', kana: 'ばえる', reading: 'baeru', meaning: '很好拍、很上相', example: 'このカフェ、映える！', exampleZh: '這間咖啡廳好好拍！', when: '咖啡廳、景點拍照' },
  { word: '盛れる', kana: 'もれる', reading: 'moreru', meaning: '拍起來特別好看', example: 'このアプリ、盛れる。', exampleZh: '這個 app 拍起來超美。', when: '自拍、修圖' },
  { word: '自撮り', kana: 'じどり', reading: 'jidori', meaning: '自拍', example: 'ここで自撮りしよ！', exampleZh: '在這裡自拍吧！', when: '景點、聚會' },
  { word: 'バズる', reading: 'bazuru', meaning: '爆紅', example: 'あの動画バズってる。', exampleZh: '那個影片爆紅了。', when: '聊社群' },
  { word: 'ググる', reading: 'guguru', meaning: '上網查', example: 'ググってみて。', exampleZh: '你上網查查看。', when: '聊天、查資料' },
  { word: '既読スルー', kana: 'きどくスルー', reading: 'kidoku surū', meaning: '已讀不回', example: '既読スルーされた。', exampleZh: '被已讀不回了。', when: '傳訊息' },
  { word: 'りょ', reading: 'ryo', meaning: '了解、OK', example: '「7時ね」「りょ」', exampleZh: '「7 點喔」「OK」', when: '跟朋友傳訊息' },
  { word: 'おつ', reading: 'otsu', meaning: '辛苦啦（お疲れさまの縮短）', example: '「終わった〜」「おつ」', exampleZh: '「結束了～」「辛苦啦」', when: '打工、同學之間' },
  { word: 'あざす', reading: 'azasu', meaning: '謝啦（ありがとうございますの縮短）', example: 'あざす！', exampleZh: '謝啦！', when: '熟人之間' },
  { word: 'とりま', reading: 'torima', meaning: '總之先（とりあえず、まあ）', example: 'とりま生ビール。', exampleZh: '總之先來杯生啤。', when: '居酒屋點餐、做決定' },
  { word: 'ワンチャン', reading: 'wanchan', meaning: '說不定、有機會', example: 'ワンチャン間に合うかも。', exampleZh: '說不定趕得上。', when: '推測、約時間' },
  { word: 'ドタキャン', reading: 'dotakyan', meaning: '臨時放鴿子', example: 'ドタキャンしてごめん。', exampleZh: '臨時取消對不起。', when: '取消約會' },
  { word: 'サボる', reading: 'saboru', meaning: '翹掉、偷懶', example: '今日はバイトサボった。', exampleZh: '今天打工翹掉了。', when: '學校、打工' },
  { word: 'コスパ', reading: 'kosupa', meaning: 'CP 值', example: 'この店コスパ最高！', exampleZh: '這家店 CP 值超高！', when: '購物、吃飯' },
  { word: 'タイパ', reading: 'taipa', meaning: '時間效率（タイムパフォーマンス）', example: 'それタイパ悪くない？', exampleZh: '那樣不會太花時間嗎？', when: '年輕人聊效率' },
];

/**
 * 今天的流行語。52 個，所以是 52 天一輪。
 * 用本地日期算，才會在當地午夜換日——原本用 Date.now()/86400000 是 UTC 天數，
 * 台灣要等到早上 8 點才會換成「今日」流行語。
 */
export const todaySlangIndex = () => {
  const [y, m, d] = today().split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000) % slang.length;
};
