# 送審備註與 App Store Connect 檢查表

build 8（1.0.0，commit `095b880`）已經上傳到 App Store Connect，EAS 的提交紀錄是
`9344eed3`。binary 不用再動，剩下的全部在 ASC 的網頁上。

## 1. App Review Information → Notes（直接貼英文那段）

審查員**不需要**測試帳號就能用 app：首頁、主題、讀物、五十音、單字本全部不用登入。
但 AI 教練在未登入狀態每天只有 1 次試用，不講清楚會被當成「功能不完整」（Guideline 2.1）。

```
This app does not require an account. All lessons, readings, kana charts and the
vocabulary book are free and work without signing in.

AI features (AI Coach, conversation analysis, AI-generated example sentences) are
metered because each request costs us money:

  - Not signed in (guest): 1 AI request per day. This is a taste-test limit, not a bug.
  - Signed in (free account): 5 AI requests per day, 1 analysis report per day.

To evaluate the AI Coach properly, please sign in first:
  "我的" (Profile) tab -> "登入方式" -> Sign in with Apple.
Signing in takes a few seconds and immediately raises the limit to 5 per day.

To test the subscription:
  "我的" tab -> the gold-bordered card above "學習設定" -> choose a plan -> purchase.
  Subscriptions require a signed-in (non-guest) account, because a guest account is
  stored only on the device and a subscription attached to it would be lost.
  Receipts are verified server-side with the App Store Server API before any
  entitlement is granted.
  "還原購買" (Restore Purchases) is at the bottom of the purchase screen. It is always
  shown there, even if the store products cannot be loaded at that moment.

Only monthly plans are on sale in this version. The yearly tiles are shown as
"日後推出" (coming later) and are intentionally not tappable.

Microphone and speech recognition are used only for the optional "speak your answer"
practice inside the AI Coach. Photo library access is only for choosing an avatar.

The app is in Traditional Chinese (zh-Hant) and teaches Japanese.
```

## 2. 送審前要在 ASC 確認的項目

- [ ] **訂閱項目跟著這個版本一起送**。`haogaku.japanese.plus.monthly` 和
      `haogaku.japanese.pro.monthly` 兩個都在同一個訂閱群組、狀態是 Ready to Submit，
      而且在版本頁的「App 內購買項目」區塊裡有勾到。第一次送審時訂閱沒附在版本上，
      是最常見的卡關——Apple 會把 app 收下、訂閱卻留在原地，使用者買不到東西。
- [ ] **付費 App 協議（Paid Apps Agreement）已生效**。沒生效的話 StoreKit 根本讀不到商品，
      購買頁會是空的。
- [ ] **截圖**（6.9" 和 6.5" 各一組）。
- [ ] **年齡分級問卷**。
- [ ] **App 隱私（資料蒐集）問卷**：要勾的有帳號識別（Apple／Google 登入的 uid 與
      顯示名稱）、使用狀況（`track` 這支 function 記的學習事件）、使用者內容
      （單字本、自我介紹、AI 對話內容）。麥克風錄到的聲音不離開裝置，
      是由系統的語音辨識轉成文字後才送出。
- [ ] **四個必填網址**（都已經是實頁，不是首頁）：
      - Support URL `https://www.forma-global.com/study/support`
      - Privacy Policy URL `https://www.forma-global.com/study/privacy`
      - 服務條款 `https://www.forma-global.com/study/terms`
      - 帳號刪除說明 `https://www.forma-global.com/study/delete-account`
- [ ] **匯出合規**：`ITSAppUsesNonExemptEncryption: false` 已經寫在 app.config.ts，
      ASC 不會再問。

## 3. 上架之後的第一件事

`src/content/plans.ts` 的成本表是**依單價推的估算**，不是實際帳單。
跑滿一個月之後拿 Google Cloud（TTS 字元）和 Firebase（Functions 常駐實例）的真實帳單
回來校正一次，特別是語音那一欄。`plans.ts` 的 `YEARLY_AVAILABLE` 要等這一步做完才該打開——
年繳等於先收 12 個月的錢，單位成本抓錯就得整年虧著跑。
