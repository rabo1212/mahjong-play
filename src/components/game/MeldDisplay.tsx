'use client';

import React from 'react';
import { Meld } from '@/engine/types';
import TileComponent from './TileComponent';

interface MeldDisplayProps {
  melds: Meld[];
  position: 'bottom' | 'top' | 'left' | 'right';
}

export default function MeldDisplay({ melds, position }: MeldDisplayProps) {
  if (melds.length === 0) return null;

  const isVertical = position === 'left' || position === 'right';

  return (
    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-2`}>
      {melds.map((meld, idx) => (
        <div
          key={idx}
          className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-[1px] items-end`}
        >
          {meld.tileIds.map((tileId) => (
            <TileComponent
              key={tileId}
              tileId={tileId}
              size="sm"
              highlighted={tileId === meld.calledTileId}
              rotate={tileId === meld.calledTileId ? 90 : 0}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
