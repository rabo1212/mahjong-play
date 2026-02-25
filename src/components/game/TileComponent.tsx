'use client';

import React from 'react';
import { TileId } from '@/engine/types';
import { getTile } from '@/engine/tiles';
import { getTileDisplayInfo } from '@/lib/tile-display';

interface TileProps {
  tileId: TileId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  interactive?: boolean;
  onClick?: (tileId: TileId) => void;
  className?: string;
  rotate?: 0 | 90 | 180 | 270;
}

const SIZES = {
  xs: { w: 26, h: 36, mainFont: 14, suitFont: 8, backFont: 12 },
  sm: { w: 32, h: 45, mainFont: 17, suitFont: 10, backFont: 14 },
  md: { w: 40, h: 56, mainFont: 22, suitFont: 12, backFont: 18 },
  lg: { w: 52, h: 73, mainFont: 28, suitFont: 15, backFont: 22 },
};

export default function TileComponent({
  tileId,
  size = 'md',
  faceDown = false,
  selected = false,
  highlighted = false,
  interactive = false,
  onClick,
  className = '',
  rotate = 0,
}: TileProps) {
  const s = SIZES[size];
  const rotateStyle = rotate !== 0 ? { transform: `rotate(${rotate}deg)` } : {};

  // faceDown이면 getTile 호출 불필요 (온라인 모드에서 -1 마스킹 패 방어)
  if (faceDown) {
    return (
      <div
        className={`mahjong-tile-back flex-shrink-0 ${className}`}
        style={{
          width: s.w,
          height: s.h,
          fontSize: s.backFont,
          ...rotateStyle,
        }}
      />
    );
  }

  const tile = getTile(tileId);
  const display = getTileDisplayInfo(tile.kind);

  return (
    <div
      className={`
        mahjong-tile flex-shrink-0 flex flex-col items-center justify-center
        ${selected ? 'selected' : ''}
        ${interactive ? 'cursor-pointer' : ''}
        ${highlighted ? 'ring-2 ring-action-success ring-opacity-60' : ''}
        ${className}
      `}
      style={{
        width: s.w,
        height: s.h,
        ...rotateStyle,
      }}
      onClick={interactive && onClick ? () => onClick(tileId) : undefined}
    >
      {display.isBlank ? (
        // 백판: 빈 사각형
        <div
          className="tile-char-dragon-white"
          style={{
            width: s.w * 0.5,
            height: s.h * 0.35,
          }}
        />
      ) : (
        <>
          {/* 메인 문자 */}
          <span
            className={`tile-char ${display.colorClass} leading-none`}
            style={{
              fontSize: (display.suitType === 'dragon-red' || display.suitType === 'dragon-green')
                ? s.mainFont * 1.3
                : s.mainFont,
            }}
          >
            {display.mainChar}
          </span>
          {/* 수트 표시 */}
          {display.suitChar && (
            <span
              className={`tile-suit-label ${display.colorClass} leading-none mt-0.5`}
              style={{ fontSize: s.suitFont }}
            >
              {display.suitChar}
            </span>
          )}
        </>
      )}
    </div>
  );
}
