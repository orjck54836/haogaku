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
  { word: 'ほんそれ', reading: 'hon sore', meaning: '真的就是這樣（本当にそれ）', example: '「月曜って長くない？」「ほんそれ」', exampleZh: '「星期一不覺得特別長嗎？」「真的就是這樣」', when: '比それな更用力的附和' },
  { word: 'それある', reading: 'sore aru', meaning: '有有有、我也會這樣', example: '「傘持ってくと晴れるよね」「それある」', exampleZh: '「帶傘出門就會放晴對吧」「有有有」', when: '聊到共同經驗' },
  { word: 'おもろい', reading: 'omoroi', meaning: '好好玩、有趣（關西腔的面白い）', example: 'この漫画、めっちゃおもろい。', exampleZh: '這部漫畫超好看。', when: '推薦東西給朋友' },
  { word: 'ぶっちゃけ', reading: 'bucchake', meaning: '老實說、說真的', example: 'ぶっちゃけ、あんまり行きたくない。', exampleZh: '老實說，我不太想去。', when: '講真心話' },
  { word: 'やばい', reading: 'yabai', meaning: '超扯／超讚（好壞都能用）', example: 'このラーメン、やばい！', exampleZh: '這拉麵也太好吃了吧！', when: '讚美食物、驚訝' },
  { word: 'めっちゃ', reading: 'meccha', meaning: '超級、非常', example: 'めっちゃおいしい！', exampleZh: '超好吃！', when: '強調程度（關西來的，現在全國都說）' },
  { word: 'ガチ', reading: 'gachi', meaning: '認真的、超級', example: 'ガチでうまい。', exampleZh: '真的超好吃。', when: '強調程度' },
  { word: '鬼〜', kana: 'おに〜', reading: 'oni-', meaning: '超級〜（接在形容詞前）', example: 'このパン鬼うまい。', exampleZh: '這麵包超好吃。', when: '年輕人之間強調' },
  { word: '秒で', kana: 'びょうで', reading: 'byō de', meaning: '一瞬間、秒', example: 'チケット秒で売り切れた。', exampleZh: '票秒殺。', when: '搶票、搶購' },
  { word: '神', kana: 'かみ', reading: 'kami', meaning: '神級、超棒', example: 'この曲、神。', exampleZh: '這首歌是神曲。', when: '大力稱讚' },
  { word: 'えぐい', reading: 'egui', meaning: '太扯、超誇張（好壞都能用）', example: 'この行列えぐくない？', exampleZh: '這排隊人潮也太誇張了吧？', when: '驚訝、讚嘆' },
  { word: 'レベチ', reading: 'rebechi', meaning: '完全不同等級（レベルが違う）', example: 'プロの歌、レベチだった。', exampleZh: '專業的唱起來完全不同等級。', when: '稱讚很厲害的人或東西' },
  { word: '爆〜', kana: 'ばく〜', reading: 'baku-', meaning: '超大量、超快（接在名詞前）', example: '昨日は爆睡した。', exampleZh: '昨天睡死了。', when: '爆睡、爆速、爆買い都很常見' },
  { word: '普通に', kana: 'ふつうに', reading: 'futsū ni', meaning: '其實滿〜的（不是「普通」的意思）', example: 'これ普通においしい。', exampleZh: '這個其實滿好吃的。', when: '比預期好的時候' },
  { word: '優勝', kana: 'ゆうしょう', reading: 'yūshō', meaning: '贏了、最棒（就是這個）', example: '風呂上がりのビール、優勝。', exampleZh: '洗完澡來杯啤酒，人生勝利。', when: '吃到好吃的、享受當下' },
  { word: '刺さる', kana: 'ささる', reading: 'sasaru', meaning: '戳中我、很有共鳴', example: 'この歌詞、めっちゃ刺さる。', exampleZh: '這段歌詞超戳我。', when: '聽歌、看劇' },
  { word: 'オワコン', reading: 'owakon', meaning: '過氣了（終わったコンテンツ）', example: 'あのアプリはもうオワコンでしょ。', exampleZh: '那個 app 已經過氣了吧。', when: '聊流行、聊社群' },
  { word: '解像度高い', kana: 'かいぞうどたかい', reading: 'kaizōdo takai', meaning: '理解得很透徹、講得很具體', example: '彼の説明、解像度高いね。', exampleZh: '他的說明講得好具體。', when: '稱讚別人想得很清楚' },
  { word: '微妙', kana: 'びみょう', reading: 'bimyō', meaning: '有點不怎麼樣、說不上來', example: '味は微妙だった。', exampleZh: '味道有點微妙。', when: '委婉地說不好' },
  { word: 'エモい', reading: 'emoi', meaning: '很有感覺、很觸動', example: 'この夜景、エモい。', exampleZh: '這夜景好有感覺。', when: '看風景、拍照' },
  { word: 'しんどい', reading: 'shindoi', meaning: '累死了、吃不消', example: '今日マジしんどい。', exampleZh: '今天真的累死了。', when: '下班後、抱怨' },
  { word: 'だるい', reading: 'darui', meaning: '懶洋洋、提不起勁', example: 'なんか体がだるい。', exampleZh: '身體懶懶的。', when: '不舒服、不想動' },
  { word: 'めんどい', reading: 'mendoi', meaning: '麻煩死了', example: '準備がめんどい。', exampleZh: '準備好麻煩。', when: '抱怨' },
  { word: '病む', kana: 'やむ', reading: 'yamu', meaning: '心情很低落、快崩潰', example: '雨続きで病みそう。', exampleZh: '一直下雨，心情快崩了。', when: '抱怨、心情不好' },
  { word: '萎える', kana: 'なえる', reading: 'naeru', meaning: '洩氣、瞬間沒勁', example: '雨で予定中止、萎える。', exampleZh: '因為下雨行程取消，好洩氣。', when: '計畫泡湯' },
  { word: '凹む', kana: 'へこむ', reading: 'hekomu', meaning: '沮喪、受打擊', example: 'テストの結果見て凹んだ。', exampleZh: '看到考試成績好沮喪。', when: '失敗、被罵之後' },
  { word: 'はずい', reading: 'hazui', meaning: '好丟臉、好害羞（恥ずかしい）', example: '写真見られるの、はずい。', exampleZh: '被看到照片好害羞。', when: '朋友間' },
  { word: 'きまず', reading: 'kimazu', meaning: '好尷尬（気まずい的縮短）', example: '元カレとばったり会った、きまず。', exampleZh: '巧遇前男友，好尷尬。', when: '傳訊息、聊天' },
  { word: 'ブチギレ', reading: 'buchigire', meaning: '氣炸、暴怒', example: '上司がブチギレてた。', exampleZh: '上司氣炸了。', when: '描述別人很生氣' },
  { word: 'テンアゲ', reading: 'ten age', meaning: '好興奮、嗨起來（テンション上がる）', example: '明日から旅行、テンアゲ！', exampleZh: '明天開始旅行，好嗨！', when: '期待的事情' },
  { word: '無理', kana: 'むり', reading: 'muri', meaning: '不行了、受不了', example: 'もう無理！', exampleZh: '我不行了！', when: '太累、拒絕' },
  { word: 'うざい', reading: 'uzai', meaning: '煩人', example: 'この虫、うざい。', exampleZh: '這蟲好煩。', when: '抱怨' },
  { word: '詰んだ', kana: 'つんだ', reading: 'tsunda', meaning: '完蛋了、沒救了', example: '財布忘れた、詰んだ。', exampleZh: '錢包忘了帶，完蛋。', when: '出狀況' },
  { word: 'チル', reading: 'chiru', meaning: '放鬆、耍廢（chill）', example: '今日は家でチルする。', exampleZh: '今天在家耍廢。', when: '週末、聊計畫' },
  { word: 'イケメン', reading: 'ikemen', meaning: '帥哥', example: '店員さんイケメンだった。', exampleZh: '店員好帥。', when: '聊天、八卦' },
  { word: 'チャラい', reading: 'charai', meaning: '輕浮、花', example: 'あの人ちょっとチャラいよね。', exampleZh: '那個人有點輕浮吧。', when: '評論別人' },
  { word: 'ダサい', reading: 'dasai', meaning: '土、俗', example: 'この服ダサくない？', exampleZh: '這衣服不會很土嗎？', when: '逛街、挑衣服' },
  { word: '痛い', kana: 'いたい', reading: 'itai', meaning: '尷尬、讓人受不了', example: 'ちょっと痛い人かも。', exampleZh: '可能有點尷尬的人。', when: '評論別人（偏負面）' },
  { word: '陽キャ', kana: 'ようキャ', reading: 'yō kya', meaning: '外向開朗、很會社交的人', example: '彼、完全に陽キャだよね。', exampleZh: '他根本是社交咖吧。', when: '形容個性' },
  { word: '陰キャ', kana: 'いんキャ', reading: 'in kya', meaning: '內向、不太社交的人', example: '私、陰キャだから飲み会苦手。', exampleZh: '我比較內向，不太喜歡聚餐。', when: '多半用在自嘲，說別人會失禮' },
  { word: 'ぼっち', reading: 'bocchi', meaning: '一個人、邊緣', example: '今日はぼっちでランチ。', exampleZh: '今天一個人吃午餐。', when: '自嘲、聊日常' },
  { word: '蛙化現象', kana: 'かえるかげんしょう', reading: 'kaeruka genshō', meaning: '突然對喜歡的人冷掉', example: '小さいことで蛙化した。', exampleZh: '因為一件小事突然冷掉了。', when: '聊戀愛' },
  { word: 'メロい', reading: 'meroi', meaning: '迷人、讓人心動（メロメロ）', example: 'あの笑顔、メロすぎる。', exampleZh: '那個笑容太讓人心動了。', when: '看偶像、看劇' },
  { word: 'ビジュ', reading: 'bijyu', meaning: '外型、顏值（ビジュアル）', example: '今日のビジュ良すぎ！', exampleZh: '今天的外型也太好！', when: '稱讚偶像、朋友的穿搭' },
  { word: 'KY', kana: 'ケーワイ', reading: 'kei wai', meaning: '不會看氣氛（空気読めない）', example: 'それKYだよ。', exampleZh: '你那樣很不會看氣氛。', when: '朋友吐槽' },
  { word: 'マウント', reading: 'maunto', meaning: '炫耀壓過別人', example: 'すぐマウント取ってくる。', exampleZh: '老愛炫耀壓人。', when: '抱怨人際' },
  { word: '神対応', kana: 'かみたいおう', reading: 'kami taiō', meaning: '超貼心的應對', example: '店員さん神対応だった。', exampleZh: '店員超貼心。', when: '稱讚服務' },
  { word: '塩対応', kana: 'しおたいおう', reading: 'shio taiō', meaning: '冷淡的應對', example: 'ちょっと塩対応だったな。', exampleZh: '有點冷淡耶。', when: '抱怨服務' },
  { word: '推し', kana: 'おし', reading: 'oshi', meaning: '最支持的偶像或角色', example: '私の推しはこの子！', exampleZh: '我推的是這個人！', when: '逛周邊、動漫店' },
  { word: '推し活', kana: 'おしかつ', reading: 'oshikatsu', meaning: '追星活動', example: '週末は推し活。', exampleZh: '週末要去追星。', when: '聊興趣' },
  { word: '尊い', kana: 'とうとい', reading: 'tōtoi', meaning: '太美好了、好可貴', example: '推しが尊い。', exampleZh: '我推太美好了。', when: '追星、看動漫' },
  { word: '沼', kana: 'ぬま', reading: 'numa', meaning: '坑（陷進去出不來）', example: 'これは沼だわ。', exampleZh: '這個會入坑。', when: '興趣、追星' },
  { word: '聖地巡礼', kana: 'せいちじゅんれい', reading: 'seichi junrei', meaning: '聖地巡禮', example: '聖地巡礼してきた。', exampleZh: '去聖地巡禮了。', when: '動漫旅行' },
  { word: '〜しか勝たん', kana: '〜しかかたん', reading: '~shika katan', meaning: '〜最棒、只有〜（無人能敵）', example: '猫しか勝たん。', exampleZh: '貓咪最棒了。', when: '表達最愛' },
  { word: '箱推し', kana: 'はこおし', reading: 'hako oshi', meaning: '整個團都喜歡', example: 'このグループは箱推し。', exampleZh: '這個團我全員都推。', when: '追星' },
  { word: '供給', kana: 'きょうきゅう', reading: 'kyōkyū', meaning: '官方發糧（新照片、新影片）', example: '今日の供給が多すぎる！', exampleZh: '今天官方發糧也太多！', when: '追星、動漫' },
  { word: '解釈一致', kana: 'かいしゃくいっち', reading: 'kaishaku icchi', meaning: '跟我想像的一模一樣', example: 'その衣装、解釈一致。', exampleZh: '那套服裝完全符合我的想像。', when: '看角色、看真人化' },
  { word: 'ハマる', reading: 'hamaru', meaning: '迷上、入坑', example: '最近キャンプにハマってる。', exampleZh: '最近迷上露營。', when: '聊興趣' },
  { word: '界隈', kana: 'かいわい', reading: 'kaiwai', meaning: '〜圈、〜族群', example: 'サウナ界隈では有名な店。', exampleZh: '在三溫暖圈很有名的店。', when: '聊興趣、社群（接在名詞後）' },
  { word: '地雷', kana: 'じらい', reading: 'jirai', meaning: '雷、踩雷', example: 'あの店、地雷だった。', exampleZh: '那家店是地雷。', when: '評價店家' },
  { word: '映える', kana: 'ばえる', reading: 'baeru', meaning: '很好拍、很上相', example: 'このカフェ、映える！', exampleZh: '這間咖啡廳好好拍！', when: '咖啡廳、景點拍照' },
  { word: '盛れる', kana: 'もれる', reading: 'moreru', meaning: '拍起來特別好看', example: 'このアプリ、盛れる。', exampleZh: '這個 app 拍起來超美。', when: '自拍、修圖' },
  { word: '自撮り', kana: 'じどり', reading: 'jidori', meaning: '自拍', example: 'ここで自撮りしよ！', exampleZh: '在這裡自拍吧！', when: '景點、聚會' },
  { word: 'バズる', reading: 'bazuru', meaning: '爆紅', example: 'あの動画バズってる。', exampleZh: '那個影片爆紅了。', when: '聊社群' },
  { word: 'ググる', reading: 'guguru', meaning: '上網查', example: 'ググってみて。', exampleZh: '你上網查查看。', when: '聊天、查資料' },
  { word: '裏垢', kana: 'うらあか', reading: 'ura aka', meaning: '分身帳、小帳', example: '裏垢で愚痴ってる。', exampleZh: '在小帳上抱怨。', when: '聊社群' },
  { word: 'フォロバ', reading: 'foroba', meaning: '回追蹤（follow back）', example: 'フォロバありがとう！', exampleZh: '謝謝回追蹤！', when: 'IG、X' },
  { word: 'リプ', reading: 'ripu', meaning: '回覆（reply）', example: 'リプもらえて嬉しい。', exampleZh: '收到回覆好開心。', when: '社群留言' },
  { word: 'スクショ', reading: 'sukusho', meaning: '截圖（screenshot）', example: '地図、スクショしといて。', exampleZh: '地圖先截圖起來。', when: '出門前、傳訊息' },
  { word: '炎上', kana: 'えんじょう', reading: 'enjō', meaning: '被炎上、引發大量批評', example: 'その投稿、炎上してる。', exampleZh: '那則貼文被炎上了。', when: '聊新聞、社群' },
  { word: 'ネタバレ', reading: 'netabare', meaning: '劇透、爆雷', example: 'ネタバレしないで！', exampleZh: '不要爆雷！', when: '看電影、追劇' },
  { word: '既読スルー', kana: 'きどくスルー', reading: 'kidoku surū', meaning: '已讀不回', example: '既読スルーされた。', exampleZh: '被已讀不回了。', when: '傳訊息' },
  { word: 'りょ', reading: 'ryo', meaning: '了解、OK', example: '「7時ね」「りょ」', exampleZh: '「7 點喔」「OK」', when: '跟朋友傳訊息' },
  { word: 'おつ', reading: 'otsu', meaning: '辛苦啦（お疲れさまの縮短）', example: '「終わった〜」「おつ」', exampleZh: '「結束了～」「辛苦啦」', when: '打工、同學之間' },
  { word: 'あざす', reading: 'azasu', meaning: '謝啦（ありがとうございますの縮短）', example: 'あざす！', exampleZh: '謝啦！', when: '熟人之間' },
  { word: 'ちな', reading: 'china', meaning: '順帶一提（ちなみに）', example: 'ちな、明日は雨らしい。', exampleZh: '順帶一提，明天好像會下雨。', when: '傳訊息補充' },
  { word: 'w', kana: 'わら', reading: 'wara', meaning: '哈哈（笑的縮寫，越多 w 越好笑）', example: '寝坊したwww', exampleZh: '睡過頭了哈哈哈', when: '傳訊息、留言' },
  { word: 'おけ', reading: 'oke', meaning: 'OK、好', example: '「明日10時ね」「おけ」', exampleZh: '「明天 10 點喔」「好」', when: '跟朋友傳訊息' },
  { word: 'あけおめ', reading: 'akeome', meaning: '新年快樂（あけましておめでとう）', example: 'あけおめ！ことよろ！', exampleZh: '新年快樂！今年也請多指教！', when: '過年傳訊息' },
  { word: 'とりま', reading: 'torima', meaning: '總之先（とりあえず、まあ）', example: 'とりま生ビール。', exampleZh: '總之先來杯生啤。', when: '居酒屋點餐、做決定' },
  { word: 'ワンチャン', reading: 'wanchan', meaning: '說不定、有機會', example: 'ワンチャン間に合うかも。', exampleZh: '說不定趕得上。', when: '推測、約時間' },
  { word: 'ドタキャン', reading: 'dotakyan', meaning: '臨時放鴿子', example: 'ドタキャンしてごめん。', exampleZh: '臨時取消對不起。', when: '取消約會' },
  { word: 'サボる', reading: 'saboru', meaning: '翹掉、偷懶', example: '今日はバイトサボった。', exampleZh: '今天打工翹掉了。', when: '學校、打工' },
  { word: '寝落ち', kana: 'ねおち', reading: 'neochi', meaning: '不小心睡著', example: '電話しながら寝落ちした。', exampleZh: '講電話講到睡著了。', when: '熬夜、聊天' },
  { word: '社畜', kana: 'しゃちく', reading: 'shachiku', meaning: '社畜（被公司壓榨的上班族）', example: '今日も社畜してます。', exampleZh: '今天也在當社畜。', when: '自嘲上班' },
  { word: '華金', kana: 'はなきん', reading: 'hanakin', meaning: '快樂星期五', example: '華金だし飲みに行こう！', exampleZh: '今天小週末，去喝一杯吧！', when: '星期五下班' },
  { word: 'サシ飲み', kana: 'サシのみ', reading: 'sashi nomi', meaning: '兩個人單獨喝酒', example: '先輩とサシ飲みした。', exampleZh: '跟學長單獨去喝酒。', when: '約喝酒' },
  { word: '親ガチャ', kana: 'おやガチャ', reading: 'oya gacha', meaning: '投胎樂透（父母是抽出來的）', example: '親ガチャって言葉、よく聞くよね。', exampleZh: '常聽到「投胎樂透」這個詞吧。', when: '聊社會話題' },
  { word: 'サブスク', reading: 'sabusuku', meaning: '訂閱制服務', example: '映画はサブスクで見てる。', exampleZh: '電影都用訂閱制看。', when: '聊影音、購物' },
  { word: 'ポチる', reading: 'pochiru', meaning: '網購下單（按下去）', example: '気づいたらポチってた。', exampleZh: '回過神已經下單了。', when: '網購' },
  { word: 'コスパ', reading: 'kosupa', meaning: 'CP 值', example: 'この店コスパ最高！', exampleZh: '這家店 CP 值超高！', when: '購物、吃飯' },
  { word: 'タイパ', reading: 'taipa', meaning: '時間效率（タイムパフォーマンス）', example: 'それタイパ悪くない？', exampleZh: '那樣不會太花時間嗎？', when: '年輕人聊效率' },
];

/**
 * 今天的流行語。100 個，所以是 100 天一輪。
 * 用本地日期算，才會在當地午夜換日——原本用 Date.now()/86400000 是 UTC 天數，
 * 台灣要等到早上 8 點才會換成「今日」流行語。
 */
export const todaySlangIndex = () => {
  const [y, m, d] = today().split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000) % slang.length;
};
