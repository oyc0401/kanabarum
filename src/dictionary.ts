// dictionary.ts
// 한국인이 익숙한 발음을 담은 특수 사전
export interface SpecialDictionaryEntry {
  word: string;
  answer: string;
  hira?: boolean; // true면 히라가나 입력에도 적용
  kata?: boolean; // true면 카타카나 입력에도 적용
}

export const SpecialDictionary: SpecialDictionaryEntry[] = [
  // ["とうきょう", "도쿄"],
  { word: "こんにちは", answer: "곤니치와", hira: true, kata: true },
  { word: "こんばんは", answer: "곰방와" },
  { word: "すみません", answer: "스미마셍" },
  { word: "はひふへほ", answer: "하히후헤호" },
  { word: "かわいい", answer: "카와이" },
  { word: "つなみ", answer: "쓰나미" },
  { word: "ゆうり", answer: "유우리" },
  { word: "ミュージック", answer: "뮤지쿠"},
];
