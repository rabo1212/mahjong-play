'use client';

import React from 'react';
import TileComponent from './TileComponent';

interface OpponentHandProps {
  player: { hand: number[]; drawnTile: number | null };
  position: 'top' | 'left' | 'right';
}

export default function OpponentHand({ player, position }: OpponentHandProps) {
  const handCount = player.hand.length;
  const tileCount = handCount + (player.drawnTile !== null ? 1 : 0);

  // 뒷면 타일 더미용 가짜 ID들
  const dummyIds = Array.from({ length: tileCount }, (_, i) => player.hand[i] ?? player.drawnTile ?? 0);

  const badge = (
    <span className="text-[9px] font-display text-text-muted bg-panel/60 px-1.5 py-0.5 rounded-full tabular-nums">
      {tileCount}
    </span>
  );

  if (position === 'top') {
    return (
      <div className="flex items-start justify-center gap-[1px] relative">
        {dummyIds.map((id, i) => (
          <TileComponent
            key={i}
            tileId={id}
            size="sm"
            faceDown
            rotate={180}
          />
        ))}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">{badge}</div>
      </div>
    );
  }

  if (position === 'left') {
    return (
      <div className="flex flex-col items-start justify-center gap-[1px] relative">
        {dummyIds.map((id, i) => (
          <TileComponent
            key={i}
            tileId={id}
            size="sm"
            faceDown
          />
        ))}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2">{badge}</div>
      </div>
    );
  }

  // right
  return (
    <div className="flex flex-col items-end justify-center gap-[1px] relative">
      {dummyIds.map((id, i) => (
        <TileComponent
          key={i}
          tileId={id}
          size="sm"
          faceDown
        />
      ))}
      <div className="absolute -left-4 top-1/2 -translate-y-1/2">{badge}</div>
    </div>
  );
}
