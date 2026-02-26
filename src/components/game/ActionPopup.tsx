'use client';

import React, { useState, useEffect } from 'react';

interface ActionPopupProps {
  action: string | null;  // 'chi' | 'pon' | 'kan' | 'win' | null
  playerId: number;       // 누가 액션을 했는지
}

const ACTION_LABELS: Record<string, { text: string; color: string }> = {
  chi: { text: '치!', color: 'text-action-blue' },
  pon: { text: '퐁!', color: 'text-action-success' },
  kan: { text: '깡!', color: 'text-action-blue' },
  win: { text: '화료!', color: 'text-gold' },
};

/** 플레이어 인덱스에 따른 팝업 위치 (모바일 대응) */
const POSITIONS: Record<number, string> = {
  0: 'bottom-20 sm:bottom-28 left-1/2 -translate-x-1/2',
  1: 'right-8 sm:right-16 top-1/2 -translate-y-1/2',
  2: 'top-10 sm:top-16 left-1/2 -translate-x-1/2',
  3: 'left-8 sm:left-16 top-1/2 -translate-y-1/2',
};

export default function ActionPopup({ action, playerId }: ActionPopupProps) {
  const [visible, setVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);

  useEffect(() => {
    if (action) {
      setCurrentAction(action);
      setCurrentPlayer(playerId);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [action, playerId]);

  if (!visible || !currentAction) return null;

  const label = ACTION_LABELS[currentAction];
  if (!label) return null;

  return (
    <div className={`absolute ${POSITIONS[currentPlayer]} z-30 pointer-events-none`}>
      <span className={`action-popup text-2xl sm:text-4xl font-tile font-bold ${label.color}`}
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
        {label.text}
      </span>
    </div>
  );
}
