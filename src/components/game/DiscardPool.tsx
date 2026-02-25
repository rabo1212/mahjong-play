'use client';

import React from 'react';
import { TileId } from '@/engine/types';
import TileComponent from './TileComponent';

interface DiscardPoolProps {
  discards: TileId[];
  lastDiscard: TileId | null;
  position: 'bottom' | 'top' | 'left' | 'right';
}

export default function DiscardPool({ discards, lastDiscard, position }: DiscardPoolProps) {
  const isVertical = position === 'left' || position === 'right';
  const tileSize = 'sm';

  // 최근 3장은 미세 강조
  const recentStart = Math.max(0, discards.length - 3);

  return (
    <div
      className={`grid gap-[2px] ${
        isVertical
          ? 'grid-cols-3 auto-rows-min'
          : 'grid-cols-6 auto-rows-min'
      }`}
      style={{
        maxWidth: isVertical ? 105 : 204,
      }}
    >
      {discards.map((tileId, idx) => {
        const isLast = tileId === lastDiscard;
        const isRecent = idx >= recentStart && !isLast;
        return (
          <div key={tileId} className={`${isLast ? 'last-discard animate-tile-enter' : ''} ${isRecent ? 'opacity-95' : idx < recentStart ? 'opacity-70' : ''}`}>
            <TileComponent
              tileId={tileId}
              size={tileSize}
              highlighted={isLast}
            />
          </div>
        );
      })}
    </div>
  );
}
