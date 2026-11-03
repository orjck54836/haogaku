import { View, Text, Image } from 'react-native';
import { useTheme, space, radius, fonts, type } from '../theme';
import type { CategoryId } from '../content/topics';
import { photoFor } from './images';
import { topicNumber } from '../content/curriculum';

/**
 * 每個分類的漢字章。
 * 用一個字代表整個分類——比通用圖示有個性，而且不用任何圖檔。
 * 沒有照片的主題一律用它當視覺。
 */
const catKanji: Record<CategoryId, string> = {
  food: '食', transport: '交', home: '住', shopping: '買', errands: '手', health: '健',
  work: '職', keigo: '敬', social: '人', fun: '楽', seasons: '季', feelings: '情', native: '語',
};

/** 五十音基礎用的字 */
export const BASICS_KANJI = '音';

/**
 * 主題自己的代表字。
 * 預設取主題名的第一個字（便利商店→便、拉麵店→拉），83 個主題裡有 73 個這樣就唯一了；
 * 下面只列會撞字的那 10 組，各挑一個更貼切的字避開。
 * 新增主題時不用動這裡，除非第一個字跟別人撞了或讀起來怪。
 */
const topicKanji: Record<string, string> = {
  newyear: '年',        // 和「新幹線」撞「新」
  nomikai: '聚',        // 和「公車」撞「公」
  pharmacy: '藥', drugstore: '妝',
  'service-keigo': '接', // 和「服飾店」撞「服」
  taxfree: '稅',        // 和「退換貨」撞「退」
  clinic: '醫', sports: '球',
  'baito-interview': '面',
  'business-phone': '電', 'business-email': '郵',
  meeting: '會', happy: '喜',
  'keigo-mistakes': '誤',
};

export const kanjiFor = (cat?: CategoryId) => (cat ? catKanji[cat] : BASICS_KANJI);

/** 一個主題要印的字：自己的 → 主題名第一個字 → 分類的 */
export function topicKanjiFor(topicId?: string, title?: string, cat?: CategoryId) {
  if (topicId && topicKanji[topicId]) return topicKanji[topicId];
  const first = title?.trim()?.[0];
  if (first) return first;
  return kanjiFor(cat);
}

/** 分類色：同一個酒紅家族，靠深淺區分，不會變成彩虹 */
export type Tone = 'wine' | 'ink' | 'gold' | 'soft' | 'shell';

const toneBg: Record<Tone, string> = {
  wine: '#8A2432', ink: '#141012', gold: '#D9A441', soft: '#F3F0EC', shell: '#2B1017',
};

/**
 * 漢字章：圓角方塊＋白色明體漢字。
 * 圓角跟著尺寸走（約 30%），所以大的看起來飽滿、小的看起來精緻。
 */
export function Seal({ kanji, size = 48, tone = 'wine' }: { kanji: string; size?: number; tone?: Tone }) {
  const t = useTheme();
  const bg = toneBg[tone];
  const fg = tone === 'soft' ? t.primary : tone === 'gold' ? '#231A08' : '#FFFFFF';
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: size * 0.46, color: fg, includeFontPadding: false }}>{kanji}</Text>
    </View>
  );
}

/**
 * 號碼版的底色循環。
 * 依主題編號輪替，所以**同一個分類裡每張卡的顏色也不一樣**——
 * 如果綁在分類上，整個「飲食」會變成一整片同色，掃過去很單調。
 * 酒紅佔一半，深酒紅和墨色當節奏，金色當偶爾的亮點；分類的辨識交給角落的漢字。
 */
const TONE_CYCLE: Tone[] = ['wine', 'ink', 'wine', 'gold', 'shell', 'wine'];
export const toneForNumber = (num: string): Tone =>
  TONE_CYCLE[(parseInt(num, 10) - 1 + TONE_CYCLE.length) % TONE_CYCLE.length] ?? 'wine';

/**
 * 卡片頂部的號碼版。
 * 這是「照片的位置」——登記照片之後就會換成照片，沒登記就是一塊有大號碼的色版。
 * aspect 由呼叫端決定，刻意讓每張卡高度不同，排出錯落的網格。
 */
export function UnitBlock({ topicId, cat, aspect = 1 }: { topicId: string; cat?: CategoryId; aspect?: number }) {
  const photo = photoFor(topicId, cat);
  const num = topicNumber(topicId);
  const tone = toneForNumber(num);
  if (photo) {
    // aspectRatio 要放在外層 View。直接下在 <Image> 上不會生效——
    // 圖片有自己的內建尺寸，會蓋過比例設定，卡片就被撐成好幾倍高。
    return (
      <View style={{ width: '100%', aspectRatio: aspect, borderRadius: radius.lg, overflow: 'hidden' }}>
        <Image source={photo} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  const fg = tone === 'soft' ? '#8A2432' : tone === 'gold' ? '#231A08' : '#FFFFFF';
  return (
    <View style={{
      width: '100%', aspectRatio: aspect, borderRadius: radius.lg, backgroundColor: toneBg[tone],
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {/* 角落的分類字：讓色版不只是一個數字，也補回分類的辨識 */}
      <Text style={{
        position: 'absolute', top: 9, left: 11, fontFamily: fonts.serif, fontSize: 15,
        color: fg, opacity: 0.4, includeFontPadding: false,
      }}>{kanjiFor(cat)}</Text>
      <Text style={{
        fontFamily: fonts.serifRegular, fontSize: 38, letterSpacing: 1,
        color: fg, includeFontPadding: false,
      }}>{num}</Text>
    </View>
  );
}

/**
 * 單元號碼磚。
 *
 * 這個 app 的圖像語言分兩種，兩種都用明體排在同一款圓角磚裡：
 *   漢字 → 系統與集合（五十音「音」、敬語「敬」、AI 教練「話」）
 *   數字 → 生活主題的單元編號（01〜77）
 * 所以一眼就分得出「這是一套系統」還是「這是第幾單元」。
 */
export function UnitTile({ num, size = 48, tone = 'wine' }: {
  num: string; size?: number; tone?: Tone;
}) {
  const t = useTheme();
  const bg = toneBg[tone];
  const fg = tone === 'soft' ? t.primary : tone === 'gold' ? '#231A08' : '#FFFFFF';
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: fonts.serifRegular, fontSize: size * 0.42, color: fg,
        letterSpacing: size * 0.02, includeFontPadding: false,
      }}>{num}</Text>
    </View>
  );
}

/**
 * 主題頁的橫幅。
 * 有登記照片就排成大圓角的照片卡，標題壓在照片下緣；
 * 沒照片就用漢字章＋大標的排版，一樣完整，不會出現灰色佔位圖。
 * 照片怎麼加：見 src/ui/images.ts
 */
export function TopicBanner({ topicId, cat, title, caption, focus }: {
  topicId?: string; cat?: CategoryId; title: string; caption?: string; focus?: string;
}) {
  const t = useTheme();
  const photo = photoFor(topicId, cat);
  const num = topicId ? topicNumber(topicId) : '';

  if (photo) {
    return (
      <View>
        <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
          <View style={{ width: '100%', aspectRatio: 3 / 2, justifyContent: 'flex-end' }}>
            <Image source={photo} resizeMode="cover"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
            <View style={{ backgroundColor: 'rgba(20,16,18,0.78)', paddingHorizontal: space.lg, paddingVertical: space.md }}>
              {caption ? <Text style={[type.caption, { color: t.gold, fontWeight: '700' }]}>{caption}</Text> : null}
              <Text style={[type.title, { color: '#FFFFFF', marginTop: 1 }]} numberOfLines={1}>{title}</Text>
            </View>
          </View>
        </View>
        {focus ? <Text style={[type.body, { color: t.sub, marginTop: space.lg }]}>{focus}</Text> : null}
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        {num ? <UnitTile num={num} size={62} /> : <Seal kanji={topicKanjiFor(topicId, title, cat)} size={62} />}
        <View style={{ flex: 1 }}>
          {caption ? <Text style={[type.caption, { color: t.faint, fontWeight: '700' }]}>{caption}</Text> : null}
          <Text style={[type.title, { color: t.heading, marginTop: 1 }]} numberOfLines={2}>{title}</Text>
        </View>
      </View>
      {focus ? <Text style={[type.body, { color: t.sub, marginTop: space.lg }]}>{focus}</Text> : null}
    </View>
  );
}

/**
 * 卡片上的小縮圖：有照片用照片，沒有就用主題的漢字章。
 * 傳 title 進來才能自動取第一個字——不傳就只會退回分類字，一整排會長得一樣。
 */
export function TopicThumb({ topicId, title, cat, size = 44, tone }: {
  topicId?: string; title?: string; cat?: CategoryId; size?: number; tone?: Tone;
}) {
  const photo = photoFor(topicId, cat);
  if (photo) return <Image source={photo} style={{ width: size, height: size, borderRadius: size * 0.3 }} resizeMode="cover" />;
  const num = topicId ? topicNumber(topicId) : '';
  if (num) return <UnitTile num={num} size={size} tone={tone} />;
  return <Seal kanji={topicKanjiFor(topicId, title, cat)} size={size} tone={tone} />;
}
