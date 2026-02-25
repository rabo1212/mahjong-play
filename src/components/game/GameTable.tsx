'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { TileId, ActionType } from '@/engine/types';
import PlayerHand from './PlayerHand';
import OpponentHand from './OpponentHand';
import DiscardPool from './DiscardPool';
import MeldDisplay from './MeldDisplay';
import ActionButtons from './ActionButtons';
import TurnIndicator from './TurnIndicator';
import GameOverModal from './GameOverModal';
import ActionPopup from './ActionPopup';
import WaitingTiles from '../guide/WaitingTiles';
import TileRecommend from '../guide/TileRecommend';
import ShantenDisplay from '../guide/ShantenDisplay';
import { resumeAudio, playTilePlace, playCall, playWin, playDraw, playClick, playTurnChange } from '@/lib/sound';
import { addRecord } from '@/lib/history';

interface GameTableProps {
  onBackToMenu: () => void;
}

export default function GameTable({ onBackToMenu }: GameTableProps) {
  const [selectedTile, setSelectedTile] = useState<TileId | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [actionPopup, setActionPopup] = useState<{ action: string; playerId: number } | null>(null);
  const actionPopupKeyRef = useRef(0);

  // 게임 상태
  const phase = useGameStore(s => s.phase);
  const players = useGameStore(s => s.players);
  const turnIndex = useGameStore(s => s.turnIndex);
  const roundWind = useGameStore(s => s.roundWind);
  const wallTiles = useGameStore(s => s.wallTiles);
  const turnCount = useGameStore(s => s.turnCount);
  const lastDiscard = useGameStore(s => s.lastDiscard);
  const winner = useGameStore(s => s.winner);
  const winResult = useGameStore(s => s.winResult);
  const difficulty = useGameStore(s => s.difficulty);

  // 설정
  const showHints = useSettingsStore(s => s.showHints);
  const soundEnabled = useSettingsStore(s => s.soundEnabled);

  // 액션
  const playerDiscard = useGameStore(s => s.playerDiscard);
  const playerAction = useGameStore(s => s.playerAction);
  const playerSkip = useGameStore(s => s.playerSkip);
  const initGame = useGameStore(s => s.initGame);
  const getPlayerActions = useGameStore(s => s.getPlayerActions);
  const canPlayerTsumo = useGameStore(s => s.canPlayerTsumo);
  const getPlayerAnkanOptions = useGameStore(s => s.getPlayerAnkanOptions);
  const playerAnkan = useGameStore(s => s.playerAnkan);

  // 게임 루프
  useGameLoop();

  // 이전 턴 추적 (효과음용)
  const prevTurnRef = useRef(turnIndex);
  const prevPhaseRef = useRef(phase);

  // 효과음: 턴 변경 + 버리기
  useEffect(() => {
    if (!soundEnabled) return;

    // 버리기 발생
    if (prevPhaseRef.current === 'discard' && phase === 'action-pending') {
      playTilePlace();
    }
    if (prevPhaseRef.current === 'discard' && phase !== 'discard' && phase !== 'action-pending' && phase !== 'game-over') {
      playTilePlace();
    }

    // 부로 발생 (AI 또는 플레이어가 치/펑/깡)
    if (prevPhaseRef.current === 'action-pending' && phase === 'discard' && turnIndex !== prevTurnRef.current) {
      playCall();
      // 부로 유형 추론: 턴이 바뀐 플레이어가 부로함
      const callerMelds = players[turnIndex]?.melds;
      if (callerMelds && callerMelds.length > 0) {
        const lastMeld = callerMelds[callerMelds.length - 1];
        const meldAction = lastMeld.type === 'chi' ? 'chi' : lastMeld.type === 'pon' ? 'pon' : 'kan';
        actionPopupKeyRef.current++;
        setActionPopup({ action: meldAction, playerId: turnIndex });
      }
    }

    // 내 턴 시작 알림
    if (phase === 'discard' && turnIndex === 0 && prevTurnRef.current !== 0) {
      playTurnChange();
    }

    // 게임 오버
    if (phase === 'game-over' && prevPhaseRef.current !== 'game-over') {
      if (winner !== null) {
        playWin();
        actionPopupKeyRef.current++;
        setActionPopup({ action: 'win', playerId: winner });
      } else {
        playDraw();
      }
    }

    prevTurnRef.current = turnIndex;
    prevPhaseRef.current = phase;
  }, [phase, turnIndex, soundEnabled, winner]);

  // 전적 기록 (게임 오버 시 1회)
  useEffect(() => {
    if (phase !== 'game-over' || recorded) return;

    const result = winner === 0 ? 'win' : winner === null ? 'draw' : 'lose';
    addRecord({
      date: new Date().toISOString(),
      difficulty,
      result,
      score: result === 'win' && winResult ? winResult.scoring.totalPoints : 0,
      yakuNames: result === 'win' && winResult
        ? winResult.scoring.yakuList.map(y => y.yaku.nameKo)
        : [],
      turns: turnCount,
    });
    setRecorded(true);
  }, [phase, recorded, winner, winResult, difficulty, turnCount]);

  const myPlayer = players[0];
  const isMyTurn = turnIndex === 0;

  // 첫 클릭으로 AudioContext 재개
  const handleInteraction = useCallback(() => {
    if (soundEnabled) resumeAudio();
  }, [soundEnabled]);

  // 타일 클릭 → 선택 → 더블클릭 또는 이미 선택된 거면 버리기
  const handleTileClick = useCallback((tileId: TileId) => {
    handleInteraction();
    if (phase !== 'discard' || !isMyTurn) return;

    if (selectedTile === tileId) {
      if (soundEnabled) playTilePlace();
      playerDiscard(tileId);
      setSelectedTile(null);
    } else {
      if (soundEnabled) playClick();
      setSelectedTile(tileId);
    }
  }, [phase, isMyTurn, selectedTile, playerDiscard, soundEnabled, handleInteraction]);

  // 액션 버튼
  const handleAction = useCallback((action: string, tiles?: number[]) => {
    handleInteraction();
    if (soundEnabled) playCall();

    if (action === 'ankan' && tiles) {
      playerAnkan(tiles[0]);
      setSelectedTile(null);
      return;
    }
    playerAction(action as ActionType, tiles);
    setSelectedTile(null);
  }, [playerAction, playerAnkan, soundEnabled, handleInteraction]);

  const handleSkip = useCallback(() => {
    handleInteraction();
    if (soundEnabled) playClick();
    playerSkip();
    setSelectedTile(null);
  }, [playerSkip, soundEnabled, handleInteraction]);

  const handleRestart = useCallback(() => {
    handleInteraction();
    const { difficulty, beginnerMode } = useGameStore.getState();
    initGame(difficulty, beginnerMode);
    setSelectedTile(null);
    setRecorded(false);
  }, [initGame, handleInteraction]);

  if (!myPlayer) return null;

  const playerActions = getPlayerActions();
  const canTsumo = canPlayerTsumo();
  const ankanOptions = getPlayerAnkanOptions();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-base select-none" onClick={handleInteraction}>
      {/* 가로 회전 안내 (세로 모바일) */}
      <div className="rotate-prompt hidden fixed inset-0 z-[100] bg-base/95 flex-col items-center justify-center gap-4">
        <div className="text-4xl">📱</div>
        <p className="text-text-secondary text-sm">가로 모드로 회전해주세요</p>
      </div>

      {/* 마작 테이블 */}
      <div className="absolute inset-2 sm:inset-4 md:inset-6 lg:inset-8 rounded-2xl table-bg overflow-hidden">
        {/* 펠트 텍스처: CSS의 .table-bg::before에서 처리 */}

        {/* === 대면 (北, 인덱스 2) === */}
        <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sm:gap-2 z-10">
          <div className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
            turnIndex === 2
              ? 'bg-gold/20 text-gold'
              : 'bg-panel/60 text-text-secondary'
          }`}>
            AI 2 (西)
          </div>
          <MeldDisplay melds={players[2].melds} position="top" />
          <OpponentHand player={players[2]} position="top" />
        </div>

        {/* === 상가 (西, 인덱스 3) — 왼쪽 === */}
        <div className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 z-10">
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
              turnIndex === 3
                ? 'bg-gold/20 text-gold'
                : 'bg-panel/60 text-text-secondary'
            }`}>
              AI 3 (北)
            </div>
            <MeldDisplay melds={players[3].melds} position="left" />
            <OpponentHand player={players[3]} position="left" />
          </div>
        </div>

        {/* === 하가 (南, 인덱스 1) — 오른쪽 === */}
        <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 z-10">
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <div className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
              turnIndex === 1
                ? 'bg-gold/20 text-gold'
                : 'bg-panel/60 text-text-secondary'
            }`}>
              AI 1 (南)
            </div>
            <MeldDisplay melds={players[1].melds} position="right" />
            <OpponentHand player={players[1]} position="right" />
          </div>
        </div>

        {/* === 중앙 영역 (버림패 + 턴 표시) === */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="relative flex flex-col items-center gap-1 sm:gap-2">
            <DiscardPool
              discards={players[2].discards}
              lastDiscard={lastDiscard?.playerId === 2 ? lastDiscard.tileId : null}
              position="top"
            />

            <div className="flex items-center gap-2 sm:gap-4">
              <DiscardPool
                discards={players[3].discards}
                lastDiscard={lastDiscard?.playerId === 3 ? lastDiscard.tileId : null}
                position="left"
              />

              <TurnIndicator
                roundWind={roundWind}
                turnIndex={turnIndex}
                wallCount={wallTiles.length}
                turnCount={turnCount}
              />

              <DiscardPool
                discards={players[1].discards}
                lastDiscard={lastDiscard?.playerId === 1 ? lastDiscard.tileId : null}
                position="right"
              />
            </div>

            <DiscardPool
              discards={players[0].discards}
              lastDiscard={lastDiscard?.playerId === 0 ? lastDiscard.tileId : null}
              position="bottom"
            />
          </div>
        </div>

        {/* === 액션 팝업 ("퐁!", "치!" 등) === */}
        {actionPopup && (
          <ActionPopup
            key={actionPopupKeyRef.current}
            action={actionPopup.action}
            playerId={actionPopup.playerId}
          />
        )}

        {/* === 내 꽃패 === */}
        {myPlayer.flowers.length > 0 && (
          <div className="absolute bottom-20 sm:bottom-24 right-2 sm:right-4 flex gap-1 z-10">
            {myPlayer.flowers.map(id => (
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

      {/* === 하단: 내 손패 + 부로 + 액션 === */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* 내 부로 패 */}
        {myPlayer.melds.length > 0 && (
          <div className="flex justify-end px-4 sm:px-8 mb-1">
            <MeldDisplay melds={myPlayer.melds} position="bottom" />
          </div>
        )}

        {/* 내 손패 */}
        <div className="bg-gradient-to-t from-base via-base/95 to-transparent pt-2 sm:pt-4 pb-1 sm:pb-2 px-2 sm:px-4">
          {/* 초보자 가이드 */}
          {showHints && (
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2 flex-wrap">
              <ShantenDisplay
                hand={myPlayer.hand}
                drawnTile={myPlayer.drawnTile}
                meldCount={myPlayer.melds.length}
              />
              <WaitingTiles
                hand={myPlayer.hand}
                drawnTile={myPlayer.drawnTile}
                meldCount={myPlayer.melds.length}
              />
              <TileRecommend
                hand={myPlayer.hand}
                drawnTile={myPlayer.drawnTile}
                meldCount={myPlayer.melds.length}
                isMyTurn={isMyTurn}
                phase={phase}
                onTileSelect={(tileId) => {
                  if (soundEnabled) playClick();
                  setSelectedTile(tileId);
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-center">
            <div className={`mr-2 sm:mr-4 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex-shrink-0 ${
              isMyTurn
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-panel/60 text-text-secondary'
            }`}>
              나 (東)
            </div>

            <PlayerHand
              hand={myPlayer.hand}
              drawnTile={myPlayer.drawnTile}
              selectedTile={selectedTile}
              onTileClick={handleTileClick}
              interactive={phase === 'discard' && isMyTurn}
            />
          </div>

          {/* 액션 버튼 */}
          <ActionButtons
            playerActions={playerActions}
            canTsumo={canTsumo}
            ankanOptions={ankanOptions}
            isMyTurn={isMyTurn}
            phase={phase}
            onAction={handleAction}
            onSkip={handleSkip}
          />

          {/* 안내 메시지 */}
          <div className="text-center text-[10px] sm:text-xs text-text-muted pb-1 sm:pb-2">
            {phase === 'discard' && isMyTurn && '패를 클릭해서 선택 → 다시 클릭하면 버리기 (숫자키 1~9, 0=쯔모)'}
            {phase === 'action-pending' && playerActions.length > 0 && '액션을 선택하세요'}
            {phase === 'discard' && !isMyTurn && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                AI {turnIndex} 차례...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 게임 오버 모달 */}
      {phase === 'game-over' && (
        <GameOverModal
          state={useGameStore.getState()}
          onRestart={handleRestart}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  );
}
