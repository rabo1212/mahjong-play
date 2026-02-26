'use client';

import { create } from 'zustand';
import { GameState, Difficulty } from '@/engine/types';
import {
  GameSession,
  createSession,
  createRoundState,
  recordRoundResult,
  isSessionOver,
  getFinalRanking,
} from '@/engine/session';
import { useGameStore } from './useGameStore';

interface SessionStore {
  session: GameSession | null;

  /** 새 세션(동풍전 4국) 시작 → 1국 자동 시작 */
  startSession: (difficulty: Difficulty, beginnerMode: boolean) => void;

  /** 현재 국 결과 기록 (게임 오버 시 호출) */
  recordResult: (gameState: GameState) => void;

  /** 다음 국 시작 (createRoundState → useGameStore에 set) */
  nextRound: () => void;

  /** 세션 초기화 (메인으로 돌아갈 때) */
  clearSession: () => void;

  /** 세션 종료 여부 */
  isOver: () => boolean;

  /** 최종 순위 */
  getRanking: () => { playerId: number; score: number }[];
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  session: null,

  startSession: (difficulty, beginnerMode) => {
    const session = createSession(difficulty, beginnerMode);
    set({ session });
    // 1국 GameState 생성 → useGameStore에 직접 set
    const roundState = createRoundState(session);
    useGameStore.setState({ ...roundState });
  },

  recordResult: (gameState) => {
    const { session } = get();
    if (!session) return;
    const updated = recordRoundResult(session, gameState);
    set({ session: updated });
  },

  nextRound: () => {
    const { session } = get();
    if (!session || isSessionOver(session)) return;
    const roundState = createRoundState(session);
    useGameStore.setState({ ...roundState });
  },

  clearSession: () => {
    set({ session: null });
  },

  isOver: () => {
    const { session } = get();
    if (!session) return false;
    return isSessionOver(session);
  },

  getRanking: () => {
    const { session } = get();
    if (!session) return [];
    return getFinalRanking(session);
  },
}));
