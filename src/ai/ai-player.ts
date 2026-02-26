import { TileId, TileKind, GameState, PendingAction } from '@/engine/types';
import { getTile, toKinds, isSuited } from '@/engine/tiles';
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

  // 패산 잔량에 따른 공수 가중치 (초반=공격, 후반=방어)
  const wallRemaining = state.wallTiles.length;
  const wallRatio = Math.min(1, wallRemaining / 77); // 1.0(초반) → 0.0(소진)
  const effectiveWeight = 1.5 + wallRatio * 2.5;     // 4.0(초반) → 1.5(후반)
  const dangerWeight = 6 + (1 - wallRatio) * 9;      // 6(초반) → 15(후반)

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
    const dangerScore = calculateDanger(ev.kind, state, playerIdx, visibleCounts);

    const shantenPenalty = ev.shanten * 100;
    const effectiveBonus = effectiveTiles * effectiveWeight;
    const dangerPenalty = dangerScore * dangerWeight;

    // 패산 적을 때 화료 어려우면 안전패 우선
    let lateGameBonus = 0;
    if (wallRemaining <= 20 && ev.shanten > 0 && dangerScore <= 1) {
      lateGameBonus = 30;
    }

    const score = -shantenPenalty + effectiveBonus - dangerPenalty + lateGameBonus;

    candidates.push({
      kind: ev.kind, tileId,
      shanten: ev.shanten, effectiveTiles, dangerScore, score,
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
  const wallRemaining = state.wallTiles.length;

  // 깡: 텐파이 이하일 때만
  const kanAction = actions.find(a => a.action === 'kan');
  if (kanAction && currentShanten <= 0) return kanAction;

  // 펑: 향청수 개선 + 2향청 이하
  const ponAction = actions.find(a => a.action === 'pon');
  if (ponAction && state.lastDiscard) {
    const discardKind = getTile(state.lastDiscard.tileId).kind;
    const remaining = [...handKinds];
    for (let i = 0; i < 2; i++) {
      const idx = remaining.indexOf(discardKind);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    const newShanten = calculateShanten(remaining, player.melds.length + 1);
    if (newShanten < currentShanten && newShanten <= 1) return ponAction;
  }

  // 치: 패산 충분(>20)이면 1향청까지 허용, 부족하면 텐파이만
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

    const chiLimit = wallRemaining > 20 ? 1 : 0;
    if (bestShanten < currentShanten && bestShanten <= chiLimit) {
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
    if (!fullHand.some(id => getTile(id).kind === ponKind)) continue;

    // Easy: 가깡 안 함
    if (state.difficulty === 'easy') return null;

    // Normal: 50% 확률
    if (state.difficulty === 'normal') {
      if (Math.random() > 0.5) continue;
      return i;
    }

    // Hard: 전략적 판단
    // 조건 1: 텐파이 또는 1향청일 때만
    const handsWithout = fullHand.filter(id => getTile(id).kind !== ponKind);
    const kinds = toKinds(handsWithout);
    if (calculateShanten(kinds, player.melds.length) > 1) continue;

    // 조건 2: 패산 10장 이하면 자제 (유국 대비)
    if (state.wallTiles.length <= 10) continue;

    // 조건 3: 상대 텐파이 가능성 높으면 자제 (강칸 론 위험)
    let opponentTenpaiRisk = false;
    for (let j = 0; j < 4; j++) {
      if (j === playerIdx) continue;
      const opp = state.players[j];
      if (opp.hand.length <= 4 && opp.melds.length >= 2) {
        opponentTenpaiRisk = true;
        break;
      }
    }
    if (opponentTenpaiRisk) continue;

    return i;
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
 * 스지(筋)/카베(壁) 안전패 분석 (0~3)
 * 숫자가 클수록 안전 (위험도에서 차감)
 *
 * 스지: 상대가 4를 버렸으면 1·7은 양면 대기 아닐 가능성 높음
 * 카베: 특정 패가 4장 모두 보이면 관련 순자 불가 → 인접 패 안전
 */
function calculateSujiKabeSafety(
  kind: TileKind,
  state: GameState,
  myIdx: number,
  visibleCounts: number[]
): number {
  if (!isSuited(kind)) return 0;

  let safety = 0;
  const num = kind % 10;
  const suitBase = Math.floor(kind / 10) * 10;

  // --- 스지(筋) 분석 ---
  for (let i = 0; i < 4; i++) {
    if (i === myIdx) continue;
    const oppDiscardKinds = state.players[i].discards.map(id => getTile(id).kind);

    let sujiMatch = false;
    // num이 4 이상이면 (num-3)이 버려졌는지 확인
    if (num >= 4 && oppDiscardKinds.includes(suitBase + (num - 3))) {
      sujiMatch = true;
    }
    // num이 6 이하이면 (num+3)이 버려졌는지 확인
    if (num <= 6 && oppDiscardKinds.includes(suitBase + (num + 3))) {
      sujiMatch = true;
    }
    if (sujiMatch) safety += 0.5;
  }

  // --- 카베(壁) 분석 ---
  // 인접 패가 4장 모두 보이면 그 방향 순자 불가 → 안전도 상승
  if (num >= 2) {
    const adjKind = suitBase + (num - 1);
    if (visibleCounts[adjKind] >= 4) safety += 1.0;
    else if (visibleCounts[adjKind] >= 3) safety += 0.3;
  }
  if (num <= 8) {
    const adjKind = suitBase + (num + 1);
    if (visibleCounts[adjKind] >= 4) safety += 1.0;
    else if (visibleCounts[adjKind] >= 3) safety += 0.3;
  }

  return Math.min(3, safety);
}

/**
 * 상대 수트 비출현 패턴 분석
 * 상대가 특정 수트를 전혀 버리지 않으면 청일색/혼일색 수집 가능성
 * → 해당 수트 패의 위험도 상승 (0~3)
 */
function analyzeSuitAbsence(
  kind: TileKind,
  state: GameState,
  myIdx: number
): number {
  if (!isSuited(kind)) return 0;

  const mySuit = Math.floor(kind / 10);
  let dangerBonus = 0;

  for (let i = 0; i < 4; i++) {
    if (i === myIdx) continue;
    const opponent = state.players[i];

    // 6장 이상 버려야 패턴 분석 의미 있음
    if (opponent.discards.length < 6) continue;

    const suitPresent = new Set<number>();
    for (const tileId of opponent.discards) {
      const k = getTile(tileId).kind;
      if (isSuited(k)) suitPresent.add(Math.floor(k / 10));
    }

    if (!suitPresent.has(mySuit)) {
      // 부로에서도 해당 수트가 보이면 확실히 수집 중
      const meldHasSuit = opponent.melds.some(m =>
        m.tileKinds.some(k => Math.floor(k / 10) === mySuit)
      );
      dangerBonus += meldHasSuit ? 2.0 : 1.0;
    }
  }

  return Math.min(3, dangerBonus);
}

/**
 * 위험도 계산 (0~10)
 * 다른 플레이어가 텐파이일 가능성 + 그 패가 위험한 정도
 */
function calculateDanger(
  kind: TileKind,
  state: GameState,
  myIdx: number,
  visibleCounts: number[]
): number {
  let danger = 0;

  for (let i = 0; i < 4; i++) {
    if (i === myIdx) continue;
    const opponent = state.players[i];

    // 부로가 많으면 텐파이에 가까울 가능성
    const meldBonus = opponent.melds.length * 1.5;

    // 상대 버림패에 이 kind가 없으면 위험 (= 상대가 필요할 수 있음)
    const alreadyDiscarded = opponent.discards.some(id => getTile(id).kind === kind);
    if (alreadyDiscarded) {
      danger -= 1; // 현물 (안전패)
    } else {
      danger += 1 + meldBonus * 0.5;
    }

    // 손패가 적으면 텐파이에 가까울 가능성
    const handSize = opponent.hand.length;
    if (handSize <= 4) danger += 2;
    else if (handSize <= 7) danger += 1;
  }

  // 스지/카베 안전도 차감
  danger -= calculateSujiKabeSafety(kind, state, myIdx, visibleCounts);

  // 수트 비출현 패턴 위험도 가산
  danger += analyzeSuitAbsence(kind, state, myIdx);

  return Math.max(0, Math.min(10, danger));
}
