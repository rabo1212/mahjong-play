'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useOnlineGameStore } from '@/stores/useOnlineGameStore';
import { PRESET_MESSAGES, type ChatMessage } from '@/lib/online-types';

/** 좌석별 닉네임 색상 (동=금, 남=파랑, 서=빨강, 북=초록) */
const SEAT_COLORS = [
  'text-gold',        // 0: 東
  'text-blue-400',    // 1: 南
  'text-red-400',     // 2: 西
  'text-green-400',   // 3: 北
] as const;

/** 스팸 방지: 최소 전송 간격 (ms) */
const SEND_COOLDOWN_MS = 2_000;

export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef(0);

  const chatMessages = useOnlineGameStore(s => s.chatMessages);
  const unreadCount = useOnlineGameStore(s => s.unreadCount);
  const chatOpen = useOnlineGameStore(s => s.chatOpen);
  const setChatOpen = useOnlineGameStore(s => s.setChatOpen);
  const seatIndex = useOnlineGameStore(s => s.seatIndex);
  const realtimeChannel = useOnlineGameStore(s => s.realtimeChannel);
  const gameState = useOnlineGameStore(s => s.gameState);

  // 자동 스크롤
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, chatOpen]);

  // 정형문 전송 (store의 realtimeChannel 사용)
  const sendChat = useCallback(async (messageIndex: number) => {
    if (seatIndex === null || !realtimeChannel) return;
    const now = Date.now();
    if (now - lastSentRef.current < SEND_COOLDOWN_MS) return;
    lastSentRef.current = now;

    const msg: ChatMessage = {
      seatIndex,
      nickname: '',
      messageIndex,
      timestamp: now,
    };

    try {
      await realtimeChannel.send({
        type: 'broadcast',
        event: 'chat',
        payload: msg,
      });
    } catch {
      // 전송 실패 시 무시 (연결 문제)
    }

    // 내 메시지도 로컬에 바로 추가 (self:false이므로 broadcast로 안 옴)
    useOnlineGameStore.getState().addChatMessage(msg, true);
  }, [seatIndex, realtimeChannel]);

  // 닉네임 표시
  const getSeatLabel = (seat: number) => {
    if (gameState) {
      const player = gameState.players[seat];
      if (player?.name) return player.name;
    }
    const winds = ['東', '南', '西', '北'];
    return `Player ${winds[seat]}`;
  };

  // 내 좌석 기준으로 회전된 색상 인덱스
  const getRotatedColorIndex = (seat: number) => {
    if (seatIndex === null) return seat;
    return (seat - seatIndex + 4) % 4;
  };

  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40
          w-9 h-9 sm:w-10 sm:h-10 rounded-full
          bg-panel/80 backdrop-blur border border-white/10
          flex items-center justify-center
          hover:bg-panel-light transition-colors cursor-pointer"
        aria-label="채팅 열기/닫기"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {/* 안 읽은 메시지 뱃지 */}
        {!chatOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
            bg-action-danger text-white text-[10px] font-bold
            rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 채팅 패널 */}
      {chatOpen && (
        <div className="absolute top-12 right-2 sm:top-16 sm:right-4 z-40
          w-56 sm:w-64 max-h-[60vh] flex flex-col
          bg-panel/90 backdrop-blur-md rounded-xl
          border border-white/10 shadow-panel overflow-hidden">

          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <span className="text-xs font-semibold text-text-secondary">채팅</span>
            <button
              onClick={() => setChatOpen(false)}
              className="text-text-muted hover:text-text-secondary text-xs cursor-pointer"
              aria-label="채팅 닫기"
            >
              닫기
            </button>
          </div>

          {/* 메시지 리스트 */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-[80px] max-h-[25vh]">
            {chatMessages.length === 0 && (
              <p className="text-[10px] text-text-muted text-center py-4">
                정형문을 선택해서 대화하세요
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={`${msg.timestamp}-${i}`} className="text-xs leading-relaxed">
                <span className={`font-semibold ${SEAT_COLORS[getRotatedColorIndex(msg.seatIndex)]}`}>
                  {getSeatLabel(msg.seatIndex)}
                </span>
                <span className="text-text-secondary ml-1.5">
                  {PRESET_MESSAGES[msg.messageIndex]}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 정형문 버튼 그리드 */}
          <div className="border-t border-white/5 p-2 grid grid-cols-2 gap-1.5">
            {PRESET_MESSAGES.map((msg, i) => (
              <button
                key={i}
                onClick={() => sendChat(i)}
                className="text-[10px] sm:text-[11px] px-2 py-1.5 rounded-lg
                  bg-panel-light/60 text-text-secondary
                  hover:bg-gold/10 hover:text-gold
                  active:bg-gold/20
                  transition-colors cursor-pointer truncate"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
