/**
 * 「剛走完新手設定」的一次性旗標。
 *
 * 新手設定的最後一步原本是把人放到首頁，讓他自己挑要從哪裡開始。
 * 首頁有十幾個入口，對一個還不知道這個 App 在幹嘛的人來說等於沒有方向，
 * 很多人就停在那裡、滑一滑、關掉。所以改成設定完**直接進第一堂課**。
 *
 * 不存 AsyncStorage 也不進 profile：它只需要活過「設定頁 → 首頁掛載」這一瞬間。
 * 存起來的話，App 在那一瞬間被殺掉，下次開啟會莫名其妙被丟進課程裡。
 */
let pending = false;

export function requestFirstLesson() { pending = true; }

/** 讀一次就清掉：首頁重新掛載（切換程度、重新登入）時不能再觸發 */
export function consumeFirstLesson(): boolean {
  const v = pending;
  pending = false;
  return v;
}
