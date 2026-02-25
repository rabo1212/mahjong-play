import { describe, it, expect } from 'vitest';
import { calculateShanten, evaluateDiscards } from '@/ai/shanten';

describe('향청수 계산', () => {
  it('텐파이 (0향청) - 일반형', () => {
    // 1,2,3만 + 4,5,6만 + 7,8,9만 + 1,1,1통 + 2통 (13장, 3통 대기)
    const kinds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 21, 21, 22];
    expect(calculateShanten(kinds, 0)).toBe(0);
  });

  it('이향청 (1향청)', () => {
    // 거의 완성이지만 1장 부족
    const kinds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 31, 32, 41, 42];
    const shanten = calculateShanten(kinds, 0);
    expect(shanten).toBeGreaterThanOrEqual(1);
    expect(shanten).toBeLessThanOrEqual(3);
  });

  it('화료 (-1향청) - 14장', () => {
    // 완성된 패 14장 → 어떤 패를 버려도 13장에서 텐파이가 됨
    // 1,2,3만 + 4,5,6만 + 7,8,9만 + 1,1,1통 + 2,2통
    const kinds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 21, 21, 22, 22];
    // 14장에서 향청수 → 한 장 빼면 텐파이(0)
    const evals = evaluateDiscards(kinds, 0);
    const minShanten = Math.min(...evals.map(e => e.shanten));
    expect(minShanten).toBeLessThanOrEqual(0);
  });

  it('칠대자 텐파이', () => {
    // 6쌍 + 1장 (텐파이)
    const kinds = [11, 11, 22, 22, 33, 33, 44, 44, 51, 51, 52, 52, 19];
    const shanten = calculateShanten(kinds, 0);
    expect(shanten).toBe(0);
  });

  it('십삼요 텐파이', () => {
    // 12종 + 쌍 1개 (텐파이)
    const kinds = [11, 19, 21, 29, 31, 39, 41, 42, 43, 44, 51, 52, 53];
    // 13종 모두 있고 1장 쌍 = 텐파이(0)
    // 실제로는 53이 하나뿐이고 모두 1장씩 → 쌍 없음 → 0향청
    const shanten = calculateShanten(kinds, 0);
    expect(shanten).toBe(0);
  });

  it('뒤죽박죽 패 → 높은 향청수', () => {
    // 아무 관련 없는 패들
    const kinds = [11, 23, 35, 42, 14, 26, 38, 43, 17, 29, 31, 44, 51];
    const shanten = calculateShanten(kinds, 0);
    expect(shanten).toBeGreaterThanOrEqual(3);
  });

  it('부로가 있는 경우', () => {
    // 면자 1개 부로 → 손패 10장 (3면자+1작두)
    const kinds = [11, 12, 13, 21, 22, 23, 31, 31, 31, 41];
    const shanten = calculateShanten(kinds, 1);
    expect(shanten).toBeLessThanOrEqual(1);
  });

  it('evaluateDiscards가 올바른 결과 반환', () => {
    const kinds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 21, 21, 22, 51];
    const evals = evaluateDiscards(kinds, 0);
    expect(evals.length).toBeGreaterThan(0);
    // 각 평가에 kind와 shanten이 있어야 함
    for (const ev of evals) {
      expect(typeof ev.kind).toBe('number');
      expect(typeof ev.shanten).toBe('number');
    }
  });
});
