import { describe, it, expect } from 'vitest';
import { calculateScore } from '@/engine/scoring';
import { canWin } from '@/engine/win-detector';
import { WinContext, WinDecomposition } from '@/engine/types';

/** 테스트용 기본 WinContext */
function makeContext(overrides: Partial<WinContext> = {}): WinContext {
  return {
    roundWind: 41,
    seatWind: 41,
    isTsumo: false,
    lastTile: 11,
    isLastWallTile: false,
    isKanDraw: false,
    flowerCount: 0,
    melds: [],
    isMenzen: true,
    ...overrides,
  };
}

describe('점수 계산', () => {
  it('평화(All Chows): 4순자 + 수패 머리 = 2점', () => {
    // 1-2-3만, 4-5-6만, 1-2-3통, 4-5-6통, 7-7통 머리
    const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 27];
    const decomps = canWin(kinds);
    expect(decomps.length).toBeGreaterThan(0);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(decomp, makeContext({ lastTile: 27 }), kinds);
    const yakuIds = result.yakuList.map(y => y.yaku.id);

    expect(yakuIds).toContain('all_chows');
    expect(yakuIds).toContain('concealed_hand');
    expect(result.totalPoints).toBeGreaterThanOrEqual(4); // 평화2 + 문전청2
  });

  it('대삼원: 중·발·백 커쯔 = 88점', () => {
    // 중×3, 발×3, 백×3, 1-2-3만, 동동 머리
    const kinds = [51, 51, 51, 52, 52, 52, 53, 53, 53, 11, 12, 13, 41, 41];
    const decomps = canWin(kinds);
    expect(decomps.length).toBeGreaterThan(0);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(decomp, makeContext({ lastTile: 41 }), kinds);
    const yakuIds = result.yakuList.map(y => y.yaku.id);

    expect(yakuIds).toContain('big_three_dragons');
    // 대삼원이 번패(dragon_pung)를 exclude해야 함
    expect(yakuIds).not.toContain('dragon_pung');
    expect(result.totalPoints).toBeGreaterThanOrEqual(88);
    expect(result.meetsMinimum).toBe(true);
  });

  it('혼일색: 한 수트 + 자패 = 6점', () => {
    // 1-2-3만, 4-5-6만, 7-8-9만, 동동동, 중중 머리
    const kinds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 41, 41, 41, 51, 51];
    const decomps = canWin(kinds);
    expect(decomps.length).toBeGreaterThan(0);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(decomp, makeContext({ lastTile: 51 }), kinds);
    const yakuIds = result.yakuList.map(y => y.yaku.id);

    expect(yakuIds).toContain('half_flush');
  });

  it('청일색: 한 수트만 = 24점', () => {
    // 1-2-3만, 4-5-6만, 7-8-9만, 1-1-1만, 5-5만 머리
    const kinds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 11, 11, 11, 15, 15];
    const decomps = canWin(kinds);
    expect(decomps.length).toBeGreaterThan(0);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(decomp, makeContext({ lastTile: 15 }), kinds);
    const yakuIds = result.yakuList.map(y => y.yaku.id);

    expect(yakuIds).toContain('full_flush');
    // 청일색이 혼일색을 exclude해야 함
    expect(yakuIds).not.toContain('half_flush');
  });

  it('쯔모: 자모 1점 추가', () => {
    const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 27];
    const decomps = canWin(kinds);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(
      decomp,
      makeContext({ isTsumo: true, lastTile: 27 }),
      kinds
    );
    const yakuIds = result.yakuList.map(y => y.yaku.id);
    expect(yakuIds).toContain('self_drawn');
  });

  it('화패 점수: 꽃패 수만큼 추가', () => {
    const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 27];
    const decomps = canWin(kinds);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(
      decomp,
      makeContext({ flowerCount: 3, lastTile: 27 }),
      kinds
    );
    const flowerYaku = result.yakuList.find(y => y.yaku.id === 'flower_tiles');
    expect(flowerYaku).toBeDefined();
    expect(flowerYaku!.count).toBe(3);
  });

  it('칠대자: 7쌍 = 24점', () => {
    const kinds = [11, 11, 15, 15, 21, 21, 25, 25, 31, 31, 41, 41, 51, 51];
    const decomps = canWin(kinds);
    const decomp = decomps.find(d => d.type === 'seven-pairs')!;

    const result = calculateScore(decomp, makeContext({ lastTile: 51 }), kinds);
    const yakuIds = result.yakuList.map(y => y.yaku.id);
    expect(yakuIds).toContain('seven_pairs');
    expect(result.totalPoints).toBeGreaterThanOrEqual(24);
  });

  it('단요구: 2~8만으로 구성 = 2점', () => {
    // 2-3-4만, 5-6-7통, 3-4-5삭, 6-7-8삭, 5-5만 머리
    const kinds = [12, 13, 14, 25, 26, 27, 33, 34, 35, 36, 37, 38, 15, 15];
    const decomps = canWin(kinds);
    expect(decomps.length).toBeGreaterThan(0);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(decomp, makeContext({ lastTile: 15 }), kinds);
    const yakuIds = result.yakuList.map(y => y.yaku.id);
    expect(yakuIds).toContain('all_simples');
  });

  it('8점 미만이면 meetsMinimum이 false', () => {
    // 단순한 화료 (평화2 + 문전청2 = 4점 < 8점)
    const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 27];
    const decomps = canWin(kinds);
    const decomp = decomps.find(d => d.type === 'standard')!;

    const result = calculateScore(decomp, makeContext({ lastTile: 27 }), kinds);
    expect(result.meetsMinimum).toBe(false);
  });
});
