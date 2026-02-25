import { describe, it, expect } from 'vitest';
import {
  createAllTiles, createFullTileIds, shuffleTiles, getTile,
  kindToSuit, kindToNumber, isSuited, isHonor, isTerminal, isFlower,
  buildKindCounts, toKinds, sortByKind,
} from '@/engine/tiles';

describe('타일 시스템', () => {
  it('144장 타일이 생성되어야 한다', () => {
    const tiles = createAllTiles();
    expect(tiles).toHaveLength(144);
  });

  it('모든 타일 ID가 0~143으로 고유해야 한다', () => {
    const tiles = createAllTiles();
    const ids = tiles.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(144);
    expect(Math.min(...ids)).toBe(0);
    expect(Math.max(...ids)).toBe(143);
  });

  it('수패는 각 종류별 4장씩이어야 한다', () => {
    const tiles = createAllTiles();
    // 만수 1~9 각 4장
    for (let n = 1; n <= 9; n++) {
      const kind = 10 + n;
      const count = tiles.filter(t => t.kind === kind).length;
      expect(count).toBe(4);
    }
    // 통수
    for (let n = 1; n <= 9; n++) {
      const kind = 20 + n;
      const count = tiles.filter(t => t.kind === kind).length;
      expect(count).toBe(4);
    }
    // 삭수
    for (let n = 1; n <= 9; n++) {
      const kind = 30 + n;
      const count = tiles.filter(t => t.kind === kind).length;
      expect(count).toBe(4);
    }
  });

  it('풍패는 각 4장, 삼원패는 각 4장이어야 한다', () => {
    const tiles = createAllTiles();
    for (const kind of [41, 42, 43, 44, 51, 52, 53]) {
      const count = tiles.filter(t => t.kind === kind).length;
      expect(count).toBe(4);
    }
  });

  it('화패는 각 1장씩 8장이어야 한다', () => {
    const tiles = createAllTiles();
    const flowers = tiles.filter(t => t.suit === 'flower');
    expect(flowers).toHaveLength(8);
    for (let n = 61; n <= 68; n++) {
      const count = tiles.filter(t => t.kind === n).length;
      expect(count).toBe(1);
    }
  });

  it('셔플 후 중복 없이 144장이어야 한다', () => {
    const ids = createFullTileIds();
    const shuffled = shuffleTiles(ids);
    expect(shuffled).toHaveLength(144);
    expect(new Set(shuffled).size).toBe(144);
  });

  it('셔플은 원본을 변경하지 않아야 한다', () => {
    const ids = createFullTileIds();
    const original = [...ids];
    shuffleTiles(ids);
    expect(ids).toEqual(original);
  });

  it('kindToSuit가 올바르게 변환되어야 한다', () => {
    expect(kindToSuit(11)).toBe('wan');
    expect(kindToSuit(25)).toBe('pin');
    expect(kindToSuit(39)).toBe('sou');
    expect(kindToSuit(41)).toBe('wind');
    expect(kindToSuit(53)).toBe('dragon');
    expect(kindToSuit(65)).toBe('flower');
  });

  it('kindToNumber가 올바르게 변환되어야 한다', () => {
    expect(kindToNumber(11)).toBe(1);
    expect(kindToNumber(19)).toBe(9);
    expect(kindToNumber(25)).toBe(5);
  });

  it('isSuited/isHonor/isTerminal/isFlower가 올바르게 판별되어야 한다', () => {
    expect(isSuited(15)).toBe(true);
    expect(isSuited(41)).toBe(false);
    expect(isHonor(41)).toBe(true);
    expect(isHonor(51)).toBe(true);
    expect(isHonor(15)).toBe(false);
    expect(isTerminal(11)).toBe(true);
    expect(isTerminal(19)).toBe(true);
    expect(isTerminal(15)).toBe(false);
    expect(isFlower(65)).toBe(true);
    expect(isFlower(41)).toBe(false);
  });

  it('buildKindCounts가 올바르게 카운트해야 한다', () => {
    const counts = buildKindCounts([11, 11, 11, 12, 12, 15]);
    expect(counts[11]).toBe(3);
    expect(counts[12]).toBe(2);
    expect(counts[15]).toBe(1);
    expect(counts[13]).toBe(0);
  });

  it('sortByKind가 kind 순으로 정렬해야 한다', () => {
    const tiles = createAllTiles();
    // 임의 순서로 타일 ID 모으기 (9삭, 1만, 동)
    const ids = [
      tiles.find(t => t.kind === 39)!.id,
      tiles.find(t => t.kind === 11)!.id,
      tiles.find(t => t.kind === 41)!.id,
    ];
    const sorted = sortByKind(ids);
    const sortedKinds = sorted.map(id => getTile(id).kind);
    expect(sortedKinds).toEqual([11, 39, 41]);
  });
});
