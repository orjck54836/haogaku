import { View, Pressable, Linking, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './index';
import { useTheme, space, radius } from '../theme';
import { activeLinks, OfficialLink } from '../content/links';

/**
 * 官方連結區塊。
 *
 * 放在「我的」最下面、品牌footer 之前：那是使用者看完自己的進度、心情最好的位置，
 * 而不是打斷學習流程的地方。導流不該插在課程中間。
 *
 * 一列一個平台而不是三個小圓icon——圓icon 只有平台 logo，看不出點進去會得到什麼；
 * 有副標的列才讓人知道「LINE 是可以問到真人」。
 */

const toneBg = { wine: '#8A2432', ink: '#2B1017', gold: '#D9A441' } as const;

async function open(l: OfficialLink) {
  try {
    await Linking.openURL(l.url);
  } catch {
    // 連結開不起來通常是沒裝那個 App 又剛好沒有瀏覽器可接手，
    // 這時至少把網址顯示出來，使用者可以自己複製
    Alert.alert('打不開連結', `請手動開啟：\n${l.url}`);
  }
}

export default function OfficialLinks() {
  const t = useTheme();
  const links = activeLinks();
  if (!links.length) return null;

  return (
    <View style={{ gap: space.sm }}>
      {links.map(l => (
        <Pressable key={l.id} accessibilityRole="link" accessibilityLabel={`${l.title}，${l.desc}`}
          onPress={() => open(l)}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: space.md,
            backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.md,
            opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.99 : 1 }],
          })}>
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: toneBg[l.tone],
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {l.image
              /* logo 本身留白不多，contain ＋ 內縮才不會滿版頂到圓角 */
              ? <Image source={l.image} resizeMode="contain" style={{ width: 32, height: 32 }} />
              : <Ionicons name={l.icon} size={21} color={l.tone === 'gold' ? '#231A08' : '#FFFFFF'} />}
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading" numberOfLines={1}>{l.title}</T>
            <T variant="caption" color={t.sub} numberOfLines={1} style={{ marginTop: 1 }}>{l.desc}</T>
          </View>
          <Ionicons name="open-outline" size={17} color={t.faint} />
        </Pressable>
      ))}
    </View>
  );
}
