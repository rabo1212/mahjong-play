import { describe, it, expect } from 'vitest';
import { aiChooseDiscard, aiRespondToActions } from '@/ai/ai-player';
import { createInitialGameState, startGame } from '@/engine/game-manager';
import { GameState, PendingAction } from '@/engine/types';

function getStartedGame(difficulty: 'easy' | 'normal' | 'hard'): GameState {
  const initial = createInitialGameState(difficulty, true);
  return startGame(initial);
}

describe('AI 플레이어', () => {
  describe('Easy AI', () => {
    it('유효한 타일 ID를 반환', () => {
      const state = getStartedGame('easy');
      // AI 1 (인덱스 1) 차례를 시뮬레이션
      const testState = { ...state, turnIndex: 1 };
      const player = testState.players[1];
      // drawnTile 있는 상태로
      const allTiles = [...player.hand, ...(player.drawnTile !== null ? [player.drawnTile] : [])];

      if (allTiles.length > 0) {
        const tileId = aiChooseDiscard(testState, 1);
        expect(allTiles).toContain(tileId);
      }
    });
  });

  describe('Normal AI', () => {
    it('유효한 타일 ID를 반환', () => {
      const state = getStartedGame('normal');
      const testState = { ...state, turnIndex: 1 };
      const player = testState.players[1];
      const allTiles = [...player.hand, ...(player.drawnTile !== null ? [player.drawnTile] : [])];

      if (allTiles.length > 0) {
        const tileId = aiChooseDiscard(testState, 1);
        expect(allTiles).toContain(tileId);
      }
    });
  });

  describe('Hard AI', () => {
    it('유효한 타일 ID를 반환', () => {
      const state = getStartedGame('hard');
      const testState = { ...state, turnIndex: 1 };
      const player = testState.players[1];
      const allTiles = [...player.hand, ...(player.drawnTile !== null ? [player.drawnTile] : [])];

      if (allTiles.length > 0) {
        const tileId = aiChooseDiscard(testState, 1);
        expect(allTiles).toContain(tileId);
      }
    });
  });

  describe('aiRespondToActions', () => {
    it('론 액션은 무조건 선택', () => {
      const state = getStartedGame('easy');
      const actions: PendingAction[] = [
        { playerId: 1, action: 'win', tiles: [], priority: 100 },
        { playerId: 1, action: 'pon', tiles: [10, 11], priority: 20 },
      ];
      const result = aiRespondToActions(state, 1, actions);
      expect(result).not.toBeNull();
      expect(result!.action).toBe('win');
    });

    it('Easy AI는 부로 안 함', () => {
      const state = getStartedGame('easy');
      const actions: PendingAction[] = [
        { playerId: 1, action: 'pon', tiles: [10, 11], priority: 20 },
      ];
      const result = aiRespondToActions(state, 1, actions);
      expect(result).toBeNull();
    });

    it('론 없는 Normal AI는 조건부 부로', () => {
      const state = getStartedGame('normal');
      const actions: PendingAction[] = [
        { playerId: 1, action: 'chi', tiles: [10, 11], priority: 10 },
      ];
      // 결과는 null이거나 chi (조건에 따라 다름)
      const result = aiRespondToActions(state, 1, actions);
      if (result) {
        expect(result.action).toBe('chi');
      }
    });
  });
});
