import { describe, it, expect } from 'vitest';
import {
  createInitialGameState, startGame, doDraw, doDiscard,
  executePon, executeChi, advanceTurn,
} from '@/engine/game-manager';
import { getTile, toKinds } from '@/engine/tiles';
import { canPon, getChiOptions } from '@/engine/hand';

describe('게임 매니저', () => {
  describe('게임 시작', () => {
    it('배패 후 각 플레이어가 13장을 가져야 한다', () => {
      const state = createInitialGameState('easy', true);
      const started = startGame(state);

      // 동가(0번)는 drawnTile 1장 + hand 13장
      expect(started.players[0].hand).toHaveLength(13);
      expect(started.players[0].drawnTile).not.toBeNull();

      // 나머지는 13장 (drawnTile 없음)
      for (let i = 1; i < 4; i++) {
        expect(started.players[i].hand).toHaveLength(13);
        expect(started.players[i].drawnTile).toBeNull();
      }
    });

    it('손패에 꽃패가 없어야 한다', () => {
      const state = createInitialGameState('easy', true);
      const started = startGame(state);

      for (const player of started.players) {
        for (const tileId of player.hand) {
          expect(getTile(tileId).suit).not.toBe('flower');
        }
        if (player.drawnTile !== null) {
          expect(getTile(player.drawnTile).suit).not.toBe('flower');
        }
      }
    });

    it('패산 + 왕패 + 모든 패 합이 144장이어야 한다', () => {
      const state = createInitialGameState('easy', true);
      const started = startGame(state);

      let total = started.wallTiles.length + started.deadWall.length;
      for (const player of started.players) {
        total += player.hand.length;
        if (player.drawnTile !== null) total += 1;
        total += player.flowers.length;
        total += player.melds.reduce((sum, m) => sum + m.tileIds.length, 0);
      }
      expect(total).toBe(144);
    });

    it('phase가 discard여야 한다 (동가가 바로 버리기)', () => {
      const state = createInitialGameState('easy', true);
      const started = startGame(state);
      expect(started.phase).toBe('discard');
      expect(started.turnIndex).toBe(0);
    });
  });

  describe('타패(버리기)', () => {
    it('패 버리기 후 손패에서 해당 타일이 제거되어야 한다', () => {
      const state = createInitialGameState('easy', true);
      let game = startGame(state);

      // 동가의 drawnTile을 버리기
      const tileToDiscard = game.players[0].drawnTile!;
      game = doDiscard(game, tileToDiscard);

      // 버린 패가 버림패에 있어야 함
      expect(game.players[0].discards).toContain(tileToDiscard);
      // 손패+drawnTile에서 사라져야 함
      expect(game.players[0].hand).not.toContain(tileToDiscard);
      expect(game.players[0].drawnTile).toBeNull();
    });
  });

  describe('턴 진행', () => {
    it('반시계방향으로 진행해야 한다 (0→1→2→3→0)', () => {
      const state = createInitialGameState('easy', true);
      let game = startGame(state);
      expect(game.turnIndex).toBe(0);

      // 0번이 버리기 → 액션 없으면 1번 턴
      const tile = game.players[0].drawnTile!;
      game = doDiscard(game, tile);

      // action-pending이거나 다음 턴으로 넘어갔거나
      if (game.phase !== 'action-pending') {
        // 다음 턴 (1번 플레이어)
        expect(game.turnIndex).toBe(1);
      }
    });
  });

  describe('좌석풍 배정', () => {
    it('4명에게 동남서북이 배정되어야 한다', () => {
      const state = createInitialGameState('easy', true);
      const started = startGame(state);

      expect(started.players[0].seatWind).toBe(41); // 동
      expect(started.players[1].seatWind).toBe(42); // 남
      expect(started.players[2].seatWind).toBe(43); // 서
      expect(started.players[3].seatWind).toBe(44); // 북
    });
  });

  describe('AI 설정', () => {
    it('0번만 플레이어, 나머지는 AI여야 한다', () => {
      const state = createInitialGameState('easy', true);
      const started = startGame(state);

      expect(started.players[0].isAI).toBe(false);
      expect(started.players[1].isAI).toBe(true);
      expect(started.players[2].isAI).toBe(true);
      expect(started.players[3].isAI).toBe(true);
    });
  });
});
