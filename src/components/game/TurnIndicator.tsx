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

/** 총 벽 타일 수 (144 - 배패 52 - 꽃대체분 등 ≈ 약 70~84장, 초기값으로 비율 계산) */
const INITIAL_WALL = 83;

function SeatLabel({ idx, turnIndex }: { idx: number; turnIndex: number }) {
  const isActive = turnIndex === idx;
  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <div className="absolute inset-0 rounded-full bg-gold/20 animate-pulse-gold" />
      )}
      <span className={`relative text-[10px] sm:text-xs font-tile transition-colors ${
        isActive ? 'text-gold font-bold' : 'text-text-muted'
      }`}>
        {SEAT_LABELS[idx]}
      </span>
    </div>
  );
}

export default function TurnIndicator({
  roundWind,
  turnIndex,
  wallCount,
}: TurnIndicatorProps) {
  const progress = Math.max(0, Math.min(100, (wallCount / INITIAL_WALL) * 100));

  return (
    <div className="table-center w-[72px] h-[72px] sm:w-[100px] sm:h-[100px] rounded-lg flex flex-col items-center justify-center
      bg-gradient-to-br from-[#0D3B20] to-[#0A2816]
      border border-gold/20 shadow-panel select-none">

      {/* 상 (대면) */}
      <SeatLabel idx={2} turnIndex={turnIndex} />

      {/* 좌 / 중앙 / 우 */}
      <div className="flex items-center gap-2 sm:gap-3">
        <SeatLabel idx={3} turnIndex={turnIndex} />
        <div className="flex flex-col items-center">
          <span className="text-base sm:text-lg font-tile text-gold font-bold">
            {WIND_CHARS[roundWind]}
          </span>
          <span className="text-[9px] sm:text-[10px] font-display text-text-secondary tabular-nums">
            {wallCount}
          </span>
        </div>
        <SeatLabel idx={1} turnIndex={turnIndex} />
      </div>

      {/* 하 (나) */}
      <SeatLabel idx={0} turnIndex={turnIndex} />

      {/* 벽 진행률 바 */}
      <div className="absolute bottom-[3px] left-2 right-2 h-[2px] sm:h-[3px] bg-black/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: progress > 30
              ? 'linear-gradient(90deg, var(--gold-dark), var(--gold))'
              : 'linear-gradient(90deg, var(--action-danger), var(--gold-dark))',
          }}
        />
      </div>
    </div>
  );
}
