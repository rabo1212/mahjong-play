'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useOnlineGameStore } from '@/stores/useOnlineGameStore';

/**
 * Supabase Realtime 구독 훅
 * 구독 먼저 시작 → 초기 상태 fetch → 이벤트 누락 방지
 */
export function useOnlineSync(roomId: string | null, roomCode: string | null) {
  const store = useOnlineGameStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!roomId || !roomCode) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 1단계: 스토어 초기화
    store.init(roomId, roomCode);

    // 2단계: 채널 구독 시작 (seat 모르는 상태에서도 연결)
    // seat별 이벤트는 fetchState 이후 별도 effect에서 처리
    store.fetchState().then(() => {
      // fetchState 완료 → seatIndex 확정됨
      // 구독은 아래 두 번째 effect에서 처리
    });

    return () => {
      initializedRef.current = false;
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, roomCode]);

  // seatIndex 확정 후 Realtime 구독
  useEffect(() => {
    if (!roomCode || store.seatIndex === null) return;

    const channel = supabase.channel(`room:${roomCode}`)
      .on('broadcast', { event: `game_state:${store.seatIndex}` }, (payload) => {
        const { state, version } = payload.payload;
        if (state && version !== undefined) {
          store.setGameState(state, version);
        }
      })
      .on('broadcast', { event: 'room_update' }, (payload) => {
        const status = payload.payload?.status;
        if (status === 'finished' || status === 'rematch') {
          // 리매치 시 새 게임 상태 fetch
          store.fetchState();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // 구독 확인 후 최신 상태 한번 더 fetch (구독 전 누락분 보정)
          store.fetchState();
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, store.seatIndex]);
}
