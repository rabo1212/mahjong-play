'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';

/**
 * 게임 루프 관리 훅
 * AI 턴 자동 진행, 액션 타임아웃 처리
 */
export function useGameLoop() {
  const phase = useGameStore(s => s.phase);
  const turnIndex = useGameStore(s => s.turnIndex);
  const pendingActions = useGameStore(s => s.pendingActions);
  const aiTurn = useGameStore(s => s.aiTurn);
  const aiRespondToAction = useGameStore(s => s.aiRespondToAction);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // AI 턴 자동 진행
  useEffect(() => {
    if (phase === 'game-over') {
      clearTimer();
      return;
    }

    // AI의 버리기 턴
    if (phase === 'discard' && turnIndex !== 0) {
      clearTimer();
      const delay = 500 + Math.random() * 800; // 0.5~1.3초
      timerRef.current = setTimeout(() => {
        aiTurn();
      }, delay);
    }

    // 액션 대기 중 (치/펑/깡/론)
    if (phase === 'action-pending') {
      clearTimer();
      const hasAiAction = pendingActions.some(a => a.playerId !== 0);
      if (hasAiAction) {
        timerRef.current = setTimeout(() => {
          aiRespondToAction();
        }, 300);
      }
    }

    // draw 페이즈에서 AI 쯔모
    if (phase === 'draw' && turnIndex !== 0) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        aiTurn();
      }, 300);
    }

    return () => clearTimer();
  }, [phase, turnIndex, pendingActions, aiTurn, aiRespondToAction, clearTimer]);

  return { clearTimer };
}
