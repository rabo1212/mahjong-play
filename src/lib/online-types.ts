/**
 * 온라인 대국 전용 타입
 */

/** 게임 액션 (클라이언트 → 서버) */
export type GameAction =
  | { type: 'discard'; tileId: number }
  | { type: 'chi'; tileIds: number[] }
  | { type: 'pon' }
  | { type: 'kan' }
  | { type: 'ankan'; kanKind: number }
  | { type: 'kakan'; meldIndex: number }
  | { type: 'tsumo' }
  | { type: 'ron' }
  | { type: 'skip' }
  | { type: 'timeout' };

/** 방 참가자 정보 */
export interface RoomPlayer {
  id: string;          // Supabase Auth user ID
  nickname: string;
  seatIndex: number;   // 0~3
  isAI: boolean;
  isConnected: boolean;
}

/** 방 상태 */
export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** 방 정보 */
export interface RoomInfo {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  difficulty: string;
  beginnerMode: boolean;
  players: RoomPlayer[];
  createdAt: string;
}

/** 게임 이벤트 (Realtime broadcast) */
export type GameEvent =
  | { type: 'discard'; playerId: number; tileId: number }
  | { type: 'call'; playerId: number; callType: 'chi' | 'pon' | 'kan' }
  | { type: 'win'; playerId: number; winType: 'tsumo' | 'ron' }
  | { type: 'draw' }
  | { type: 'turn_start'; playerId: number };
