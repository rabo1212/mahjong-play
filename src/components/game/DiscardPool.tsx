'use client';

import React from 'react';
import { TileId } from '@/engine/types';
import TileComponent from './TileComponent';
import { useIsMobile } from '@/hooks/useIsMobile';

interface DiscardPoolProps {
  discards: TileId[];
  lastDiscard: TileId | null;
  position: 'bottom' | 'top' | 'left' | 'right';
}

export default function DiscardPool({ discards, lastDiscard, position }: DiscardPoolProps) {
  const isVertical = position === 'left' || position === 'right';
  const isMobile = useIsMobile();
  const tileSize = isMobile ? 'xs' : 'sm';

  // xs: 26px, sm: 32px — gap 2px 포함하여 maxWidth 계산
  const maxWidth = isVertical
    ? (isMobile ? 84 : 105)   // 3열: 26×3+6=84 / 32×3+9=105
    : (isMobile ? 164 : 204); // 6열: 26×6+12=164 / 32×6+12=204

  // 최근 3장은 미세 강조
  const recentStart = Math.max(0, discards.length - 3);

  return (
    <div
      className={`grid gap-[2px] ${
        isVertical
          ? 'grid-cols-3 auto-rows-min'
          : 'grid-cols-6 auto-rows-min'
      }`}
      style={{ maxWidth }}
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
