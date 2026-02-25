/**
 * AI 턴 연속 처리 + 타이머 설정 유틸리티
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

/** 턴 타이머 상수 (action/route.ts와 동일) */
const DISCARD_TIMEOUT_MS = 30_000;
const PENDING_TIMEOUT_MS = 15_000;

/** 인간 플레이어 턴이면 deadline 설정 (action/route.ts의 setDeadlineIfNeeded와 동일 로직) */
export function setDeadlineIfNeeded(state: GameState): GameState {
  if (state.phase === 'game-over') return state;

  if (state.phase === 'discard' && !state.players[state.turnIndex].isAI) {
    return { ...state, turnDeadline: Date.now() + DISCARD_TIMEOUT_MS };
  }
  if (state.phase === 'action-pending') {
    const pendingPlayerIds = Array.from(new Set(state.pendingActions.map(a => a.playerId)));
    const hasHuman = pendingPlayerIds.some(pid => !state.players[pid].isAI);
    if (hasHuman) {
      return { ...state, turnDeadline: Date.now() + PENDING_TIMEOUT_MS };
    }
  }
  return { ...state, turnDeadline: null };
}

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

    // 암깡 체크 (action/route.ts의 aiCheckAnkan과 동일 로직)
    const player = s.players[s.turnIndex];
    const fullHand = player.drawnTile !== null
      ? [...player.hand, player.drawnTile]
      : [...player.hand];
    const ankanOpts = getAnkanOptions(fullHand);
    if (ankanOpts.length > 0) {
      if (s.difficulty === 'easy') {
        // easy: 암깡 안 함
      } else if (s.difficulty === 'normal' && Math.random() > 0.5) {
        // normal: 50% 확률
      } else {
        s = executeAnkan(s, s.turnIndex, ankanOpts[0]);
        continue;
      }
    }

    // 버리기
    const tile = aiChooseDiscard(s, s.turnIndex);
    s = doDiscard(s, tile);

    // action-pending이면 AI만 있으면 자동 처리
    if (s.phase === 'action-pending') {
      const pendingIds = Array.from(new Set(s.pendingActions.map(a => a.playerId)));
      const hasHuman = pendingIds.some(pid => !s.players[pid].isAI);
      if (hasHuman) break; // 인간이 관여 → 루프 탈출, caller가 deadline 설정

      // AI only pending — collectedResponses 초기화 포함
      const decisions = [];
      for (const pid of pendingIds) {
        const pActions = s.pendingActions.filter(a => a.playerId === pid);
        const d = aiRespondToActions(s, pid, pActions);
        if (d) decisions.push(d);
      }

      const cleanState: GameState = { ...s, collectedResponses: [] };

      if (decisions.length === 0) {
        s = advanceTurn({ ...cleanState, pendingActions: [] });
      } else {
        const top = resolveTopAction(decisions, s.lastDiscard!.playerId);
        if (!top) {
          s = advanceTurn({ ...cleanState, pendingActions: [] });
        } else {
          switch (top.action) {
            case 'win': s = declareRon(cleanState, top.playerId); break;
            case 'kan': s = executeMinkan(cleanState, top.playerId); break;
            case 'pon': s = executePon(cleanState, top.playerId); break;
            case 'chi': s = executeChi(cleanState, top.playerId, top.tiles); break;
            default: s = advanceTurn({ ...cleanState, pendingActions: [] });
          }
        }
      }
    }
  }
  return s;
}
