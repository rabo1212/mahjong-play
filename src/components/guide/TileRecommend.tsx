'use client';

import React, { useMemo } from 'react';
import { TileId } from '@/engine/types';
import { toKinds } from '@/engine/tiles';
import { evaluateDiscards } from '@/ai/shanten';
import { getTileDisplayInfo } from '@/lib/tile-display';

interface TileRecommendProps {
  hand: TileId[];
  drawnTile: TileId | null;
  meldCount: number;
  isMyTurn: boolean;
  phase: string;
}

export default function TileRecommend({
  hand,
  drawnTile,
  meldCount,
  isMyTurn,
  phase,
}: TileRecommendProps) {
  const recommendations = useMemo(() => {
    if (!isMyTurn || phase !== 'discard' || drawnTile === null) return [];

    const allTileIds = [...hand, drawnTile];
    const kinds = toKinds(allTileIds);
    const evals = evaluateDiscards(kinds, meldCount);

    // 향청수 정렬 (낮을수록 좋음)
    evals.sort((a, b) => a.shanten - b.shanten);
    if (evals.length === 0) return [];

    const bestShanten = evals[0].shanten;

    // 최적 버림패 kind 목록
    return evals
      .filter(e => e.shanten === bestShanten)
      .map(e => e.kind);
  }, [hand, drawnTile, meldCount, isMyTurn, phase]);

  if (recommendations.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-action-chi/10 border border-action-chi/20">
      <span className="text-[10px] text-action-chi font-display whitespace-nowrap">추천</span>
      <div className="flex gap-1">
        {recommendations.slice(0, 5).map(kind => {
          const info = getTileDisplayInfo(kind);
          return (
            <div
              key={kind}
              className="inline-flex items-center justify-center rounded
                bg-tile-face/90 border border-action-chi/30
                min-w-[20px] h-[26px] px-1"
            >
              <span className={`text-xs font-tile font-bold ${info.colorClass}`}>
                {info.mainChar}
              </span>
              {info.suitChar && (
                <span className={`text-[8px] font-tile ${info.colorClass} ml-0.5`}>
                  {info.suitChar}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <span className="text-[10px] text-text-muted">
        버리기
      </span>
    </div>
  );
}
