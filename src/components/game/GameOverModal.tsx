'use client';

import React from 'react';
import { GameState } from '@/engine/types';
import { calculateSettlement } from '@/engine/settlement';
import TileComponent from './TileComponent';

interface GameOverModalProps {
  state: GameState;
  onRestart: () => void;
  onBackToMenu: () => void;
  /** 세션 모드: 다음 국으로 */
  onNextRound?: () => void;
  /** 세션 누적 점수 (4명) */
  sessionScores?: number[];
  /** 현재 국 번호 (0~3) */
  currentRound?: number;
  /** 총 국 수 (동풍전: 4) */
  maxRounds?: number;
  /** 세션 종료 여부 */
  isSessionOver?: boolean;
}

const WIND_CHARS: Record<number, string> = { 41: '東', 42: '南', 43: '西', 44: '北' };
const WIND_FALLBACK = ['東', '南', '西', '北'];

export default function GameOverModal({
  state,
  onRestart,
  onBackToMenu,
  onNextRound,
  sessionScores,
  currentRound,
  maxRounds,
  isSessionOver,
}: GameOverModalProps) {
  // 동적 좌석풍 라벨
  const getSeatLabel = (idx: number) => {
    const wind = WIND_CHARS[state.players[idx]?.seatWind] || WIND_FALLBACK[idx];
    return idx === 0 ? `나 (${wind})` : `AI ${idx} (${wind})`;
  };
  const getShortLabel = (idx: number) => idx === 0 ? '나' : `AI ${idx}`;

  const winner = state.winner;
  const winResult = state.winResult;
  const isPlayerWin = winner === 0;
  const isDraw = winner === null;

  // 쯔모/론 판별
  const isTsumo = winResult
    ? winResult.scoring.yakuList.some(y => y.yaku.id === 'self_drawn')
    : false;
  const fromPlayerId = !isTsumo && state.lastDiscard
    ? state.lastDiscard.playerId
    : undefined;

  // 정산 계산
  const settlement = winner !== null && winResult
    ? calculateSettlement(winner, winResult.scoring.totalPoints, isTsumo, fromPlayerId)
    : null;

  // 승자 정보
  const winnerPlayer = winner !== null ? state.players[winner] : null;

  // 세션 최종 순위 (isSessionOver일 때)
  const finalRanking = isSessionOver && sessionScores
    ? sessionScores
        .map((score, idx) => ({ idx, score }))
        .sort((a, b) => b.score - a.score)
    : null;

  // 공유 텍스트
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

        {/* 국 번호 뱃지 */}
        {currentRound !== undefined && maxRounds && (
          <div className="text-center mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              東{currentRound + 1}局 / {maxRounds}국
            </span>
          </div>
        )}

        {/* 타이틀 */}
        <h2 className="text-center mb-4 sm:mb-5">
          {isDraw ? (
            <span className="text-2xl sm:text-3xl font-tile text-text-secondary">유국 流局</span>
          ) : isPlayerWin ? (
            <span className="text-3xl sm:text-4xl font-tile text-gold font-bold"
              style={{ textShadow: '0 0 20px rgba(212,168,75,0.5)' }}>
              화료! 和了
            </span>
          ) : (
            <span className="text-2xl sm:text-3xl font-tile text-action-danger">
              {getSeatLabel(winner!)} 화료
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
              {winnerPlayer.hand.map(id => (
                <TileComponent key={id} tileId={id} size="sm" />
              ))}
              {isTsumo && winnerPlayer.drawnTile !== null && (
                <div className="ml-1.5 sm:ml-2 ring-2 ring-gold rounded-sm">
                  <TileComponent tileId={winnerPlayer.drawnTile} size="sm" />
                </div>
              )}
              {!isTsumo && state.lastDiscard && (
                <div className="ml-1.5 sm:ml-2 ring-2 ring-action-danger rounded-sm">
                  <TileComponent tileId={state.lastDiscard.tileId} size="sm" />
                </div>
              )}
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
                <div className="space-y-1 mb-2">
                  {settlement.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between
                      bg-base/40 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                      <span className="text-action-danger truncate max-w-[30%]">
                        {getSeatLabel(p.from)}
                      </span>
                      <span className="text-text-muted flex-shrink-0 px-1">
                        → {p.amount}점 →
                      </span>
                      <span className="text-green-400 truncate max-w-[30%] text-right">
                        {getSeatLabel(p.to)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map(seat => {
                    const delta = settlement.playerDeltas[seat];
                    return (
                      <div key={seat} className={`text-center py-1.5 rounded-lg text-[10px] sm:text-xs
                        ${delta > 0 ? 'bg-green-500/10 text-green-400' :
                          delta < 0 ? 'bg-action-danger/10 text-action-danger' :
                          'bg-panel text-text-muted'}`}>
                        <div className="truncate px-1">{getShortLabel(seat)}</div>
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

        {/* 세션 누적 점수 */}
        {sessionScores && !isSessionOver && (
          <div className="mb-4 border-t border-white/5 pt-3">
            <h3 className="text-xs text-text-muted text-center mb-2">누적 점수</h3>
            <div className="grid grid-cols-4 gap-1">
              {sessionScores.map((score, idx) => (
                <div key={idx} className={`text-center py-1.5 rounded-lg text-[10px] sm:text-xs
                  ${idx === 0 ? 'bg-gold/10 border border-gold/20' : 'bg-panel border border-white/5'}`}>
                  <div className="truncate px-1 text-text-muted">{getShortLabel(idx)}</div>
                  <div className={`font-display font-bold text-sm ${
                    idx === 0 ? 'text-gold' : 'text-text-secondary'
                  }`}>
                    {score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 세션 최종 결과 (4국 완료) */}
        {isSessionOver && finalRanking && (
          <div className="mb-4 border-t border-gold/20 pt-4">
            <h3 className="text-sm text-gold text-center mb-3 font-display font-bold">
              동풍전 최종 결과
            </h3>
            <div className="space-y-1.5">
              {finalRanking.map((entry, rank) => {
                const isMe = entry.idx === 0;
                const rankColors = [
                  'bg-gold/15 border-gold/30 text-gold',
                  'bg-white/5 border-white/10 text-text-secondary',
                  'bg-white/5 border-white/5 text-text-muted',
                  'bg-white/5 border-white/5 text-text-muted',
                ];
                return (
                  <div key={entry.idx}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border ${rankColors[rank]}
                      ${isMe ? 'ring-1 ring-gold/30' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm w-5">
                        {rank + 1}위
                      </span>
                      <span className={`text-sm ${isMe ? 'font-semibold' : ''}`}>
                        {getSeatLabel(entry.idx)}
                      </span>
                    </div>
                    <span className="font-display font-bold text-base">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 justify-center flex-wrap">
          {/* 다음 국으로 (세션 진행 중일 때) */}
          {onNextRound && !isSessionOver && (
            <button
              onClick={onNextRound}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer
                bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
                hover:shadow-gold-glow active:scale-[0.98] transition-all"
            >
              다음 국으로
            </button>
          )}
          <button
            onClick={onRestart}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors
              ${onNextRound && !isSessionOver
                ? 'bg-panel-light text-text-secondary border border-white/10 hover:border-white/20'
                : 'bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30'
              }`}
          >
            {isSessionOver ? '새 동풍전' : '처음부터'}
          </button>
          {isPlayerWin && winResult && (
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
            메인으로
          </button>
        </div>
      </div>
    </div>
  );
}
