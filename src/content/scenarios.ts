import { Scenario } from './types';

export const scenarios: Scenario[] = [
  // 旅行
  { id: 'ai-station', level: 'L2', category: '旅行', title: '車站問路', icon: 'train-outline',
    role: '新宿站的站員', setting: '你在新宿站，想去淺草，不知道怎麼轉車。', goal: '問出要搭哪條線、在哪裡轉乘',
    opening: 'はい、どうされましたか？', openingZh: '您好，請問怎麼了嗎？' },
  { id: 'ai-konbini', level: 'L2', category: '旅行', title: '便利商店結帳', icon: 'storefront-outline',
    role: '便利商店的店員', setting: '你要買便當和咖啡，還想問店裡有沒有 ATM。', goal: '完成結帳並問到 ATM 的位置',
    opening: 'いらっしゃいませ。お弁当、温めますか？', openingZh: '歡迎光臨。便當要加熱嗎？' },
  { id: 'ai-restaurant', level: 'L2', category: '旅行', title: '居酒屋點餐', icon: 'restaurant-outline',
    role: '居酒屋的店員', setting: '你和朋友兩個人走進居酒屋。', goal: '入座、點兩杯啤酒和店員推薦的菜、最後結帳',
    opening: 'いらっしゃいませ！何名様ですか？', openingZh: '歡迎光臨！請問幾位？' },
  { id: 'ai-hotel', level: 'L2', category: '旅行', title: '飯店入住', icon: 'bed-outline',
    role: '飯店櫃台人員', setting: '你剛抵達預約好的飯店。', goal: '辦好入住，並問到早餐時間和 Wi-Fi 密碼',
    opening: 'いらっしゃいませ。チェックインでしょうか？', openingZh: '歡迎光臨。請問是要辦理入住嗎？' },
  // 生活
  { id: 'ai-rent', level: 'L3', category: '生活', title: '找房子', icon: 'home-outline',
    role: '不動產仲介', setting: '你在找東京的套房，預算每月 7 萬日圓以內，希望離車站近。', goal: '說明條件、問到租金與初期費用、約好看房時間',
    opening: 'いらっしゃいませ。本日はどのようなお部屋をお探しですか？', openingZh: '歡迎光臨。今天想找什麼樣的房子呢？' },
  { id: 'ai-ward', level: 'L3', category: '生活', title: '區役所辦手續', icon: 'document-text-outline',
    role: '區役所窗口的職員', setting: '你剛搬到日本，要辦住民登錄。', goal: '說明來意，問清楚需要的文件和流程',
    opening: 'こんにちは。本日はどのようなご用件でしょうか？', openingZh: '您好，請問今天要辦什麼事呢？' },
  { id: 'ai-baito', level: 'L3', category: '生活', title: '打工面試', icon: 'people-outline',
    role: '居酒屋店長（面試官）', setting: '你來居酒屋面試打工。', goal: '自我介紹、說明可以排班的時間、問時薪',
    opening: '今日は来てくれてありがとう。じゃあ、簡単に自己紹介してもらえますか？', openingZh: '謝謝你今天過來。那先簡單自我介紹一下吧？' },
  { id: 'ai-clinic', level: 'L3', category: '生活', title: '看醫生', icon: 'medkit-outline',
    role: '診所的醫生', setting: '你感冒了，喉嚨痛又有點發燒，到診所看病。', goal: '描述症狀和持續時間，問清楚吃藥方式',
    opening: 'こんにちは。今日はどうされましたか？', openingZh: '您好，今天哪裡不舒服呢？' },
  // 職場
  { id: 'ai-interview', level: 'L4', category: '職場', title: '日商面試', icon: 'briefcase-outline',
    role: '日商 IT 公司的面試官', setting: '你正在應徵這家公司的工程師職位。', goal: '自我介紹、說明志望動機，最後提出一個逆質問',
    opening: '本日はお越しいただきありがとうございます。それでは、自己紹介をお願いいたします。', openingZh: '感謝您今天前來。那麼，請先自我介紹。' },
  { id: 'ai-horenso', level: 'L4', category: '職場', title: '向上司報告', icon: 'chatbox-ellipses-outline',
    role: '你的上司（課長）', setting: '你負責的專案進度落後兩天。', goal: '用適當敬語報告狀況、說明原因並提出對策',
    opening: 'お疲れさま。何かあった？', openingZh: '辛苦了。有什麼事嗎？' },
  { id: 'ai-phone', level: 'L4', category: '職場', title: '商務電話', icon: 'call-outline',
    role: '客戶公司的總機', setting: '你打電話給客戶，要找業務部的田中先生確認會議時間。', goal: '用商務電話用語轉接並約定時間',
    opening: 'お電話ありがとうございます。株式会社山田商事でございます。', openingZh: '感謝您的來電，這裡是山田商事。' },
  { id: 'ai-keigo', level: 'L4', category: '職場', title: '接待客戶', icon: 'business-outline',
    role: '來訪的客戶（佐藤部長）', setting: '客戶來公司開會，你負責在大廳接待。', goal: '正確使用尊敬語與謙讓語，帶客戶到會議室',
    opening: 'すみません、本日14時にお約束をしております、佐藤と申します。', openingZh: '不好意思，我是今天下午兩點有約的佐藤。' },
  // 自由
  { id: 'ai-free', level: 'L2', category: '自由', title: '跟日本朋友聊天', icon: 'happy-outline',
    role: '住在東京、個性開朗的日本大學生「ゆい」', setting: '你們在語言交換活動認識，輕鬆聊天。', goal: '聊聊興趣、喜歡的日本食物或想去的地方',
    opening: 'はじめまして！ゆいです。台湾から来たんですか？', openingZh: '初次見面！我是由衣。你是從台灣來的嗎？' },
];

export const scenarioById = (id: string) => scenarios.find(s => s.id === id);
