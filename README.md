# 皓學日語 v2

React Native（Expo）＋ Firebase ＋ Claude AI。

## 功能

- **生活主題課程**：12 大類、77 個生活主題（飲食、交通、居住、購物、手續、健康、工作、社交、娛樂、季節文化、情緒、道地口語），每個主題 3 堂一般課程：基本說法、道地說法、情境練習；AI 對話統一在「AI 教練」分頁
- **敬語**：和五十音並列的語言系統，獨立成一個基礎單元（6 個主題：敬語入門、尊敬語、謙讓語、服務業敬語、常見敬語錯誤、對長輩與老師）
- 程度只決定難度，不鎖住主題；依學習目標推薦主題
- **五十音**：平假名、片假名各 5 課，附字源聯想和五十音表
- **AI 情境會話**：13 個情境，AI 扮演站員、店員、面試官等角色，每句即時糾正並建議下一句
- **AI 會話分析**：文法、用詞、禮貌程度、流暢度評分，整理要記的句子
- **AI 句子健檢**：寫一句日文，AI 改正並提供其他說法與語氣差異
- **日文讀物**：11 篇原創短篇（小說、隨筆、文化），每篇三到五分鐘。中譯預設收起來先猜再對答案，點任一行可以朗讀，文末附五個帶得走的詞
- **單字本**：課程、會話、報告裡都能收藏，間隔複習
- **等級制度**：XP 依課程難度加權（道地說法 ×1.3、情境練習 ×1.6、AI 會話 ×2），累積換十段段位，升段時會有慶祝畫面
- **成長曲線**：「我的」頁可以看收藏單字的累積量，支援 30 天／90 天／全部
- **登入**：Apple、Google、訪客試用（訪客之後可綁定帳號，紀錄不遺失），進度雲端同步；「我的」頁可以看到目前綁了哪些登入方式、加綁另一種、或解除綁定（會保留至少一種）
- **自然語音**：Google 神經語音（男女聲依角色），可調語速，播過一次存在手機
- **語音輸入**：AI 會話與句子健檢可以直接用說的（手機內建辨識，免費）
- **方案**：課程、讀物、五十音、單字複習、排行榜、等級、成長曲線**全部免費**；付費只買 AI 與語音的每日用量（標準 NT$150／月、無限 NT$320／月，年繳約 7 折）
- **排行榜**：依累積 XP 排名，看得到其他學員的等級、連續天數；可以在「我的」頁退出，退出後資料會從榜上刪除
- **官方連結**：「我的」頁最下面有官網、LINE 官方帳號與 Instagram
- 日語程度在「主題」頁上方用標籤切換（入門／初級／中級／高級），只決定難度，不鎖住主題
- 紅白品牌配色、每日目標、XP、連續天數、深色模式、刪除帳號

---

## 一、開始使用（3 個指令）

把這個資料夾放到桌面，在終端機執行：

```
cd ~/Desktop/haogaku-japanese
npm install
npm start
```

用 Expo Go 掃 QR Code。第一次打開會看到「還差一步：設定 Firebase」，照下面第二步設定即可。

> 這個專案已經包含所有需要的套件（Expo SDK 58），不需要再執行 create-expo-app 或 expo install。

---

## 二、建立 Firebase 專案

1. 到 https://console.firebase.google.com 建立專案
2. **新增網頁應用程式**（是「網頁」，因為使用 Firebase JS SDK），把設定值填進專案裡的 `.env`，存檔後按 `Ctrl+C` 再執行 `npm start`
3. **Authentication → 登入方式**，啟用：
   - 匿名（訪客試用用）
   - Google
   - Apple
4. **Firestore Database** → 建立資料庫，地區選 `asia-east1`（台灣）
5. 專案升級為 **Blaze 方案**（Cloud Functions 需要，小流量幾乎免費，建議設預算提醒）

---

## 三、部署 AI 後端

```
npm install -g firebase-tools
firebase login
firebase use --add            # 選你的專案
cd functions && npm install && cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY   # 貼上 Anthropic API 金鑰
firebase deploy --only functions,firestore:rules
```

- API 金鑰到 https://console.anthropic.com 申請，**只存在後端**，不會出現在 app 裡
- 模型與每日次數在 `functions/src/index.ts` 最上面的 `MODEL`、`LIMITS` 調整（目前訪客 10 次、會員 40 次）

**啟用自然語音**：打開下面網址按「啟用」，再部署一次後端。
```
https://console.cloud.google.com/apis/library/texttospeech.googleapis.com?project=haogaku-60c56
```
Text-to-Speech 有每月免費額度，超過後依字數計費；短句加上手機快取，成本很低。語音每日次數在 `TTS_LIMITS` 調整。

部署完成後，**在 Expo Go 用「先試用」就能測試 AI 會話與自然語音**。語音輸入（麥克風）需要開發版 App。

---

## 四、Google 與 Apple 登入（需要開發版 App）

Expo Go 不支援 Google、Apple 原生登入，要做一個自己的開發版 App：

**Google**
1. Firebase → Authentication → Google，展開「網頁 SDK 設定」，複製**網頁用戶端 ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
2. Google Cloud 主控台（同一個專案）→ 憑證 → 建立 OAuth 用戶端 ID → 類型選 iOS，套件 ID 填 `com.formaglobal.haogaku`
3. 填入 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`，並把它反過來寫成 `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`

**Apple**
1. 需要 Apple Developer Program（年費 US$99）
2. developer.apple.com → Identifiers → 你的 App ID 勾選 **Sign In with Apple**
3. Firebase → Authentication → Apple，啟用即可（iOS 原生登入不用填服務 ID）

**打包開發版**
```
npm install -g eas-cli
eas login
eas build --profile development --platform ios
```
完成後用 iPhone 掃描連結安裝，之後用 `npm run dev` 開發。

---

## 五、上架前檢查

- [ ] 替換 `assets/icon.png`（1024×1024，不透明）與啟動畫面
- [ ] App Store Connect 填隱私權政策網址（有收集 email 與學習紀錄）
- [ ] 隱私問卷：勾選「聯絡資訊（email）」「使用者內容」，用途為 App 功能
- [ ] 確認刪除帳號功能可用（App Store 規定）
- [x] Apple 登入帳號刪除時撤銷 token（`src/state/auth.tsx` 的 `deleteAccount`：先請使用者重新用 Apple 登入拿 `authorizationCode`，再呼叫 `revokeAccessToken`）
- [ ] 正式打包：`eas build -p ios --profile production`，再 `eas submit -p ios`

---

## 檔案結構

```
App.tsx                      進入點
src/navigation.tsx           登入判斷、分頁、頁面堆疊
src/theme.ts                 設計系統：四條原則寫在檔頭，改樣式前先讀
src/ui/                      共用元件（髮絲線、按鈕、站名牌、印章…）
src/ui/seal.tsx              漢字印章與主題橫幅（沒有照片時的視覺）
src/ui/images.ts             主題照片的登記表（要加照片改這裡）
assets/topics/               主題照片放這裡
src/state/auth.tsx           Apple／Google／訪客登入、綁定、刪除帳號
src/state/data.tsx           學習進度、單字本、XP，手機快取＋雲端同步
src/lib/ai.ts                呼叫 AI 後端
src/content/                 課程內容：五十音、情境課、AI 情境、流行語
src/screens/                 所有畫面
functions/src/index.ts       AI 後端：會話、分析、句子健檢、每日額度
```

## 預先產生課程（上架前必做）

讓所有主題課隨 app 內建，用戶打開立即開始、離線也能用、不花 AI 額度。

```
ANTHROPIC_API_KEY=sk-ant-你的金鑰 npm run generate-lessons -- --levels=L2,L3
```

- 產生 83 個主題 × 3 堂 × 2 種程度 = 498 堂，約 30〜45 分鐘
- **目前狀態：L2 的 249 堂已經產生好了，L3 的 249 堂還沒**。
  只補 L3：`ANTHROPIC_API_KEY=... npm run generate-lessons -- --levels=L3`
  （已經有的不會重跑，所以直接下 `--levels=L2,L3` 也一樣只會補 L3）
- 入門程度會使用初級版本、高級程度會使用中級版本；想要 4 種程度都有，拿掉 `--levels=L2,L3`（996 堂）
- 中途中斷或有失敗，再執行一次同樣的指令就會從沒做完的繼續
- 只重做某個主題：加上 `--only=ramen --force`
- 結果在 `src/content/generated/lessons.json`，可以直接打開檢查、修改日文內容，存檔後重新整理 app 就會生效

新增主題後，再執行一次就會只產生新的部分。

## AI 課程內容的管理（後備）

沒有預先產生的主題（例如上架後新增的），第一次有人打開時才由 AI 產生，存在 Firestore 的 `lessons` 集合，之後所有人共用；進入主題頁時會在背景先準備好。

- 想檢查或修改內容：Firebase 主控台 → Firestore → `lessons`，直接編輯 `steps` 裡的文字
- 想重新產生某一課：刪掉那份文件，下次有人打開就會重新產生
- 文件裡的 `reviewed` 欄位可以拿來標記你審核過的課程
- 課程用的模型在 `functions/src/index.ts` 的 `LESSON_MODEL`，會話用的是 `MODEL`

## 設計系統

視覺語言是「圓潤、飽滿、重字」。四條原則寫在 `src/theme.ts` 檔頭，改樣式前先讀：

1. **圓角要大**。卡片 24／28，按鈕和標籤一律 pill。不要出現小圓角
2. **層次靠「殼」**：深酒紅底 → 酒紅大卡 → 白色面板用大圓角往上疊蓋住它（見首頁的 `Screen shell` ＋ `Sheet`）。
   殼是 `theme.shell`（深酒紅，不是黑——黑不在品牌色裡）；想要更亮的版面就把它換成 `cream`
3. 標題用 **800 字重＋負字距**。UI 全部系統字，明體只留給日文內容本身（例句、假名、站名牌）
4. **一個畫面只有一塊飽和色鋪滿**，其餘是白、淺灰、黑

主要元件在 `src/ui/index.tsx`：`Sheet`（白面板）、`IconTile`（淺灰圓角磚）、`RoundButton`（圓鈕）、
`ProgressDots`（進度站點）、`Avatar`、`Pill`、`Card`（`tone="soft"` 是淺灰磚）。

## 加入照片

介面的圖像語言分兩種，都是明體排在同一款圓角磚裡，不需要任何圖檔：

- **漢字** → 系統與集合：五十音「音」、敬語「敬」、AI 教練「話」、複習「覚」
- **數字** → 生活主題的單元編號：生活主題 01〜77、敬語底下 01〜06（`curriculum.ts` 的 `topicNumber`）

主題卡上方的號碼版（`UnitBlock`）底色依**編號**輪替，不是依分類——綁分類的話整個「飲食」
會變成一整片同色。分類的辨識交給號碼版左上角的小漢字。

編號是畫面上的身分，分類順序改了編號就會變——不要拿它當資料的 key，key 一律用 `topic.id`。
想換成真照片：

1. 圖放到 `assets/topics/`，檔名用主題 id，例如 `ramen.jpg`
2. 到 `src/ui/images.ts` 的 `topicPhotos` 加一行 require

目前已配圖的 8 個主題：拉麵店、居酒屋、咖啡廳、超市買菜、地鐵電車、新幹線、溫泉、祭典與煙火。
來源與授權記在 `assets/topics/CREDITS.md`。

**挑圖的兩條硬規則**（寫在 CREDITS.md 裡，換圖時照做）：

- **不要可辨識的人臉**。Pexels／Unsplash 的授權不含肖像權（model release）
- **不要第三方商標**。所以便利商店、藥妝店刻意沒配圖——日本這兩類店最好看的照片
  一定拍到 7-11／Lawson 招牌或商品包裝，這兩個主題留用單元編號

登記過的主題會在主題頁變成大圓角橫幅照片、主題卡變成縮圖；沒登記的繼續用單元編號，所以可以一個一個慢慢加，不用一次補齊。
登入頁的主視覺也在同一個檔案（`heroImage`，目前是 `assets/logo.png`）。建議 1200×800（3:2）、JPEG、單張 200KB 以內。

**只放自己拍的或有商用授權的圖**，App Store 審查會看版權。

## 新增內容

- **新情境課**：在 `src/content/scenes.ts` 照格式新增，加進 `curriculum.ts` 的單元
- **新主題**：在 `src/content/topics.ts` 新增一行（名稱、涵蓋內容、AI 角色、情境、任務），課程和 AI 會話會自動產生，不用改後端
- **新分類**：加到 `topics.ts` 的 `categories`，並在 `src/ui/seal.tsx` 的 `catKanji` 補一個代表漢字
- **流行語**：加到 `src/content/slang.ts`。目前 52 個，所以是 52 天一輪。
  含漢字的詞要填 `kana`（平假名讀音），假名詞不用——詞形本身就是讀音
