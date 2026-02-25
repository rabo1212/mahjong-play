'use client';

import React from 'react';
import { TileId } from '@/engine/types';
import TileComponent from './TileComponent';

interface PlayerHandProps {
  hand: TileId[];
  drawnTile: TileId | null;
  selectedTile: TileId | null;
  onTileClick: (tileId: TileId) => void;
  interactive: boolean;
}

export default function PlayerHand({
  hand,
  drawnTile,
  selectedTile,
  onTileClick,
  interactive,
}: PlayerHandProps) {
  return (
    <div className="flex items-end justify-center gap-[2px]">
      {/* 손패 */}
      {hand.map((tileId) => (
        <TileComponent
          key={tileId}
          tileId={tileId}
          size="md"
          selected={selectedTile === tileId}
          interactive={interactive}
          onClick={onTileClick}
        />
      ))}

      {/* 쯔모한 패 (오른쪽에 약간 떨어져서) */}
      {drawnTile !== null && (
        <div className="ml-3">
          <TileComponent
            tileId={drawnTile}
            size="md"
            selected={selectedTile === drawnTile}
            interactive={interactive}
            onClick={onTileClick}
          />
        </div>
      )}
    </div>
  );
}
