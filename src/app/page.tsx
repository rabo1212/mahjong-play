'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Difficulty } from '@/engine/types';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getStats, getHistory, clearHistory, type GameRecord } from '@/lib/history';

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
  const [showLocalHistory, setShowLocalHistory] = useState(false);
  const [localHistory, setLocalHistory] = useState<GameRecord[]>([]);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  useEffect(() => {
    setStats(getStats());
    setLocalHistory(getHistory());
    fetch('/api/rooms').then(r => r.json()).then(d => {
      setRoomCount(d.rooms?.length ?? 0);
    }).catch(() => {});
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
          <button
            onClick={() => setShowLocalHistory(!showLocalHistory)}
            className="w-full bg-panel/60 rounded-xl border border-white/5 px-4 sm:px-6 py-3 sm:py-4
              hover:border-white/10 transition-colors cursor-pointer text-left"
          >
            <div className="text-[10px] text-text-muted text-center mb-2">AI 대전 기록</div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-display font-bold text-gold">{stats.winRate}%</div>
                <div className="text-[10px] sm:text-xs text-text-muted">승률</div>
              </div>
              <div className="flex gap-4 sm:gap-6 text-center">
                <div>
                  <div className="text-sm sm:text-base font-display font-semibold text-text-secondary">{stats.total}</div>
                  <div className="text-[10px] sm:text-xs text-text-muted">총</div>
                </div>
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
            <div className="text-center mt-2">
              <span className="text-[10px] text-text-muted">
                {showLocalHistory ? '접기 ▲' : '상세 보기 ▼'}
              </span>
            </div>
          </button>

          {/* 로컬 전적 목록 (접이식) */}
          {showLocalHistory && (
            <>
              {/* 난이도 필터 */}
              {localHistory.length > 0 && (
                <div className="flex gap-1.5 justify-center mt-2 mb-1">
                  {[{ key: 'all', label: '전체' }, { key: 'easy', label: '쉬움' },
                    { key: 'normal', label: '보통' }, { key: 'hard', label: '어려움' }].map(f => (
                    <button key={f.key}
                      onClick={() => setHistoryFilter(f.key)}
                      className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-colors ${
                        historyFilter === f.key
                          ? 'bg-gold/20 text-gold border border-gold/30'
                          : 'bg-white/5 text-text-muted border border-white/5 hover:border-white/10'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 전적 목록 */}
              {(() => {
                const filtered = historyFilter === 'all'
                  ? localHistory
                  : localHistory.filter(r => r.difficulty === historyFilter);
                if (filtered.length === 0) {
                  return (
                    <div className="mt-2 text-center text-xs text-text-muted py-4">
                      {localHistory.length === 0
                        ? '아직 게임 기록이 없습니다. AI 대전을 시작해보세요!'
                        : '해당 난이도의 기록이 없습니다.'}
                    </div>
                  );
                }
                return (
                  <div className="mt-2 space-y-1.5 max-h-[40vh] overflow-y-auto">
                    {filtered.slice(0, 20).map((record, i) => {
                      const d = new Date(record.date);
                      const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                      const resultLabel = record.result === 'draw' ? '유국' : record.result === 'win' ? '승' : '패';
                      const resultColor = record.result === 'draw'
                        ? 'bg-white/5 text-text-muted'
                        : record.result === 'win'
                          ? 'bg-gold/15 text-gold'
                          : 'bg-action-danger/15 text-action-danger';
                      const diffLabel = record.difficulty === 'easy' ? '쉬움' : record.difficulty === 'normal' ? '보통' : '어려움';

                      return (
                        <div key={i} className="bg-panel/60 rounded-lg border border-white/5 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center
                              font-display font-bold text-[11px] ${resultColor}`}>
                              {resultLabel}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-text-secondary">{dateStr}</span>
                                <span className="text-[10px] px-1 rounded bg-white/5 text-text-muted">{diffLabel}</span>
                                <span className="text-[10px] text-text-muted">{record.turns}턴</span>
                              </div>
                              {record.yakuNames.length > 0 && (
                                <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                                  {record.yakuNames.join(', ')}
                                </p>
                              )}
                            </div>
                            {record.score > 0 && (
                              <span className="flex-shrink-0 font-display font-bold text-xs text-gold">
                                {record.score}점
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 기록 삭제 */}
              {localHistory.length > 0 && (
                <div className="text-center mt-2">
                  <button
                    onClick={() => {
                      if (confirm('모든 AI 대전 기록을 삭제하시겠습니까?')) {
                        clearHistory();
                        setLocalHistory([]);
                        setStats({ total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgScore: 0 });
                      }
                    }}
                    className="text-[10px] text-text-muted hover:text-action-danger transition-colors cursor-pointer"
                  >
                    기록 삭제
                  </button>
                </div>
              )}
            </>
          )}
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
          AI 대전
        </button>
      </div>

      {/* 온라인 대전 버튼 */}
      <button
        className="w-full max-w-md py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer
          bg-action-blue/20 text-action-blue border border-action-blue/30
          hover:bg-action-blue/30 hover:shadow-[0_0_16px_rgba(74,159,217,0.2)] active:scale-[0.98]"
        onClick={() => router.push('/lobby')}
      >
        온라인 대전
        {roomCount !== null && roomCount > 0 && (
          <span className="ml-2 text-xs font-normal bg-action-blue/30 px-2 py-0.5 rounded-full">
            {roomCount}방 대기 중
          </span>
        )}
      </button>

      {/* 네비게이션 링크 */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => router.push('/rules')}
          className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer"
        >
          규칙
        </button>
        <button
          onClick={() => router.push('/leaderboard')}
          className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer"
        >
          랭킹
        </button>
        <button
          onClick={() => router.push('/history')}
          className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer"
        >
          온라인 전적
        </button>
        <button
          onClick={() => router.push('/yaku')}
          className="text-xs text-text-muted hover:text-gold transition-colors cursor-pointer"
        >
          역 사전
        </button>
      </div>

      {/* 하단 정보 */}
      <div className="mt-4 sm:mt-6 text-center text-[10px] sm:text-xs text-text-muted space-y-1">
        <p>중국식 마작 (국표마작, MCR) · AI 연습 + 온라인 대전</p>
        <p>4명 플레이 · 144장 · 25가지 역</p>
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
