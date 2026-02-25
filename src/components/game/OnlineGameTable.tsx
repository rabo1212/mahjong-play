'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useOnlineGameStore } from '@/stores/useOnlineGameStore';
import { useOnlineSync } from '@/hooks/useOnlineSync';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { TileId, PendingAction, TileKind, Meld } from '@/engine/types';
import PlayerHand from './PlayerHand';
import OpponentHand from './OpponentHand';
import DiscardPool from './DiscardPool';
import MeldDisplay from './MeldDisplay';
import ActionButtons from './ActionButtons';
import TurnIndicator from './TurnIndicator';
import ActionPopup from './ActionPopup';
import ChatPanel from './ChatPanel';
import { getTile } from '@/engine/tiles';
import { resumeAudio, playTilePlace, playCall, playWin, playDraw, playClick, playTurnChange } from '@/lib/sound';

interface OnlineGameTableProps {
  roomId: string;
  roomCode: string;
  onBackToMenu: () => void;
}

export default function OnlineGameTable({ roomId, roomCode, onBackToMenu }: OnlineGameTableProps) {
  const [selectedTile, setSelectedTile] = useState<TileId | null>(null);
  const [actionPopup, setActionPopup] = useState<{ action: string; playerId: number } | null>(null);
  const actionPopupKeyRef = useRef(0);

  // Realtime 구독
  useOnlineSync(roomId, roomCode);

  // 언마운트 시 스토어 초기화
  const reset = useOnlineGameStore(s => s.reset);
  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  // 온라인 게임 상태
  const gameState = useOnlineGameStore(s => s.gameState);
  const seatIndex = useOnlineGameStore(s => s.seatIndex);
  const isLoading = useOnlineGameStore(s => s.isLoading);
  const error = useOnlineGameStore(s => s.error);
  const actionPending = useOnlineGameStore(s => s.actionPending);
  const sendAction = useOnlineGameStore(s => s.sendAction);
  const storeVersion = useOnlineGameStore(s => s.version);
  const connectionStatus = useOnlineGameStore(s => s.connectionStatus);
  const presenceReady = useOnlineGameStore(s => s.presenceReady);
  const playerPresence = useOnlineGameStore(s => s.playerPresence);

  // 설정
  const soundEnabled = useSettingsStore(s => s.soundEnabled);

  // 이전 턴 추적 (효과음용)
  const prevTurnRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

  // 효과음
  useEffect(() => {
    if (!soundEnabled || !gameState) return;

    const phase = gameState.phase;
    const turnIndex = gameState.turnIndex;

    // 버리기 효과음
    if (prevPhaseRef.current === 'discard' && phase === 'action-pending') {
      playTilePlace();
    }
    if (prevPhaseRef.current === 'discard' && phase !== 'discard' && phase !== 'action-pending' && phase !== 'game-over') {
      playTilePlace();
    }

    // 부로 효과음
    if (prevPhaseRef.current === 'action-pending' && phase === 'discard' && turnIndex !== prevTurnRef.current) {
      playCall();
      const callerMelds = gameState.players[turnIndex]?.melds;
      if (callerMelds && callerMelds.length > 0) {
        const lastMeld = callerMelds[callerMelds.length - 1];
        const meldAction = lastMeld.type === 'chi' ? 'chi' : lastMeld.type === 'pon' ? 'pon' : 'kan';
        actionPopupKeyRef.current++;
        const rotatedCaller = (turnIndex - (seatIndex ?? 0) + 4) % 4;
        setActionPopup({ action: meldAction, playerId: rotatedCaller });
      }
    }

    // 내 턴 알림
    if (phase === 'discard' && turnIndex === seatIndex && prevTurnRef.current !== seatIndex) {
      playTurnChange();
    }

    // 게임 오버
    if (phase === 'game-over' && prevPhaseRef.current !== 'game-over') {
      if (gameState.winner !== null) {
        playWin();
        actionPopupKeyRef.current++;
        const rotatedWinner = (gameState.winner - (seatIndex ?? 0) + 4) % 4;
        setActionPopup({ action: 'win', playerId: rotatedWinner });
      } else {
        playDraw();
      }
    }

    prevTurnRef.current = turnIndex;
    prevPhaseRef.current = phase;
  }, [gameState, seatIndex, soundEnabled]);

  const handleInteraction = useCallback(() => {
    if (soundEnabled) resumeAudio();
  }, [soundEnabled]);

  // 타일 클릭 → 버리기
  const handleTileClick = useCallback((tileId: TileId) => {
    handleInteraction();
    if (!gameState || gameState.phase !== 'discard' || gameState.turnIndex !== seatIndex) return;
    if (actionPending) return;

    if (selectedTile === tileId) {
      if (soundEnabled) playTilePlace();
      sendAction({ type: 'discard', tileId });
      setSelectedTile(null);
    } else {
      if (soundEnabled) playClick();
      setSelectedTile(tileId);
    }
  }, [gameState, seatIndex, selectedTile, actionPending, sendAction, soundEnabled, handleInteraction]);

  // 액션 버튼
  const handleAction = useCallback((action: string, tiles?: number[]) => {
    handleInteraction();
    if (actionPending) return;
    if (soundEnabled) playCall();

    if (action === 'ankan' && tiles) {
      sendAction({ type: 'ankan', kanKind: tiles[0] });
      setSelectedTile(null);
      return;
    }
    if (action === 'kakan' && tiles) {
      sendAction({ type: 'kakan', meldIndex: tiles[0] });
      setSelectedTile(null);
      return;
    }
    if (action === 'chi' && tiles) {
      sendAction({ type: 'chi', tileIds: tiles });
      setSelectedTile(null);
      return;
    }
    if (action === 'pon') {
      sendAction({ type: 'pon' });
    } else if (action === 'kan') {
      sendAction({ type: 'kan' });
    } else if (action === 'win') {
      // discard 단계에서는 쯔모, action-pending 단계에서는 론
      if (gameState?.phase === 'action-pending') {
        sendAction({ type: 'ron' });
      } else {
        sendAction({ type: 'tsumo' });
      }
    }
    setSelectedTile(null);
  }, [actionPending, sendAction, soundEnabled, handleInteraction, gameState?.phase]);

  const handleSkip = useCallback(() => {
    handleInteraction();
    if (actionPending) return;
    if (soundEnabled) playClick();
    sendAction({ type: 'skip' });
    setSelectedTile(null);
  }, [actionPending, sendAction, soundEnabled, handleInteraction]);

  // 다시하기
  const [rematchLoading, setRematchLoading] = useState(false);
  const handleRematch = useCallback(async () => {
    if (rematchLoading) return;
    setRematchLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/rooms/${roomCode}/rematch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '다시하기 실패');
      }
      // 성공 시 Realtime broadcast가 새 게임 상태를 보내줌
    } catch {
      alert('다시하기 실패');
    } finally {
      setRematchLoading(false);
    }
  }, [roomCode, rematchLoading]);

  // 턴 타이머 만료 → 서버에 timeout 전송 (ref로 안정화)
  const sendActionRef = useRef(sendAction);
  sendActionRef.current = sendAction;
  const actionPendingRef = useRef(actionPending);
  actionPendingRef.current = actionPending;

  const handleTimeout = useCallback(() => {
    if (actionPendingRef.current) return;
    sendActionRef.current({ type: 'timeout' });
  }, []);

  // 재연결 성공 토스트
  const [showReconnected, setShowReconnected] = useState(false);
  const prevConnectionRef = useRef(connectionStatus);
  useEffect(() => {
    if (prevConnectionRef.current !== 'connected' && connectionStatus === 'connected') {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      prevConnectionRef.current = connectionStatus;
      return () => clearTimeout(timer);
    }
    prevConnectionRef.current = connectionStatus;
  }, [connectionStatus]);

  // turnDeadline 메모이제이션: version이 바뀔 때만 재계산 (렌더 안정성)
  const memoizedDeadline = useMemo(() => {
    if (!gameState || gameState.turnRemainingMs == null) return null;
    return Date.now() + gameState.turnRemainingMs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeVersion]);

  // 로딩 중
  if (isLoading || !gameState || seatIndex === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base gap-3">
        <div className="text-text-secondary animate-pulse">게임 로딩 중...</div>
        {error && <div className="text-action-danger text-xs">{error}</div>}
      </div>
    );
  }

  // DTO에서 좌석 기준으로 플레이어 회전 (내가 항상 아래쪽)
  // melds의 type을 MeldType으로 캐스트
  const rotatedPlayers = [0, 1, 2, 3].map(i => {
    const p = gameState.players[(seatIndex + i) % 4];
    return { ...p, melds: p.melds as Meld[] };
  });
  const myPlayer = rotatedPlayers[0];
  const rightPlayer = rotatedPlayers[1];
  const topPlayer = rotatedPlayers[2];
  const leftPlayer = rotatedPlayers[3];

  // 턴 인덱스도 회전
  const rotatedTurnIndex = (gameState.turnIndex - seatIndex + 4) % 4;
  const isMyTurn = gameState.turnIndex === seatIndex;

  // DTO의 myPendingActions → PendingAction[] 변환 (ActionButtons 호환)
  const playerActions: PendingAction[] = (gameState.myPendingActions || []).map(a => ({
    playerId: seatIndex,
    action: a.action as PendingAction['action'],
    tiles: a.tiles,
    priority: 0,
  }));

  // 쯔모 가능 여부 (서버에서 판정)
  const canTsumo = gameState.canTsumo ?? false;

  // 내 응답이 이미 수집됨 (다른 플레이어 대기 중)
  const myResponseCollected = gameState.myResponseCollected ?? false;

  // 암깡/가깡은 서버에서 허용 여부를 보내지 않으므로 클라이언트에서 계산
  const ankanOptions: TileKind[] = [];
  const kakanOptions: number[] = [];
  if (gameState.phase === 'discard' && isMyTurn) {
    // 암깡: 같은 종류 4장
    const kindCounts: Record<number, number> = {};
    const allHand = myPlayer.drawnTile !== null
      ? [...myPlayer.hand, myPlayer.drawnTile]
      : [...myPlayer.hand];
    for (const tid of allHand) {
      if (tid < 0) continue; // 마스킹된 패 스킵
      // TileId에서 kind 계산은 클라이언트에 tiles.ts 접근 필요
      // DTO는 TileId를 그대로 전달하므로 getTile 사용 가능
      const kind = getTile(tid).kind;
      kindCounts[kind] = (kindCounts[kind] || 0) + 1;
    }
    for (const [k, count] of Object.entries(kindCounts)) {
      if (count >= 4) ankanOptions.push(Number(k));
    }

    // 가깡: 펑한 면자 + 손패에 같은 패
    for (let i = 0; i < myPlayer.melds.length; i++) {
      const meld = myPlayer.melds[i];
      if (meld.type !== 'pon') continue;
      const ponKind = meld.tileKinds[0];
      if (allHand.some(tid => {
        if (tid < 0) return false;
        return getTile(tid).kind === ponKind;
      })) {
        kakanOptions.push(i);
      }
    }
  }

  // lastDiscard도 회전
  const rotatedLastDiscard = gameState.lastDiscard
    ? { ...gameState.lastDiscard, playerId: (gameState.lastDiscard.playerId - seatIndex + 4) % 4 }
    : null;

  // 풍패 표시 회전
  const windLabels = ['東', '南', '西', '北'];
  const myWind = windLabels[(seatIndex) % 4];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-base select-none" onClick={handleInteraction}>
      {/* 채팅 패널 */}
      <ChatPanel />

      {/* 가로 회전 안내 */}
      <div className="rotate-prompt hidden fixed inset-0 z-[100] bg-base/95 flex-col items-center justify-center gap-4">
        <div className="text-4xl">📱</div>
        <p className="text-text-secondary text-sm">가로 모드로 회전해주세요</p>
      </div>

      {/* 연결 상태 배너 */}
      {connectionStatus === 'disconnected' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50
          bg-action-danger/30 text-white text-xs px-4 py-2 rounded-full
          border border-action-danger/50 animate-pulse flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-action-danger" />
          연결이 끊어졌습니다. 재연결 시도 중...
        </div>
      )}
      {connectionStatus === 'reconnecting' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50
          bg-gold/20 text-gold text-xs px-4 py-2 rounded-full
          border border-gold/30 animate-pulse flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold" />
          재연결 중...
        </div>
      )}
      {showReconnected && connectionStatus === 'connected' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50
          bg-green-500/20 text-green-400 text-xs px-4 py-2 rounded-full
          border border-green-500/30 animate-fade-in">
          재연결 성공!
        </div>
      )}

      {/* 에러 표시 */}
      {error && connectionStatus === 'connected' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50
          bg-action-danger/20 text-action-danger text-xs px-3 py-1 rounded-full animate-fade-in">
          {error}
        </div>
      )}

      {/* 액션 처리 중 표시 */}
      {actionPending && (
        <div className="absolute top-2 right-4 z-50
          bg-gold/20 text-gold text-xs px-3 py-1 rounded-full animate-pulse">
          처리 중...
        </div>
      )}

      {/* 마작 테이블 */}
      <div className="absolute inset-2 sm:inset-4 md:inset-6 lg:inset-8 rounded-2xl table-bg overflow-hidden">
        {/* 대면 (인덱스 2) */}
        <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sm:gap-2 z-10">
          <div className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
            rotatedTurnIndex === 2
              ? 'bg-gold/20 text-gold'
              : 'bg-panel/60 text-text-secondary'
          }`}>
            {topPlayer.isAI ? `AI (${windLabels[(seatIndex + 2) % 4]})` : `${topPlayer.name} (${windLabels[(seatIndex + 2) % 4]})`}
            {presenceReady && !topPlayer.isAI && playerPresence[(seatIndex + 2) % 4] === false && (
              <span className="ml-1 text-action-danger">(끊김)</span>
            )}
          </div>
          <MeldDisplay melds={topPlayer.melds} position="top" />
          <OpponentHand player={topPlayer} position="top" />
        </div>

        {/* 상가 (인덱스 3) — 왼쪽 */}
        <div className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 z-10">
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
              rotatedTurnIndex === 3
                ? 'bg-gold/20 text-gold'
                : 'bg-panel/60 text-text-secondary'
            }`}>
              {leftPlayer.isAI ? `AI (${windLabels[(seatIndex + 3) % 4]})` : `${leftPlayer.name} (${windLabels[(seatIndex + 3) % 4]})`}
              {presenceReady && !leftPlayer.isAI && playerPresence[(seatIndex + 3) % 4] === false && (
                <span className="ml-1 text-action-danger">(끊김)</span>
              )}
            </div>
            <MeldDisplay melds={leftPlayer.melds} position="left" />
            <OpponentHand player={leftPlayer} position="left" />
          </div>
        </div>

        {/* 하가 (인덱스 1) — 오른쪽 */}
        <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 z-10">
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
              rotatedTurnIndex === 1
                ? 'bg-gold/20 text-gold'
                : 'bg-panel/60 text-text-secondary'
            }`}>
              {rightPlayer.isAI ? `AI (${windLabels[(seatIndex + 1) % 4]})` : `${rightPlayer.name} (${windLabels[(seatIndex + 1) % 4]})`}
              {presenceReady && !rightPlayer.isAI && playerPresence[(seatIndex + 1) % 4] === false && (
                <span className="ml-1 text-action-danger">(끊김)</span>
              )}
            </div>
            <MeldDisplay melds={rightPlayer.melds} position="right" />
            <OpponentHand player={rightPlayer} position="right" />
          </div>
        </div>

        {/* 중앙 (버림패 + 턴 표시) */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="relative flex flex-col items-center gap-1 sm:gap-2">
            <DiscardPool
              discards={topPlayer.discards}
              lastDiscard={rotatedLastDiscard?.playerId === 2 ? rotatedLastDiscard.tileId : null}
              position="top"
            />
            <div className="flex items-center gap-2 sm:gap-4">
              <DiscardPool
                discards={leftPlayer.discards}
                lastDiscard={rotatedLastDiscard?.playerId === 3 ? rotatedLastDiscard.tileId : null}
                position="left"
              />
              <TurnIndicator
                roundWind={gameState.roundWind}
                turnIndex={rotatedTurnIndex}
                wallCount={gameState.wallTileCount}
                turnCount={gameState.turnCount}
                turnDeadline={memoizedDeadline}
                onTimeout={handleTimeout}
              />
              <DiscardPool
                discards={rightPlayer.discards}
                lastDiscard={rotatedLastDiscard?.playerId === 1 ? rotatedLastDiscard.tileId : null}
                position="right"
              />
            </div>
            <DiscardPool
              discards={myPlayer.discards}
              lastDiscard={rotatedLastDiscard?.playerId === 0 ? rotatedLastDiscard.tileId : null}
              position="bottom"
            />
          </div>
        </div>

        {/* 액션 팝업 */}
        {actionPopup && (
          <ActionPopup
            key={actionPopupKeyRef.current}
            action={actionPopup.action}
            playerId={actionPopup.playerId}
          />
        )}

        {/* 내 꽃패 */}
        {myPlayer.flowers.length > 0 && (
          <div className="absolute bottom-20 sm:bottom-24 right-2 sm:right-4 flex gap-1 z-10">
            {myPlayer.flowers.map((id) => (
              <div key={id} className="opacity-80">
                <span className="text-[9px] sm:text-[10px] text-text-muted block text-center mb-0.5">花</span>
                <div className="mahjong-tile flex items-center justify-center" style={{ width: 24, height: 34, fontSize: 10 }}>
                  <span className="tile-char tile-char-dragon-red font-tile font-bold" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단: 내 손패 + 액션 */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {myPlayer.melds.length > 0 && (
          <div className="flex justify-end px-4 sm:px-8 mb-1">
            <MeldDisplay melds={myPlayer.melds} position="bottom" />
          </div>
        )}

        <div className="bg-gradient-to-t from-base via-base/95 to-transparent pt-2 sm:pt-4 pb-1 sm:pb-2 px-2 sm:px-4">
          <div className="flex items-center justify-center">
            <div className={`mr-2 sm:mr-4 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex-shrink-0 ${
              isMyTurn
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-panel/60 text-text-secondary'
            }`}>
              나 ({myWind})
            </div>

            <PlayerHand
              hand={myPlayer.hand}
              drawnTile={myPlayer.drawnTile}
              selectedTile={selectedTile}
              onTileClick={handleTileClick}
              interactive={gameState.phase === 'discard' && isMyTurn && !actionPending}
            />
          </div>

          {/* 액션 버튼 (응답 수집 완료 시 숨김) */}
          {!myResponseCollected && (
            <ActionButtons
              playerActions={playerActions}
              canTsumo={canTsumo}
              ankanOptions={ankanOptions}
              kakanOptions={kakanOptions}
              isMyTurn={isMyTurn}
              phase={gameState.phase}
              onAction={handleAction}
              onSkip={handleSkip}
            />
          )}

          {/* 안내 메시지 */}
          <div className="text-center text-[10px] sm:text-xs text-text-muted pb-1 sm:pb-2">
            {myResponseCollected && (
              <span className="inline-flex items-center gap-1.5 text-gold animate-pulse">
                다른 플레이어 응답 대기 중...
              </span>
            )}
            {!myResponseCollected && gameState.phase === 'discard' && isMyTurn && !actionPending && '패를 클릭해서 선택 → 다시 클릭하면 버리기'}
            {!myResponseCollected && gameState.phase === 'action-pending' && playerActions.length > 0 && '액션을 선택하세요'}
            {gameState.phase === 'discard' && !isMyTurn && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                상대방 차례...
              </span>
            )}
            {actionPending && '서버 응답 대기 중...'}
          </div>
        </div>
      </div>

      {/* 게임 오버 */}
      {gameState.phase === 'game-over' && (
        <div className="absolute inset-0 z-50 bg-base/80 flex items-center justify-center">
          <div className="bg-panel rounded-2xl border border-white/10 shadow-panel p-6 sm:p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-display font-bold text-gold mb-4">
              {gameState.winner === null ? '유국' : gameState.winner === seatIndex ? '승리!' : '패배'}
            </h2>
            {gameState.winResult && (
              <div className="mb-4 text-sm text-text-secondary">
                <p>{gameState.winResult.scoring.totalPoints}점</p>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {gameState.winResult.scoring.yakuList.map((y, i) => (
                    <span key={i} className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded">
                      {y.yaku.nameKo} ({y.yaku.points * y.count}점)
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRematch}
                disabled={rematchLoading}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer
                  bg-gold/20 text-gold border border-gold/30
                  hover:bg-gold/30 transition-colors disabled:opacity-50"
              >
                {rematchLoading ? '준비 중...' : '다시하기'}
              </button>
              <button
                onClick={onBackToMenu}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer
                  bg-panel-light text-text-secondary border border-white/5
                  hover:border-white/10 transition-colors"
              >
                로비로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
