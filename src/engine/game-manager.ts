import {
  GameState, GamePhase, TileId, TileKind,
  Meld, Difficulty, DrawReason,
} from './types';
import { getTile, toKinds, sortByKind, isFlower } from './tiles';
import { dealInitialHands, drawFromWall, drawFromDeadWall } from './wall';
import { removeTilesFromHand } from './hand';
import { collectPendingActions } from './action-resolver';
import { canWin } from './win-detector';
import { calculateScore } from './scoring';

/** 간단한 UUID 생성 (crypto.randomUUID 폴백) */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 폴백: 타임스탬프 + 랜덤
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 초기 게임 상태 생성 */
export function createInitialGameState(difficulty: Difficulty, beginnerMode: boolean): GameState {
  return {
    gameId: generateId(),
    phase: 'idle',
    roundWind: 41, // 동
    turnIndex: 0,
    turnCount: 0,
    players: [],
    wallTiles: [],
    deadWall: [],
    lastDiscard: null,
    lastDrawReason: 'normal',
    pendingActions: [],
    winner: null,
    winResult: null,
    difficulty,
    beginnerMode,
  };
}

/** 게임 시작: 배패 + 꽃패 처리 */
export function startGame(state: GameState): GameState {
  const { players, wallTiles, deadWall } = dealInitialHands();

  return {
    ...state,
    phase: 'discard' as GamePhase, // 동가가 14장 받았으므로 바로 버리기
    turnIndex: 0,
    turnCount: 0,
    players,
    wallTiles,
    deadWall,
    lastDiscard: null,
    pendingActions: [],
    winner: null,
    winResult: null,
  };
}

/** 쯔모(패산에서 1장 뽑기) */
export function doDraw(state: GameState, reason: DrawReason = 'normal'): GameState {
  const playerIdx = state.turnIndex;
  const drawResult = drawFromWall(state.wallTiles);

  if (!drawResult) {
    // 패산 소진 → 유국
    return { ...state, phase: 'game-over' as GamePhase };
  }

  const { tile, wall } = drawResult;
  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIdx] };

  // 꽃패 처리
  if (isFlower(getTile(tile).kind)) {
    player.flowers = [...player.flowers, tile];
    newPlayers[playerIdx] = player;

    // 패산 소진 가드 (꽃패 보충 시에도 체크)
    if (wall.length === 0) {
      return { ...state, phase: 'game-over' as GamePhase, players: newPlayers, wallTiles: wall };
    }

    // 꽃패 보충 (패산에서 다시 뽑기)
    const newState = { ...state, players: newPlayers, wallTiles: wall };
    return doDraw(newState, 'flower-replacement'); // 재귀 (꽃패가 또 나올 수 있음)
  }

  player.drawnTile = tile;
  newPlayers[playerIdx] = player;

  return {
    ...state,
    phase: 'discard' as GamePhase,
    players: newPlayers,
    wallTiles: wall,
    lastDrawReason: reason,
  };
}

/** 쯔모 화료 체크 */
export function checkTsumoWin(state: GameState): boolean {
  const player = state.players[state.turnIndex];
  if (player.drawnTile === null) return false;

  const handKinds = toKinds([...player.hand, player.drawnTile]);
  const decomps = canWin(handKinds, player.melds.length);
  if (decomps.length === 0) return false;

  if (!state.beginnerMode) {
    // 8점 제한 체크 — 모든 분해 중 최고점으로 판정
    const allKinds = [...handKinds, ...player.melds.flatMap(m => m.tileKinds)];
    const isMenzen = player.melds.every(m => m.type === 'ankan') || player.melds.length === 0;
    const winContext: Parameters<typeof calculateScore>[1] = {
      roundWind: state.roundWind,
      seatWind: player.seatWind,
      isTsumo: true,
      lastTile: getTile(player.drawnTile).kind,
      isLastWallTile: state.wallTiles.length === 0,
      isKanDraw: state.lastDrawReason === 'kan-replacement',
      flowerCount: player.flowers.length,
      melds: player.melds,
      isMenzen,
    };
    for (const d of decomps) {
      const scoring = calculateScore(d, winContext, allKinds);
      if (scoring.meetsMinimum) return true;
    }
    return false;
  }

  return true;
}

/** 타패(버리기) */
export function doDiscard(state: GameState, tileId: TileId): GameState {
  const playerIdx = state.turnIndex;
  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIdx] };

  // drawnTile과 hand 합치기
  let fullHand = [...player.hand];
  if (player.drawnTile !== null) {
    fullHand.push(player.drawnTile);
  }

  // 타일 소유권 검증
  if (!fullHand.includes(tileId)) {
    return state; // 소유하지 않은 타일은 버릴 수 없음
  }

  // 지정 타일 제거
  fullHand = removeTilesFromHand(fullHand, [tileId]);
  player.hand = sortByKind(fullHand);
  player.drawnTile = null;
  player.discards = [...player.discards, tileId];
  newPlayers[playerIdx] = player;

  // 다른 플레이어 액션 체크
  const actions = collectPendingActions(newPlayers, playerIdx, tileId);

  if (actions.length > 0) {
    return {
      ...state,
      phase: 'action-pending' as GamePhase,
      players: newPlayers,
      lastDiscard: { playerId: playerIdx, tileId },
      pendingActions: actions,
    };
  }

  // 액션 없으면 다음 턴
  return advanceTurn({
    ...state,
    players: newPlayers,
    lastDiscard: { playerId: playerIdx, tileId },
    pendingActions: [],
  });
}

/** 다음 턴으로 진행 */
export function advanceTurn(state: GameState): GameState {
  const nextTurn = (state.turnIndex + 1) % 4;

  const newState: GameState = {
    ...state,
    turnIndex: nextTurn,
    turnCount: state.turnCount + 1,
    pendingActions: [],
  };

  // 쯔모
  return doDraw(newState);
}

/** 치 실행 */
export function executeChi(state: GameState, playerId: number, handTiles: TileId[]): GameState {
  if (!state.lastDiscard) return state;
  const discardTileId = state.lastDiscard.tileId;
  const discardKind = getTile(discardTileId).kind;

  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerId] };

  // 손패에서 2장 제거
  player.hand = removeTilesFromHand(player.hand, handTiles);

  // 면자 추가
  const meldKinds = [...handTiles.map(id => getTile(id).kind), discardKind].sort((a, b) => a - b);
  const meld: Meld = {
    type: 'chi',
    tileIds: [...handTiles, discardTileId],
    tileKinds: meldKinds,
    fromPlayer: state.lastDiscard.playerId,
    calledTileId: discardTileId,
  };
  player.melds = [...player.melds, meld];

  // 버린 플레이어의 버림패에서 제거 (이미 가져갔으므로)
  const discardPlayer = { ...newPlayers[state.lastDiscard.playerId] };
  discardPlayer.discards = discardPlayer.discards.filter(id => id !== discardTileId);
  newPlayers[state.lastDiscard.playerId] = discardPlayer;

  player.hand = sortByKind(player.hand);
  newPlayers[playerId] = player;

  // 치 후 바로 버리기 단계 (쯔모 없이)
  return {
    ...state,
    phase: 'discard' as GamePhase,
    turnIndex: playerId,
    players: newPlayers,
    pendingActions: [],
    lastDiscard: null,
  };
}

/** 펑 실행 */
export function executePon(state: GameState, playerId: number): GameState {
  if (!state.lastDiscard) return state;
  const discardTileId = state.lastDiscard.tileId;
  const discardKind = getTile(discardTileId).kind;

  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerId] };

  // 손패에서 같은 kind 2장 제거
  const matching = player.hand.filter(id => getTile(id).kind === discardKind).slice(0, 2);
  player.hand = removeTilesFromHand(player.hand, matching);

  // 면자 추가
  const meld: Meld = {
    type: 'pon',
    tileIds: [...matching, discardTileId],
    tileKinds: [discardKind, discardKind, discardKind],
    fromPlayer: state.lastDiscard.playerId,
    calledTileId: discardTileId,
  };
  player.melds = [...player.melds, meld];

  // 버린 플레이어의 버림패에서 제거
  const discardPlayer = { ...newPlayers[state.lastDiscard.playerId] };
  discardPlayer.discards = discardPlayer.discards.filter(id => id !== discardTileId);
  newPlayers[state.lastDiscard.playerId] = discardPlayer;

  player.hand = sortByKind(player.hand);
  newPlayers[playerId] = player;

  return {
    ...state,
    phase: 'discard' as GamePhase,
    turnIndex: playerId,
    players: newPlayers,
    pendingActions: [],
    lastDiscard: null,
  };
}

/** 대명깡 실행 */
export function executeMinkan(state: GameState, playerId: number): GameState {
  if (!state.lastDiscard) return state;
  const discardTileId = state.lastDiscard.tileId;
  const discardKind = getTile(discardTileId).kind;

  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerId] };

  // 손패에서 같은 kind 3장 제거
  const matching = player.hand.filter(id => getTile(id).kind === discardKind).slice(0, 3);
  player.hand = removeTilesFromHand(player.hand, matching);

  const meld: Meld = {
    type: 'minkan',
    tileIds: [...matching, discardTileId],
    tileKinds: [discardKind, discardKind, discardKind, discardKind],
    fromPlayer: state.lastDiscard.playerId,
    calledTileId: discardTileId,
  };
  player.melds = [...player.melds, meld];

  // 버린 플레이어의 버림패에서 제거
  const discardPlayer = { ...newPlayers[state.lastDiscard.playerId] };
  discardPlayer.discards = discardPlayer.discards.filter(id => id !== discardTileId);
  newPlayers[state.lastDiscard.playerId] = discardPlayer;

  player.hand = sortByKind(player.hand);
  newPlayers[playerId] = player;

  // 깡 후 왕패에서 1장 보충
  const deadDrawResult = drawFromDeadWall(state.deadWall);
  if (!deadDrawResult) {
    return { ...state, phase: 'game-over' as GamePhase, players: newPlayers };
  }

  const { tile: kanDraw, deadWall: newDeadWall } = deadDrawResult;
  const p = { ...newPlayers[playerId] };

  // 깡 보충 패가 꽃패인 경우 처리
  if (isFlower(getTile(kanDraw).kind)) {
    p.flowers = [...p.flowers, kanDraw];
    newPlayers[playerId] = p;
    // 패산에서 다시 뽑기
    const newState: GameState = {
      ...state,
      turnIndex: playerId,
      players: newPlayers,
      deadWall: newDeadWall,
      pendingActions: [],
      lastDiscard: null,
    };
    return doDraw(newState, 'kan-replacement');
  }

  p.drawnTile = kanDraw;
  newPlayers[playerId] = p;

  return {
    ...state,
    phase: 'discard' as GamePhase,
    turnIndex: playerId,
    players: newPlayers,
    deadWall: newDeadWall,
    pendingActions: [],
    lastDiscard: null,
    lastDrawReason: 'kan-replacement',
  };
}

/** 암깡 실행 */
export function executeAnkan(state: GameState, playerId: number, kanKind: TileKind): GameState {
  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerId] };

  // 손패+drawnTile에서 해당 kind 4장 찾기
  let fullHand = [...player.hand];
  if (player.drawnTile !== null) fullHand.push(player.drawnTile);

  const matching = fullHand.filter(id => getTile(id).kind === kanKind).slice(0, 4);
  if (matching.length < 4) return state;

  fullHand = removeTilesFromHand(fullHand, matching);
  player.hand = sortByKind(fullHand);
  player.drawnTile = null;

  const meld: Meld = {
    type: 'ankan',
    tileIds: matching,
    tileKinds: [kanKind, kanKind, kanKind, kanKind],
  };
  player.melds = [...player.melds, meld];
  newPlayers[playerId] = player;

  // 왕패에서 1장 보충
  const deadDrawResult = drawFromDeadWall(state.deadWall);
  if (!deadDrawResult) {
    return { ...state, phase: 'game-over' as GamePhase, players: newPlayers };
  }

  const { tile: kanDraw, deadWall: newDeadWall } = deadDrawResult;
  const p = { ...newPlayers[playerId] };

  // 깡 보충 패가 꽃패인 경우 처리
  if (isFlower(getTile(kanDraw).kind)) {
    p.flowers = [...p.flowers, kanDraw];
    newPlayers[playerId] = p;
    const newState: GameState = {
      ...state,
      turnIndex: playerId,
      players: newPlayers,
      deadWall: newDeadWall,
      pendingActions: [],
    };
    return doDraw(newState, 'kan-replacement');
  }

  p.drawnTile = kanDraw;
  newPlayers[playerId] = p;

  return {
    ...state,
    phase: 'discard' as GamePhase,
    turnIndex: playerId,
    players: newPlayers,
    deadWall: newDeadWall,
    pendingActions: [],
    lastDrawReason: 'kan-replacement',
  };
}

/** 가깡(加杠) 실행 — 이미 펑한 세트에 4번째 패 추가 */
export function executeKakan(state: GameState, playerId: number, meldIndex: number): GameState {
  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerId] };

  const targetMeld = player.melds[meldIndex];
  if (!targetMeld || targetMeld.type !== 'pon') return state;

  const ponKind = targetMeld.tileKinds[0];

  // 손패 + drawnTile에서 해당 kind 1장 찾기
  let fullHand = [...player.hand];
  if (player.drawnTile !== null) fullHand.push(player.drawnTile);

  const kakanTile = fullHand.find(id => getTile(id).kind === ponKind);
  if (kakanTile === undefined) return state;

  // 손패에서 제거
  fullHand = removeTilesFromHand(fullHand, [kakanTile]);
  player.hand = sortByKind(fullHand);
  player.drawnTile = null;

  // 펑 → 가깡으로 업그레이드
  const newMelds = [...player.melds];
  newMelds[meldIndex] = {
    ...targetMeld,
    type: 'kakan',
    tileIds: [...targetMeld.tileIds, kakanTile],
    tileKinds: [ponKind, ponKind, ponKind, ponKind],
  };
  player.melds = newMelds;
  newPlayers[playerId] = player;

  // 왕패에서 1장 보충
  const deadDrawResult = drawFromDeadWall(state.deadWall);
  if (!deadDrawResult) {
    return { ...state, phase: 'game-over' as GamePhase, players: newPlayers };
  }

  const { tile: kanDraw, deadWall: newDeadWall } = deadDrawResult;
  const p = { ...newPlayers[playerId] };

  // 깡 보충 패가 꽃패인 경우 처리
  if (isFlower(getTile(kanDraw).kind)) {
    p.flowers = [...p.flowers, kanDraw];
    newPlayers[playerId] = p;
    const newState: GameState = {
      ...state,
      turnIndex: playerId,
      players: newPlayers,
      deadWall: newDeadWall,
      pendingActions: [],
    };
    return doDraw(newState, 'kan-replacement');
  }

  p.drawnTile = kanDraw;
  newPlayers[playerId] = p;

  return {
    ...state,
    phase: 'discard' as GamePhase,
    turnIndex: playerId,
    players: newPlayers,
    deadWall: newDeadWall,
    pendingActions: [],
    lastDrawReason: 'kan-replacement',
  };
}

/** 론 화료 선언 */
export function declareRon(state: GameState, winnerId: number): GameState {
  if (!state.lastDiscard) return state;
  const discardTileId = state.lastDiscard.tileId;
  const discardKind = getTile(discardTileId).kind;

  const winner = state.players[winnerId];
  const handKinds = [...toKinds(winner.hand), discardKind].sort((a, b) => a - b);
  const decomps = canWin(handKinds, winner.melds.length);
  if (decomps.length === 0) return state;

  const allKinds = [...handKinds, ...winner.melds.flatMap(m => m.tileKinds)];
  const isMenzen = winner.melds.every(m => m.type === 'ankan') || winner.melds.length === 0;
  const winContext: Parameters<typeof calculateScore>[1] = {
    roundWind: state.roundWind,
    seatWind: winner.seatWind,
    isTsumo: false,
    lastTile: discardKind,
    isLastWallTile: state.wallTiles.length === 0,
    isKanDraw: false,
    flowerCount: winner.flowers.length,
    melds: winner.melds,
    isMenzen,
  };

  // 모든 분해를 비교해서 최고 점수 선택
  let bestDecomp = decomps[0];
  let bestScoring = calculateScore(decomps[0], winContext, allKinds);
  for (let i = 1; i < decomps.length; i++) {
    const s = calculateScore(decomps[i], winContext, allKinds);
    if (s.totalPoints > bestScoring.totalPoints) {
      bestDecomp = decomps[i];
      bestScoring = s;
    }
  }

  if (!state.beginnerMode && !bestScoring.meetsMinimum) return state;

  return {
    ...state,
    phase: 'game-over' as GamePhase,
    winner: winnerId,
    winResult: { decomposition: bestDecomp, scoring: bestScoring },
    pendingActions: [],
  };
}

/** 쯔모 화료 선언 */
export function declareTsumo(state: GameState, playerId: number): GameState {
  const player = state.players[playerId];
  if (player.drawnTile === null) return state;

  const drawnKind = getTile(player.drawnTile).kind;
  const handKinds = [...toKinds(player.hand), drawnKind].sort((a, b) => a - b);
  const decomps = canWin(handKinds, player.melds.length);
  if (decomps.length === 0) return state;

  const allKinds = [...handKinds, ...player.melds.flatMap(m => m.tileKinds)];
  const isMenzen = player.melds.every(m => m.type === 'ankan') || player.melds.length === 0;
  const winContext: Parameters<typeof calculateScore>[1] = {
    roundWind: state.roundWind,
    seatWind: player.seatWind,
    isTsumo: true,
    lastTile: drawnKind,
    isLastWallTile: state.wallTiles.length === 0,
    isKanDraw: state.lastDrawReason === 'kan-replacement',
    flowerCount: player.flowers.length,
    melds: player.melds,
    isMenzen,
  };

  // 모든 분해를 비교해서 최고 점수 선택
  let bestDecomp = decomps[0];
  let bestScoring = calculateScore(decomps[0], winContext, allKinds);
  for (let i = 1; i < decomps.length; i++) {
    const s = calculateScore(decomps[i], winContext, allKinds);
    if (s.totalPoints > bestScoring.totalPoints) {
      bestDecomp = decomps[i];
      bestScoring = s;
    }
  }

  if (!state.beginnerMode && !bestScoring.meetsMinimum) return state;

  return {
    ...state,
    phase: 'game-over' as GamePhase,
    winner: playerId,
    winResult: { decomposition: bestDecomp, scoring: bestScoring },
    pendingActions: [],
  };
}

/** 패스 (액션 스킵) */
export function skipAction(state: GameState, playerId: number): GameState {
  const remaining = state.pendingActions.filter(a => a.playerId !== playerId);

  if (remaining.length === 0) {
    // 모든 액션 패스 → 다음 턴
    return advanceTurn({
      ...state,
      pendingActions: [],
    });
  }

  return {
    ...state,
    pendingActions: remaining,
  };
}
