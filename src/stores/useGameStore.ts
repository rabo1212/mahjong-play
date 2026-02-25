'use client';

import { create } from 'zustand';
import {
  GameState, TileId, TileKind,
  PendingAction, Difficulty, ActionType,
} from '@/engine/types';
import {
  createInitialGameState, startGame, doDiscard,
  executeChi, executePon, executeMinkan,
  declareTsumo, declareRon, advanceTurn,
  checkTsumoWin,
} from '@/engine/game-manager';
import { toKinds } from '@/engine/tiles';
import { getAnkanOptions } from '@/engine/hand';
import { canWin } from '@/engine/win-detector';
import { aiChooseDiscard, aiRespondToActions } from '@/ai/ai-player';

interface GameStore extends GameState {
  // 액션
  initGame: (difficulty: Difficulty, beginnerMode: boolean) => void;
  playerDiscard: (tileId: TileId) => void;
  playerAction: (action: ActionType, tiles?: TileId[]) => void;
  playerSkip: () => void;
  aiTurn: () => void;
  aiRespondToAction: () => void;

  // 유저 가능 액션 계산
  getPlayerActions: () => PendingAction[];
  canPlayerTsumo: () => boolean;
  getPlayerAnkanOptions: () => TileKind[];
}

export const useGameStore = create<GameStore>()((set, get) => ({
  // 초기 상태
  ...createInitialGameState('easy', true),

  initGame: (difficulty, beginnerMode) => {
    const initial = createInitialGameState(difficulty, beginnerMode);
    const started = startGame(initial);
    set({ ...started });
  },

  playerDiscard: (tileId) => {
    const state = get();
    if (state.phase !== 'discard' || state.turnIndex !== 0) return;

    const newState = doDiscard(state, tileId);
    set({ ...newState });
  },

  playerAction: (action, tiles) => {
    const state = get();

    if (action === 'win') {
      // 론 (상대 버린 패로 화료)
      if (state.lastDiscard) {
        const newState = declareRon(state, 0);
        set({ ...newState });
      } else {
        // 쯔모 화료
        const newState = declareTsumo(state, 0);
        set({ ...newState });
      }
      return;
    }

    if (!state.lastDiscard) return;

    if (action === 'chi' && tiles) {
      const newState = executeChi(state, 0, tiles);
      set({ ...newState });
    } else if (action === 'pon') {
      const newState = executePon(state, 0);
      set({ ...newState });
    } else if (action === 'kan') {
      const newState = executeMinkan(state, 0);
      set({ ...newState });
    }
  },

  playerSkip: () => {
    const state = get();
    // 플레이어가 패스 → 플레이어의 pending action 제거
    const remaining = state.pendingActions.filter(a => a.playerId !== 0);

    if (remaining.length === 0) {
      // 모든 액션 패스 → 다음 턴
      const newState = advanceTurn({
        ...state,
        pendingActions: [],
      });
      set({ ...newState });
    } else {
      set({ pendingActions: remaining });
    }
  },

  aiTurn: () => {
    const state = get();
    if (state.phase === 'game-over') return;
    const playerIdx = state.turnIndex;
    if (playerIdx === 0) return; // 사람 턴이면 스킵

    const player = state.players[playerIdx];

    // 쯔모 화료 체크
    if (player.drawnTile !== null) {
      const handKinds = toKinds([...player.hand, player.drawnTile]);
      const decomps = canWin(handKinds, player.melds.length);
      if (decomps.length > 0) {
        const newState = declareTsumo(state, playerIdx);
        if (newState.phase === 'game-over') {
          set({ ...newState });
          return;
        }
      }
    }

    // AI 버리기: 난이도별 전략 사용
    if (state.phase === 'discard' && player.drawnTile !== null) {
      const tileToDiscard = aiChooseDiscard(state, playerIdx);
      const newState = doDiscard(state, tileToDiscard);
      set({ ...newState });
    }
  },

  aiRespondToAction: () => {
    const state = get();
    if (state.phase !== 'action-pending') return;

    const aiActions = state.pendingActions.filter(a => a.playerId !== 0);
    const playerActions = state.pendingActions.filter(a => a.playerId === 0);

    // 각 AI의 응답 수집
    let bestAction: PendingAction | null = null;
    let bestPriority = -1;

    for (const aiAct of aiActions) {
      const myActions = aiActions.filter(a => a.playerId === aiAct.playerId);
      const response = aiRespondToActions(state, aiAct.playerId, myActions);
      if (response && response.priority > bestPriority) {
        bestAction = response;
        bestPriority = response.priority;
      }
    }

    // AI가 액션을 선택한 경우
    if (bestAction) {
      if (bestAction.action === 'win' && state.lastDiscard) {
        const newState = declareRon(state, bestAction.playerId);
        set({ ...newState });
        return;
      }
      if (bestAction.action === 'pon') {
        const newState = executePon(state, bestAction.playerId);
        set({ ...newState });
        return;
      }
      if (bestAction.action === 'chi') {
        const newState = executeChi(state, bestAction.playerId, bestAction.tiles);
        set({ ...newState });
        return;
      }
      if (bestAction.action === 'kan') {
        const newState = executeMinkan(state, bestAction.playerId);
        set({ ...newState });
        return;
      }
    }

    // AI 모두 패스
    if (playerActions.length > 0) {
      // 플레이어 액션만 남김
      set({ pendingActions: playerActions });
    } else {
      // 아무도 안 하면 다음 턴
      const newState = advanceTurn({
        ...state,
        pendingActions: [],
      });
      set({ ...newState });
    }
  },

  getPlayerActions: () => {
    const state = get();
    return state.pendingActions.filter(a => a.playerId === 0);
  },

  canPlayerTsumo: () => {
    const state = get();
    if (state.turnIndex !== 0) return false;
    return checkTsumoWin(state);
  },

  getPlayerAnkanOptions: () => {
    const state = get();
    if (state.turnIndex !== 0) return [];
    const player = state.players[0];
    const fullHand = player.drawnTile
      ? [...player.hand, player.drawnTile]
      : player.hand;
    return getAnkanOptions(fullHand);
  },
}));
