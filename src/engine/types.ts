// ========================================
// MahjongPlay 핵심 타입 정의
// ========================================

/** 타일 인스턴스 고유 ID (0~143) */
export type TileId = number;

/**
 * 타일 종류 코드
 * 만수: 11~19, 통수: 21~29, 삭수: 31~39
 * 풍패: 41(동)~44(북), 삼원패: 51(중)~53(백)
 * 화패: 61~68
 */
export type TileKind = number;

export type Suit = 'wan' | 'pin' | 'sou' | 'wind' | 'dragon' | 'flower';

export type MeldType = 'chi' | 'pon' | 'minkan' | 'ankan' | 'kakan';

export type ActionType = 'chi' | 'pon' | 'kan' | 'win';

export type GamePhase =
  | 'idle'
  | 'dealing'
  | 'draw'
  | 'discard'
  | 'action-check'
  | 'action-pending'
  | 'game-over';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Tile {
  id: TileId;
  kind: TileKind;
  suit: Suit;
  number: number;    // 수패: 1~9, 풍: 1~4, 삼원: 1~3, 화: 1~8
  label: string;     // 한국어 표시명 ("1만", "동", "중" 등)
}

export interface Meld {
  type: MeldType;
  tileIds: TileId[];       // 구성 타일 ID들
  tileKinds: TileKind[];   // 구성 타일 종류들
  fromPlayer?: number;     // 누구에게서 가져왔는지 (암깡은 undefined)
  calledTileId?: TileId;   // 가져온 타일 ID
}

export interface PlayerState {
  id: number;           // 0~3
  name: string;
  seatWind: TileKind;   // 41~44
  hand: TileId[];       // 손패 (kind 순 정렬)
  melds: Meld[];        // 부로한 면자
  discards: TileId[];   // 버림패 (순서대로)
  drawnTile: TileId | null;  // 방금 쯔모한 패 (아직 손패에 미합류)
  flowers: TileId[];    // 보화한 꽃패
  isAI: boolean;
}

export interface PendingAction {
  playerId: number;
  action: ActionType;
  tiles: TileId[];     // 사용할 손패 (치: 2장, 펑: 2장, 깡: 3장)
  priority: number;    // 높을수록 우선 (화료:100, 깡:30, 펑:20, 치:10)
}

/** 화료 분해 결과 */
export interface WinDecomposition {
  type: 'standard' | 'seven-pairs' | 'thirteen-orphans';
  melds: WinMeld[];
  pair: TileKind;
}

export interface WinMeld {
  type: 'sequence' | 'triplet';
  kinds: TileKind[];    // 구성 kind 3개
}

/** 화료 컨텍스트 (점수 계산용) */
export interface WinContext {
  roundWind: TileKind;     // 장풍
  seatWind: TileKind;      // 자풍
  isTsumo: boolean;        // 쯔모 화료 여부
  lastTile: TileKind;      // 화료패
  isLastWallTile: boolean; // 해저모월
  isKanDraw: boolean;      // 영상개화
  flowerCount: number;     // 꽃패 수
  melds: Meld[];           // 부로한 면자들
  isMenzen: boolean;       // 문전(부로 없음) 여부
}

/** 역(役) 정의 */
export interface Yaku {
  id: string;
  nameKo: string;
  nameCn: string;
  nameEn: string;
  points: number;
  description: string;
  excludes: string[];   // 이 역 성립 시 제외되는 하위역 ID들
}

/** 점수 계산 결과 */
export interface ScoringResult {
  yakuList: { yaku: Yaku; count: number }[];
  totalPoints: number;
  meetsMinimum: boolean;   // 8점 이상 여부
}

/** 마지막 쯔모의 이유 (영상개화 등 판정용) */
export type DrawReason = 'normal' | 'kan-replacement' | 'flower-replacement';

/** 전체 게임 상태 */
export interface GameState {
  gameId: string;                // 게임 고유 ID
  phase: GamePhase;
  roundWind: TileKind;         // 장풍 (41=동)
  turnIndex: number;           // 현재 턴 플레이어 (0~3)
  turnCount: number;           // 총 턴 수
  players: PlayerState[];
  wallTiles: TileId[];         // 패산 (뒤에서부터 뽑기)
  deadWall: TileId[];          // 왕패 (깡 보충용)
  lastDiscard: { playerId: number; tileId: TileId } | null;
  lastDrawReason: DrawReason;  // 마지막 쯔모 이유
  pendingActions: PendingAction[];
  winner: number | null;
  winResult: {
    decomposition: WinDecomposition;
    scoring: ScoringResult;
  } | null;
  difficulty: Difficulty;
  beginnerMode: boolean;       // 8점 제한 해제
}
