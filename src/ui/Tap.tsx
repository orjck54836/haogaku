import { isValidElement, ReactNode } from 'react';
import { Pressable as RNPressable, PressableProps } from 'react-native';
import { trackTap } from '../lib/analytics';

/**
 * 會記點擊的 Pressable。全 App 的 Pressable 都從這裡 import，不要直接用 react-native 的——
 * 少一顆就是後台「按鈕點擊」那張表上不存在的按鈕，而「沒人點」和「沒埋」看起來一模一樣。
 *
 * 按鈕名稱的來源依序是：`tapId` → `accessibilityLabel` → 子元件裡的文字 → 圖示名稱。
 * 會帶到使用者內容或數字的按鈕（播放某個單字、「還差 115 XP」）**一定要給 `tapId`**：
 * 不給的話每個單字都變成一顆獨立的按鈕，後台的表會被灌爆，而且使用者自己打的字
 * 會被送進 GA4。`normalize` 只是保底，不要靠它。
 */
export type TapProps = PressableProps & { tapId?: string };

// React 19 起 ref 是一般的 prop，跟著 ...rest 傳下去就好，不需要 forwardRef
export function Pressable({ tapId, onPress, ...rest }: TapProps) {
  const handle: PressableProps['onPress'] = onPress
    ? e => {
      // 記錄失敗不能擋住按鈕本身
      try { trackTap(tapId ?? labelOf(rest)); } catch { /* 忽略 */ }
      onPress(e);
    }
    : undefined;
  return <RNPressable {...rest} onPress={handle} />;
}

function labelOf(p: PressableProps): string {
  const raw = p.accessibilityLabel || textOf(p.children as ReactNode) || iconOf(p.children as ReactNode);
  return normalize(raw) || '（未命名）';
}

/** 「」裡的內容、冒號逗號後面的說明、數字都拿掉：那些是會變的部分，留下的才是「哪一顆按鈕」 */
export function normalize(s: string): string {
  return s.replace(/「[^」]*」/g, '「」').split(/[：:，,。（(]/)[0]
    .replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 20);
}

function textOf(node: ReactNode, depth = 0): string {
  if (depth > 6 || node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(n => textOf(n, depth + 1)).filter(Boolean).join(' ');
  if (isValidElement(node)) return textOf((node.props as any)?.children, depth + 1);
  return '';
}

function iconOf(node: ReactNode, depth = 0): string {
  if (depth > 6 || node == null || typeof node !== 'object') return '';
  if (Array.isArray(node)) { for (const n of node) { const r = iconOf(n, depth + 1); if (r) return r; } return ''; }
  if (isValidElement(node)) {
    const props = node.props as any;
    if (typeof props?.name === 'string') return `圖示 ${props.name}`;
    return iconOf(props?.children, depth + 1);
  }
  return '';
}
