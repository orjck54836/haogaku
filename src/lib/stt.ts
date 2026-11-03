import Constants, { ExecutionEnvironment } from 'expo-constants';
import { stopSpeech, resetAudioMode } from './speech';

export type ListenHandlers = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
};

export const speechInputAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** 開始聽使用者說日文，回傳停止函式 */
export async function startListening(h: ListenHandlers): Promise<() => void> {
  if (!speechInputAvailable) throw new Error('語音輸入需要開發版 App，Expo Go 不支援');
  // 延遲載入：避免在 Expo Go 中因缺少原生模組而閃退
  const { ExpoSpeechRecognitionModule: M } = await import('expo-speech-recognition');
  const perm = await M.requestPermissionsAsync();
  if (!perm.granted) throw new Error('請到 iPhone「設定 → 皓學日語」允許使用麥克風和語音辨識');

  stopSpeech();
  const subs = [
    M.addListener('result', e => {
      const text = e.results[0]?.transcript ?? '';
      if (e.isFinal) h.onFinal(text); else h.onPartial(text);
    }),
    M.addListener('error', e => {
      resetAudioMode();
      if (e.error === 'aborted') return;
      h.onError(e.error === 'no-speech' || e.error === 'speech-timeout' ? '沒有聽到聲音，再說一次看看' : '沒有聽清楚，再說一次看看');
    }),
    M.addListener('end', () => {
      subs.forEach(s => s.remove());
      resetAudioMode();
      h.onEnd();
    }),
  ];
  M.start({
    lang: 'ja-JP', interimResults: true, continuous: false, addsPunctuation: true,
    // 收音時也讓聲音走喇叭；結束後會恢復成一般播放模式（見 speech.ts）
    iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth'], mode: 'measurement' },
  });
  return () => M.stop();
}
