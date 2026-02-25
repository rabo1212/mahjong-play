import { TileId, TileKind, Meld } from './types';
import { getTile, isSuited, buildKindCounts } from './tiles';

/** 치(吃) 가능 여부 체크 — 왼쪽 플레이어(상가)의 버린 패만 가능 */
export function getChiOptions(
  hand: TileId[],
  discardKind: TileKind,
  discardPlayerId: number,
  myId: number
): TileId[][] {
  // 치는 상가(바로 왼쪽 플레이어)만 가능
  // 반시계방향 진행: 0→1→2→3→0
  // 내 상가 = (myId + 3) % 4
  const prevPlayer = (myId + 3) % 4;
  if (discardPlayerId !== prevPlayer) return [];

  // 수패만 치 가능
  if (!isSuited(discardKind)) return [];

  const dk = discardKind;
  const num = dk % 10;
  const options: TileId[][] = [];

  const handKinds = hand.map(id => ({ id, kind: getTile(id).kind }));

  // 패턴 1: dk-2, dk-1, [dk] (예: 1,2,[3])
  if (num >= 3) {
    const t1 = handKinds.find(t => t.kind === dk - 2);
    const t2 = handKinds.find(t => t.kind === dk - 1 && t.id !== t1?.id);
    if (t1 && t2) options.push([t1.id, t2.id]);
  }

  // 패턴 2: dk-1, [dk], dk+1 (예: 2,[3],4)
  if (num >= 2 && num <= 8) {
    const t1 = handKinds.find(t => t.kind === dk - 1);
    const t2 = handKinds.find(t => t.kind === dk + 1 && t.id !== t1?.id);
    if (t1 && t2) options.push([t1.id, t2.id]);
  }

  // 패턴 3: [dk], dk+1, dk+2 (예: [3],4,5)
  if (num <= 7) {
    const t1 = handKinds.find(t => t.kind === dk + 1);
    const t2 = handKinds.find(t => t.kind === dk + 2 && t.id !== t1?.id);
    if (t1 && t2) options.push([t1.id, t2.id]);
  }

  return options;
}

/** 펑(碰) 가능 여부 — 같은 kind 2장 이상 */
export function canPon(hand: TileId[], discardKind: TileKind): TileId[] | null {
  const matching = hand.filter(id => getTile(id).kind === discardKind);
  if (matching.length >= 2) return matching.slice(0, 2);
  return null;
}

/** 대명깡 가능 여부 — 같은 kind 3장 보유 */
export function canMinkan(hand: TileId[], discardKind: TileKind): TileId[] | null {
  const matching = hand.filter(id => getTile(id).kind === discardKind);
  if (matching.length >= 3) return matching.slice(0, 3);
  return null;
}

/** 암깡 가능한 kind 목록 — 손패에 같은 kind 4장 */
export function getAnkanOptions(hand: TileId[]): TileKind[] {
  const counts = buildKindCounts(hand.map(id => getTile(id).kind));
  const result: TileKind[] = [];
  for (let k = 11; k <= 53; k++) {
    if (counts[k] >= 4) result.push(k);
  }
  return result;
}

/** 가깡 가능한 meld 인덱스 목록 — 이미 펑한 세트 + 손패에 같은 패 1장 */
export function getKakanOptions(hand: TileId[], melds: Meld[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < melds.length; i++) {
    if (melds[i].type !== 'pon') continue;
    const ponKind = melds[i].tileKinds[0];
    if (hand.some(id => getTile(id).kind === ponKind)) {
      result.push(i);
    }
  }
  return result;
}

/** 손패에서 특정 타일 제거 */
export function removeTilesFromHand(hand: TileId[], toRemove: TileId[]): TileId[] {
  const removeSet = new Set(toRemove);
  return hand.filter(id => !removeSet.has(id));
}
