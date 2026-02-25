import { TileKind } from '@/engine/types';
import { buildKindCounts, isSuited } from '@/engine/tiles';
import { ALL_TILE_KINDS, TERMINAL_AND_HONOR_KINDS } from '@/lib/constants';

/**
 * 향청수(向聴数) 계산
 * 화료까지 필요한 최소 교환 수
 * 0 = 텐파이, -1 = 화료
 */

/** 일반형(4면자+1작두) 향청수 */
function shantenStandard(counts: number[], meldCount: number): number {
  const needed = 4 - meldCount;
  let best = 8; // 최악의 경우

  // 모든 가능한 pair를 시도
  for (let k = 11; k <= 53; k++) {
    if (counts[k] < 2) continue;
    counts[k] -= 2;
    const s = calcMentsu(counts, needed, 0, 0) - 1; // -1: pair 보너스
    best = Math.min(best, s);
    counts[k] += 2;
  }

  // pair 없이도 시도 (pair를 아직 못 찾은 경우)
  const noPair = calcMentsu(counts, needed, 0, 0);
  best = Math.min(best, noPair);

  return best;
}

/** 면자/대자 추출 재귀 */
function calcMentsu(counts: number[], needed: number, mentsu: number, partial: number): number {
  // 가장 작은 non-zero kind 찾기
  let first = -1;
  for (let k = 11; k <= 53; k++) {
    if (counts[k] > 0) { first = k; break; }
  }

  if (first === -1) {
    // 모두 소진 → 향청수 계산
    return (needed - mentsu) * 2 - partial;
  }

  let best = (needed - mentsu) * 2 - partial; // 현재 상태에서 중단

  // 커쯔 (3장)
  if (counts[first] >= 3 && mentsu < needed) {
    counts[first] -= 3;
    const s = calcMentsu(counts, needed, mentsu + 1, partial);
    best = Math.min(best, s);
    counts[first] += 3;
  }

  // 순자 (수패만)
  if (isSuited(first)) {
    const k1 = first, k2 = first + 1, k3 = first + 2;
    if (Math.floor(k1 / 10) === Math.floor(k3 / 10) &&
        counts[k1] >= 1 && counts[k2] >= 1 && counts[k3] >= 1 && mentsu < needed) {
      counts[k1]--; counts[k2]--; counts[k3]--;
      const s = calcMentsu(counts, needed, mentsu + 1, partial);
      best = Math.min(best, s);
      counts[k1]++; counts[k2]++; counts[k3]++;
    }

    // 대자 (2장 연속 = 불완전 순자)
    if (Math.floor(k1 / 10) === Math.floor(k2 / 10) &&
        counts[k1] >= 1 && counts[k2] >= 1 && (mentsu + partial) < needed) {
      counts[k1]--; counts[k2]--;
      const s = calcMentsu(counts, needed, mentsu, partial + 1);
      best = Math.min(best, s);
      counts[k1]++; counts[k2]++;
    }

    // 간짱 대자 (1칸 건너뛴 2장)
    if (Math.floor(k1 / 10) === Math.floor(k3 / 10) &&
        counts[k1] >= 1 && counts[k3] >= 1 && (mentsu + partial) < needed) {
      counts[k1]--; counts[k3]--;
      const s = calcMentsu(counts, needed, mentsu, partial + 1);
      best = Math.min(best, s);
      counts[k1]++; counts[k3]++;
    }
  }

  // 대자 (커쯔 2장 = 불완전 커쯔)
  if (counts[first] >= 2 && (mentsu + partial) < needed) {
    counts[first] -= 2;
    const s = calcMentsu(counts, needed, mentsu, partial + 1);
    best = Math.min(best, s);
    counts[first] += 2;
  }

  // 고립패로 무시
  counts[first]--;
  const s = calcMentsu(counts, needed, mentsu, partial);
  best = Math.min(best, s);
  counts[first]++;

  return best;
}

/** 칠대자 향청수 */
function shantenSevenPairs(counts: number[]): number {
  let pairs = 0;
  let kinds = 0;
  for (let k = 11; k <= 53; k++) {
    if (counts[k] >= 2) pairs++;
    if (counts[k] >= 1) kinds++;
  }
  // 남은 종류가 7개 미만이면 보정
  const shortage = Math.max(0, 7 - kinds);
  return 6 - pairs + shortage;
}

/** 십삼요 향청수 */
function shantenThirteenOrphans(counts: number[]): number {
  let have = 0;
  let hasPair = false;
  for (const k of TERMINAL_AND_HONOR_KINDS) {
    if (counts[k] >= 1) have++;
    if (counts[k] >= 2) hasPair = true;
  }
  return 13 - have - (hasPair ? 1 : 0);
}

// 향청수 메모이제이션 캐시
const shantenCache = new Map<string, number>();

/** 캐시 키 생성: kinds를 정렬해서 문자열화 */
function makeCacheKey(kinds: TileKind[], meldCount: number): string {
  const sorted = [...kinds].sort((a, b) => a - b);
  return `${sorted.join(',')}_${meldCount}`;
}

/** 캐시 초기화 (매 AI 턴마다 호출) */
export function clearShantenCache(): void {
  shantenCache.clear();
}

/**
 * 향청수 계산 (메인)
 * @param kinds 손패 kind 배열 (부로 제외, 13장 or 14장)
 * @param meldCount 부로한 면자 수
 * @returns 향청수 (-1=화료, 0=텐파이, 1=이향청, ...)
 */
export function calculateShanten(kinds: TileKind[], meldCount: number = 0): number {
  const key = makeCacheKey(kinds, meldCount);
  const cached = shantenCache.get(key);
  if (cached !== undefined) return cached;

  const counts = buildKindCounts(kinds);

  let best = shantenStandard(counts, meldCount);

  // 특수형은 부로 없을 때만 (13장 or 14장 모두)
  if (meldCount === 0) {
    best = Math.min(best, shantenSevenPairs(counts));
    best = Math.min(best, shantenThirteenOrphans(counts));
  }

  // 캐시 크기 제한 (메모리 보호)
  if (shantenCache.size > 10000) shantenCache.clear();
  shantenCache.set(key, best);

  return best;
}

/**
 * 유효패 수 계산
 * 특정 패를 버린 후 향청수를 낮출 수 있는 패의 남은 매수 합계
 * @param handKinds 현재 손패 kinds (14장 = hand + drawnTile)
 * @param meldCount 부로 면자 수
 * @param discardKind 버릴 패의 kind
 * @param visibleCounts 보이는 패 카운트 (버림패 + 부로 패 등)
 */
export function countEffectiveTiles(
  handKinds: TileKind[],
  meldCount: number,
  discardKind: TileKind,
  visibleCounts: number[]
): number {
  // 버린 후 손패
  const afterDiscard = [...handKinds];
  const idx = afterDiscard.indexOf(discardKind);
  if (idx === -1) return 0;
  afterDiscard.splice(idx, 1);

  const currentShanten = calculateShanten(afterDiscard, meldCount);
  let count = 0;

  // 한 번만 계산해서 재사용
  const handCount = buildKindCounts(afterDiscard);

  for (const testKind of ALL_TILE_KINDS) {
    // 남은 매수 체크
    const totalUsed = visibleCounts[testKind] + handCount[testKind];
    const remaining = 4 - totalUsed;
    if (remaining <= 0) continue;

    const testHand = [...afterDiscard, testKind];
    const newShanten = calculateShanten(testHand, meldCount);
    if (newShanten < currentShanten) {
      count += remaining;
    }
  }

  return count;
}

/**
 * 버림패별 향청수 평가
 * 각 패를 버렸을 때 향청수 반환
 */
export function evaluateDiscards(
  handKinds: TileKind[],
  meldCount: number
): { kind: TileKind; shanten: number }[] {
  const seen = new Set<TileKind>();
  const results: { kind: TileKind; shanten: number }[] = [];

  for (const kind of handKinds) {
    if (seen.has(kind)) continue;
    seen.add(kind);

    const remaining = [...handKinds];
    const idx = remaining.indexOf(kind);
    remaining.splice(idx, 1);

    const shanten = calculateShanten(remaining, meldCount);
    results.push({ kind, shanten });
  }

  return results;
}
