import { TileId, PendingAction, PlayerState } from './types';
import { getTile, toKinds } from './tiles';
import { getChiOptions, canPon, canMinkan } from './hand';
import { canWin } from './win-detector';
import { ACTION_PRIORITY } from '@/lib/constants';

/**
 * 버린 패에 대해 각 플레이어가 할 수 있는 액션 수집
 * @param players - 4명의 플레이어 상태
 * @param discardPlayerId - 패를 버린 플레이어
 * @param discardTileId - 버린 타일 ID
 * @returns 가능한 액션 목록 (우선순위 포함)
 */
export function collectPendingActions(
  players: PlayerState[],
  discardPlayerId: number,
  discardTileId: TileId,
): PendingAction[] {
  const actions: PendingAction[] = [];
  const discardKind = getTile(discardTileId).kind;

  for (let i = 0; i < 4; i++) {
    if (i === discardPlayerId) continue;
    const player = players[i];
    const hand = player.hand;

    // 론(화료) 체크
    const handKinds = toKinds(hand);
    const testHand = [...handKinds, discardKind].sort((a, b) => a - b);
    if (canWin(testHand, player.melds.length).length > 0) {
      actions.push({
        playerId: i,
        action: 'win',
        tiles: [],
        priority: ACTION_PRIORITY.win,
      });
    }

    // 대명깡 체크
    const kanTiles = canMinkan(hand, discardKind);
    if (kanTiles) {
      actions.push({
        playerId: i,
        action: 'kan',
        tiles: kanTiles,
        priority: ACTION_PRIORITY.kan,
      });
    }

    // 펑 체크
    const ponTiles = canPon(hand, discardKind);
    if (ponTiles) {
      actions.push({
        playerId: i,
        action: 'pon',
        tiles: ponTiles,
        priority: ACTION_PRIORITY.pon,
      });
    }

    // 치 체크 (바로 다음 플레이어만)
    const chiOptions = getChiOptions(hand, discardKind, discardPlayerId, i);
    if (chiOptions.length > 0) {
      actions.push({
        playerId: i,
        action: 'chi',
        tiles: chiOptions[0], // 첫 번째 옵션 (AI가 선택 변경 가능)
        priority: ACTION_PRIORITY.chi,
      });
    }
  }

  return actions;
}

/**
 * 액션 우선순위에 따라 최우선 액션 결정
 * 동일 우선순위 시 방포자 기준 하가(다음 턴) 우선
 */
export function resolveTopAction(
  actions: PendingAction[],
  discardPlayerId: number
): PendingAction | null {
  if (actions.length === 0) return null;

  // 우선순위 내림차순 정렬
  const sorted = [...actions].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // 같은 우선순위면 방포자 기준 다음 순서 우선
    const distA = (a.playerId - discardPlayerId + 4) % 4;
    const distB = (b.playerId - discardPlayerId + 4) % 4;
    return distA - distB;
  });

  return sorted[0];
}
