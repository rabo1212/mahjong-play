'use client';

import React, { useEffect, useCallback } from 'react';
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
  // 키보드 단축키: 1~9,0 = 손패 선택, Enter = 버리기
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!interactive) return;

    const allTiles = drawnTile !== null ? [...hand, drawnTile] : [...hand];

    // 숫자 키 1~9, 0 → 인덱스 0~9
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      if (idx < allTiles.length) {
        onTileClick(allTiles[idx]);
      }
    } else if (e.key === '0') {
      // 0 = 마지막 패 (보통 쯔모 패)
      if (allTiles.length > 0) {
        onTileClick(allTiles[allTiles.length - 1]);
      }
    }
  }, [interactive, hand, drawnTile, onTileClick]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex items-end justify-center gap-[2px]">
      {/* 손패 */}
      {hand.map((tileId, idx) => (
        <div key={tileId} className="relative">
          <TileComponent
            tileId={tileId}
            size="md"
            selected={selectedTile === tileId}
            interactive={interactive}
            onClick={onTileClick}
          />
          {interactive && idx < 9 && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-text-muted/40 font-display">
              {idx + 1}
            </span>
          )}
        </div>
      ))}

      {/* 쯔모한 패 (오른쪽에 약간 떨어져서) */}
      {drawnTile !== null && (
        <div className="ml-3 relative">
          <TileComponent
            tileId={drawnTile}
            size="md"
            selected={selectedTile === drawnTile}
            interactive={interactive}
            onClick={onTileClick}
          />
          {interactive && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-text-muted/40 font-display">
              0
            </span>
          )}
        </div>
      )}
    </div>
  );
}
