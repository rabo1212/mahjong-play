'use client';

import React from 'react';
import type { GameStateDTO } from '@/engine/dto';
import { calculateSettlement } from '@/engine/settlement';
import TileComponent from './TileComponent';

interface OnlineGameOverModalProps {
  gameState: GameStateDTO;
  seatIndex: number;
  onRematch: () => void;
  onBackToMenu: () => void;
  rematchLoading: boolean;
}

const WIND_LABELS = ['東', '南', '西', '北'];

export default function OnlineGameOverModal({
  gameState,
  seatIndex,
  onRematch,
  onBackToMenu,
  rematchLoading,
}: OnlineGameOverModalProps) {
  const winner = gameState.winner;
  const winResult = gameState.winResult;
  const isDraw = winner === null;
  const isMyWin = winner === seatIndex;

  // 승자 플레이어 정보
  const winnerPlayer = winner !== null ? gameState.players[winner] : null;

  // 쯔모/론 판별
  const isTsumo = winResult
    ? winResult.scoring.yakuList.some(y => y.yaku.id === 'self_drawn')
    : false;
  const fromPlayerId = !isTsumo && gameState.lastDiscard
    ? gameState.lastDiscard.playerId
    : undefined;

  // 정산 계산
  const settlement = winner !== null && winResult
    ? calculateSettlement(winner, winResult.scoring.totalPoints, isTsumo, fromPlayerId)
    : null;

  // 플레이어 이름 (좌석 회전 적용)
  const getPlayerLabel = (absoluteSeat: number) => {
    const p = gameState.players[absoluteSeat];
    const wind = WIND_LABELS[absoluteSeat % 4];
    return p ? `${p.name} (${wind})` : `Player ${wind}`;
  };

  // 공유 텍스트 생성
  const handleShare = () => {
    if (!winResult) return;
    const yakuNames = winResult.scoring.yakuList.map(y => y.yaku.nameKo).join(', ');
    const winType = isTsumo ? '쯔모' : '론';
    const text = `MahjongPlay - ${winResult.scoring.totalPoints}점 화료! (${winType})\n역: ${yakuNames}\nhttps://mahjong-play-rho.vercel.app`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('클립보드에 복사되었습니다!');
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(212,168,75,0.1) 0%, rgba(0,0,0,0.75) 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="bg-gradient-to-b from-panel-light to-panel rounded-2xl border border-gold/20
        shadow-gold-glow p-4 sm:p-6 max-w-lg w-full mx-3 animate-result-appear
        max-h-[90vh] overflow-y-auto">

        {/* 타이틀 */}
        <h2 className="text-center mb-4 sm:mb-5">
          {isDraw ? (
            <span className="text-2xl sm:text-3xl font-tile text-text-secondary">유국 流局</span>
          ) : isMyWin ? (
            <span className="text-3xl sm:text-4xl font-tile text-gold font-bold"
              style={{ textShadow: '0 0 20px rgba(212,168,75,0.5)' }}>
              화료! 和了
            </span>
          ) : (
            <span className="text-2xl sm:text-3xl font-tile text-action-danger">
              {getPlayerLabel(winner!)} 화료
            </span>
          )}
          {!isDraw && (
            <div className="text-xs text-text-muted mt-1">
              {isTsumo ? '쯔모 (自摸)' : '론 (榮)'}
            </div>
          )}
        </h2>

        {/* 승자 손패 + 역 + 정산 */}
        {winResult && winner !== null && winnerPlayer && (
          <div className="mb-4 sm:mb-5">
            {/* 화료패 표시 */}
            <div className="flex items-center justify-center gap-0.5 sm:gap-1 mb-4 flex-wrap">
              {/* 손패 (마스킹 안 된 것만) */}
              {winnerPlayer.hand.filter(id => id >= 0).map(id => (
                <TileComponent key={id} tileId={id} size="sm" />
              ))}
              {/* 쯔모: drawnTile 하이라이트 */}
              {isTsumo && winnerPlayer.drawnTile !== null && winnerPlayer.drawnTile >= 0 && (
                <div className="ml-1.5 sm:ml-2 ring-2 ring-gold rounded-sm">
                  <TileComponent tileId={winnerPlayer.drawnTile} size="sm" />
                </div>
              )}
              {/* 론: lastDiscard 하이라이트 */}
              {!isTsumo && gameState.lastDiscard && (
                <div className="ml-1.5 sm:ml-2 ring-2 ring-action-danger rounded-sm">
                  <TileComponent tileId={gameState.lastDiscard.tileId} size="sm" />
                </div>
              )}
              {/* 부로 면자 */}
              {winnerPlayer.melds.length > 0 && (
                <div className="ml-2 sm:ml-3 flex gap-0.5">
                  {winnerPlayer.melds.map((meld, mi) => (
                    <div key={mi} className="flex gap-[1px]">
                      {meld.tileIds.map(tid => (
                        <TileComponent key={tid} tileId={tid} size="sm" />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 역 목록 */}
            <div className="space-y-1 mb-3">
              {winResult.scoring.yakuList.map(({ yaku, count }, idx) => {
                const pts = yaku.points * count;
                const tierColor = pts >= 64 ? 'text-action-danger' :
                  pts >= 24 ? 'text-gold' :
                  pts >= 6 ? 'text-action-blue' : 'text-text-primary';
                const tierBg = pts >= 64 ? 'bg-action-danger/10 border-action-danger/20' :
                  pts >= 24 ? 'bg-gold/10 border-gold/20' :
                  pts >= 6 ? 'bg-action-blue/10 border-action-blue/20' : 'bg-base/50 border-transparent';
                return (
                  <div key={idx}
                    className={`flex justify-between items-center px-3 py-1.5 rounded border ${tierBg}`}
                    style={{ animationDelay: `${idx * 80}ms` }}>
                    <div>
                      <span className="text-text-primary text-sm">{yaku.nameKo}</span>
                      <span className="text-text-muted text-xs ml-2">{yaku.nameCn}</span>
                    </div>
                    <span className={`font-display font-bold ${tierColor}`}>
                      {pts}점
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 총점 */}
            <div className="text-center py-2 border-t border-gold/20 mb-3">
              <span className="text-text-secondary text-sm mr-2">총점</span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-gold"
                style={{ textShadow: '0 0 16px rgba(212,168,75,0.4)' }}>
                {winResult.scoring.totalPoints}점
              </span>
            </div>

            {/* MCR 정산 */}
            {settlement && (
              <div className="mb-3">
                <h3 className="text-xs text-text-muted text-center mb-2">정산</h3>
                {/* 지불 흐름 */}
                <div className="space-y-1 mb-2">
                  {settlement.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between
                      bg-base/40 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                      <span className="text-action-danger truncate max-w-[30%]">
                        {getPlayerLabel(p.from)}
                      </span>
                      <span className="text-text-muted flex-shrink-0 px-1">
                        → {p.amount}점 →
                      </span>
                      <span className="text-green-400 truncate max-w-[30%] text-right">
                        {getPlayerLabel(p.to)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* 각 플레이어 점수 변동 */}
                <div className="grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map(seat => {
                    const delta = settlement.playerDeltas[seat];
                    const p = gameState.players[seat];
                    const wind = WIND_LABELS[seat % 4];
                    return (
                      <div key={seat} className={`text-center py-1.5 rounded-lg text-[10px] sm:text-xs
                        ${delta > 0 ? 'bg-green-500/10 text-green-400' :
                          delta < 0 ? 'bg-action-danger/10 text-action-danger' :
                          'bg-panel text-text-muted'}`}>
                        <div className="truncate px-1">{p?.name || wind}</div>
                        <div className="font-display font-bold text-sm">
                          {delta > 0 ? '+' : ''}{delta}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 유국 시 사유 */}
        {isDraw && (
          <div className="text-center text-text-muted text-sm mb-4">
            패산이 소진되어 유국이 되었습니다.
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={onRematch}
            disabled={rematchLoading}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer
              bg-gold/20 text-gold border border-gold/30
              hover:bg-gold/30 transition-colors disabled:opacity-50"
          >
            {rematchLoading ? '준비 중...' : '다시하기'}
          </button>
          {isMyWin && winResult && (
            <button
              onClick={handleShare}
              className="px-5 py-2.5 rounded-lg font-semibold text-sm cursor-pointer
                bg-panel-light text-text-secondary border border-white/10
                hover:border-white/20 transition-colors"
            >
              결과 공유
            </button>
          )}
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
  );
}
