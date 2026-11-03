import { LevelId } from './types';

export type CategoryId =
  | 'food' | 'transport' | 'home' | 'shopping' | 'errands' | 'health'
  | 'work' | 'keigo' | 'social' | 'fun' | 'seasons' | 'feelings' | 'native';

export type Category = { id: CategoryId; title: string; icon: string; desc: string };

export type Topic = {
  id: string;
  cat: CategoryId;
  title: string;
  icon: string;
  focus: string;        // 這個主題涵蓋的內容（也用來產生課程）
  role: string;         // AI 會話扮演的角色
  setting: string;
  goal: string;
  voice?: 'female' | 'male';
  opening?: string;     // 沒有填的話由 AI 開場
  openingZh?: string;
  minLevel?: LevelId;   // 建議程度，不會鎖住
};

export const categories: Category[] = [
  { id: 'food', title: '飲食', icon: 'restaurant-outline', desc: '吃喝、點餐、買菜' },
  { id: 'transport', title: '交通', icon: 'train-outline', desc: '電車、公車、問路' },
  { id: 'home', title: '居住', icon: 'home-outline', desc: '住宿、租屋、生活大小事' },
  { id: 'shopping', title: '購物', icon: 'bag-handle-outline', desc: '藥妝、衣服、退稅' },
  { id: 'errands', title: '生活手續', icon: 'document-text-outline', desc: '區役所、銀行、郵局' },
  { id: 'health', title: '健康', icon: 'medkit-outline', desc: '看病、藥局、緊急狀況' },
  { id: 'work', title: '工作', icon: 'briefcase-outline', desc: '打工、面試、職場溝通' },
  { id: 'keigo', title: '敬語', icon: 'ribbon-outline', desc: '尊敬語、謙讓語、服務業與職場敬語' },
  { id: 'social', title: '人際社交', icon: 'people-outline', desc: '交朋友、邀約、傳訊息' },
  { id: 'fun', title: '休閒娛樂', icon: 'musical-notes-outline', desc: '動漫、溫泉、演唱會' },
  { id: 'seasons', title: '季節文化', icon: 'leaf-outline', desc: '天氣、節日、送禮' },
  { id: 'feelings', title: '情緒表達', icon: 'happy-outline', desc: '開心、抱怨、安慰' },
  { id: 'native', title: '道地口語', icon: 'chatbubbles-outline', desc: '流行語、相槌、關西腔' },
];

const T = (id: string, cat: CategoryId, title: string, icon: string, focus: string, role: string, setting: string, goal: string, extra: Partial<Topic> = {}): Topic =>
  ({ id, cat, title, icon, focus, role, setting, goal, ...extra });

export const topics: Topic[] = [
  // 飲食
  T('konbini', 'food', '便利商店', 'storefront-outline', '加熱便當、要不要袋子、付款方式、集點卡、找商品', '便利商店店員', '你在超商買便當和咖啡。', '完成結帳，並問店員有沒有賣某樣東西',
    { opening: 'いらっしゃいませ。お弁当、温めますか？', openingZh: '歡迎光臨。便當要加熱嗎？' }),
  T('restaurant', 'food', '餐廳點餐', 'restaurant-outline', '人數、等位、點餐、請店員推薦、不吃某種食材、結帳', '餐廳店員', '你和朋友兩個人到餐廳吃晚餐。', '入座、請店員推薦並點餐、最後結帳',
    { opening: 'いらっしゃいませ！何名様ですか？', openingZh: '歡迎光臨！請問幾位？' }),
  T('izakaya', 'food', '居酒屋', 'beer-outline', '乾杯、先來杯啤酒、點小菜、續杯、最後點餐、分開結帳', '居酒屋的店員', '你和同事下班後去居酒屋。', '點飲料和下酒菜，最後問能不能分開結帳'),
  T('ramen', 'food', '拉麵店', 'fast-food-outline', '食券機、麵的硬度、湯頭濃淡、加麵、配料', '拉麵店老闆', '你第一次到有食券機的拉麵店。', '問清楚食券怎麼買，並點出自己喜歡的麵硬度和湯頭', { voice: 'male' }),
  T('cafe', 'food', '咖啡廳', 'cafe-outline', '尺寸、內用外帶、客製化、有沒有插座和 Wi-Fi', '咖啡廳店員', '你想在咖啡廳坐下來工作一下。', '點一杯客製化的飲料，並問有沒有插座和 Wi-Fi'),
  T('supermarket', 'food', '超市買菜', 'cart-outline', '找食材、打折貼紙、試吃、熟食、結帳', '超市店員', '你在超市找做咖哩的食材。', '問到食材的位置，並確認打折商品'),
  T('cooking', 'food', '做菜與味道', 'flame-outline', '酸甜苦辣與口感的形容、料理方式、廚房用語', '日本朋友「ゆい」', '你們在朋友家一起做台灣菜。', '說明料理步驟，並形容味道和口感'),
  // 交通
  T('subway', 'transport', '地鐵電車', 'subway-outline', '車廂與月台廣播、轉乘、各站停車與快速車、擠車廂下車', '車站站員', '你在新宿站，想去淺草卻不知道怎麼轉車。', '問出要搭哪條線、在哪裡轉乘',
    { voice: 'male', opening: 'はい、どうされましたか？', openingZh: '您好，請問怎麼了嗎？' }),
  T('shinkansen', 'transport', '新幹線', 'speedometer-outline', '買票、指定席與自由席、靠窗座位、時刻、行李', 'JR 售票處人員', '你要買明天早上從東京到京都的新幹線票。', '買到指定席的靠窗座位', { voice: 'male' }),
  T('bus', 'transport', '公車', 'bus-outline', '上下車、整理券、付錢、問站名、下車鈴', '公車司機', '你上了公車，不確定這班會不會到你要去的地方。', '確認路線和下車站，並問清楚怎麼付錢', { voice: 'male' }),
  T('taxi', 'transport', '計程車', 'car-outline', '說目的地、給地址、趕時間、付款、收據', '計程車司機', '你在飯店門口上了計程車。', '說清楚目的地，問大概多久會到並用卡付款', { voice: 'male' }),
  T('directions', 'transport', '問路', 'navigate-outline', '方向、地標、距離、走路多久、迷路時求助', '路上的日本人', '你在澀谷迷路了，想找某家店。', '問到怎麼走、大概要走幾分鐘'),
  T('airport', 'transport', '機場', 'airplane-outline', '報到、托運行李、安檢、轉機、遺失行李', '航空公司櫃台人員', '你在成田機場辦理回台灣的登機手續。', '辦好報到、托運行李並選到走道座位'),
  // 居住
  T('hotel', 'home', '飯店住宿', 'bed-outline', '入住、寄放行李、早餐時間、Wi-Fi、房間問題', '飯店櫃台人員', '你剛抵達預約好的飯店。', '辦好入住，並問到早餐時間和 Wi-Fi 密碼',
    { opening: 'いらっしゃいませ。チェックインでしょうか？', openingZh: '歡迎光臨。請問是要辦理入住嗎？' }),
  T('renting', 'home', '找房子', 'key-outline', '預算、格局、離車站多遠、初期費用、看房', '不動產仲介', '你在找東京的套房，預算每月 7 萬日圓。', '說明條件、問到初期費用並約好看房', { minLevel: 'L3' }),
  T('utilities', 'home', '搬家與水電網路', 'flash-outline', '申請水電瓦斯、網路、搬家公司、地址變更', '網路公司客服', '你剛搬家，打電話申請網路。', '說明住址和希望的開通日期，問清楚月費', { minLevel: 'L3' }),
  T('garbage', 'home', '垃圾分類', 'trash-outline', '可燃與不可燃、資源回收、收垃圾的日子、大型垃圾', '公寓的管理員', '你剛搬進公寓，不知道垃圾怎麼丟。', '問清楚分類方式和各種垃圾的收集日', { voice: 'male' }),
  T('neighbors', 'home', '鄰居相處', 'happy-outline', '打招呼、搬家送禮、噪音、借東西', '隔壁的鄰居太太', '你剛搬來，帶著小禮物去跟鄰居打招呼。', '自我介紹、送上禮物，並請對方多多指教'),
  T('repairs', 'home', '東西壞了', 'construct-outline', '熱水器、冷氣、漏水、報修、約時間', '管理公司的客服', '你家的熱水器突然不會出熱水。', '說明狀況，約好修理的時間'),
  // 購物
  T('drugstore', 'shopping', '藥妝店', 'medical-outline', '找商品、請店員推薦、試用、限購、退稅', '藥妝店店員', '你想買朋友託你買的保養品。', '找到商品、問推薦款，並確認能不能退稅'),
  T('clothes', 'shopping', '服飾店', 'shirt-outline', '試穿、尺寸、顏色、有沒有別款、修改褲長', '服飾店店員', '你看到一件喜歡的外套。', '試穿、換一個尺寸，最後決定要不要買'),
  T('electronics', 'shopping', '電器行', 'phone-portrait-outline', '比較商品、海外能不能用、保固、價格', '電器行店員', '你想買一台吹風機帶回台灣。', '比較兩款，確認台灣電壓能不能用', { voice: 'male' }),
  T('taxfree', 'shopping', '退稅與付款', 'card-outline', '免稅條件、出示護照、刷卡、分開包裝', '百貨公司免稅櫃台人員', '你買了一些東西想辦退稅。', '確認退稅條件並完成手續'),
  T('returns', 'shopping', '退換貨', 'swap-horizontal-outline', '收據、瑕疵品、換尺寸、退款', '服飾店店員', '你昨天買的衣服尺寸不對。', '說明原因，換到正確的尺寸'),
  T('secondhand', 'shopping', '二手店與古著', 'pricetags-outline', '找商品、狀況、殺價、賣東西估價', '二手店店員', '你想把不用的包包賣給二手店。', '問估價方式並談好價格', { voice: 'male', minLevel: 'L3' }),
  // 生活手續
  T('cityhall', 'errands', '區役所', 'business-outline', '住民登錄、國民健康保險、年金、需要的文件', '區役所窗口的職員', '你剛搬到日本，要辦住民登錄。', '說明來意，問清楚需要的文件和流程',
    { minLevel: 'L3', opening: 'こんにちは。本日はどのようなご用件でしょうか？', openingZh: '您好，請問今天要辦什麼事呢？' }),
  T('bank', 'errands', '銀行開戶', 'cash-outline', '開戶、印章、在留卡、提款卡、匯款', '銀行行員', '你想在日本開一個銀行帳戶。', '問到開戶需要的東西並完成申請', { minLevel: 'L3' }),
  T('mobile', 'errands', '辦手機門號', 'cellular-outline', '方案、流量、SIM 卡、合約期間、解約', '手機門市店員', '你想辦一支便宜的手機門號。', '比較兩種方案，選出適合自己的'),
  T('post', 'errands', '郵局與宅配', 'mail-outline', '寄包裹、國際郵件、再配達、追蹤', '郵局櫃台人員', '你要把一箱東西寄回台灣。', '問清楚寄送方式、價格和天數'),
  T('hairsalon', 'errands', '美容院', 'cut-outline', '剪髮長度、修瀏海、染髮、洗髮、預約', '美容師', '你第一次在日本剪頭髮。', '說清楚想要的髮型和長度'),
  T('lostfound', 'errands', '遺失物', 'search-outline', '派出所、描述物品、在哪裡弄丟、聯絡方式', '派出所的警察', '你的錢包在電車上不見了。', '說明遺失的時間地點和錢包特徵', { voice: 'male' }),
  // 健康
  T('clinic', 'health', '看醫生', 'medkit-outline', '掛號、描述症狀、持續多久、過敏、吃藥方式', '診所的醫生', '你感冒了，喉嚨痛又有點發燒。', '描述症狀和持續時間，問清楚吃藥方式', { voice: 'male' }),
  T('pharmacy', 'health', '藥局', 'bandage-outline', '買成藥、說明症狀、副作用、一天吃幾次', '藥劑師', '你頭痛，想買止痛藥。', '說明症狀，買到適合的藥並問清楚吃法'),
  T('dentist', 'health', '牙醫', 'happy-outline', '牙痛、蛀牙、洗牙、麻醉、下次預約', '牙醫師', '你吃東西時牙齒會痛。', '說明哪裡痛、什麼時候痛，約好下次治療', { voice: 'male', minLevel: 'L3' }),
  T('emergency', 'health', '緊急狀況', 'alert-circle-outline', '叫救護車、受傷、求救、說明地點', '119 的接線員', '你的朋友在路上跌倒，腳不能動。', '說清楚發生什麼事和所在位置'),
  T('body', 'health', '身體不舒服', 'body-outline', '痛、癢、頭暈、想吐、累、各部位的說法', '關心你的日本朋友', '朋友看你臉色不太好。', '說明自己哪裡不舒服'),
  T('gym', 'health', '健身房', 'barbell-outline', '入會、器材使用、預約課程、置物櫃', '健身房櫃台人員', '你想加入健身房會員。', '問清楚月費和設施，完成入會'),
  // 工作
  T('baito-interview', 'work', '打工面試', 'people-outline', '自我介紹、可以排班的時間、時薪、交通費', '居酒屋店長（面試官）', '你來居酒屋面試打工。', '自我介紹、說明可以排班的時間、問時薪',
    { voice: 'male', minLevel: 'L3', opening: '今日は来てくれてありがとう。じゃあ、簡単に自己紹介してもらえますか？', openingZh: '謝謝你今天過來。那先簡單自我介紹一下吧？' }),
  T('baito', 'work', '打工日常', 'storefront-outline', '接客用語、跟同事溝通、請假、換班', '打工的前輩', '你是新來的店員，第一天上班。', '問清楚工作內容，並說明下週想請假', { minLevel: 'L3' }),
  T('job-interview', 'work', '日商面試', 'briefcase-outline', '自我介紹、志望動機、優缺點、逆質問', '日商 IT 公司的面試官', '你正在應徵這家公司的工程師職位。', '自我介紹、說明志望動機，最後提出一個問題',
    { voice: 'male', minLevel: 'L4', opening: '本日はお越しいただきありがとうございます。それでは、自己紹介をお願いいたします。', openingZh: '感謝您今天前來。那麼，請先自我介紹。' }),
  T('horenso', 'work', '報連相', 'chatbox-ellipses-outline', '報告進度、聯絡變更、找上司商量、說明問題與對策', '你的上司（課長）', '你負責的專案進度落後兩天。', '用適當的敬語報告狀況並提出對策', { voice: 'male', minLevel: 'L4' }),
  T('business-phone', 'work', '商務電話', 'call-outline', '接電話、轉接、留言、約時間、確認', '客戶公司的總機', '你打電話給客戶，要找田中先生確認會議時間。', '用商務電話用語轉接並約好時間', { minLevel: 'L4' }),
  T('business-email', 'work', '商務郵件與訊息', 'mail-open-outline', '開頭結尾、請託、催促、道歉、確認', '公司的前輩', '前輩教你怎麼寫郵件跟客戶延期。', '說出一封延期郵件的重點句子', { minLevel: 'L4' }),
  T('meeting', 'work', '開會', 'easel-outline', '發言、贊成反對、提出意見、確認待辦', '同部門的同事', '你們在討論新活動的企劃。', '提出自己的意見，並委婉地表達不同看法', { minLevel: 'L4' }),
  T('nomikai', 'work', '公司聚餐', 'wine-outline', '乾杯、幫忙倒酒、敬語與閒聊、續攤、道謝', '部門的部長', '公司的歡迎會上，部長坐在你旁邊。', '有禮貌地聊天，最後得體地道謝', { voice: 'male', minLevel: 'L3' }),
  // 敬語
  T('keigo-basics', 'keigo', '敬語入門', 'school-outline', '丁寧語、尊敬語、謙讓語的差別，什麼時候要用敬語，です・ます的基本', '日語老師', '你第一次正式學敬語。', '說出三種敬語的差別，並各舉一句例子'),
  T('sonkeigo', 'keigo', '尊敬語', 'trending-up-outline', 'いらっしゃる、おっしゃる、召し上がる、ご覧になる、お〜になる 等抬高對方的說法', '公司的前輩', '前輩在教你怎麼跟客戶說話。', '用尊敬語詢問客戶的行程和需求', { minLevel: 'L3' }),
  T('kenjougo', 'keigo', '謙讓語', 'trending-down-outline', '参る、申す、いただく、拝見する、お〜する 等降低自己的說法', '公司的前輩', '你在練習對外介紹自己和公司。', '用謙讓語介紹自己並說明公司的服務', { minLevel: 'L3' }),
  T('service-keigo', 'keigo', '服務業敬語', 'storefront-outline', 'いらっしゃいませ、かしこまりました、少々お待ちください 等打工與接客必備用語', '打工的店長', '今天是你在餐廳打工的第一天。', '用正確的接客用語從帶位接待到結帳', { voice: 'male', minLevel: 'L3' }),
  T('keigo-mistakes', 'keigo', '常見敬語錯誤', 'alert-circle-outline', '二重敬語、打工敬語（よろしかったでしょうか）、尊敬語和謙讓語用反、台灣人常犯的錯', '日語老師', '老師在幫你檢查寫好的敬語。', '找出不自然的敬語並改成正確說法', { minLevel: 'L3' }),
  T('elders', 'keigo', '對長輩與老師', 'people-outline', '跟房東、老師、朋友父母說話的禮貌程度，拜訪別人家的客套話', '日本朋友的媽媽', '你第一次到日本朋友家拜訪。', '有禮貌地打招呼、送上伴手禮並道謝離開', { minLevel: 'L3' }),
  // 人際社交
  T('self-intro', 'social', '自我介紹', 'person-outline', '名字、從哪裡來、工作或學校、興趣、請多指教', '語言交換活動上認識的日本人', '你第一次參加語言交換活動。', '完整地自我介紹，並問對方一個問題'),
  T('friends', 'social', '交朋友', 'people-circle-outline', '找共同話題、交換 LINE、約下次見面', '日本朋友「ゆい」', '你們在語言交換活動認識，輕鬆聊天。', '聊聊興趣，最後交換聯絡方式',
    { opening: 'はじめまして！ゆいです。台湾から来たんですか？', openingZh: '初次見面！我是由衣。你是從台灣來的嗎？' }),
  T('invitations', 'social', '邀約與拒絕', 'calendar-outline', '約時間地點、答應、委婉拒絕、改天', '日本朋友', '朋友約你這週末去看電影。', '約好時間地點，或委婉拒絕並提議改天'),
  T('dating', 'social', '約會', 'heart-outline', '約對方出去、稱讚、聊天、告白的說法', '你有好感的日本人', '你們第二次單獨出來吃飯。', '自然地聊天並約下一次見面', { minLevel: 'L3' }),
  T('line-chat', 'social', 'LINE 傳訊息', 'chatbubble-outline', '訊息常用縮寫、貼圖文化、已讀不回、約時間', '用 LINE 聊天的日本朋友', '你們用 LINE 討論週末要去哪裡。', '用輕鬆的口語訊息約好行程'),
  T('thanks-sorry', 'social', '道謝與道歉', 'hand-left-outline', 'ありがとう的各種程度、すみません的用法、正式道歉', '日本朋友', '你借了朋友的傘卻弄丟了。', '好好道歉並提出補償'),
  T('compliments', 'social', '稱讚與回應', 'thumbs-up-outline', '稱讚外表穿搭、稱讚能力、謙虛地回應', '日本朋友', '朋友換了新髮型。', '自然地稱讚對方，並回應對方的稱讚'),
  // 休閒娛樂
  T('anime', 'fun', '動漫與宅文化', 'tv-outline', '喜歡的作品、角色、聖地巡禮、周邊、推し', '動漫迷的日本朋友', '你們在秋葉原逛動漫商店。', '聊喜歡的作品和角色，並問推薦'),
  T('karaoke', 'fun', '唱 KTV', 'mic-outline', '開包廂、時數、點歌、飲料吧、延長', 'KTV 櫃台人員', '你和朋友想唱兩小時。', '開好包廂、選好方案和飲料'),
  T('onsen', 'fun', '溫泉', 'water-outline', '入浴規矩、刺青、毛巾、男湯女湯、休息區', '溫泉旅館的女將', '你第一次去日本的溫泉旅館。', '問清楚泡溫泉的規矩和晚餐時間'),
  T('concert', 'fun', '演唱會與推活', 'musical-notes-outline', '抽票、周邊、應援、感想', '同一個偶像的日本粉絲', '你在演唱會會場排周邊。', '跟對方聊喜歡的成員和演唱會感想'),
  T('sports', 'fun', '看球賽與運動', 'baseball-outline', '棒球、加油、規則、喜歡的隊伍、球場美食', '一起看棒球的日本朋友', '你們在東京巨蛋看棒球。', '聊喜歡的球隊和比賽情況', { voice: 'male' }),
  T('sightseeing', 'fun', '景點與美術館', 'camera-outline', '門票、拍照規定、導覽、開放時間、寄物', '美術館的服務人員', '你想參觀美術館的特展。', '買好票並問清楚能不能拍照'),
  T('matsuri', 'fun', '祭典與煙火', 'sparkles-outline', '浴衣、攤販、煙火大會、人潮', '一起去祭典的日本朋友', '你們穿浴衣去夏日祭典。', '一起逛攤販，聊吃的和煙火'),
  // 季節文化
  T('weather', 'seasons', '天氣閒聊', 'partly-sunny-outline', '熱冷、梅雨、颱風、花粉、天氣預報', '公司的同事', '早上在電梯遇到同事。', '用天氣自然地開啟話題'),
  T('hanami', 'seasons', '賞花', 'flower-outline', '櫻花、佔位、野餐、夜櫻、開花預測', '日本朋友', '你們約好週末去公園賞櫻。', '討論時間地點和要帶的東西'),
  T('summer', 'seasons', '夏天', 'sunny-outline', '海邊、暑假、中暑、刨冰、夏日活動', '日本朋友', '暑假快到了。', '一起規劃暑假要做什麼'),
  T('newyear', 'seasons', '新年', 'gift-outline', '新年問候、初詣、年菜、福袋、壓歲錢', '房東太太', '新年第一次見到房東。', '用正確的新年問候語打招呼並聊新年'),
  T('gifts', 'seasons', '送禮文化', 'gift-outline', '伴手禮、回禮、送禮的客氣話、包裝', '公司的同事', '你從台灣帶伴手禮回公司。', '用適當的說法把伴手禮分給大家'),
  T('holidays', 'seasons', '節日與連假', 'calendar-number-outline', '黃金週、盂蘭盆節、聖誕節、情人節', '日本朋友', '連假快到了。', '聊連假的計畫和日本節日的習俗'),
  // 情緒表達
  T('happy', 'feelings', '開心與興奮', 'happy-outline', '開心、期待、感動、太好了的各種說法', '日本朋友', '你剛收到好消息。', '把開心的心情生動地表達出來'),
  T('complain', 'feelings', '抱怨與不滿', 'sad-outline', '抱怨、累了、受不了、委婉的不滿', '一起下班的同事', '今天工作特別累。', '跟同事抱怨一下今天發生的事'),
  T('comfort', 'feelings', '安慰與鼓勵', 'heart-half-outline', '安慰、鼓勵、加油的各種說法、陪伴', '心情不好的日本朋友', '朋友考試沒考好，很沮喪。', '安慰並鼓勵對方'),
  T('reactions', 'feelings', '驚訝與反應', 'flash-outline', '真的嗎、好厲害、不會吧、原來如此', '分享八卦的日本朋友', '朋友在跟你講一件很誇張的事。', '用自然的反應接話，讓對話熱絡'),
  T('opinions', 'feelings', '表達意見', 'chatbubbles-outline', '贊成、反對、委婉表達不同看法、我覺得', '日本朋友', '你們在討論要去哪裡旅行。', '說出自己的想法，委婉地表達不同意見'),
  T('requests', 'feelings', '拜託與請求', 'hand-right-outline', '委婉的拜託、請對方幫忙、不好意思的說法', '公司的前輩', '你需要前輩幫你看一下資料。', '有禮貌地拜託前輩幫忙', { minLevel: 'L3' }),
  // 道地口語
  T('slang', 'native', '年輕人流行語', 'trending-up-outline', 'やばい、エモい、推し、草、りょ 等網路與年輕人用語', '日本大學生「ゆい」', '你們在咖啡廳聊天。', '在聊天中自然地用上幾個流行語'),
  T('aizuchi', 'native', '相槌與附和', 'ear-outline', 'そうなんだ、なるほど、確かに、へえ 等讓對話自然的附和', '日本朋友', '朋友在跟你講他週末的事。', '用各種相槌自然地聽完並接話'),
  T('onomatopoeia', 'native', '擬聲擬態語', 'musical-note-outline', 'ドキドキ、ペコペコ、ワクワク、ふわふわ 等生活中超常用的擬聲擬態語', '日本朋友', '你們在聊美食和心情。', '用擬聲擬態語形容味道和心情'),
  T('kansai', 'native', '關西腔', 'chatbubble-ellipses-outline', 'あかん、ほんま、なんでやねん、おおきに 等大阪話', '大阪的朋友', '你到大阪找朋友玩。', '聽懂對方的關西腔並試著用幾句', { voice: 'male', minLevel: 'L3' }),
  T('idioms', 'native', '慣用句與諺語', 'library-outline', '日常常用的慣用句、諺語與四字熟語', '日本朋友', '你們在聊最近的生活。', '在對話中用上一兩個慣用句', { minLevel: 'L3' }),
  T('casual', 'native', '常體與敬體切換', 'swap-vertical-outline', '什麼時候用です・ます、什麼時候可以說常體、從敬語慢慢變熟', '剛認識不久的日本朋友', '你們漸漸變熟了。', '從敬體自然地切換到常體聊天', { minLevel: 'L3' }),
];

export const topicById = (id: string) => topics.find(t => t.id === id);
export const topicsIn = (cat: CategoryId) => topics.filter(t => t.cat === cat);
