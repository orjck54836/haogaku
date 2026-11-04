import { FolderTabs } from './index';
import { LevelId } from '../content/types';
import { levelOrder, levelShort, levelJlpt } from '../content/curriculum';

/**
 * 日語程度頁籤。
 *
 * 原本藏在「我的 → 學習設定」，要點進分頁再往下滑才看得到，
 * 而且是「點一下換下一個」的循環式——想從 L4 回 L1 要點三下，
 * 也看不出總共有幾階。程度會影響整個主題頁的推薦和「進階」標記，
 * 所以它該待在主題頁上面，四階一次攤開。
 *
 * 外觀走 FolderTabs（和讀物、五十音的頁籤同一套語言）：
 * 選中的是白卡＋頂上一條酒紅，往下和主題清單連成一片。
 */
export default function LevelTabs({ value, onChange }: { value: LevelId; onChange: (v: LevelId) => void }) {
  return (
    <FolderTabs items={levelOrder.map(id => ({
      key: id, label: levelShort[id], sub: levelJlpt[id], on: id === value, onPress: () => onChange(id),
    }))} />
  );
}
