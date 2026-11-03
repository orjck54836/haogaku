import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
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
async function ensureAudioMode() {
  if (audioReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'duckOthers',
    });
    audioReady = true;
  } catch {
    // 設定失敗下次再試
  }
}

/** 語音辨識結束後呼叫，下次播放前會重新設定音訊模式 */
export const resetAudioMode = () => { audioReady = false; };

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

async function cacheFile(text: string, voice: Voice) {
  const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, `${voice}|${rate}|${text}`);
  return new File(Paths.cache, `tts-${key}.mp3`);
}

/** 把後端一起回傳的語音存進快取（AI 會話用：文字和語音同時到，不必再多等一次） */
export async function cacheAudio(text: string, voice: Voice, base64: string) {
  try {
    const file = await cacheFile(text, voice);
    if (!file.exists) file.write(base64, { encoding: 'base64' });
  } catch { /* 忽略，播放時會再向雲端要 */ }
}

/** 雲端自然語音：第一次產生後存在手機，之後離線也能播、不再計費 */
async function cloudAudio(text: string, voice: Voice): Promise<string | null> {
  const file = await cacheFile(text, voice);
  if (file.exists) return file.uri;
  if (!auth.currentUser) return null;
  const res = await httpsCallable(functions, 'aiSpeak')({ text, voice, rate });
  const audio = (res.data as { audio?: string })?.audio;
  if (!audio) return null;
  file.write(audio, { encoding: 'base64' });
  return file.uri;
}

/**
 * 播放日文。回傳的 Promise 在「開始出聲」（或確定改用手機語音）時完成，
 * 畫面可以用它顯示「語音準備中」。
 */
export async function speakJa(text: string, voice: Voice = 'female'): Promise<void> {
  const my = ++token;
  stopPlayback();
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
