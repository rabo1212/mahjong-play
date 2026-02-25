'use client';

import React, { useMemo } from 'react';
import { TileId } from '@/engine/types';
import { toKinds } from '@/engine/tiles';
import { calculateShanten } from '@/ai/shanten';

interface ShantenDisplayProps {
  hand: TileId[];
  drawnTile: TileId | null;
  meldCount: number;
}

const SHANTEN_LABELS: Record<number, { text: string; color: string }> = {
  [-1]: { text: '화료!', color: 'text-gold' },
  0: { text: '텐파이', color: 'text-action-success' },
  1: { text: '이향청', color: 'text-action-blue' },
  2: { text: '삼향청', color: 'text-text-secondary' },
};

export default function ShantenDisplay({ hand, drawnTile, meldCount }: ShantenDisplayProps) {
  const shanten = useMemo(() => {
    const kinds = drawnTile !== null
      ? toKinds([...hand, drawnTile])
      : toKinds(hand);

    // 14장이면 버림 전 상태 → 13장으로 계산하기 위해 최소 향청수 찾기
    if (drawnTile !== null) {
      // 14장 중 가장 좋은 13장의 향청수
      let best = 99;
      for (let i = 0; i < kinds.length; i++) {
        const remaining = [...kinds];
        remaining.splice(i, 1);
        best = Math.min(best, calculateShanten(remaining, meldCount));
      }
      return best;
    }

    return calculateShanten(kinds, meldCount);
  }, [hand, drawnTile, meldCount]);

  const label = SHANTEN_LABELS[shanten] ?? {
    text: `${shanten}향청`,
    color: 'text-text-muted',
  };

  return (
    <div className={`text-[10px] font-display ${label.color} px-2 py-0.5 rounded-full bg-panel/60`}>
      {label.text}
    </div>
  );
}
