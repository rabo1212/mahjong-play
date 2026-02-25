'use client';

import React from 'react';
import { TileKind } from '@/engine/types';

interface TurnIndicatorProps {
  roundWind: TileKind;
  turnIndex: number;
  wallCount: number;
  turnCount: number;
}

const WIND_CHARS: Record<number, string> = { 41: '東', 42: '南', 43: '西', 44: '北' };
const SEAT_LABELS = ['東', '南', '西', '北'];

export default function TurnIndicator({
  roundWind,
  turnIndex,
  wallCount,
}: TurnIndicatorProps) {
  return (
    <div className="table-center w-[72px] h-[72px] sm:w-[100px] sm:h-[100px] rounded-lg flex flex-col items-center justify-center
      bg-gradient-to-br from-[#0D3B20] to-[#0A2816]
      border border-gold/20 shadow-panel select-none">

      {/* 상 (대면) */}
      <div className={`text-[10px] sm:text-xs font-tile ${turnIndex === 2 ? 'text-gold' : 'text-text-muted'}`}>
        {SEAT_LABELS[2]}
      </div>

      {/* 좌 / 중앙 / 우 */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`text-[10px] sm:text-xs font-tile ${turnIndex === 3 ? 'text-gold' : 'text-text-muted'}`}>
          {SEAT_LABELS[3]}
        </span>
        <div className="flex flex-col items-center">
          <span className="text-base sm:text-lg font-tile text-gold font-bold">
            {WIND_CHARS[roundWind]}
          </span>
          <span className="text-[9px] sm:text-[10px] font-display text-text-secondary tabular-nums">
            {wallCount}
          </span>
        </div>
        <span className={`text-[10px] sm:text-xs font-tile ${turnIndex === 1 ? 'text-gold' : 'text-text-muted'}`}>
          {SEAT_LABELS[1]}
        </span>
      </div>

      {/* 하 (나) */}
      <div className={`text-[10px] sm:text-xs font-tile ${turnIndex === 0 ? 'text-gold' : 'text-text-muted'}`}>
        {SEAT_LABELS[0]}
      </div>
    </div>
  );
}
