import { describe, it, expect } from 'vitest';
import { canWin, isTenpai, getWaitingTiles } from '@/engine/win-detector';

describe('화료 판정', () => {
  describe('일반형 (4면자 + 1작두)', () => {
    it('기본 화료: 4순자 + 1작두 (평화)', () => {
      // 1-2-3만, 4-5-6만, 1-2-3통, 4-5-6통, 7-7통 머리
      const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 27];
      const results = canWin(kinds);
      expect(results.length).toBeGreaterThan(0);
      const std = results.find(r => r.type === 'standard');
      expect(std).toBeDefined();
      expect(std!.melds).toHaveLength(4);
      expect(std!.pair).toBe(27);
    });

    it('기본 화료: 4커쯔 + 1작두', () => {
      // 1만×3, 5만×3, 동×3, 중×3, 백백 머리
      const kinds = [11, 11, 11, 15, 15, 15, 41, 41, 41, 51, 51, 51, 53, 53];
      const results = canWin(kinds);
      expect(results.length).toBeGreaterThan(0);
      const std = results.find(r => r.type === 'standard');
      expect(std).toBeDefined();
      expect(std!.melds.filter(m => m.type === 'triplet')).toHaveLength(4);
    });

    it('혼합 화료: 순자 + 커쯔', () => {
      // 1-2-3만, 5-5-5통, 7-8-9삭, 동동동, 중중 머리
      const kinds = [11, 12, 13, 25, 25, 25, 37, 38, 39, 41, 41, 41, 51, 51];
      const results = canWin(kinds);
      expect(results.length).toBeGreaterThan(0);
    });

    it('부로 시 적은 장수로 화료 가능해야 한다', () => {
      // 부로 2개 → 손패 8장 (2면자+1작두)
      // 1-2-3만, 5-5-5통, 동동 머리
      const kinds = [11, 12, 13, 25, 25, 25, 41, 41];
      const results = canWin(kinds, 2);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('칠대자 (七対子)', () => {
    it('7쌍이면 화료', () => {
      const kinds = [11, 11, 15, 15, 21, 21, 25, 25, 31, 31, 41, 41, 51, 51];
      const results = canWin(kinds);
      const sevenPairs = results.find(r => r.type === 'seven-pairs');
      expect(sevenPairs).toBeDefined();
    });

    it('같은 패 4장은 칠대자가 아니다', () => {
      // 1만×4 + 나머지 5쌍 = 14장이지만 1만이 4장이므로 불가
      const kinds = [11, 11, 11, 11, 15, 15, 21, 21, 25, 25, 31, 31, 41, 41];
      const results = canWin(kinds);
      const sevenPairs = results.find(r => r.type === 'seven-pairs');
      expect(sevenPairs).toBeUndefined();
    });
  });

  describe('십삼요 (十三幺)', () => {
    it('13종 요구패 + 1중복이면 화료', () => {
      const kinds = [11, 19, 21, 29, 31, 39, 41, 42, 43, 44, 51, 52, 53, 11];
      kinds.sort((a, b) => a - b);
      const results = canWin(kinds);
      const thirteen = results.find(r => r.type === 'thirteen-orphans');
      expect(thirteen).toBeDefined();
    });

    it('요구패가 빠지면 십삼요 불가', () => {
      // 백(53) 대신 2만(12) → 불가
      const kinds = [11, 19, 21, 29, 31, 39, 41, 42, 43, 44, 51, 52, 12, 11];
      kinds.sort((a, b) => a - b);
      const results = canWin(kinds);
      const thirteen = results.find(r => r.type === 'thirteen-orphans');
      expect(thirteen).toBeUndefined();
    });
  });

  describe('비화료 케이스', () => {
    it('13장은 화료가 아니다', () => {
      const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27];
      const results = canWin(kinds);
      expect(results).toHaveLength(0);
    });

    it('면자가 안 맞는 14장은 화료가 아니다', () => {
      // 불완전한 조합
      const kinds = [11, 12, 14, 15, 17, 18, 21, 22, 24, 25, 27, 28, 31, 31];
      const results = canWin(kinds);
      expect(results).toHaveLength(0);
    });
  });

  describe('텐파이(대기) 판정', () => {
    it('1장으로 화료 가능하면 텐파이', () => {
      // 1-2-3만, 4-5-6만, 1-2-3통, 4-5-6통, 7통 → 7통 대기
      const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27];
      expect(isTenpai(kinds)).toBe(true);
    });

    it('대기패 목록이 정확해야 한다', () => {
      // 위와 같은 패: 7통(27) 대기
      const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27];
      const waiting = getWaitingTiles(kinds);
      expect(waiting).toContain(27);
    });

    it('양면대기: 대기패가 2개', () => {
      // 1-2-3만, 4-5-6만, 7-8-9만, 2-3통, 동동 → 1통 또는 4통 대기
      const kinds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 23, 41, 41];
      const waiting = getWaitingTiles(kinds);
      expect(waiting).toContain(21); // 1통
      expect(waiting).toContain(24); // 4통
    });

    it('텐파이가 아닌 경우', () => {
      // 전혀 맞지 않는 패
      const kinds = [11, 13, 15, 17, 21, 23, 25, 27, 31, 33, 35, 37, 41];
      expect(isTenpai(kinds)).toBe(false);
    });
  });
});
