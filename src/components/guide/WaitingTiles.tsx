'use client';

import React from 'react';
import { TileId } from '@/engine/types';
import { toKinds } from '@/engine/tiles';
import { getWaitingTiles, isTenpai } from '@/engine/win-detector';
import { getTileDisplayInfo } from '@/lib/tile-display';

interface WaitingTilesProps {
  hand: TileId[];
  drawnTile: TileId | null;
  meldCount: number;
}

export default function WaitingTiles({ hand, meldCount }: WaitingTilesProps) {
  // 13장 손패 (drawnTile 제외)로 대기패 계산
  const handKinds = toKinds(hand);

  if (!isTenpai(handKinds, meldCount)) return null;

  const waiting = getWaitingTiles(handKinds, meldCount);
  if (waiting.length === 0) return null;

  const MAX_DISPLAY = 8;
  const shown = waiting.slice(0, MAX_DISPLAY);
  const overflow = waiting.length - MAX_DISPLAY;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20">
      <span className="text-[10px] text-gold font-display whitespace-nowrap">대기</span>
      <div className="flex gap-1">
        {shown.map(kind => {
          const info = getTileDisplayInfo(kind);
          return (
            <div
              key={kind}
              className="inline-flex items-center justify-center rounded
                bg-tile-face/90 border border-tile-shadow/30
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
        {overflow > 0 && (
          <span className="text-[10px] text-gold font-display self-center">
            +{overflow}
          </span>
        )}
      </div>
      <span className="text-[10px] text-text-muted">
        {waiting.length}종
      </span>
    </div>
  );
}
