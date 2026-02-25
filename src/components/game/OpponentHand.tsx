'use client';

import React from 'react';
import { PlayerState } from '@/engine/types';
import TileComponent from './TileComponent';

interface OpponentHandProps {
  player: PlayerState;
  position: 'top' | 'left' | 'right';
}

export default function OpponentHand({ player, position }: OpponentHandProps) {
  const tileCount = player.hand.length + (player.drawnTile !== null ? 1 : 0);

  // 뒷면 타일 더미용 가짜 ID들
  const dummyIds = Array.from({ length: tileCount }, (_, i) => player.hand[i] ?? player.drawnTile ?? 0);

  if (position === 'top') {
    return (
      <div className="flex items-start justify-center gap-[1px]">
        {dummyIds.map((id, i) => (
          <TileComponent
            key={i}
            tileId={id}
            size="sm"
            faceDown
            rotate={180}
          />
        ))}
      </div>
    );
  }

  if (position === 'left') {
    return (
      <div className="flex flex-col items-start justify-center gap-[1px]">
        {dummyIds.map((id, i) => (
          <TileComponent
            key={i}
            tileId={id}
            size="sm"
            faceDown
          />
        ))}
      </div>
    );
  }

  // right
  return (
    <div className="flex flex-col items-end justify-center gap-[1px]">
      {dummyIds.map((id, i) => (
        <TileComponent
          key={i}
          tileId={id}
          size="sm"
          faceDown
        />
      ))}
    </div>
  );
}
