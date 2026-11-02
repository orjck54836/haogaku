import * as Speech from 'expo-speech';

export function speakJa(text: string, rate = 0.9) {
  Speech.stop();
  Speech.speak(text, { language: 'ja-JP', rate });
}
export const stopSpeech = () => { Speech.stop(); };
