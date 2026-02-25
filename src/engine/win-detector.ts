import { TileKind, WinDecomposition, WinMeld } from './types';
import { isSuited, buildKindCounts } from './tiles';
import { ALL_TILE_KINDS, TERMINAL_AND_HONOR_KINDS } from '@/lib/constants';

/**
 * 화료(승리) 판정
 * 14장(손패 13장 + 쯔모/론 1장)이 화료 형태인지 확인
 * 부로한 면자의 kind는 포함하지 않음 (이미 완성된 면자이므로)
 * @param kinds - 손패의 kind 배열 (14장, 또는 부로 시 그만큼 줄어듦)
 * @param meldCount - 이미 부로로 완성된 면자 수 (0~4)
 * @returns 가능한 모든 화료 분해
 */
export function canWin(kinds: TileKind[], meldCount: number = 0): WinDecomposition[] {
  const expectedTiles = (4 - meldCount) * 3 + 2;
  if (kinds.length !== expectedTiles) return [];

  const results: WinDecomposition[] = [];

  // 1. 특수형 체크 (부로 없을 때만)
  if (meldCount === 0) {
    const thirteenOrphans = checkThirteenOrphans(kinds);
    if (thirteenOrphans) results.push(thirteenOrphans);

    const sevenPairs = checkSevenPairs(kinds);
    if (sevenPairs) results.push(sevenPairs);
  }

  // 2. 일반형: (4-meldCount)면자 + 1작두
  const counts = buildKindCounts(kinds);
  const neededMelds = 4 - meldCount;

  for (let k = 11; k <= 53; k++) {
    if (counts[k] < 2) continue;

    // k를 작두(pair)로 사용
    const remaining = [...counts];
    remaining[k] -= 2;

    const melds: WinMeld[] = [];
    if (extractAllMelds(remaining, melds, neededMelds)) {
      results.push({
        type: 'standard',
        melds: [...melds],
        pair: k,
      });
    }
  }

  return results;
}

/** 재귀 면자 분해 */
function extractAllMelds(counts: number[], melds: WinMeld[], needed: number): boolean {
  if (melds.length === needed) {
    // 모든 카운트가 0인지 확인
    for (let k = 11; k <= 53; k++) {
      if (counts[k] > 0) return false;
    }
    return true;
  }

  // 가장 작은 non-zero kind 찾기
  let firstKind = -1;
  for (let k = 11; k <= 53; k++) {
    if (counts[k] > 0) { firstKind = k; break; }
  }
  if (firstKind === -1) return false;

  // 커쯔(triplet) 시도
  if (counts[firstKind] >= 3) {
    counts[firstKind] -= 3;
    melds.push({ type: 'triplet', kinds: [firstKind, firstKind, firstKind] });
    if (extractAllMelds(counts, melds, needed)) return true;
    melds.pop();
    counts[firstKind] += 3;
  }

  // 순자(sequence) 시도 — 수패만 가능
  if (isSuited(firstKind)) {
    const k1 = firstKind;
    const k2 = firstKind + 1;
    const k3 = firstKind + 2;

    // 같은 수트 내에서만 (10의 자리가 같아야 함)
    if (
      Math.floor(k1 / 10) === Math.floor(k2 / 10) &&
      Math.floor(k1 / 10) === Math.floor(k3 / 10) &&
      counts[k1] >= 1 && counts[k2] >= 1 && counts[k3] >= 1
    ) {
      counts[k1] -= 1;
      counts[k2] -= 1;
      counts[k3] -= 1;
      melds.push({ type: 'sequence', kinds: [k1, k2, k3] });
      if (extractAllMelds(counts, melds, needed)) return true;
      melds.pop();
      counts[k1] += 1;
      counts[k2] += 1;
      counts[k3] += 1;
    }
  }

  return false;
}

/** 십삼요(十三幺) 체크 */
function checkThirteenOrphans(kinds: TileKind[]): WinDecomposition | null {
  if (kinds.length !== 14) return null;

  const counts = buildKindCounts(kinds);
  let pairKind: TileKind = -1;

  for (const k of TERMINAL_AND_HONOR_KINDS) {
    if (counts[k] === 0) return null;
    if (counts[k] === 2) {
      if (pairKind !== -1) return null; // 2쌍 이상이면 불가
      pairKind = k;
    }
    if (counts[k] > 2) return null;
  }

  // 요구패 13종 외의 패가 있으면 불가
  let total = 0;
  for (const k of TERMINAL_AND_HONOR_KINDS) {
    total += counts[k];
  }
  if (total !== 14) return null;

  if (pairKind === -1) return null;

  return {
    type: 'thirteen-orphans',
    melds: [],
    pair: pairKind,
  };
}

/** 칠대자(七対子) 체크 */
function checkSevenPairs(kinds: TileKind[]): WinDecomposition | null {
  if (kinds.length !== 14) return null;

  const counts = buildKindCounts(kinds);
  const pairs: TileKind[] = [];

  for (let k = 11; k <= 53; k++) {
    if (counts[k] === 0) continue;
    if (counts[k] !== 2) return null;  // 0 또는 2만 허용 (4장은 불가)
    pairs.push(k);
  }

  if (pairs.length !== 7) return null;

  return {
    type: 'seven-pairs',
    melds: [],
    pair: pairs[0],  // 편의상 첫 번째 쌍을 pair로
  };
}

/**
 * 텐파이(청패) 판정 — 1장 더 오면 화료 가능한 상태
 * @param kinds - 손패 kind 배열 (13장 또는 부로 시 줄어듦)
 * @param meldCount - 이미 부로한 면자 수
 */
export function isTenpai(kinds: TileKind[], meldCount: number = 0): boolean {
  return getWaitingTiles(kinds, meldCount).length > 0;
}

/**
 * 대기패 목록 — 어떤 패가 오면 화료인지
 * @param kinds - 손패 kind 배열 (13장 또는 부로 시 줄어듦)
 * @param meldCount - 이미 부로한 면자 수
 */
export function getWaitingTiles(kinds: TileKind[], meldCount: number = 0): TileKind[] {
  const waiting: TileKind[] = [];

  for (const testKind of ALL_TILE_KINDS) {
    const testHand = [...kinds, testKind].sort((a, b) => a - b);
    if (canWin(testHand, meldCount).length > 0) {
      waiting.push(testKind);
    }
  }

  return waiting;
}
