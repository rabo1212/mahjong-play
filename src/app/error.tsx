'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-base flex flex-col items-center justify-center gap-4 px-4">
      <div className="text-4xl font-tile text-action-danger">오류</div>
      <p className="text-text-secondary text-sm text-center max-w-sm">
        예상치 못한 오류가 발생했습니다.
      </p>
      {error.message && (
        <p className="text-text-muted text-xs text-center max-w-sm bg-panel/50 rounded-lg px-3 py-2">
          {error.message}
        </p>
      )}
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer
            bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-colors"
        >
          다시 시도
        </button>
        <a
          href="/"
          className="px-5 py-2 rounded-lg text-sm font-semibold
            bg-panel-light text-text-secondary border border-white/10
            hover:border-white/20 transition-colors"
        >
          메인으로
        </a>
      </div>
    </main>
  );
}
