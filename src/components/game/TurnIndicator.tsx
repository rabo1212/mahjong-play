'use client';

import React, { useState, useEffect } from 'react';
import { TileKind } from '@/engine/types';

interface TurnIndicatorProps {
  roundWind: TileKind;
  turnIndex: number;
  wallCount: number;
  turnCount: number;
  /** 현재 국 번호 (0~3, 동1국~동4국) */
  currentRound?: number;
  /** 온라인 대국: 턴 마감 시각 (ms timestamp) */
  turnDeadline?: number | null;
  /** 타이머 만료 시 콜백 */
  onTimeout?: () => void;
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
  currentRound,
  turnDeadline,
  onTimeout,
}: TurnIndicatorProps) {
  const progress = Math.max(0, Math.min(100, (wallCount / INITIAL_WALL) * 100));

  // 국번호 라벨 (東1局~東4局)
  const windChar = WIND_CHARS[roundWind] || '東';
  const roundLabel = currentRound !== undefined
    ? `${windChar}${currentRound + 1}局`
    : windChar;

  // 카운트다운 타이머
  const [remaining, setRemaining] = useState<number | null>(null);
  const timeoutFiredRef = React.useRef(false);

  useEffect(() => {
    if (!turnDeadline) {
      setRemaining(null);
      timeoutFiredRef.current = false;
      return;
    }

    timeoutFiredRef.current = false;

    const tick = () => {
      const left = Math.max(0, turnDeadline - Date.now());
      setRemaining(Math.ceil(left / 1000));

      if (left <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        onTimeout?.();
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [turnDeadline, onTimeout]);

  const isUrgent = remaining !== null && remaining <= 5;

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
          {/* 타이머 표시 (deadline이 있을 때만) */}
          {remaining !== null ? (
            <span className={`text-base sm:text-lg font-display font-bold tabular-nums transition-colors ${
              isUrgent ? 'text-action-danger animate-pulse' : 'text-gold'
            }`}>
              {remaining}
            </span>
          ) : (
            <span className={`font-tile text-gold font-bold leading-tight ${
              currentRound !== undefined ? 'text-[10px] sm:text-xs' : 'text-base sm:text-lg'
            }`}>
              {roundLabel}
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] font-display text-text-secondary tabular-nums">
            {remaining !== null ? roundLabel : wallCount}
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
