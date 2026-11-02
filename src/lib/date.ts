export function dayString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return dayString(d);
}
export const today = () => dayString();
export const yesterday = () => addDays(-1);
