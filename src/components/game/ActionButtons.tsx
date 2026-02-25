'use client';

import React from 'react';
import { PendingAction, TileKind } from '@/engine/types';

interface ActionButtonsProps {
  // 액션 대기 중 표시할 버튼들
  playerActions: PendingAction[];
  canTsumo: boolean;
  ankanOptions: TileKind[];
  isMyTurn: boolean;
  phase: string;
  onAction: (action: string, tiles?: number[]) => void;
  onSkip: () => void;
}

export default function ActionButtons({
  playerActions,
  canTsumo,
  ankanOptions,
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
  const showTsumoBar = phase === 'discard' && isMyTurn && (canTsumo || ankanOptions.length > 0);

  if (!showActionBar && !showTsumoBar) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-3 animate-fade-in">
      {/* 상대 버린 패에 대한 액션 */}
      {showActionBar && (
        <>
          {hasChi && (
            <button
              className="action-btn action-btn-chi"
              onClick={() => onAction('chi', chiAction?.tiles)}
            >
              치 吃
            </button>
          )}
          {hasPon && (
            <button
              className="action-btn action-btn-pon"
              onClick={() => onAction('pon')}
            >
              펑 碰
            </button>
          )}
          {hasKan && (
            <button
              className="action-btn action-btn-kan"
              onClick={() => onAction('kan')}
            >
              깡 杠
            </button>
          )}
          {hasRon && (
            <button
              className="action-btn action-btn-win"
              onClick={() => onAction('win')}
            >
              화료 和
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
              쯔모 自摸
            </button>
          )}
          {ankanOptions.map(kind => (
            <button
              key={kind}
              className="action-btn action-btn-kan"
              onClick={() => onAction('ankan', [kind])}
            >
              암깡 暗杠
            </button>
          ))}
        </>
      )}
    </div>
  );
}
