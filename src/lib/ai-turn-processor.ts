/**
 * AI 턴 연속 처리 유틸리티
 * start/rematch 라우트에서 첫 턴이 AI인 경우 사용
 */
import {
  doDiscard, declareTsumo, checkTsumoWin,
  executeAnkan, executeKakan, advanceTurn,
  executeChi, executePon, executeMinkan, declareRon,
} from '@/engine/game-manager';
import { aiChooseDiscard, aiRespondToActions, aiShouldKakan } from '@/ai/ai-player';
import { resolveTopAction } from '@/engine/action-resolver';
import { getAnkanOptions } from '@/engine/hand';
import type { GameState } from '@/engine/types';

/** AI 첫 턴 연속 처리 (사람 차례가 올 때까지) */
export function processStartAITurns(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 100; i++) {
    if (s.phase === 'game-over') break;
    if (s.phase !== 'discard') break;
    if (!s.players[s.turnIndex].isAI) break;

    // 쯔모 체크
    if (checkTsumoWin(s)) {
      s = declareTsumo(s, s.turnIndex);
      continue;
    }

    // 가깡 체크
    const kakanIdx = aiShouldKakan(s, s.turnIndex);
    if (kakanIdx !== null) {
      s = executeKakan(s, s.turnIndex, kakanIdx);
      continue;
    }

    // 암깡 체크
    const player = s.players[s.turnIndex];
    const fullHand = player.drawnTile !== null
      ? [...player.hand, player.drawnTile]
      : [...player.hand];
    const ankanOpts = getAnkanOptions(fullHand);
    if (ankanOpts.length > 0 && s.difficulty !== 'easy') {
      s = executeAnkan(s, s.turnIndex, ankanOpts[0]);
      continue;
    }

    // 버리기
    const tile = aiChooseDiscard(s, s.turnIndex);
    s = doDiscard(s, tile);

    // action-pending이면 AI만 있으면 자동 처리
    if (s.phase === 'action-pending') {
      const pendingIds = Array.from(new Set(s.pendingActions.map(a => a.playerId)));
      const hasHuman = pendingIds.some(pid => !s.players[pid].isAI);
      if (hasHuman) break;

      // AI only pending
      const decisions = [];
      for (const pid of pendingIds) {
        const pActions = s.pendingActions.filter(a => a.playerId === pid);
        const d = aiRespondToActions(s, pid, pActions);
        if (d) decisions.push(d);
      }

      if (decisions.length === 0) {
        s = advanceTurn({ ...s, pendingActions: [] });
      } else {
        const top = resolveTopAction(decisions, s.lastDiscard!.playerId);
        if (!top) {
          s = advanceTurn({ ...s, pendingActions: [] });
        } else {
          switch (top.action) {
            case 'win': s = declareRon(s, top.playerId); break;
            case 'kan': s = executeMinkan(s, top.playerId); break;
            case 'pon': s = executePon(s, top.playerId); break;
            case 'chi': s = executeChi(s, top.playerId, top.tiles); break;
            default: s = advanceTurn({ ...s, pendingActions: [] });
          }
        }
      }
    }
  }
  return s;
}
