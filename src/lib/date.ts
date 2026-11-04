export function dayString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return dayString(d);
}
export const today = () => dayString();
export const yesterday = () => addDays(-1);

/**
 * 給歷史紀錄用的顯示字串：今天、昨天，再往前就寫日期。
 * 「3 天前」這種相對寫法在列表裡掃起來反而難對時間，所以只給最近兩天特例。
 */
export function whenLabel(ms: number): string {
  const day = dayString(new Date(ms));
  if (day === today()) return '今天';
  if (day === yesterday()) return '昨天';
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  return sameYear ? md : `${d.getFullYear()}年${md}`;
}
