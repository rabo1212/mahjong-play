import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-base flex flex-col items-center justify-center gap-4 px-4">
      <div className="text-6xl font-tile text-gold/30">404</div>
      <p className="text-text-secondary text-sm">
        페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        className="px-5 py-2 rounded-lg text-sm font-semibold
          bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-colors"
      >
        메인으로
      </Link>
    </main>
  );
}
