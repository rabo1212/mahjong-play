import { TileId, TileKind, GameState, PendingAction } from '@/engine/types';
import { getTile, toKinds } from '@/engine/tiles';
import { calculateShanten, evaluateDiscards, countEffectiveTiles, clearShantenCache } from './shanten';

/**
 * AI 플레이어
 * Easy: 랜덤 버리기, 부로 안 함
 * Normal: 향청수 기반 최적 버리기 + 기본 부로
 * Hard: 향청수 + 유효패 수 + 방어(위험패 회피)
 */

/** AI가 버릴 패 선택 */
export function aiChooseDiscard(state: GameState, playerIdx: number): TileId {
  clearShantenCache(); // 매 턴 캐시 초기화 (이전 턴 상태 무효화)
  const player = state.players[playerIdx];
  const allTileIds = player.drawnTile !== null
    ? [...player.hand, player.drawnTile]
    : [...player.hand];

  if (allTileIds.length === 0) {
    throw new Error(`AI player ${playerIdx} has no tiles to discard`);
  }

  switch (state.difficulty) {
    case 'easy':
      return easyDiscard(allTileIds);
    case 'normal':
      return normalDiscard(allTileIds, player.melds.length);
    case 'hard':
      return hardDiscard(allTileIds, player.melds.length, state, playerIdx);
    default:
      return easyDiscard(allTileIds);
  }
}

/** AI가 액션 응답 (치/펑/깡/론/패스) */
export function aiRespondToActions(
  state: GameState,
  playerIdx: number,
  actions: PendingAction[]
): PendingAction | null {
  if (actions.length === 0) return null;

  // 론(화료)은 무조건 선언
  const winAction = actions.find(a => a.action === 'win');
  if (winAction) return winAction;

  switch (state.difficulty) {
    case 'easy':
      // Easy: 부로 안 함
      return null;
    case 'normal':
      return normalRespondToAction(state, playerIdx, actions);
    case 'hard':
      return hardRespondToAction(state, playerIdx, actions);
    default:
      return null;
  }
}

// ===== Easy AI =====

function easyDiscard(tileIds: TileId[]): TileId {
  // 완전 랜덤
  const idx = Math.floor(Math.random() * tileIds.length);
  return tileIds[idx];
}

// ===== Normal AI =====

function normalDiscard(tileIds: TileId[], meldCount: number): TileId {
  const kinds = toKinds(tileIds);
  const evals = evaluateDiscards(kinds, meldCount);

  // 향청수가 가장 낮은 (= 화료에 가까운) 버리기 선택
  evals.sort((a, b) => a.shanten - b.shanten);
  const bestShanten = evals[0].shanten;

  // 같은 향청수 중에서 랜덤 선택 (약간의 변동성)
  const bestOptions = evals.filter(e => e.shanten === bestShanten);
  const chosen = bestOptions[Math.floor(Math.random() * bestOptions.length)];

  // 해당 kind의 TileId 찾기
  return tileIds.find(id => getTile(id).kind === chosen.kind)!;
}

function normalRespondToAction(
  state: GameState,
  playerIdx: number,
  actions: PendingAction[]
): PendingAction | null {
  const player = state.players[playerIdx];
  const handKinds = toKinds(player.hand);
  const currentShanten = calculateShanten(handKinds, player.melds.length);

  // 펑: 향청수가 줄어드는 경우만
  const ponAction = actions.find(a => a.action === 'pon');
  if (ponAction && state.lastDiscard) {
    const discardKind = getTile(state.lastDiscard.tileId).kind;
    // 펑 후 손패에서 2장 제거 + 면자 1개 추가
    const afterPon = handKinds.filter((k, i) => {
      const matchIdx = handKinds.indexOf(discardKind);
      const matchIdx2 = handKinds.indexOf(discardKind, matchIdx + 1);
      return i !== matchIdx && i !== matchIdx2;
    });
    const newShanten = calculateShanten(afterPon, player.melds.length + 1);
    if (newShanten < currentShanten) return ponAction;
  }

  // 치: 모든 옵션 중 향청수가 가장 줄어드는 조합 선택
  const chiAction = actions.find(a => a.action === 'chi');
  if (chiAction && state.lastDiscard) {
    const options = chiAction.chiOptions ?? [chiAction.tiles];
    let bestOption = chiAction.tiles;
    let bestShanten = Infinity;

    for (const option of options) {
      const chiTileKinds = option.map(id => getTile(id).kind);
      const remaining = [...handKinds];
      for (const ck of chiTileKinds) {
        const idx = remaining.indexOf(ck);
        if (idx !== -1) remaining.splice(idx, 1);
      }
      const newShanten = calculateShanten(remaining, player.melds.length + 1);
      if (newShanten < bestShanten) {
        bestShanten = newShanten;
        bestOption = option;
      }
    }

    if (bestShanten < currentShanten) {
      return { ...chiAction, tiles: bestOption };
    }
  }

  return null;
}

// ===== Hard AI =====

function hardDiscard(
  tileIds: TileId[],
  meldCount: number,
  state: GameState,
  playerIdx: number
): TileId {
  const kinds = toKinds(tileIds);
  const evals = evaluateDiscards(kinds, meldCount);

  // 보이는 패 카운트 (모든 버림패 + 모든 부로패)
  const visibleCounts = getVisibleCounts(state);

  // 각 버리기 후보에 점수 부여
  type Candidate = {
    kind: TileKind;
    tileId: TileId;
    shanten: number;
    effectiveTiles: number;
    dangerScore: number;
    score: number;
  };

  const candidates: Candidate[] = [];
  const seenKinds = new Set<TileKind>();

  for (const ev of evals) {
    if (seenKinds.has(ev.kind)) continue;
    seenKinds.add(ev.kind);

    const tileId = tileIds.find(id => getTile(id).kind === ev.kind)!;
    const effectiveTiles = countEffectiveTiles(kinds, meldCount, ev.kind, visibleCounts);
    const dangerScore = calculateDanger(ev.kind, state, playerIdx);

    // 종합 점수: 향청수 낮을수록 좋고, 유효패 많을수록 좋고, 위험도 낮을수록 좋음
    const shantenPenalty = ev.shanten * 100;
    const effectiveBonus = effectiveTiles * 3;
    const dangerPenalty = dangerScore * 10;
    const score = -shantenPenalty + effectiveBonus - dangerPenalty;

    candidates.push({
      kind: ev.kind,
      tileId,
      shanten: ev.shanten,
      effectiveTiles,
      dangerScore,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.tileId ?? tileIds[0];
}

function hardRespondToAction(
  state: GameState,
  playerIdx: number,
  actions: PendingAction[]
): PendingAction | null {
  const player = state.players[playerIdx];
  const handKinds = toKinds(player.hand);
  const currentShanten = calculateShanten(handKinds, player.melds.length);

  // 깡: 텐파이 이하일 때만
  const kanAction = actions.find(a => a.action === 'kan');
  if (kanAction && currentShanten <= 0) return kanAction;

  // 펑: 향청수 개선 + 텐파이에 가까울 때
  const ponAction = actions.find(a => a.action === 'pon');
  if (ponAction && state.lastDiscard) {
    const discardKind = getTile(state.lastDiscard.tileId).kind;
    const remaining = [...handKinds];
    // 같은 kind 2장 제거
    for (let i = 0; i < 2; i++) {
      const idx = remaining.indexOf(discardKind);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    const newShanten = calculateShanten(remaining, player.melds.length + 1);
    // 향청수가 개선되고, 2향청 이하일 때만 부로
    if (newShanten < currentShanten && newShanten <= 1) return ponAction;
  }

  // 치: 모든 옵션 중 텐파이에 가장 가까운 조합 선택
  const chiAction = actions.find(a => a.action === 'chi');
  if (chiAction) {
    const options = chiAction.chiOptions ?? [chiAction.tiles];
    let bestOption = chiAction.tiles;
    let bestShanten = Infinity;

    for (const option of options) {
      const chiTileKinds = option.map(id => getTile(id).kind);
      const remaining = [...handKinds];
      for (const ck of chiTileKinds) {
        const idx = remaining.indexOf(ck);
        if (idx !== -1) remaining.splice(idx, 1);
      }
      const newShanten = calculateShanten(remaining, player.melds.length + 1);
      if (newShanten < bestShanten) {
        bestShanten = newShanten;
        bestOption = option;
      }
    }

    if (bestShanten < currentShanten && bestShanten <= 0) {
      return { ...chiAction, tiles: bestOption };
    }
  }

  return null;
}

/** AI 가깡 판단 — 펑한 면자 + 손패에 4번째 패가 있으면 가깡 */
export function aiShouldKakan(
  state: GameState,
  playerIdx: number
): number | null {
  const player = state.players[playerIdx];
  const fullHand = player.drawnTile !== null
    ? [...player.hand, player.drawnTile]
    : [...player.hand];

  for (let i = 0; i < player.melds.length; i++) {
    const meld = player.melds[i];
    if (meld.type !== 'pon') continue;
    const ponKind = meld.tileKinds[0];
    if (fullHand.some(id => getTile(id).kind === ponKind)) {
      // Easy: 가깡 안 함, Normal: 50%, Hard: 항상
      if (state.difficulty === 'easy') return null;
      if (state.difficulty === 'normal' && Math.random() > 0.5) continue;
      return i;
    }
  }
  return null;
}

// ===== 유틸리티 =====

/** 모든 보이는 패의 kind 카운트 */
function getVisibleCounts(state: GameState): number[] {
  const counts = new Array(70).fill(0);

  for (const player of state.players) {
    // 버림패
    for (const tileId of player.discards) {
      counts[getTile(tileId).kind]++;
    }
    // 부로 패
    for (const meld of player.melds) {
      for (const kind of meld.tileKinds) {
        counts[kind]++;
      }
    }
    // 꽃패
    for (const tileId of player.flowers) {
      counts[getTile(tileId).kind]++;
    }
  }

  return counts;
}

/**
 * 위험도 계산 (0~10)
 * 다른 플레이어가 텐파이일 가능성 + 그 패가 위험한 정도
 */
function calculateDanger(
  kind: TileKind,
  state: GameState,
  myIdx: number
): number {
  let danger = 0;

  for (let i = 0; i < 4; i++) {
    if (i === myIdx) continue;
    const opponent = state.players[i];

    // 상대 리치 여부 (MCR에는 리치가 없지만, 텐파이 근접 추정)
    // 부로가 많으면 텐파이에 가까울 가능성
    const meldBonus = opponent.melds.length * 1.5;

    // 상대 버림패에 이 kind가 없으면 위험 (= 상대가 필요할 수 있음)
    const alreadyDiscarded = opponent.discards.some(id => getTile(id).kind === kind);
    if (alreadyDiscarded) {
      // 현물 (안전패) → 위험도 낮음
      danger -= 1;
    } else {
      danger += 1 + meldBonus * 0.5;
    }

    // 손패가 적으면 텐파이에 가까울 가능성
    const handSize = opponent.hand.length;
    if (handSize <= 4) danger += 2;
    else if (handSize <= 7) danger += 1;
  }

  return Math.max(0, Math.min(10, danger));
}
