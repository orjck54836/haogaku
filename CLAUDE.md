# 皓學日語

給台灣人的日語學習 App。React Native 0.88 / Expo SDK 58 / Firebase / Claude API。
介面文字一律**繁體中文**，程式註解也用中文，而且**寫原因不寫動作**（「為什麼這樣做」比「這段在做什麼」有用）。

## 驗證一定要跑完三段

少一段就會漏東西，這是實際踩出來的：

```bash
npx tsc --noEmit                    # 1. 型別（functions/ 要另外在該目錄再跑一次）
npx expo export --platform ios      # 2. 打包：抓 require 路徑、循環相依、資源有沒有進 bundle
npx expo start --go --ios           # 3. 模擬器實跑 ← 版面問題只有這段抓得到
```

**第 3 段不能跳過。** 這個專案絕大多數的真實缺陷（圖片撐破卡片、白字讀不到、
面板沒撐到底、Pill 被擠成直排）前兩段全部顯示通過。

Metro 要背景跑並導到 log 檔再輪詢——直接接 `| tail` 會卡住，因為 dev server 不會結束。
用完記得 `pkill -f "expo start --go"`。

## 設計系統

`src/theme.ts` 檔頭有四條規則，改版面前先讀。摘要：

1. **圓角要大**。卡片 `lg`(24)／`xl`(28)，按鈕和標籤一律 `pill`。不要出現小圓角
2. **層次靠「殼」**：`Screen shell` 深色底 → `WineCard` 彩色大卡 → `Sheet` 白面板用大圓角往上疊
3. 標題用重字重（800）＋負字距；中日文混排負字距給 -0.3 就好
4. 一個畫面只有一塊飽和色鋪滿，其餘是白、淺灰、黑

日文內容一律用明體（`fonts.serifMedium`／`serifRegular`），中文 UI 用系統字。

## 照片

83 個主題全部有圖，共 86 張（含 `basics` 和兩張介面用圖），登記在 `src/ui/images.ts`。

挑圖的兩條**硬規則**，和完整的來源表、38 筆否決紀錄都在
[`assets/topics/CREDITS.md`](assets/topics/CREDITS.md)：

1. **不要可辨識的人臉**（Pexels／Unsplash 的授權不含肖像權）
2. **不要可辨識的第三方商標**

搜尋頁的文字描述**看不出**這兩件事，每張都要下載下來親眼確認。
最常踩到的第三類是**拍錯國家**（中國、義大利、德國、泰國的場景混進日語 App）。

拍不到本體的主題（自我介紹、道謝、相槌）用**意象相近的物件**：名片、封蠟信、耳機。

## 已知的版面陷阱

都踩過一次，寫在 `src/ui/index.tsx` 的註解裡：

- **鋪底的 `<Image>` 一定要給 `width`/`height`**，只下四邊 inset 會照圖片內建尺寸放大成局部特寫
  （同一類問題：`aspectRatio` 下在 `<Image>` 上不生效，要放外層 `View`）
- **`height: '100%'` 需要父層有確定高度**，靠 padding 撐出來的 auto 高度算不出百分比
- **父層有左右 padding 時，絕對定位子層的 `width: '100%'` 算的是內容區寬度**，右邊會露出一條底色
- **沒有裝漸層套件**。不要用多層矩形模擬漸層，邊界在實機上是看得見的灰帶；遮罩一律單層平光
- **`TopBar` 的左右欄固定 44pt**，只能放 44pt 的圓形元件，塞寬的 Pill 進去字會變直排
- `ImageBackground` 在 RN 0.88 已棄用，用 `View` + 絕對定位的 `Image`

## 新裝的原生模組不要頂層 import

`expo-*` 這類有原生模組的套件，**用到才 require，並且包 try/catch**：

```ts
function loadX() { try { return require('expo-x'); } catch { return null; } }
```

原因：這種套件在 import 當下就會 `requireNativeModule`。原生模組是編進 binary 的，
`npx expo install` 不會讓它出現在**已經裝在手機上的 dev client** 裡，
於是 app 一啟動就死在「Cannot find native module 'ExpoXxx'」——整個打不開，
不只是那個功能壞掉。（`expo-store-review` 就這樣炸過一次。）

而且**模擬器的 Expo Go 驗不出來**：Expo Go 內建了大部分 expo 模組，一切正常；
裝 dev client 的實機才會炸。裝新的原生套件後要嘛重新 build dev client
（`npx expo run:ios` 或 EAS），要嘛確保程式在模組不存在時能安靜降級。

## 內容

- **課程**：`src/content/generated/lessons.json`，**初級 249 堂＋進階 249 堂**，兩階都齊了。
  產生要 `ANTHROPIC_API_KEY`（console.anthropic.com 發的 `sk-ant-api03-`，
  Claude Code 的登入憑證不能用）：`npm run generate-lessons -- --levels=L3`
- **流行語**：`src/content/slang.ts`，52 個，每天輪一個。
  含漢字的要填 `kana`（平假名讀音），假名詞不用——詞形本身就是讀音
- **主題**：`src/content/topics.ts`。`topicNumber()` 的編號是畫面上的身分，
  順序改了編號就會變，**不要拿它當資料的 key**，key 一律用 `topic.id`
- **讀物**：`src/content/readings.ts`，30 篇。全部是**原創**，不收青空文庫或任何現成作品——
  授權乾淨，而且明治大正的文體學了用不出去。寫作的三條約束寫在檔頭。
  完成紀錄也進 `progress.completed`，但 id 有 `read-` 前綴，統計「完成課程」時
  要用 `isReadingLesson()` 排掉，不然數字會灌水。
  `photo` 共用 `images.ts` 的主題照片，但**每篇要不同張**——重複了列表掃下來像同一篇

## 等級與 XP

`src/lib/rank.ts`。兩個容易混的概念，命名上分開了：

- **日語程度**（`LevelId`）：使用者自己選的難度，只有**兩階**——初級（N5〜N4）和進階（N3〜N2）。
  切換入口在**主題頁**上方的 `LevelTabs`（不在「我的」——它影響的是主題頁的
  「進階」標記和課程內容的難度，要調完就看到結果）。

  **id 仍然是 `L2`／`L3`，不要改名**。原本是 L1〜L4，但只有兩份內容，L1 降級抓 L2、
  L4 降級抓 L3，四格裡有兩組畫面一模一樣。砍成兩階時沿用舊 id，是因為改名要動
  lessons.json 的 498 筆 key、Cloud Functions 和所有已存的使用者資料。
  舊資料的 L1／L4 在 `data.tsx` 的 `migrateLevel()` 搬到 L2／L3，
  後端 `parseLevel()` 也會把舊 App 送上來的 L1／L4 收斂掉。

  **手寫的「基本說法」只有初級那一階**（`curriculum.ts` 的 `handwritten`：
  地鐵、便利商店、餐廳、飯店四個主題）。它走 `Lesson.basicSteps`，
  由 `useLesson` 只在初級時採用，進階一律用產生的——
  直接塞進 `steps` 的話這四個主題切程度會看到一模一樣的 N5 句子。
- **段位**（`Rank`，Lv.1〜10）：XP 換來的成就，畫面上寫「Lv.3 道案内」

XP 依難度加權，不是每堂課都一樣：基本說法 ×1，道地說法 ×1.3，情境練習 ×1.6，
AI 會話 ×2，主題標為進階（`minLevel: 'L3'`）再 +15%。三堂給一樣的分等於在獎勵只刷基本說法。
改 XP 一律改 `rank.ts`，不要在畫面裡寫死數字（ReportScreen 的「+30 XP」就犯過這個錯）。

## 排行榜

公開資料在 Firestore 的 `leaderboard/{uid}`，**和 `users/{uid}` 分開**——
users 裡有單字本、學習目標、自我介紹，不能為了做榜單就整份開放。
規則用 `hasOnly` 鎖住欄位，改 client 也塞不進 email 之類的東西。

改過 `firestore.rules` 一定要部署，不然排行榜只會顯示「還沒啟用」：

```bash
firebase deploy --only firestore:rules
```

推送時機有兩個，**兩個都需要**：`commit()`（有變動時）和**載入完成後那一次**。
只靠 commit 的話，既有使用者會一直不在榜上，直到他下次賺到 XP。
退出排行榜要主動 `deleteDoc`，只停止更新的話他會永遠卡在最後一次的分數。

## 評價彈窗

`src/lib/review.ts` ＋ `useReviewPrompt(active)`。**兩段式**：先自己問一句，
說喜歡才叫原生評分視窗，說有意見就導去 LINE。原因是 iOS 一年只准跳三次原生視窗，
跳給不爽的人等於浪費額度又換來一顆星。

只掛在「剛完成一件事」的畫面（課程完成頁、讀物讀完），不要在啟動時問。
時機規則（5 堂課以上、間隔 60 天、一輩子 3 次）全部集中在 review.ts，不要散出去。

## 官方連結

`src/content/links.ts`，網站／LINE／IG 都在這裡，畫面只讀不寫死。
`url` 留空的項目會自動從畫面消失，所以要加新平台可以先補一筆再補網址。
官網那一列用 `image`（`assets/logo.png`）而不是 Ionicons——通用的地球圖示
和 LINE、IG 擺在一起，看不出哪個才是「我們自己」。

## 開銷

模擬器截圖很貴（一張約 2k token，而且會一直留在對話裡被重複計費）。
驗證時用 `scale: 0.4`，只截關鍵畫面；大量比對圖片這種工作交給 subagent，
中間過程才不會佔住主對話。

## 分頁（底部 tab）

六格：首頁、主題、讀物、AI 教練、單字本、我的。**六格是上限**——
每格只剩約 65pt，標籤字級已經壓到 10pt 才讓「AI 教練」排得下一行，
再加第七格就會換行或截斷。要再放新功能，先想清楚拿掉哪一個。

排行榜不在 tab 裡，入口是「我的」最上方那張酒紅卡。它是偶爾看一次的東西，
但入口必須是色塊——之前只做成區塊標題右邊的一行小字，實測會被整個滑過去。

## 付費

`src/content/plans.ts` 定義方案，`PlansScreen` 是畫面。一條原則：
**沒有用到 AI 的東西一律免費**（課程、讀物、五十音、單字複習、排行榜、
等級、成長曲線），付費買的只有 AI 次數和語音次數。

定價的成本結構：會話用 claude-haiku-5-5（$0.10/$0.50 per MTok），
一則回覆約 **NT$0.008**，一份分析約 NT$0.017。
**真正的成本是 Chirp3-HD 語音**（約 US$30 / 1M 字元），一句日文約 30 字 ≈ **NT$0.029**，
是一則 AI 回覆的四倍，而且語音額度通常給得比 AI 多一個量級。

## 語音算字元，不算次數

Google 按字元收費，播一個 5 字的單字和一句 60 字的例句成本差 12 倍。
舊版記「每天 600 次」，乘 30 天是 NT$520 的成本，而月費 NT$150——用好用滿會賠。
現在後端 `PLAN_ALLOWANCE` 用**每月字元**，額度和成本同一個單位，最壞情況算得出來：

| 方案 | AI 文字 | 語音 | 最壞月成本 | 月費 | 毛利 |
|---|---|---|---|---|---|
| 訪客 | 5 次/天 | 3k 字 Neural2 | NT$2.7 | 0 | — |
| 免費 | 10 次/天 | 8k 字 Neural2 | NT$6.5 | 0 | — |
| 標準 | 60 次/天 | 40k 字 HD | NT$52 | 150 | 65% |
| 無限 | 150 次/天 | 100k 字 HD | NT$132 | 320 | 59% |

常駐實例（`chatOpts` 的 `minInstances: 1`）約 NT$300〜600/月是**固定成本**，
和用量無關：**約 5 個標準訂戶就打平**，之後每一個都是淨賺。

兩條省錢的設計：

- **HD 只給付費**。免費和訪客從 Neural2 開始（約一半價），`VOICES` 分成 `hd` 和 `std` 兩條 fallback 鏈。
- **額度用完不擋，降級**。`aiSpeak` 回傳 `audio: null`（不是丟錯），
  手機端 `speakJa` 自己改用內建語音——使用者還是聽得到，只是音色退一階。
  用 throw 的話畫面會跳錯誤，對一個「還能用」的降級太吵。

`plans.ts` 的數字只負責**顯示**，真正的額度在 `functions/src/index.ts` 的 `PLAN_ALLOWANCE`。
兩邊要一起改，不然畫面會承諾後端不給的東西。

## 方案資格只信 `entitlements/{uid}`

後端判斷方案時**只讀 `entitlements/{uid}`，不讀 `users/{uid}`**。
後者是手機寫上去的，改個 client 就能把自己變成無限方案。
`firestore.rules` 把 entitlements 的寫入對所有人關閉（本人也不行），
只有 Cloud Functions 用 admin SDK 寫得進去。

**訂閱還沒接**，所以現在沒有任何東西會寫 entitlements，每個人都是 free——
這是正確的預設。接 IAP 時：收據送到 Cloud Functions 驗證，**驗證通過才由後端**
寫 `entitlements/{uid} = { plan, expiresAt }`。`profile.plan` 永遠只拿來顯示畫面。

## 中文排版：JSX 的換行會變成空格

多行的 JSX 文字，原始碼換行會被當成一個半形空格。接在全形句號後面
就會留下一個看得見的缺口（「各算一次。 一場完整的」）。
一句話一個 `<T>`，或整句包成 `{'…'}` 字串，不要靠原始碼換行排版。

## App icon

`assets/icon.png` 是從 `assets/logo.png` 產出來的，不是手工檔案。要換 logo 就重跑產生程序。

兩條硬規則：
- **iOS 的 icon 必須 1024×1024 且不含 alpha 通道**。有透明度 App Store Connect 會直接退件，
  所以產出時一定要把 logo 疊到不透明底色（目前用 theme 的 cream `#F8F3EA`）再存成 RGB。
- 系統自己會把方形裁成圓角，logo 要留安全邊距（目前佔 82%）。Android 的 adaptive icon
  foreground 相反：要保留透明，而且中心安全區只有約 66%，所以只放到 62%。

Expo Go 裡**看不到自訂 icon**（顯示的是 Expo Go 自己的），要驗證得做 dev build 或 prebuild。

## 購買流程

方案比較（`PlansScreen`）和購買（`PurchaseScreen`）**刻意分成兩頁**：
前者回答「我該買哪個」，後者回答「扣多少、什麼時候扣、怎麼取消」。
擠在一起的話，比較的資訊會把付款條件壓掉——而付款條件正是審查在看的。

購買頁的版面是照 App Store Guideline 3.1.2 排的，**這五項必須在購買當下同一畫面看得到**：
訂閱名稱、期間長度、每期價格、服務條款連結、隱私權政策連結。少一項就是退件，
不要為了版面好看拿掉。另外「還原購買」也是訂閱型 app 的必備項目。

`legalLinks`（`src/content/links.ts`）目前指向官網首頁，**上架前一定要換成真正的條款頁**，
指向首頁一樣會被退件。

**年繳先關著**（`plans.ts` 的 `YEARLY_AVAILABLE = false`）。價錢和 productId 都留著，
但畫面上只開月繳，購買頁的年繳格子顯示「日後推出」且不能點。
原因是語音按字元計價、目前的定價只是依成本結構推的估算——年繳等於先收 12 個月的錢，
單位成本抓錯就得整年虧著跑，或者去動已經收錢的訂閱。先跑幾個月月繳、
對過 Google Cloud 和 Firebase 的真實帳單，再把那個值改成 true。

方案入口在「我的」的**金邊照片色塊**，排在「學習設定」上面。
原本是設定清單裡的一列小字、位置在整頁倒數第三段，實測會被整個滑過去。
和排行榜那張酒紅卡用不同顏色分開——兩張都是入口，去的地方不一樣。
