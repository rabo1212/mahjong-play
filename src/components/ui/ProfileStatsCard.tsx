'use client';

interface ProfileStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  avgPointsPerWin: number;
  bestScore: number;
  topYaku: { nameKo: string; count: number }[];
  currentStreak: { type: 'win' | 'lose'; count: number };
}

interface ProfileStatsCardProps {
  stats: ProfileStats | null;
  loading: boolean;
}

export default function ProfileStatsCard({ stats, loading }: ProfileStatsCardProps) {
  if (loading) {
    return (
      <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-5 w-full max-w-sm">
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-6 bg-white/5 rounded animate-pulse mb-1" />
              <div className="h-3 bg-white/5 rounded animate-pulse w-2/3 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-5 w-full max-w-sm text-center">
        <p className="text-sm text-text-muted">아직 대국 기록이 없습니다.</p>
        <p className="text-xs text-text-muted mt-1">첫 대국을 시작해보세요!</p>
      </div>
    );
  }

  const statItems = [
    { value: stats.totalGames, label: '대국' },
    { value: stats.totalWins, label: '승리' },
    { value: `${stats.winRate}%`, label: '승률' },
    { value: stats.avgPointsPerWin, label: '평균' },
  ];

  return (
    <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-5 w-full max-w-sm animate-fade-in">
      {/* 4칸 통계 그리드 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {statItems.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-lg font-display font-bold text-gold">{item.value}</div>
            <div className="text-[10px] text-text-muted">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 최고 점수 + 연승/연패 */}
      {(stats.bestScore > 0 || stats.currentStreak.count >= 2) && (
        <div className="flex items-center justify-between text-xs mb-3">
          {stats.bestScore > 0 && (
            <span className="text-text-secondary">
              최고 <span className="font-display text-gold font-semibold">{stats.bestScore}</span>점
            </span>
          )}
          {stats.currentStreak.count >= 2 && (
            <span className={stats.currentStreak.type === 'win' ? 'text-gold' : 'text-action-danger'}>
              {stats.currentStreak.count}연{stats.currentStreak.type === 'win' ? '승' : '패'} 중
            </span>
          )}
        </div>
      )}

      {/* 자주 나온 역 */}
      {stats.topYaku.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted">자주 나온 역</span>
          {stats.topYaku.map((y, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-secondary">
              {y.nameKo} {y.count}회
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
