'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PendingAction, TileKind } from '@/engine/types';
import TileComponent from './TileComponent';

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
  const [showChiPicker, setShowChiPicker] = useState(false);

  const hasChi = playerActions.some(a => a.action === 'chi');
  const hasPon = playerActions.some(a => a.action === 'pon');
  const hasKan = playerActions.some(a => a.action === 'kan');
  const hasRon = playerActions.some(a => a.action === 'win');
  const chiAction = playerActions.find(a => a.action === 'chi');
  const chiAllOptions = chiAction?.chiOptions ?? (chiAction ? [chiAction.tiles] : []);

  // 치 액션이 사라지면 팝업 닫기
  useEffect(() => {
    if (!hasChi) setShowChiPicker(false);
  }, [hasChi]);

  const handleChiClick = useCallback(() => {
    if (chiAllOptions.length <= 1) {
      onAction('chi', chiAction?.tiles);
    } else {
      setShowChiPicker(true);
    }
  }, [chiAllOptions.length, chiAction?.tiles, onAction]);

  const handleChiOptionSelect = (tiles: number[]) => {
    setShowChiPicker(false);
    onAction('chi', tiles);
  };

  const showActionBar = phase === 'action-pending' && playerActions.length > 0;
  const showTsumoBar = phase === 'discard' && isMyTurn && (canTsumo || ankanOptions.length > 0 || kakanOptions.length > 0);

  // 키보드 단축키
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();

    if (showActionBar) {
      if (key === 'c' && hasChi) { handleChiClick(); return; }
      if (key === 'p' && hasPon) { onAction('pon'); return; }
      if (key === 'k' && hasKan) { onAction('kan'); return; }
      if (key === 'w' && hasRon) { onAction('win'); return; }
      if (key === ' ' || key === 'escape') { e.preventDefault(); onSkip(); return; }
    }
    if (showTsumoBar) {
      if (key === 'w' && canTsumo) { onAction('win'); return; }
      if (key === 'k' && ankanOptions.length > 0) { onAction('ankan', [ankanOptions[0]]); return; }
    }
  }, [showActionBar, showTsumoBar, hasChi, hasPon, hasKan, hasRon, canTsumo, ankanOptions, onAction, onSkip, handleChiClick]);

  useEffect(() => {
    if (!showActionBar && !showTsumoBar) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, showActionBar, showTsumoBar]);

  if (!showActionBar && !showTsumoBar) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3 animate-fade-in">
      {/* 상대 버린 패에 대한 액션 */}
      {showActionBar && (
        <>
          {/* 부로 그룹 */}
          {(hasChi || hasPon || hasKan) && (
            <div className="relative flex gap-2 px-2 py-1 rounded-lg bg-panel-light/40 border border-white/5">
              {hasChi && (
                <button
                  className="action-btn action-btn-chi"
                  onClick={handleChiClick}
                >
                  치 <span className="font-tile text-[17px]">吃</span>
                  <span className="text-[9px] opacity-40 ml-1">C</span>
                </button>
              )}
              {hasPon && (
                <button
                  className="action-btn action-btn-pon"
                  onClick={() => onAction('pon')}
                >
                  펑 <span className="font-tile text-[17px]">碰</span>
                  <span className="text-[9px] opacity-40 ml-1">P</span>
                </button>
              )}
              {hasKan && (
                <button
                  className="action-btn action-btn-kan"
                  onClick={() => onAction('kan')}
                >
                  깡 <span className="font-tile text-[17px]">杠</span>
                  <span className="text-[9px] opacity-40 ml-1">K</span>
                </button>
              )}

              {/* 치 옵션 선택 팝업 */}
              {showChiPicker && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[60]
                  bg-panel rounded-xl border border-white/15 shadow-panel p-3
                  animate-fade-in">
                  <div className="text-[10px] text-text-muted text-center mb-2">
                    치 조합 선택
                  </div>
                  <div className="flex gap-2">
                    {chiAllOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleChiOptionSelect(option)}
                        className="flex gap-0.5 p-1.5 rounded-lg bg-white/5
                          hover:bg-white/10 border border-white/10
                          hover:border-gold/40 transition-all cursor-pointer"
                      >
                        {option.map(tileId => (
                          <TileComponent
                            key={tileId}
                            tileId={tileId}
                            size="xs"
                          />
                        ))}
                      </button>
                    ))}
                  </div>
                  <button
                    className="mt-2 w-full text-[10px] text-text-muted
                      hover:text-text-secondary transition-colors cursor-pointer"
                    onClick={() => setShowChiPicker(false)}
                  >
                    취소
                  </button>
                </div>
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
              <span className="text-[9px] opacity-40 ml-1">W</span>
            </button>
          )}
          <button
            className="action-btn action-btn-pass"
            onClick={onSkip}
          >
            패스
            <span className="text-[9px] opacity-40 ml-1">Space</span>
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
              <span className="text-[9px] opacity-40 ml-1">W</span>
            </button>
          )}
          {ankanOptions.map((kind, i) => (
            <button
              key={`ankan-${kind}`}
              className="action-btn action-btn-kan"
              onClick={() => onAction('ankan', [kind])}
            >
              암깡 <span className="font-tile text-[17px]">暗杠</span>
              {i === 0 && <span className="text-[9px] opacity-40 ml-1">K</span>}
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
