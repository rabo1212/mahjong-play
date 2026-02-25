/**
 * GameState DTO — 직렬화/역직렬화
 * 온라인 대국 시 서버↔클라이언트 간 상태 전송용
 */
import { GameState, DrawReason } from './types';
import { checkTsumoWin } from './game-manager';

/** 직렬화 가능한 GameState (JSON.stringify 안전) */
export interface GameStateDTO {
  gameId: string;
  phase: string;
  roundWind: number;
  turnIndex: number;
  turnCount: number;
  players: {
    id: number;
    name: string;
    seatWind: number;
    hand: number[];
    melds: {
      type: string;
      tileIds: number[];
      tileKinds: number[];
      fromPlayer?: number;
      calledTileId?: number;
    }[];
    discards: number[];
    drawnTile: number | null;
    flowers: number[];
    isAI: boolean;
  }[];
  wallTileCount: number;     // 클라이언트에는 패산 개수만 전송
  deadWallCount: number;     // 왕패 개수만
  lastDiscard: { playerId: number; tileId: number } | null;
  lastDrawReason: DrawReason;
  winner: number | null;
  winResult: GameState['winResult'];
  difficulty: string;
  beginnerMode: boolean;
  /** 내 pendingActions만 전달 (어떤 액션 버튼을 보여줄지 판단용) */
  myPendingActions: { action: string; tiles: number[] }[];
  /** 쯔모 가능 여부 (서버에서 판정) */
  canTsumo: boolean;
  /** 내가 이미 응답 수집 완료했는지 (다른 플레이어 대기 중) */
  myResponseCollected: boolean;
  /** 현재 턴 남은 밀리초 (null=타이머 없음, 클라이언트에서 Date.now()+값으로 deadline 계산) */
  turnRemainingMs: number | null;
}

/** GameState → DTO (서버 → 클라이언트) */
export function serializeGameState(state: GameState, forPlayerId?: number): GameStateDTO {
  return {
    gameId: state.gameId,
    phase: state.phase,
    roundWind: state.roundWind,
    turnIndex: state.turnIndex,
    turnCount: state.turnCount,
    players: state.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      seatWind: p.seatWind,
      // 다른 플레이어의 손패는 숨김 (온라인용)
      // 단, 게임 오버 시 승자의 손패는 공개
      hand: forPlayerId !== undefined && idx !== forPlayerId
        ? (state.phase === 'game-over' && state.winner === idx
          ? [...p.hand]
          : p.hand.map(() => -1))
        : [...p.hand],
      melds: p.melds.map(m => ({
        type: m.type,
        tileIds: [...m.tileIds],
        tileKinds: [...m.tileKinds],
        fromPlayer: m.fromPlayer,
        calledTileId: m.calledTileId,
      })),
      discards: [...p.discards],
      drawnTile: forPlayerId !== undefined && idx !== forPlayerId
        ? (state.phase === 'game-over' && state.winner === idx
          ? p.drawnTile
          : (p.drawnTile !== null ? -1 : null))
        : p.drawnTile,
      flowers: [...p.flowers],
      isAI: p.isAI,
    })),
    wallTileCount: state.wallTiles.length,
    deadWallCount: state.deadWall.length,
    lastDiscard: state.lastDiscard ? { ...state.lastDiscard } : null,
    lastDrawReason: state.lastDrawReason,
    winner: state.winner,
    winResult: state.winResult ? {
      decomposition: { ...state.winResult.decomposition },
      scoring: { ...state.winResult.scoring },
    } : null,
    difficulty: state.difficulty,
    beginnerMode: state.beginnerMode,
    myPendingActions: forPlayerId !== undefined
      ? state.pendingActions
          .filter(a => a.playerId === forPlayerId)
          .map(a => ({ action: a.action, tiles: [...a.tiles] }))
      : [],
    canTsumo: forPlayerId !== undefined
      && state.phase === 'discard'
      && state.turnIndex === forPlayerId
      && checkTsumoWin(state),
    myResponseCollected: forPlayerId !== undefined
      && (state.collectedResponses || []).some(r => r.playerId === forPlayerId),
    turnRemainingMs: state.turnDeadline
      ? Math.max(0, state.turnDeadline - Date.now())
      : null,
  };
}
