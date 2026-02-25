import { TileId, PlayerState } from './types';
import { createFullTileIds, shuffleTiles, getTile, sortByKind, isFlower } from './tiles';
import { SEAT_WINDS } from '@/lib/constants';

export interface DealResult {
  players: PlayerState[];
  wallTiles: TileId[];
  deadWall: TileId[];
}

/** 패산 생성 (144장 셔플) */
export function createWall(): TileId[] {
  return shuffleTiles(createFullTileIds());
}

/** 패산에서 1장 뽑기 (뒤에서부터) */
export function drawFromWall(wall: TileId[]): { tile: TileId; wall: TileId[] } | null {
  if (wall.length === 0) return null;
  const newWall = [...wall];
  const tile = newWall.pop()!;
  return { tile, wall: newWall };
}

/** 왕패에서 1장 뽑기 (깡 보충용) */
export function drawFromDeadWall(deadWall: TileId[]): { tile: TileId; deadWall: TileId[] } | null {
  if (deadWall.length === 0) return null;
  const newDeadWall = [...deadWall];
  const tile = newDeadWall.pop()!;
  return { tile, deadWall: newDeadWall };
}

/** 초기 배패 + 꽃패 교체 */
export function dealInitialHands(inputWall?: TileId[]): DealResult {
  const wall = inputWall ? [...inputWall] : createWall();

  // 왕패 14장 분리 (패산 앞쪽에서)
  const deadWall = wall.splice(0, 14);

  // 4명 플레이어 초기화
  const players: PlayerState[] = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    name: i === 0 ? '나' : `AI ${i}`,
    seatWind: SEAT_WINDS[i],
    hand: [],
    melds: [],
    discards: [],
    drawnTile: null,
    flowers: [],
    isAI: i !== 0,
  }));

  // 배패: 각 플레이어에게 13장씩 (동가=0부터)
  for (let round = 0; round < 3; round++) {
    for (let p = 0; p < 4; p++) {
      // 4장씩 3번 = 12장
      for (let i = 0; i < 4; i++) {
        const drawn = wall.pop();
        if (drawn !== undefined) players[p].hand.push(drawn);
      }
    }
  }
  // 마지막 1장씩
  for (let p = 0; p < 4; p++) {
    const drawn = wall.pop();
    if (drawn !== undefined) players[p].hand.push(drawn);
  }

  // 동가(0번)는 14장째 쯔모 (첫 턴 시작)
  const firstDraw = wall.pop();
  if (firstDraw !== undefined) {
    players[0].drawnTile = firstDraw;
  }

  // 꽃패 교체: 각 플레이어의 손패에서 꽃패를 찾아 보화
  for (let p = 0; p < 4; p++) {
    replaceFlowers(players[p], wall);
  }
  // drawnTile도 꽃패일 수 있음
  if (players[0].drawnTile !== null && isFlower(getTile(players[0].drawnTile).kind)) {
    players[0].flowers.push(players[0].drawnTile);
    const replacement = wall.pop();
    players[0].drawnTile = replacement !== undefined ? replacement : null;
    // 교체한 패도 꽃패일 수 있으므로 반복
    while (
      players[0].drawnTile !== null &&
      isFlower(getTile(players[0].drawnTile).kind)
    ) {
      players[0].flowers.push(players[0].drawnTile);
      const next = wall.pop();
      players[0].drawnTile = next !== undefined ? next : null;
    }
  }

  // 손패 정렬
  for (const p of players) {
    p.hand = sortByKind(p.hand);
  }

  return { players, wallTiles: wall, deadWall };
}

/** 손패에서 꽃패를 찾아 보화 처리 */
function replaceFlowers(player: PlayerState, wall: TileId[]): void {
  let hasFlower = true;
  while (hasFlower) {
    hasFlower = false;
    const newHand: TileId[] = [];
    for (const tileId of player.hand) {
      if (isFlower(getTile(tileId).kind)) {
        player.flowers.push(tileId);
        // 패산에서 보충
        const replacement = wall.pop();
        if (replacement !== undefined) {
          newHand.push(replacement);
        }
        hasFlower = true;
      } else {
        newHand.push(tileId);
      }
    }
    player.hand = newHand;
  }
}
