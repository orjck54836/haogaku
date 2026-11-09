import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebase';

export type Voice = 'female' | 'male';

let rate = 1.0;
/** 由使用者設定的語速（0.85 慢、1.0 標準、1.15 快） */
export const setSpeechRate = (r: number) => { rate = r; };
export const getSpeechRate = () => rate;

let player: AudioPlayer | null = null;
let token = 0;
let audioReady = false;
let deviceVoice: string | undefined;
let deviceVoiceLoaded = false;

/**
 * 設定為「播放」模式：
 * - playsInSilentMode：靜音開關打開也會出聲
 * - allowsRecording: false：語音輸入後把音訊從「錄音模式」切回來，否則聲音會很小或從聽筒出來
 * - shouldRouteThroughEarpiece: false：一律從喇叭播放
 */
async function applyPlaybackMode() {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
  });
}

async function ensureAudioMode() {
  if (audioReady) return;
  try {
    await applyPlaybackMode();
    audioReady = true;
  } catch {
    // 設定失敗下次再試
  }
}

/**
 * 語音辨識結束後呼叫。
 *
 * 只把旗標清掉不夠：辨識的原生 session 是在 'end' 事件之後才真正關閉，
 * 這時候搶著設定播放模式會被它收尾時覆蓋回錄音用的 session，
 * 結果就是「使用者講完話之後，AI 的回覆變得很小聲」。
 * 所以這裡先立刻設一次（讓馬上要播的那句有正確模式），
 * 再延遲補設一次，蓋掉辨識收尾留下的設定。
 */
export function resetAudioMode() {
  audioReady = false;
  const retry = async () => { try { await applyPlaybackMode(); audioReady = true; } catch { audioReady = false; } };
  void retry();
  setTimeout(retry, 400);
}

/** 備援：手機內建語音，優先選高品質的日文語音 */
async function speakOnDevice(text: string) {
  if (!deviceVoiceLoaded) {
    deviceVoiceLoaded = true;
    try {
      const ja = (await Speech.getAvailableVoicesAsync()).filter(v => v.language?.toLowerCase().startsWith('ja'));
      deviceVoice = (ja.find(v => v.quality === Speech.VoiceQuality.Enhanced) ?? ja[0])?.identifier;
    } catch { /* 忽略 */ }
  }
  Speech.speak(text, { language: 'ja-JP', rate, voice: deviceVoice });
}

/**
 * 快取檔名的版本前綴。
 *
 * v1（`tts-`）那一版寫檔沒有 await，可能留下寫到一半的 MP3——檔案大小看起來正常、
 * 播出來卻是雜音，而且永遠不會自己重抓。沒辦法從外面判斷一個 MP3 是不是截斷的，
 * 所以**整批作廢**：換前綴等於舊的全部不採用，第一次播會重新跟雲端要一份乾淨的。
 */
const CACHE_VERSION = 'tts2';

async function cacheFile(text: string, voice: Voice) {
  const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, `${voice}|${rate}|${text}`);
  return new File(Paths.cache, `${CACHE_VERSION}-${key}.mp3`);
}

/**
 * 把 v1 留下來的檔案清掉。不清的話，那些（有些是壞的）MP3 會一直佔著手機空間，
 * 而且再也沒有人會去讀它。整個 app 生命週期只跑一次，失敗就算了。
 */
let swept = false;
function sweepOldCache() {
  if (swept) return;
  swept = true;
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && entry.name.startsWith('tts-')) {
        try { entry.delete(); } catch { /* 忽略 */ }
      }
    }
  } catch { /* 忽略：清不掉只是佔空間，不該影響播放 */ }
}

/**
 * 把 base64 寫成快取檔。
 *
 * **一定要先寫暫存檔再搬過去，而且要 await。**
 * `file.write()` 是非同步的，直接接著用 `file.uri` 去播，會播到一個還沒寫完
 * （甚至 0 byte）的檔案——聽起來就是一陣雜音。更糟的是那個半成品會用正式檔名
 * 留在快取裡，`file.exists` 永遠是 true，所以**那一句從此每次都是雜音**，
 * 重開 app 也不會好。先寫 .part 再 move，中斷時壞檔不會佔到正式檔名。
 */
async function writeCache(file: File, base64: string) {
  const part = new File(Paths.cache, `${file.name}.part`);
  try { if (part.exists) part.delete(); } catch { /* 忽略 */ }
  await part.write(base64, { encoding: 'base64' });
  part.moveSync(file);
}

/**
 * 把括號裡的注音讀法拿掉再唸。
 *
 * 課程文字會寫成「陳(ちん)さん」讓使用者看得到漢字怎麼唸，但 TTS 會把括號裡的
 * 假名當成另一個詞，變成「ちん ちん さん」——同一個字唸兩次。
 *
 * 只拿掉「**漢字後面、括號裡全是假名**」的那一種，因為那才是注音。
 * 不限定成「括號內是假名就刪」：像「(はい)」這種本身就是內容的括號會被誤刪。
 * 中文的括號註解（「（文法錯誤）」）也因此留著——它們出現在 sub／zh 這些
 * 本來就不會送進 TTS 的欄位，但規則寫窄一點，之後多接一個欄位也不會出事。
 *
 * 做在這裡而不是去清 lessons.json：讀物、單字本、AI 補的例句都可能帶注音，
 * 而且畫面上**要**看得到那個假名，只有唸的時候不要。
 */
const FURIGANA = /([\u3400-\u4dbf\u4e00-\u9fff])[(（][\u3040-\u309f\u30a0-\u30ff ・ー]+[)）]/g;
export const forSpeech = (text: string) => text.replace(FURIGANA, '$1');

/** 快取檔小到不可能是一段 MP3，就是上面那種寫壞的半成品 */
const MIN_AUDIO_BYTES = 256;
const usableCache = (file: File) => file.exists && (file.size ?? 0) >= MIN_AUDIO_BYTES;

/** 把後端一起回傳的語音存進快取（AI 會話用：文字和語音同時到，不必再多等一次） */
export async function cacheAudio(text: string, voice: Voice, base64: string) {
  try {
    const file = await cacheFile(forSpeech(text), voice);
    if (!usableCache(file)) await writeCache(file, base64);
  } catch { /* 忽略，播放時會再向雲端要 */ }
}

/** 雲端自然語音：第一次產生後存在手機，之後離線也能播、不再計費 */
async function cloudAudio(text: string, voice: Voice): Promise<string | null> {
  sweepOldCache();
  const file = await cacheFile(text, voice);
  if (usableCache(file)) return file.uri;
  // 舊版留下來的壞檔要先清掉，否則下面寫不進去，使用者會一直聽到雜音
  try { if (file.exists) file.delete(); } catch { /* 忽略 */ }
  if (!auth.currentUser) return null;
  const res = await httpsCallable(functions, 'aiSpeak')({ text, voice, rate });
  const audio = (res.data as { audio?: string })?.audio;
  if (!audio) return null;
  await writeCache(file, audio);
  return file.uri;
}

/**
 * 播放日文。回傳的 Promise 在「開始出聲」（或確定改用手機語音）時完成，
 * 畫面可以用它顯示「語音準備中」。
 */
export async function speakJa(raw: string, voice: Voice = 'female'): Promise<void> {
  const my = ++token;
  stopPlayback();
  // 注音在這裡就拿掉：快取的 key 和送上雲端的字串都用唸出來的那一份，
  // 「陳(ちん)さん」和「陳さん」才不會各存一份一模一樣的音檔
  const text = forSpeech(raw);
  if (!text.trim()) return;
  await ensureAudioMode();
  try {
    const uri = await cloudAudio(text, voice);
    if (my !== token) return;          // 期間又按了別的
    if (uri) {
      const p = createAudioPlayer(uri);
      player = p;
      p.addListener('playbackStatusUpdate', s => { if (s.didJustFinish) { p.remove(); if (player === p) player = null; } });
      p.play();
      return;
    }
  } catch (e) {
    console.warn('雲端語音失敗，改用手機語音', e);
  }
  if (my === token) await speakOnDevice(text);
}

function stopPlayback() {
  Speech.stop();
  if (player) { try { player.remove(); } catch { /* 忽略 */ } player = null; }
}

export function stopSpeech() {
  token++;
  stopPlayback();
}
