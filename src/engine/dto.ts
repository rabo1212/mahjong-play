/**
 * GameState DTO — 직렬화/역직렬화
 * 온라인 대국 시 서버↔클라이언트 간 상태 전송용
 */
import { GameState, DrawReason } from './types';

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
      hand: forPlayerId !== undefined && idx !== forPlayerId
        ? p.hand.map(() => -1)    // -1 = 비공개 타일
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
        ? (p.drawnTile !== null ? -1 : null)
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
  };
}
