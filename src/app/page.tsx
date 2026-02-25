'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Difficulty } from '@/engine/types';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getStats } from '@/lib/history';

export default function Home() {
  const router = useRouter();
  const difficulty = useSettingsStore(s => s.difficulty);
  const setDifficulty = useSettingsStore(s => s.setDifficulty);
  const beginnerMode = useSettingsStore(s => s.beginnerMode);
  const setBeginnerMode = useSettingsStore(s => s.setBeginnerMode);
  const showHints = useSettingsStore(s => s.showHints);
  const setShowHints = useSettingsStore(s => s.setShowHints);
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const setSoundEnabled = useSettingsStore(s => s.setSoundEnabled);

  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgScore: 0 });

  useEffect(() => {
    setStats(getStats());
  }, []);

  const startGame = () => {
    router.push(`/game?difficulty=${difficulty}&beginner=${beginnerMode}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-base px-4 py-8">
      {/* 로고 */}
      <div className="mb-8 sm:mb-12 text-center">
        <h1 className="text-4xl sm:text-6xl font-display font-bold text-gold mb-2"
          style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}>
          MahjongPlay
        </h1>
        <p className="text-sm sm:text-lg text-text-secondary">
          마작플레이 — 몰라도 배우면서 즐기자
        </p>
      </div>

      {/* 전적 (플레이 기록이 있을 때만) */}
      {stats.total > 0 && (
        <div className="w-full max-w-md mb-4 sm:mb-6 animate-fade-in">
          <div className="bg-panel/60 rounded-xl border border-white/5 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-display font-bold text-gold">{stats.winRate}%</div>
                <div className="text-[10px] sm:text-xs text-text-muted">승률</div>
              </div>
              <div className="flex gap-4 sm:gap-6 text-center">
                <div>
                  <div className="text-sm sm:text-base font-display font-semibold text-action-success">{stats.wins}</div>
                  <div className="text-[10px] sm:text-xs text-text-muted">승</div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-display font-semibold text-action-danger">{stats.losses}</div>
                  <div className="text-[10px] sm:text-xs text-text-muted">패</div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-display font-semibold text-text-secondary">{stats.draws}</div>
                  <div className="text-[10px] sm:text-xs text-text-muted">무</div>
                </div>
              </div>
              {stats.avgScore > 0 && (
                <div className="text-center">
                  <div className="text-sm sm:text-base font-display font-semibold text-gold-light">{stats.avgScore}</div>
                  <div className="text-[10px] sm:text-xs text-text-muted">평균점</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 설정 카드 */}
      <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-5 sm:p-8 w-full max-w-md mb-4 sm:mb-6">
        {/* 난이도 */}
        <div className="mb-5 sm:mb-6">
          <label className="block text-xs sm:text-sm text-text-secondary mb-2 sm:mb-3">난이도</label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                className={`py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  difficulty === d
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'bg-panel-light text-text-secondary border border-white/5 hover:border-white/10'
                }`}
                onClick={() => setDifficulty(d)}
              >
                {d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움'}
              </button>
            ))}
          </div>
          <p className="text-[10px] sm:text-xs text-text-muted mt-2">
            {difficulty === 'easy' && 'AI가 랜덤하게 플레이합니다. 마작 입문용!'}
            {difficulty === 'normal' && 'AI가 향청수 기반 전략으로 플레이합니다.'}
            {difficulty === 'hard' && 'AI가 공격·수비를 모두 고려합니다.'}
          </p>
        </div>

        {/* 토글 설정들 */}
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {/* 초보자 모드 */}
          <ToggleOption
            label="초보자 모드"
            description="8점 제한 없이 아무 조합이든 화료 가능"
            checked={beginnerMode}
            onChange={setBeginnerMode}
          />

          {/* 가이드 표시 */}
          <ToggleOption
            label="가이드 표시"
            description="향청수, 대기패, 추천 버리기를 표시"
            checked={showHints}
            onChange={setShowHints}
          />

          {/* 효과음 */}
          <ToggleOption
            label="효과음"
            description="패 놓기, 부로, 화료 효과음"
            checked={soundEnabled}
            onChange={setSoundEnabled}
          />
        </div>

        {/* 시작 버튼 */}
        <button
          className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer
            bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
            hover:shadow-gold-glow active:scale-[0.98]"
          onClick={startGame}
        >
          게임 시작
        </button>
      </div>

      {/* 하단 정보 */}
      <div className="text-center text-[10px] sm:text-xs text-text-muted space-y-1">
        <p>중국식 마작 (국표마작, MCR) · AI 연습 모드</p>
        <p>4명 플레이 · 144장 · 20가지 역</p>
      </div>
    </main>
  );
}

/** 토글 옵션 컴포넌트 */
function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors relative flex-shrink-0 ${
          checked ? 'bg-gold' : 'bg-panel-light border border-white/10'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
            checked ? 'translate-x-[20px] sm:translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
      <div>
        <span className="text-xs sm:text-sm text-text-primary">{label}</span>
        <p className="text-[10px] sm:text-xs text-text-muted">{description}</p>
      </div>
    </label>
  );
}
