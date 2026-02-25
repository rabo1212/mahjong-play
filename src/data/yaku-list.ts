import { Yaku } from '@/engine/types';

/** MCR 20개 핵심 역 정의 */
export const YAKU_LIST: Record<string, Yaku> = {
  // === 88점 ===
  big_three_dragons: {
    id: 'big_three_dragons',
    nameKo: '대삼원',
    nameCn: '大三元',
    nameEn: 'Big Three Dragons',
    points: 88,
    description: '중·발·백 모두 커쯔/깡쯔',
    excludes: ['small_three_dragons', 'dragon_pung'],
  },
  big_four_winds: {
    id: 'big_four_winds',
    nameKo: '대사희',
    nameCn: '大四喜',
    nameEn: 'Big Four Winds',
    points: 88,
    description: '동·남·서·북 모두 커쯔/깡쯔',
    excludes: ['small_four_winds', 'prevalent_wind', 'seat_wind', 'pung_of_terminals_honors'],
  },
  all_honors: {
    id: 'all_honors',
    nameKo: '자일색',
    nameCn: '字一色',
    nameEn: 'All Honors',
    points: 64,
    description: '자패(풍패+삼원패)로만 구성',
    excludes: ['all_pungs', 'pung_of_terminals_honors'],
  },
  nine_gates: {
    id: 'nine_gates',
    nameKo: '구련보등',
    nameCn: '九蓮寶燈',
    nameEn: 'Nine Gates',
    points: 88,
    description: '한 수트로 1112345678999 + 아무 패 1장',
    excludes: ['full_flush', 'concealed_hand'],
  },
  thirteen_orphans: {
    id: 'thirteen_orphans',
    nameKo: '십삼요',
    nameCn: '十三幺',
    nameEn: 'Thirteen Orphans',
    points: 88,
    description: '13종 요구패 + 아무 요구패 1장 중복',
    excludes: ['concealed_hand', 'all_types'],
  },

  // === 64점 ===
  small_three_dragons: {
    id: 'small_three_dragons',
    nameKo: '소삼원',
    nameCn: '小三元',
    nameEn: 'Little Three Dragons',
    points: 64,
    description: '삼원패 중 2개 커쯔 + 1개 머리',
    excludes: ['dragon_pung'],
  },
  small_four_winds: {
    id: 'small_four_winds',
    nameKo: '소사희',
    nameCn: '小四喜',
    nameEn: 'Little Four Winds',
    points: 64,
    description: '풍패 중 3개 커쯔 + 1개 머리',
    excludes: ['prevalent_wind', 'seat_wind'],
  },
  four_concealed_pungs: {
    id: 'four_concealed_pungs',
    nameKo: '사암각',
    nameCn: '四暗刻',
    nameEn: 'Four Concealed Pungs',
    points: 64,
    description: '4개 암각 (부로 없이 커쯔 4개)',
    excludes: ['concealed_hand', 'all_pungs'],
  },

  // === 24점 ===
  seven_pairs: {
    id: 'seven_pairs',
    nameKo: '칠대자',
    nameCn: '七對子',
    nameEn: 'Seven Pairs',
    points: 24,
    description: '7개의 대자(쌍)',
    excludes: ['concealed_hand'],
  },
  full_flush: {
    id: 'full_flush',
    nameKo: '청일색',
    nameCn: '清一色',
    nameEn: 'Full Flush',
    points: 24,
    description: '한 종류 수패로만 구성',
    excludes: ['half_flush'],
  },

  // === 16점 ===
  three_concealed_pungs: {
    id: 'three_concealed_pungs',
    nameKo: '삼암각',
    nameCn: '三暗刻',
    nameEn: 'Three Concealed Pungs',
    points: 16,
    description: '부로 없이 커쯔 3개',
    excludes: [],
  },
  pure_straight: {
    id: 'pure_straight',
    nameKo: '일기통관',
    nameCn: '一氣通貫',
    nameEn: 'Pure Straight',
    points: 16,
    description: '같은 수트로 123+456+789',
    excludes: [],
  },

  // === 6점 ===
  half_flush: {
    id: 'half_flush',
    nameKo: '혼일색',
    nameCn: '混一色',
    nameEn: 'Half Flush',
    points: 6,
    description: '한 종류 수패 + 자패',
    excludes: [],
  },

  // === 4점 ===
  prevalent_wind: {
    id: 'prevalent_wind',
    nameKo: '권풍각',
    nameCn: '圈風刻',
    nameEn: 'Prevalent Wind',
    points: 2,
    description: '장풍과 같은 풍패 커쯔',
    excludes: [],
  },
  seat_wind: {
    id: 'seat_wind',
    nameKo: '문풍각',
    nameCn: '門風刻',
    nameEn: 'Seat Wind',
    points: 2,
    description: '자풍과 같은 풍패 커쯔',
    excludes: [],
  },

  // === 2점 ===
  all_chows: {
    id: 'all_chows',
    nameKo: '평화',
    nameCn: '平和',
    nameEn: 'All Chows',
    points: 2,
    description: '4개 순자 + 수패 머리, 자패 없음',
    excludes: [],
  },
  all_simples: {
    id: 'all_simples',
    nameKo: '단요구',
    nameCn: '斷幺九',
    nameEn: 'All Simples',
    points: 2,
    description: '노두패(1,9)와 자패 없이 2~8로만 구성',
    excludes: [],
  },
  concealed_hand: {
    id: 'concealed_hand',
    nameKo: '문전청',
    nameCn: '門前清',
    nameEn: 'Concealed Hand',
    points: 2,
    description: '부로 없이 문전으로 화료',
    excludes: [],
  },
  all_pungs: {
    id: 'all_pungs',
    nameKo: '대대화',
    nameCn: '碰碰和',
    nameEn: 'All Pungs',
    points: 6,
    description: '4개 모두 커쯔/깡쯔',
    excludes: [],
  },

  // === 1점 ===
  self_drawn: {
    id: 'self_drawn',
    nameKo: '자모',
    nameCn: '自摸',
    nameEn: 'Self-Drawn',
    points: 1,
    description: '쯔모(직접 뽑기)로 화료',
    excludes: [],
  },
  flower_tiles: {
    id: 'flower_tiles',
    nameKo: '화패',
    nameCn: '花牌',
    nameEn: 'Flower Tiles',
    points: 1,
    description: '꽃패 1장당 1점',
    excludes: [],
  },
  dragon_pung: {
    id: 'dragon_pung',
    nameKo: '번패',
    nameCn: '箭刻',
    nameEn: 'Dragon Pung',
    points: 2,
    description: '삼원패(중/발/백) 커쯔',
    excludes: [],
  },
};

/** 역 목록 배열 (점수 내림차순) */
export const YAKU_ARRAY = Object.values(YAKU_LIST).sort((a, b) => b.points - a.points);
