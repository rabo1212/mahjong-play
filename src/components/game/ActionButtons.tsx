'use client';

import React from 'react';
import { PendingAction, TileKind } from '@/engine/types';

interface ActionButtonsProps {
  // 액션 대기 중 표시할 버튼들
  playerActions: PendingAction[];
  canTsumo: boolean;
  ankanOptions: TileKind[];
  kakanOptions: number[];
  isMyTurn: boolean;
  phase: string;
  onAction: (action: string, tiles?: number[]) => void;
  onSkip: () => void;
}

export default function ActionButtons({
  playerActions,
  canTsumo,
  ankanOptions,
  kakanOptions,
  isMyTurn,
  phase,
  onAction,
  onSkip,
}: ActionButtonsProps) {
  const hasChi = playerActions.some(a => a.action === 'chi');
  const hasPon = playerActions.some(a => a.action === 'pon');
  const hasKan = playerActions.some(a => a.action === 'kan');
  const hasRon = playerActions.some(a => a.action === 'win');
  const chiAction = playerActions.find(a => a.action === 'chi');

  const showActionBar = phase === 'action-pending' && playerActions.length > 0;
  const showTsumoBar = phase === 'discard' && isMyTurn && (canTsumo || ankanOptions.length > 0 || kakanOptions.length > 0);

  if (!showActionBar && !showTsumoBar) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3 animate-fade-in">
      {/* 상대 버린 패에 대한 액션 */}
      {showActionBar && (
        <>
          {/* 부로 그룹 */}
          {(hasChi || hasPon || hasKan) && (
            <div className="flex gap-2 px-2 py-1 rounded-lg bg-panel-light/40 border border-white/5">
              {hasChi && (
                <button
                  className="action-btn action-btn-chi"
                  onClick={() => onAction('chi', chiAction?.tiles)}
                >
                  치 <span className="font-tile text-[17px]">吃</span>
                </button>
              )}
              {hasPon && (
                <button
                  className="action-btn action-btn-pon"
                  onClick={() => onAction('pon')}
                >
                  펑 <span className="font-tile text-[17px]">碰</span>
                </button>
              )}
              {hasKan && (
                <button
                  className="action-btn action-btn-kan"
                  onClick={() => onAction('kan')}
                >
                  깡 <span className="font-tile text-[17px]">杠</span>
                </button>
              )}
            </div>
          )}
          {/* 화료 (분리) */}
          {hasRon && (
            <button
              className="action-btn action-btn-win"
              onClick={() => onAction('win')}
            >
              화료 <span className="font-tile text-[17px]">和</span>
            </button>
          )}
          <button
            className="action-btn action-btn-pass"
            onClick={onSkip}
          >
            패스
          </button>
        </>
      )}

      {/* 내 턴에 쯔모/암깡 */}
      {showTsumoBar && (
        <>
          {canTsumo && (
            <button
              className="action-btn action-btn-win"
              onClick={() => onAction('win')}
            >
              쯔모 <span className="font-tile text-[17px]">自摸</span>
            </button>
          )}
          {ankanOptions.map(kind => (
            <button
              key={`ankan-${kind}`}
              className="action-btn action-btn-kan"
              onClick={() => onAction('ankan', [kind])}
            >
              암깡 <span className="font-tile text-[17px]">暗杠</span>
            </button>
          ))}
          {kakanOptions.map(idx => (
            <button
              key={`kakan-${idx}`}
              className="action-btn action-btn-kan"
              onClick={() => onAction('kakan', [idx])}
            >
              가깡 <span className="font-tile text-[17px]">加杠</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
