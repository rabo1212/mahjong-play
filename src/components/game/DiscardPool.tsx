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
      {discards.map((tileId) => (
        <div key={tileId} className={tileId === lastDiscard ? 'last-discard animate-tile-enter' : ''}>
          <TileComponent
            tileId={tileId}
            size={tileSize}
            highlighted={tileId === lastDiscard}
          />
        </div>
      ))}
    </div>
  );
}
