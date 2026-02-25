'use client';

import React from 'react';
import { GameState } from '@/engine/types';
import TileComponent from './TileComponent';

interface GameOverModalProps {
  state: GameState;
  onRestart: () => void;
  onBackToMenu: () => void;
}

const SEAT_LABELS = ['나 (東)', 'AI 1 (南)', 'AI 2 (西)', 'AI 3 (北)'];

export default function GameOverModal({ state, onRestart, onBackToMenu }: GameOverModalProps) {
  const winner = state.winner;
  const winResult = state.winResult;
  const isPlayerWin = winner === 0;
  const isDraw = winner === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(212,168,75,0.1) 0%, rgba(0,0,0,0.75) 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="bg-gradient-to-b from-panel-light to-panel rounded-2xl border border-gold/20 shadow-gold-glow p-5 sm:p-8 max-w-lg w-full mx-4 animate-slide-up">
        {/* 타이틀 */}
        <h2 className="text-center mb-6">
          {isDraw ? (
            <span className="text-3xl font-tile text-text-secondary">유국 流局</span>
          ) : isPlayerWin ? (
            <span className="text-4xl font-tile text-gold font-bold"
              style={{ textShadow: '0 0 20px rgba(212,168,75,0.5)' }}>
              화료! 和了
            </span>
          ) : (
            <span className="text-3xl font-tile text-action-danger">
              {SEAT_LABELS[winner!]} 화료
            </span>
          )}
        </h2>

        {/* 역 목록 & 점수 */}
        {winResult && (
          <div className="mb-6">
            {/* 화료패 표시 */}
            {winner !== null && (
              <div className="flex items-center justify-center gap-1 mb-4">
                {state.players[winner].hand.map(id => (
                  <TileComponent key={id} tileId={id} size="sm" />
                ))}
                {state.players[winner].drawnTile !== null && (
                  <div className="ml-2">
                    <TileComponent tileId={state.players[winner].drawnTile!} size="sm" />
                  </div>
                )}
              </div>
            )}

            {/* 역 목록 */}
            <div className="space-y-1 mb-4">
              {winResult.scoring.yakuList.map(({ yaku, count }, idx) => {
                const pts = yaku.points * count;
                const tierColor = pts >= 64 ? 'text-action-danger' :
                  pts >= 24 ? 'text-gold' :
                  pts >= 6 ? 'text-action-blue' : 'text-text-primary';
                const tierBg = pts >= 64 ? 'bg-action-danger/10 border-action-danger/20' :
                  pts >= 24 ? 'bg-gold/10 border-gold/20' :
                  pts >= 6 ? 'bg-action-blue/10 border-action-blue/20' : 'bg-base/50 border-transparent';
                return (
                  <div key={idx} className={`flex justify-between items-center px-3 py-1.5 rounded border ${tierBg}`}
                    style={{ animationDelay: `${idx * 100}ms` }}>
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
            <div className="text-center py-3 border-t border-gold/20">
              <span className="text-text-secondary text-sm mr-2">총점</span>
              <span className="font-display font-bold text-3xl text-gold"
                style={{ textShadow: '0 0 16px rgba(212,168,75,0.4)' }}>
                {winResult.scoring.totalPoints}점
              </span>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            className="action-btn action-btn-win px-8"
            onClick={onRestart}
          >
            다시하기
          </button>
          {isPlayerWin && winResult && (
            <button
              className="action-btn px-6"
              onClick={() => {
                const yakuNames = winResult.scoring.yakuList.map(y => y.yaku.nameKo).join(', ');
                const text = `MahjongPlay - ${winResult.scoring.totalPoints}점 화료!\n역: ${yakuNames}\nhttps://mahjong-play-rho.vercel.app`;
                if (navigator.share) {
                  navigator.share({ text }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(text).then(() => {
                    alert('클립보드에 복사되었습니다!');
                  }).catch(() => {});
                }
              }}
            >
              결과 공유
            </button>
          )}
          <button
            className="action-btn action-btn-pass px-8"
            onClick={onBackToMenu}
          >
            메인으로
          </button>
        </div>
      </div>
    </div>
  );
}
