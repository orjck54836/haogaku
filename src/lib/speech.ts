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

let player: AudioPlayer | null = null;
let token = 0;
let audioReady = false;
let deviceVoice: string | undefined;
let deviceVoiceLoaded = false;

async function ensureAudioMode() {
  if (audioReady) return;
  audioReady = true;
  try { await setAudioModeAsync({ playsInSilentMode: true }); } catch { /* 忽略 */ }
}

/** 語音辨識結束後要重設，否則聲音可能變小或從聽筒出來 */
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

/** 雲端自然語音：第一次產生後存在手機，之後離線也能播、不再計費 */
async function cloudAudio(text: string, voice: Voice): Promise<string | null> {
  if (!auth.currentUser) return null;
  const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, `${voice}|${rate}|${text}`);
  const file = new File(Paths.cache, `tts-${key}.mp3`);
  if (file.exists) return file.uri;
  const res = await httpsCallable(functions, 'aiSpeak')({ text, voice, rate });
  const audio = (res.data as { audio?: string })?.audio;
  if (!audio) return null;
  file.write(audio, { encoding: 'base64' });
  return file.uri;
}

export async function speakJa(text: string, voice: Voice = 'female') {
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
  } catch { /* 改用手機語音 */ }
  if (my === token) speakOnDevice(text);
}

function stopPlayback() {
  Speech.stop();
  if (player) { try { player.remove(); } catch { /* 忽略 */ } player = null; }
}

export function stopSpeech() {
  token++;
  stopPlayback();
}
