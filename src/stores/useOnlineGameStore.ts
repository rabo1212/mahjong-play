'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { GameStateDTO } from '@/engine/dto';
import type { GameAction } from '@/lib/online-types';

interface OnlineGameStore {
  // 상태
  roomId: string | null;
  roomCode: string | null;
  seatIndex: number | null;
  gameState: GameStateDTO | null;
  version: number;
  isLoading: boolean;
  error: string | null;
  actionPending: boolean;

  // 초기화
  init: (roomId: string, roomCode: string) => void;
  reset: () => void;

  // 게임 상태 설정 (Realtime에서 수신)
  setGameState: (state: GameStateDTO, version: number) => void;

  // 초기 상태 fetch
  fetchState: () => Promise<void>;

  // 액션 전송
  sendAction: (action: GameAction) => Promise<void>;
}

export const useOnlineGameStore = create<OnlineGameStore>()((set, get) => ({
  roomId: null,
  roomCode: null,
  seatIndex: null,
  gameState: null,
  version: 0,
  isLoading: false,
  error: null,
  actionPending: false,

  init: (roomId, roomCode) => {
    set({ roomId, roomCode, gameState: null, version: 0, error: null });
  },

  reset: () => {
    set({
      roomId: null,
      roomCode: null,
      seatIndex: null,
      gameState: null,
      version: 0,
      isLoading: false,
      error: null,
      actionPending: false,
    });
  },

  setGameState: (state, version) => {
    // 오래된 버전이면 무시
    if (version <= get().version) return;
    set({ gameState: state, version, isLoading: false, error: null });
  },

  fetchState: async () => {
    const { roomId } = get();
    if (!roomId) return;

    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/game/${roomId}/state`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Realtime에서 이미 더 새로운 버전을 받았으면 무시
      if (data.version <= get().version && get().gameState !== null) {
        set({ isLoading: false });
        return;
      }
      set({
        gameState: data.state,
        version: data.version,
        seatIndex: data.seatIndex,
        isLoading: false,
      });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : '상태 조회 실패', isLoading: false });
    }
  },

  sendAction: async (action) => {
    const { roomId, version } = get();
    if (!roomId || get().actionPending) return;

    set({ actionPending: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/game/${roomId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action, version }),
      });
      const data = await res.json();

      if (data.stale) {
        // 버전 불일치 → 최신 상태 다시 가져오기
        await get().fetchState();
        set({ actionPending: false });
        return;
      }

      if (!res.ok) throw new Error(data.error);

      set({
        gameState: data.state,
        version: data.version,
        actionPending: false,
      });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : '액션 실패', actionPending: false });
    }
  },
}));
