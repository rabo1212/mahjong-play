import { TileKind, WinDecomposition, WinMeld, WinContext, ScoringResult, Meld } from './types';
import { isSuited, isHonor, isTerminal } from './tiles';
import { YAKU_LIST } from '@/data/yaku-list';

/**
 * MCR 점수 계산
 * @param decomp - 화료 분해 결과
 * @param context - 화료 상황 정보
 * @param allKinds - 화료 시 전체 kind (손패 + 부로 패 모두)
 */
export function calculateScore(
  decomp: WinDecomposition,
  context: WinContext,
  allKinds: TileKind[]
): ScoringResult {
  const detected: { id: string; count: number }[] = [];

  // 모든 면자 (분해 면자 + 부로 면자)
  const allMelds = [
    ...decomp.melds,
    ...context.melds.map(meldToWinMeld),
  ];

  const pair = decomp.pair;

  // ===== 88점 역 =====

  // 대삼원: 중·발·백 모두 커쯔
  if (hasTripletOf(allMelds, 51) && hasTripletOf(allMelds, 52) && hasTripletOf(allMelds, 53)) {
    detected.push({ id: 'big_three_dragons', count: 1 });
  }

  // 대사희: 동남서북 모두 커쯔
  if (hasTripletOf(allMelds, 41) && hasTripletOf(allMelds, 42) &&
      hasTripletOf(allMelds, 43) && hasTripletOf(allMelds, 44)) {
    detected.push({ id: 'big_four_winds', count: 1 });
  }

  // 십삼요
  if (decomp.type === 'thirteen-orphans') {
    detected.push({ id: 'thirteen_orphans', count: 1 });
  }

  // 구련보등: 한 수트 1112345678999 + 1장
  if (decomp.type === 'standard' && context.isMenzen && checkNineGates(allKinds)) {
    detected.push({ id: 'nine_gates', count: 1 });
  }

  // ===== 64점 역 =====

  // 자일색: 자패만
  if (allKinds.every(k => isHonor(k))) {
    detected.push({ id: 'all_honors', count: 1 });
  }

  // 소삼원: 삼원패 2개 커쯔 + 1개 머리
  if (!detected.some(d => d.id === 'big_three_dragons')) {
    const dragonTriplets = [51, 52, 53].filter(k => hasTripletOf(allMelds, k)).length;
    const dragonPair = [51, 52, 53].includes(pair);
    if (dragonTriplets === 2 && dragonPair) {
      detected.push({ id: 'small_three_dragons', count: 1 });
    }
  }

  // 소사희: 풍패 3개 커쯔 + 1개 머리
  if (!detected.some(d => d.id === 'big_four_winds')) {
    const windTriplets = [41, 42, 43, 44].filter(k => hasTripletOf(allMelds, k)).length;
    const windPair = [41, 42, 43, 44].includes(pair);
    if (windTriplets === 3 && windPair) {
      detected.push({ id: 'small_four_winds', count: 1 });
    }
  }

  // 사암각: 4개 암각 (부로 없이 커쯔 4개)
  if (decomp.type === 'standard') {
    const concealedTriplets = decomp.melds.filter(m => m.type === 'triplet').length;
    if (concealedTriplets === 4) {
      detected.push({ id: 'four_concealed_pungs', count: 1 });
    }
  }

  // ===== 24점 역 =====

  // 칠대자
  if (decomp.type === 'seven-pairs') {
    detected.push({ id: 'seven_pairs', count: 1 });
  }

  // 청일색: 한 종류 수패만
  if (decomp.type !== 'thirteen-orphans') {
    const suitCodes = new Set(allKinds.map(k => Math.floor(k / 10)));
    if (suitCodes.size === 1 && allKinds.every(k => isSuited(k))) {
      detected.push({ id: 'full_flush', count: 1 });
    }
  }

  // ===== 16점 역 =====

  // 삼암각
  if (decomp.type === 'standard' && !detected.some(d => d.id === 'four_concealed_pungs')) {
    const concealedTriplets = decomp.melds.filter(m => m.type === 'triplet').length;
    if (concealedTriplets === 3) {
      detected.push({ id: 'three_concealed_pungs', count: 1 });
    }
  }

  // 일기통관: 같은 수트 123+456+789
  if (decomp.type === 'standard') {
    for (const base of [10, 20, 30]) {
      const sequences = allMelds.filter(m =>
        m.type === 'sequence' && m.kinds[0] >= base + 1 && m.kinds[0] <= base + 9
      );
      const hasLow = sequences.some(m => m.kinds[0] === base + 1);
      const hasMid = sequences.some(m => m.kinds[0] === base + 4);
      const hasHigh = sequences.some(m => m.kinds[0] === base + 7);
      if (hasLow && hasMid && hasHigh) {
        detected.push({ id: 'pure_straight', count: 1 });
        break;
      }
    }
  }

  // ===== 6점 역 =====

  // 혼일색: 한 종류 수패 + 자패
  if (!detected.some(d => ['full_flush', 'all_honors'].includes(d.id)) &&
      decomp.type !== 'thirteen-orphans') {
    const suitedKinds = allKinds.filter(k => isSuited(k));
    const honorKinds = allKinds.filter(k => isHonor(k));
    if (suitedKinds.length > 0 && honorKinds.length > 0) {
      const suitCodes = new Set(suitedKinds.map(k => Math.floor(k / 10)));
      if (suitCodes.size === 1) {
        detected.push({ id: 'half_flush', count: 1 });
      }
    }
  }

  // 대대화(All Pungs): 4개 모두 커쯔
  if (decomp.type === 'standard' && !detected.some(d => d.id === 'all_honors')) {
    const allTriplets = allMelds.every(m => m.type === 'triplet');
    if (allTriplets && allMelds.length === 4) {
      detected.push({ id: 'all_pungs', count: 1 });
    }
  }

  // ===== 2점 역 =====

  // 평화(All Chows): 4순자 + 수패 머리, 자패 없음
  if (decomp.type === 'standard') {
    const allSequences = allMelds.every(m => m.type === 'sequence');
    const pairIsSuited = isSuited(pair);
    if (allSequences && pairIsSuited && allMelds.length === 4) {
      detected.push({ id: 'all_chows', count: 1 });
    }
  }

  // 단요구: 노두패·자패 없이 2~8만
  if (!detected.some(d => d.id === 'thirteen_orphans')) {
    if (allKinds.every(k => isSuited(k) && !isTerminal(k))) {
      detected.push({ id: 'all_simples', count: 1 });
    }
  }

  // 문전청: 부로 없이 화료
  if (context.isMenzen && !detected.some(d =>
    ['four_concealed_pungs', 'seven_pairs', 'thirteen_orphans', 'nine_gates'].includes(d.id)
  )) {
    detected.push({ id: 'concealed_hand', count: 1 });
  }

  // 번패(Dragon Pung): 삼원패 커쯔 (개별)
  if (!detected.some(d => ['big_three_dragons', 'small_three_dragons'].includes(d.id))) {
    for (const dk of [51, 52, 53]) {
      if (hasTripletOf(allMelds, dk)) {
        detected.push({ id: 'dragon_pung', count: 1 });
      }
    }
  }

  // 권풍각: 장풍 커쯔
  if (!detected.some(d => ['big_four_winds', 'small_four_winds'].includes(d.id))) {
    if (hasTripletOf(allMelds, context.roundWind)) {
      detected.push({ id: 'prevalent_wind', count: 1 });
    }
  }

  // 문풍각: 자풍 커쯔
  if (!detected.some(d => ['big_four_winds', 'small_four_winds'].includes(d.id))) {
    if (hasTripletOf(allMelds, context.seatWind)) {
      detected.push({ id: 'seat_wind', count: 1 });
    }
  }

  // ===== 1점 역 =====

  // 자모(쯔모)
  if (context.isTsumo) {
    detected.push({ id: 'self_drawn', count: 1 });
  }

  // 화패: 꽃패 1장당 1점
  if (context.flowerCount > 0) {
    detected.push({ id: 'flower_tiles', count: context.flowerCount });
  }

  // ===== exclusion 처리 =====
  const finalList = applyExclusions(detected);

  // 점수 합산
  let totalPoints = 0;
  const yakuList = finalList.map(d => {
    const yaku = YAKU_LIST[d.id];
    const points = yaku.points * d.count;
    totalPoints += points;
    return { yaku, count: d.count };
  });

  // 기본 화료 1점은 항상 포함 (MCR 규칙)
  // → 이미 자모 등으로 1점 이상이므로 별도 추가 안 함
  // 단, 아무 역도 없으면 최소 1점 (화패 점수만으로도 가능)

  return {
    yakuList,
    totalPoints,
    meetsMinimum: totalPoints >= 8,
  };
}

/** Meld → WinMeld 변환 */
function meldToWinMeld(meld: Meld): WinMeld {
  const kinds = meld.tileKinds;
  if (meld.type === 'chi') {
    return { type: 'sequence', kinds: [...kinds].sort((a, b) => a - b) };
  }
  return { type: 'triplet', kinds: kinds.slice(0, 3) };
}

/** 면자들 중 특정 kind의 커쯔가 있는지 */
function hasTripletOf(melds: WinMeld[], kind: TileKind): boolean {
  return melds.some(m => m.type === 'triplet' && m.kinds[0] === kind);
}

/** 구련보등 체크: 한 수트 1112345678999 + 1장 */
function checkNineGates(kinds: TileKind[]): boolean {
  if (kinds.length !== 14) return false;

  const suitCodes = new Set(kinds.map(k => Math.floor(k / 10)));
  if (suitCodes.size !== 1) return false;
  if (!isSuited(kinds[0])) return false;

  const base = Math.floor(kinds[0] / 10) * 10;
  const counts = new Array(10).fill(0);
  for (const k of kinds) {
    counts[k - base]++;
  }

  // 1112345678999 패턴: 1이 3장, 2~8이 1장, 9가 3장 + 아무거나 1장
  const pattern = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3]; // [0]은 미사용
  let extra = 0;
  for (let n = 1; n <= 9; n++) {
    const diff = counts[n] - pattern[n];
    if (diff < 0) return false;
    extra += diff;
  }
  return extra === 1;
}

/** exclusion 처리: 상위역이 있으면 하위역 제거 */
function applyExclusions(detected: { id: string; count: number }[]): { id: string; count: number }[] {
  const excludeSet = new Set<string>();

  for (const d of detected) {
    const yaku = YAKU_LIST[d.id];
    if (yaku) {
      for (const ex of yaku.excludes) {
        excludeSet.add(ex);
      }
    }
  }

  return detected.filter(d => !excludeSet.has(d.id));
}
