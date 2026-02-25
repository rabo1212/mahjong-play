import { TileKind, Suit } from '@/engine/types';

// 좌석 이름
export const SEAT_NAMES = ['동', '남', '서', '북'] as const;
export const SEAT_WINDS: TileKind[] = [41, 42, 43, 44];

// 수트 정보
export const SUIT_INFO: Record<Exclude<Suit, 'flower'>, { label: string; startKind: number; endKind: number }> = {
  wan:    { label: '만', startKind: 11, endKind: 19 },
  pin:    { label: '통', startKind: 21, endKind: 29 },
  sou:    { label: '삭', startKind: 31, endKind: 39 },
  wind:   { label: '풍', startKind: 41, endKind: 44 },
  dragon: { label: '원', startKind: 51, endKind: 53 },
};

// kind → 한국어 라벨
export const TILE_LABELS: Record<number, string> = {
  // 만수
  11: '1만', 12: '2만', 13: '3만', 14: '4만', 15: '5만',
  16: '6만', 17: '7만', 18: '8만', 19: '9만',
  // 통수
  21: '1통', 22: '2통', 23: '3통', 24: '4통', 25: '5통',
  26: '6통', 27: '7통', 28: '8통', 29: '9통',
  // 삭수
  31: '1삭', 32: '2삭', 33: '3삭', 34: '4삭', 35: '5삭',
  36: '6삭', 37: '7삭', 38: '8삭', 39: '9삭',
  // 풍패
  41: '동', 42: '남', 43: '서', 44: '북',
  // 삼원패
  51: '중', 52: '발', 53: '백',
  // 화패
  61: '매', 62: '란', 63: '국', 64: '죽',
  65: '춘', 66: '하', 67: '추', 68: '동',
};

// kind → 타일 위 표시 한자
export const TILE_CHARS: Record<number, string> = {
  // 만수 숫자
  11: '一', 12: '二', 13: '三', 14: '四', 15: '五',
  16: '六', 17: '七', 18: '八', 19: '九',
  // 통수 숫자 (동그라미 개수로 표현)
  21: '①', 22: '②', 23: '③', 24: '④', 25: '⑤',
  26: '⑥', 27: '⑦', 28: '⑧', 29: '⑨',
  // 삭수 숫자
  31: '1', 32: '2', 33: '3', 34: '4', 35: '5',
  36: '6', 37: '7', 38: '8', 39: '9',
  // 풍패
  41: '東', 42: '南', 43: '西', 44: '北',
  // 삼원패
  51: '中', 52: '發', 53: '　',  // 백은 빈칸
  // 화패
  61: '梅', 62: '蘭', 63: '菊', 64: '竹',
  65: '春', 66: '夏', 67: '秋', 68: '冬',
};

// kind → 수트 표시
export const SUIT_CHARS: Record<number, string> = {
  1: '萬', 2: '筒', 3: '索',
};

// 모든 수패 kind (11~39)
export const ALL_SUITED_KINDS: TileKind[] = [];
for (let s = 1; s <= 3; s++) {
  for (let n = 1; n <= 9; n++) {
    ALL_SUITED_KINDS.push(s * 10 + n);
  }
}

// 모든 자패 kind (41~53)
export const ALL_HONOR_KINDS: TileKind[] = [41, 42, 43, 44, 51, 52, 53];

// 모든 일반 kind (34종, 꽃패 제외)
export const ALL_TILE_KINDS: TileKind[] = [...ALL_SUITED_KINDS, ...ALL_HONOR_KINDS];

// 요구패 (십삼요에 필요한 13종)
export const TERMINAL_AND_HONOR_KINDS: TileKind[] = [
  11, 19, 21, 29, 31, 39, // 노두패 (1, 9)
  41, 42, 43, 44,          // 풍패
  51, 52, 53,              // 삼원패
];

// 노두패 (1, 9)
export const TERMINAL_KINDS: TileKind[] = [11, 19, 21, 29, 31, 39];

// 꽃패
export const FLOWER_KINDS: TileKind[] = [61, 62, 63, 64, 65, 66, 67, 68];

// 액션 우선순위
export const ACTION_PRIORITY: Record<string, number> = {
  win: 100,
  kan: 30,
  pon: 20,
  chi: 10,
};
