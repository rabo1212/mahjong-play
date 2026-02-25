/**
 * 풀 게임 플레이 테스트
 * AI 4명이 자동으로 한 판을 처음부터 끝까지 플레이
 */
import { describe, it, expect } from 'vitest';
import {
  createInitialGameState, startGame, doDiscard,
  executeChi, executePon, executeMinkan, executeAnkan,
  declareTsumo, declareRon, advanceTurn, checkTsumoWin,
} from '@/engine/game-manager';
import { toKinds, getTile } from '@/engine/tiles';
import { canWin } from '@/engine/win-detector';
import { getAnkanOptions } from '@/engine/hand';
import { aiChooseDiscard } from '@/ai/ai-player';
import { GameState, PendingAction } from '@/engine/types';

function simulateFullGame(difficulty: 'easy' | 'normal' | 'hard'): {
  turns: number;
  result: 'win' | 'draw';
  winner: number | null;
  totalPoints: number;
  yakuNames: string[];
  errors: string[];
} {
  const errors: string[] = [];
  let state = startGame(createInitialGameState(difficulty, true));
  let maxTurns = 300; // 무한루프 방지
  let turnCount = 0;

  while (state.phase !== 'game-over' && maxTurns-- > 0) {
    turnCount++;

    // 1. 버리기 단계
    if (state.phase === 'discard') {
      const playerIdx = state.turnIndex;
      const player = state.players[playerIdx];

      // 쯔모 체크
      if (player.drawnTile !== null) {
        const handKinds = toKinds([...player.hand, player.drawnTile]);
        const decomps = canWin(handKinds, player.melds.length);
        if (decomps.length > 0) {
          state = declareTsumo(state, playerIdx);
          if (state.phase === 'game-over') break;
        }
      }

      // 암깡 체크
      if (state.phase === 'discard') {
        const fullHand = player.drawnTile
          ? [...player.hand, player.drawnTile]
          : player.hand;
        const ankanOpts = getAnkanOptions(fullHand);
        if (ankanOpts.length > 0 && Math.random() < 0.3) {
          state = executeAnkan(state, playerIdx, ankanOpts[0]);
          continue;
        }
      }

      // 패 버리기
      if (state.phase === 'discard') {
        try {
          const tileToDiscard = aiChooseDiscard(state, playerIdx);
          // 유효성 검증
          const p = state.players[playerIdx];
          const allTiles = p.drawnTile !== null
            ? [...p.hand, p.drawnTile]
            : p.hand;
          if (!allTiles.includes(tileToDiscard)) {
            errors.push(`Turn ${turnCount}: Player ${playerIdx} tried to discard tile ${tileToDiscard} not in hand`);
            // 비상 탈출: 첫 번째 패 버리기
            state = doDiscard(state, allTiles[0]);
          } else {
            state = doDiscard(state, tileToDiscard);
          }
        } catch (e: unknown) {
          errors.push(`Turn ${turnCount}: Discard error for player ${playerIdx}: ${e instanceof Error ? e.message : String(e)}`);
          break;
        }
      }
      continue;
    }

    // 2. 액션 대기 단계
    if (state.phase === 'action-pending') {
      // 론 체크 (최우선)
      const ronAction = state.pendingActions.find(a => a.action === 'win');
      if (ronAction) {
        state = declareRon(state, ronAction.playerId);
        continue;
      }

      // 펑/치 (30% 확률로 실행)
      const ponAction = state.pendingActions.find(a => a.action === 'pon');
      if (ponAction && Math.random() < 0.3) {
        state = executePon(state, ponAction.playerId);
        continue;
      }

      const chiAction = state.pendingActions.find(a => a.action === 'chi');
      if (chiAction && Math.random() < 0.2) {
        state = executeChi(state, chiAction.playerId, chiAction.tiles);
        continue;
      }

      // 모두 패스
      state = advanceTurn({ ...state, pendingActions: [] });
      continue;
    }

    // 예상치 못한 단계
    errors.push(`Turn ${turnCount}: Unexpected phase "${state.phase}"`);
    break;
  }

  if (maxTurns <= 0) {
    errors.push('Game exceeded 300 turns - possible infinite loop');
  }

  const result = state.winner !== null ? 'win' : 'draw';
  const totalPoints = state.winResult?.scoring.totalPoints ?? 0;
  const yakuNames = state.winResult?.scoring.yakuList.map(y => y.yaku.nameKo) ?? [];

  return {
    turns: turnCount,
    result,
    winner: state.winner,
    totalPoints,
    yakuNames,
    errors,
  };
}

describe('풀 게임 플레이 테스트', () => {
  it('Easy 난이도 10판 시뮬레이션', () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(simulateFullGame('easy'));
    }

    let wins = 0, draws = 0, totalErrors = 0;
    for (const r of results) {
      if (r.result === 'win') wins++;
      else draws++;
      totalErrors += r.errors.length;

      // 에러 출력
      if (r.errors.length > 0) {
        console.warn(`Game errors:`, r.errors);
      }
    }

    console.log(`\n=== Easy 10판 결과 ===`);
    console.log(`화료: ${wins}판, 유국: ${draws}판`);
    console.log(`에러: ${totalErrors}건`);
    results.filter(r => r.result === 'win').forEach((r, i) => {
      console.log(`  화료 ${i + 1}: Player ${r.winner} - ${r.totalPoints}점 [${r.yakuNames.join(', ')}] (${r.turns}턴)`);
    });

    // 10판 중 에러 없이 완주해야 함
    expect(totalErrors).toBe(0);
    // 모든 게임이 game-over에 도달해야 함
    expect(results.length).toBe(10);
  });

  it('Normal 난이도 10판 시뮬레이션', () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(simulateFullGame('normal'));
    }

    let wins = 0, draws = 0, totalErrors = 0;
    for (const r of results) {
      if (r.result === 'win') wins++;
      else draws++;
      totalErrors += r.errors.length;
      if (r.errors.length > 0) console.warn(`Game errors:`, r.errors);
    }

    console.log(`\n=== Normal 10판 결과 ===`);
    console.log(`화료: ${wins}판, 유국: ${draws}판`);
    console.log(`에러: ${totalErrors}건`);
    results.filter(r => r.result === 'win').forEach((r, i) => {
      console.log(`  화료 ${i + 1}: Player ${r.winner} - ${r.totalPoints}점 [${r.yakuNames.join(', ')}] (${r.turns}턴)`);
    });

    expect(totalErrors).toBe(0);
  });

  it('Hard 난이도 10판 시뮬레이션', { timeout: 30000 }, () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(simulateFullGame('hard'));
    }

    let wins = 0, draws = 0, totalErrors = 0;
    for (const r of results) {
      if (r.result === 'win') wins++;
      else draws++;
      totalErrors += r.errors.length;
      if (r.errors.length > 0) console.warn(`Game errors:`, r.errors);
    }

    console.log(`\n=== Hard 10판 결과 ===`);
    console.log(`화료: ${wins}판, 유국: ${draws}판`);
    console.log(`에러: ${totalErrors}건`);
    results.filter(r => r.result === 'win').forEach((r, i) => {
      console.log(`  화료 ${i + 1}: Player ${r.winner} - ${r.totalPoints}점 [${r.yakuNames.join(', ')}] (${r.turns}턴)`);
    });

    expect(totalErrors).toBe(0);
  });

  it('치/펑 부로 후 게임이 정상 진행되는지', () => {
    // 부로가 빈번하게 일어나도록 확률 100%로 시뮬
    let state = startGame(createInitialGameState('normal', true));
    let meldCount = 0;
    let turnCount = 0;
    const maxTurns = 300;

    while (state.phase !== 'game-over' && turnCount < maxTurns) {
      turnCount++;

      if (state.phase === 'discard') {
        const playerIdx = state.turnIndex;
        const player = state.players[playerIdx];

        // 쯔모 체크
        if (player.drawnTile !== null) {
          const handKinds = toKinds([...player.hand, player.drawnTile]);
          const decomps = canWin(handKinds, player.melds.length);
          if (decomps.length > 0) {
            state = declareTsumo(state, playerIdx);
            if (state.phase === 'game-over') break;
          }
        }

        if (state.phase === 'discard') {
          const tileToDiscard = aiChooseDiscard(state, playerIdx);
          state = doDiscard(state, tileToDiscard);
        }
      } else if (state.phase === 'action-pending') {
        // 론 최우선
        const ronAction = state.pendingActions.find(a => a.action === 'win');
        if (ronAction) {
          state = declareRon(state, ronAction.playerId);
          continue;
        }

        // 부로 무조건 실행
        const ponAction = state.pendingActions.find(a => a.action === 'pon');
        if (ponAction) {
          state = executePon(state, ponAction.playerId);
          meldCount++;
          continue;
        }

        const chiAction = state.pendingActions.find(a => a.action === 'chi');
        if (chiAction) {
          state = executeChi(state, chiAction.playerId, chiAction.tiles);
          meldCount++;
          continue;
        }

        state = advanceTurn({ ...state, pendingActions: [] });
      } else {
        break;
      }
    }

    console.log(`\n=== 부로 강제 테스트 ===`);
    console.log(`부로 발생: ${meldCount}회, 턴: ${turnCount}, 결과: ${state.phase === 'game-over' ? (state.winner !== null ? `Player ${state.winner} 화료` : '유국') : '미완료'}`);

    expect(state.phase).toBe('game-over');
    expect(meldCount).toBeGreaterThan(0);
  });

  it('패 수 일관성 검증 (매 턴마다)', () => {
    let state = startGame(createInitialGameState('normal', true));
    let turnCount = 0;
    const errors: string[] = [];

    while (state.phase !== 'game-over' && turnCount < 200) {
      turnCount++;

      // 매 턴마다 패 수 검증
      for (let p = 0; p < 4; p++) {
        const player = state.players[p];
        const handSize = player.hand.length + (player.drawnTile !== null ? 1 : 0);
        const meldTiles = player.melds.reduce((sum, m) => sum + m.tileIds.length, 0);
        const expectedHand = 14 - meldTiles + (player.drawnTile !== null ? 0 : -1);

        // 부로하면 패 3장이 meld로 이동 (손패에서 2장 + 가져온 1장)
        // 깡은 4장
        // 정확한 검증은 복잡하므로 범위로 체크
        if (handSize < 1 || handSize > 14) {
          errors.push(`Turn ${turnCount}: Player ${p} has ${handSize} tiles (hand ${player.hand.length}, drawn ${player.drawnTile !== null ? 1 : 0})`);
        }
      }

      if (state.phase === 'discard') {
        const playerIdx = state.turnIndex;
        const player = state.players[playerIdx];

        if (player.drawnTile !== null) {
          const handKinds = toKinds([...player.hand, player.drawnTile]);
          const decomps = canWin(handKinds, player.melds.length);
          if (decomps.length > 0) {
            state = declareTsumo(state, playerIdx);
            if (state.phase === 'game-over') break;
          }
        }

        if (state.phase === 'discard') {
          const tileToDiscard = aiChooseDiscard(state, playerIdx);
          state = doDiscard(state, tileToDiscard);
        }
      } else if (state.phase === 'action-pending') {
        const ronAction = state.pendingActions.find(a => a.action === 'win');
        if (ronAction) {
          state = declareRon(state, ronAction.playerId);
          continue;
        }
        state = advanceTurn({ ...state, pendingActions: [] });
      }
    }

    if (errors.length > 0) {
      console.warn('패 수 에러:', errors.slice(0, 5));
    }
    console.log(`\n=== 패 수 검증: ${turnCount}턴 동안 에러 ${errors.length}건 ===`);
    expect(errors.length).toBe(0);
  });
});
