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

- **課程**：`src/content/generated/lessons.json`，目前只有 **L2 的 249 堂**，L3 還沒生。
  產生要 `ANTHROPIC_API_KEY`（console.anthropic.com 發的 `sk-ant-api03-`，
  Claude Code 的登入憑證不能用）：`npm run generate-lessons -- --levels=L3`
- **流行語**：`src/content/slang.ts`，52 個，每天輪一個。
  含漢字的要填 `kana`（平假名讀音），假名詞不用——詞形本身就是讀音
- **主題**：`src/content/topics.ts`。`topicNumber()` 的編號是畫面上的身分，
  順序改了編號就會變，**不要拿它當資料的 key**，key 一律用 `topic.id`
- **讀物**：`src/content/readings.ts`，11 篇。全部是**原創**，不收青空文庫或任何現成作品——
  授權乾淨，而且明治大正的文體學了用不出去。寫作的三條約束寫在檔頭。
  完成紀錄也進 `progress.completed`，但 id 有 `read-` 前綴，統計「完成課程」時
  要用 `isReadingLesson()` 排掉，不然數字會灌水。
  `photo` 共用 `images.ts` 的主題照片，但**每篇要不同張**——重複了列表掃下來像同一篇

## 等級與 XP

`src/lib/rank.ts`。兩個容易混的概念，命名上分開了：

- **日語程度**（`LevelId`，L1〜L4）：使用者自己選的難度，切換入口在**主題頁**上方的
  `LevelTabs`（不在「我的」——它影響的是主題頁的推薦和「進階」標記，要調完就看到結果）
- **段位**（`Rank`，Lv.1〜10）：XP 換來的成就，畫面上寫「Lv.3 道案内」

XP 依難度加權，不是每堂課都一樣：基本說法 ×1，道地說法 ×1.3，情境練習 ×1.6，
AI 會話 ×2，主題的 `minLevel` 每升一階再 +15%。三堂給一樣的分等於在獎勵只刷基本說法。
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
一次回覆約 NT$0.015，一個月用好用滿也才幾十塊。**真正的成本是 Chirp3-HD 語音**，
按字元計價，高一個量級。所以語音次數才是分級主軸，AI 次數可以給得大方。
這些是依成本結構推的估算，上架前拿真實帳單校正一次。

**訂閱還沒接。** `profile.plan` 只拿來顯示畫面，不能用它決定額度——
它存在手機上，改得動。真正的解鎖要接 IAP 並**在 Cloud Functions 驗證收據**
之後才放寬 `functions/src/index.ts` 的 LIMITS。

## 中文排版：JSX 的換行會變成空格

多行的 JSX 文字，原始碼換行會被當成一個半形空格。接在全形句號後面
就會留下一個看得見的缺口（「各算一次。 一場完整的」）。
一句話一個 `<T>`，或整句包成 `{'…'}` 字串，不要靠原始碼換行排版。
