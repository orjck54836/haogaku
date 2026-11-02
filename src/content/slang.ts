import { Slang } from './types';

export const slang: Slang[] = [
  { word: 'やばい', reading: 'yabai', meaning: '超扯／超讚（好壞都能用）', example: 'このラーメン、やばい！', exampleZh: '這拉麵也太好吃了吧！', when: '讚美食物、驚訝' },
  { word: 'それな', reading: 'sore na', meaning: '真的！對啊！', example: '「暑すぎない？」「それな」', exampleZh: '「也太熱了吧？」「真的！」', when: '跟朋友聊天' },
  { word: 'エモい', reading: 'emoi', meaning: '很有感覺、很觸動', example: 'この夜景、エモい。', exampleZh: '這夜景好有感覺。', when: '看風景、拍照' },
  { word: '推し', reading: 'oshi', meaning: '最支持的偶像或角色', example: '私の推しはこの子！', exampleZh: '我推的是這個人！', when: '逛周邊、動漫店' },
  { word: 'マジで', reading: 'maji de', meaning: '真的假的／真的', example: 'マジで？安すぎる！', exampleZh: '真的假的？也太便宜！', when: '驚訝、確認' },
  { word: 'ガチ', reading: 'gachi', meaning: '認真的、超級', example: 'ガチでうまい。', exampleZh: '真的超好吃。', when: '強調程度' },
  { word: 'ウケる', reading: 'ukeru', meaning: '好好笑', example: 'それ、ウケる！', exampleZh: '那個好好笑！', when: '朋友間開玩笑' },
  { word: '映える', reading: 'baeru', meaning: '很好拍、很上相', example: 'このカフェ、映える！', exampleZh: '這間咖啡廳好好拍！', when: '咖啡廳、景點拍照' },
  { word: '草', reading: 'kusa', meaning: '笑死（網路用語）', example: 'その動画、草。', exampleZh: '那個影片笑死。', when: '傳訊息、留言' },
  { word: 'りょ', reading: 'ryo', meaning: '了解、OK', example: '「7時ね」「りょ」', exampleZh: '「7 點喔」「OK」', when: '跟朋友傳訊息' },
];

export const todaySlangIndex = () => Math.floor(Date.now() / 86400000) % slang.length;
