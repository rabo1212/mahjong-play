import { Tile, TileId, TileKind, Suit } from './types';
import { TILE_LABELS } from '@/lib/constants';

// 144장 타일 전체 (모듈 로드 시 한 번만 생성)
let ALL_TILES: Tile[] | null = null;

/** kind → Suit 변환 */
export function kindToSuit(kind: TileKind): Suit {
  const s = Math.floor(kind / 10);
  switch (s) {
    case 1: return 'wan';
    case 2: return 'pin';
    case 3: return 'sou';
    case 4: return 'wind';
    case 5: return 'dragon';
    case 6: return 'flower';
    default: throw new Error(`Invalid kind: ${kind}`);
  }
}

/** kind → 숫자 변환 */
export function kindToNumber(kind: TileKind): number {
  return kind % 10;
}

/** 수패(만/통/삭) 여부 */
export function isSuited(kind: TileKind): boolean {
  const s = Math.floor(kind / 10);
  return s >= 1 && s <= 3;
}

/** 자패(풍/삼원) 여부 */
export function isHonor(kind: TileKind): boolean {
  const s = Math.floor(kind / 10);
  return s === 4 || s === 5;
}

/** 노두패(1, 9) 여부 */
export function isTerminal(kind: TileKind): boolean {
  if (!isSuited(kind)) return false;
  const n = kind % 10;
  return n === 1 || n === 9;
}

/** 요구패(노두+자패) 여부 */
export function isTerminalOrHonor(kind: TileKind): boolean {
  return isTerminal(kind) || isHonor(kind);
}

/** 꽃패 여부 */
export function isFlower(kind: TileKind): boolean {
  return Math.floor(kind / 10) === 6;
}

/** 같은 수트 여부 */
export function sameSuit(a: TileKind, b: TileKind): boolean {
  return Math.floor(a / 10) === Math.floor(b / 10);
}

/** 144장 타일 생성 */
export function createAllTiles(): Tile[] {
  if (ALL_TILES) return ALL_TILES;

  const tiles: Tile[] = [];
  let id = 0;

  // 수패: 만(11~19), 통(21~29), 삭(31~39) × 4장씩
  for (const suitBase of [10, 20, 30]) {
    for (let n = 1; n <= 9; n++) {
      const kind = suitBase + n;
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({
          id: id++,
          kind,
          suit: kindToSuit(kind),
          number: n,
          label: TILE_LABELS[kind] || `${kind}`,
        });
      }
    }
  }

  // 풍패: 동(41)~북(44) × 4장씩
  for (let n = 1; n <= 4; n++) {
    const kind = 40 + n;
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: id++,
        kind,
        suit: 'wind',
        number: n,
        label: TILE_LABELS[kind] || `${kind}`,
      });
    }
  }

  // 삼원패: 중(51), 발(52), 백(53) × 4장씩
  for (let n = 1; n <= 3; n++) {
    const kind = 50 + n;
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: id++,
        kind,
        suit: 'dragon',
        number: n,
        label: TILE_LABELS[kind] || `${kind}`,
      });
    }
  }

  // 화패: 매란국죽(61~64), 춘하추동(65~68) × 1장씩
  for (let n = 1; n <= 8; n++) {
    const kind = 60 + n;
    tiles.push({
      id: id++,
      kind,
      suit: 'flower',
      number: n,
      label: TILE_LABELS[kind] || `${kind}`,
    });
  }

  ALL_TILES = tiles;
  return tiles;
}

/** id로 Tile 조회 */
export function getTile(id: TileId): Tile {
  const tiles = createAllTiles();
  if (id < 0 || id >= tiles.length) {
    throw new Error(`Invalid TileId: ${id} (valid range: 0~${tiles.length - 1})`);
  }
  return tiles[id];
}

/** TileId 배열을 kind 순으로 정렬 */
export function sortByKind(tileIds: TileId[]): TileId[] {
  return [...tileIds].sort((a, b) => getTile(a).kind - getTile(b).kind);
}

/** TileId[] → TileKind[] */
export function toKinds(tileIds: TileId[]): TileKind[] {
  return tileIds.map(id => getTile(id).kind);
}

/** Fisher-Yates 셔플 */
export function shuffleTiles(tileIds: TileId[]): TileId[] {
  const arr = [...tileIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 전체 144장 ID 배열 생성 (셔플 전) */
export function createFullTileIds(): TileId[] {
  return createAllTiles().map(t => t.id);
}

/** kind별 카운트 맵 생성 (최대 kind=68 꽃패, 인덱스용으로 70 확보) */
export function buildKindCounts(kinds: TileKind[]): number[] {
  const counts = new Array(70).fill(0);
  for (const k of kinds) {
    counts[k]++;
  }
  return counts;
}
