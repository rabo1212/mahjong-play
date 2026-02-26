/**
 * 튜토리얼 5단계 정의
 */

export interface TileGroupInfo {
  label: string;
  description: string;
  kinds: number[];
  colorClass: string;
}

export interface QuizQuestion {
  question: string;
  options: { kinds: number[]; label: string }[];
  correctIndex: number;
  explanation: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  subtitle: string;
  type: 'tiles' | 'melds' | 'discard' | 'call' | 'win';
}

// --- Step 1: 패 종류 ---
export const TILE_GROUPS: TileGroupInfo[] = [
  {
    label: '만수 (萬)',
    description: '한자 숫자 + 萬. 1~9까지 각 4장씩.',
    kinds: [11, 12, 13, 14, 15, 16, 17, 18, 19],
    colorClass: 'text-tile-wan',
  },
  {
    label: '통수 (筒)',
    description: '동그란 점 무늬. 1~9까지 각 4장씩.',
    kinds: [21, 22, 23, 24, 25, 26, 27, 28, 29],
    colorClass: 'text-tile-pin',
  },
  {
    label: '삭수 (索)',
    description: '대나무 막대 무늬. 1~9까지 각 4장씩.',
    kinds: [31, 32, 33, 34, 35, 36, 37, 38, 39],
    colorClass: 'text-tile-sou',
  },
  {
    label: '풍패 (風牌)',
    description: '동·남·서·북. 각 4장씩.',
    kinds: [41, 42, 43, 44],
    colorClass: 'text-text-primary',
  },
  {
    label: '삼원패 (三元牌)',
    description: '中·發·白. 각 4장씩.',
    kinds: [51, 52, 53],
    colorClass: 'text-tile-dragon',
  },
];

// --- Step 2: 면자 퀴즈 ---
export const MELD_EXAMPLES = {
  shuntsu: { label: '순자 (順子)', description: '같은 수트의 연속 3장', kinds: [11, 12, 13] },
  koutsu: { label: '커쯔 (刻子)', description: '같은 패 3장', kinds: [25, 25, 25] },
  pair: { label: '머리 (雀頭)', description: '같은 패 2장 (1조만 필요)', kinds: [44, 44] },
  complete: {
    label: '완성 예시',
    description: '면자 4조 + 머리 1조 = 화료!',
    groups: [
      [11, 12, 13],   // 순자
      [21, 22, 23],   // 순자
      [31, 31, 31],   // 커쯔
      [42, 42, 42],   // 커쯔
      [19, 19],        // 머리
    ],
  },
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: '다음 중 면자(순자 또는 커쯔)인 것은?',
    options: [
      { kinds: [11, 12, 13], label: '1만 2만 3만' },
      { kinds: [11, 21, 31], label: '1만 1통 1삭' },
      { kinds: [11, 13, 15], label: '1만 3만 5만' },
    ],
    correctIndex: 0,
    explanation: '순자는 같은 수트의 연속 3장이어야 합니다. 다른 수트끼리는 안 됩니다.',
  },
  {
    question: '다음 중 커쯔(같은 패 3장)인 것은?',
    options: [
      { kinds: [41, 42, 43], label: '東 南 西' },
      { kinds: [51, 51, 51], label: '中 中 中' },
      { kinds: [31, 32, 33], label: '1삭 2삭 3삭' },
    ],
    correctIndex: 1,
    explanation: '커쯔는 완전히 같은 패 3장입니다. 풍패 3종류는 커쯔가 아닙니다.',
  },
  {
    question: '화료하려면 무엇이 필요한가요?',
    options: [
      { kinds: [], label: '면자 3조 + 머리 2조' },
      { kinds: [], label: '면자 4조 + 머리 1조' },
      { kinds: [], label: '면자 5조' },
    ],
    correctIndex: 1,
    explanation: '기본 화료 조건: 면자(순자/커쯔) 4조 + 머리 1조 = 14장!',
  },
];

// --- Step 3: 버리기 연습 ---
// 향청수 1인 손패 (1장 버리면 텐파이)
// 11,12,13, 21,22,23, 31,32,33, 41,41,41, 19,15
// 15(5만)를 버리면 텐파이 → 대기패: 19(9만)
export const DISCARD_HAND_KINDS = [11, 12, 13, 15, 19, 21, 22, 23, 31, 32, 33, 41, 41, 41];
export const DISCARD_CORRECT_KIND = 15; // 5만을 버려야 함
export const DISCARD_HINT = '이 패는 어떤 면자에도 속하지 않습니다. 버려보세요!';

// --- Step 4: 치 연습 ---
// 내 손패에 11, 12가 있고 상대가 13을 버림 → 치 가능
export const CALL_HAND_KINDS = [11, 12, 21, 22, 23, 31, 32, 33, 44, 44, 44, 19, 19];
export const CALL_DISCARD_KIND = 13;   // 상대가 3만을 버림
export const CALL_HINT = '상대가 버린 3만으로 순자(1만 2만 3만)를 완성할 수 있습니다!';

// --- Step 5: 화료 ---
// 완전한 텐파이, 대기패 = 19(9만)
export const WIN_HAND_KINDS = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 41, 41, 19];
export const WIN_TILE_KIND = 19;  // 쯔모패 = 9만
export const WIN_HINT = '텐파이 상태에서 대기패를 뽑았습니다! 쯔모를 선언하세요!';

// 단계 목록
export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'tiles', title: '패 종류', subtitle: '만수·통수·삭수·풍패·삼원패', type: 'tiles' },
  { id: 'melds', title: '면자 만들기', subtitle: '순자·커쯔·머리', type: 'melds' },
  { id: 'discard', title: '패 버리기', subtitle: '텐파이를 만들어보자', type: 'discard' },
  { id: 'call', title: '치 해보기', subtitle: '상대 패로 면자 완성', type: 'call' },
  { id: 'win', title: '화료!', subtitle: '쯔모로 이겨보자', type: 'win' },
];
