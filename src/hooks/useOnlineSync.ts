'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useOnlineGameStore } from '@/stores/useOnlineGameStore';

/** 폴링 백업 간격 (ms) — Realtime 끊겼을 때만 활성화 */
const POLL_INTERVAL_MS = 10_000;

/**
 * Supabase Realtime 구독 훅
 * - broadcast: 게임 상태 + 방 이벤트
 * - presence: 플레이어 연결 상태 추적
 * - 연결 감지 + 폴링 백업 + 탭 복귀 감지
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

    // 2단계: 초기 상태 fetch (seatIndex 확정)
    store.fetchState();

    return () => {
      initializedRef.current = false;
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, roomCode]);

  // seatIndex 확정 후 Realtime 구독
  useEffect(() => {
    if (!roomCode || store.seatIndex === null) return;

    const seatIndex = store.seatIndex;

    const channel = supabase.channel(`room:${roomCode}`)
      // 게임 상태 broadcast
      .on('broadcast', { event: `game_state:${seatIndex}` }, (payload) => {
        const { state, version } = payload.payload;
        if (state && version !== undefined) {
          store.setGameState(state, version);
        }
      })
      // 방 이벤트 broadcast
      .on('broadcast', { event: 'room_update' }, (payload) => {
        const status = payload.payload?.status;
        if (status === 'finished') {
          store.fetchState();
        } else if (status === 'rematch') {
          useOnlineGameStore.setState({ version: -1 });
          store.fetchState();
        }
      })
      // Presence: sync만으로 상태 관리 (leave와의 경합 방지, sync가 source of truth)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState() as Record<string, { seatIndex?: number }[]>;
        store.updatePresence(presenceState);
      })
      // 구독 상태 콜백
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Presence에 내 좌석 등록
          try {
            await channel.track({ seatIndex });
          } catch {
            // track 실패 시에도 게임 진행은 가능 (Presence만 미등록)
          }
          store.setConnectionStatus('connected');
          // 구독 확인 후 최신 상태 fetch (누락분 보정)
          store.fetchState();
        } else if (status === 'CHANNEL_ERROR') {
          // Supabase가 자동 재연결 시도 중
          store.setConnectionStatus('reconnecting');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          store.setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    // 폴링 백업: 연결 끊겼을 때 10초마다 fetchState
    const pollId = setInterval(() => {
      const connStatus = useOnlineGameStore.getState().connectionStatus;
      if (connStatus !== 'connected') {
        store.fetchState();
      }
    }, POLL_INTERVAL_MS);

    // 탭 복귀 감지: visibility 변경 시 상태 복원
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        store.fetchState();
        // Presence 재등록 (탭이 백그라운드에서 돌아온 경우)
        if (channelRef.current) {
          channelRef.current.track({ seatIndex }).catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, store.seatIndex]);
}
