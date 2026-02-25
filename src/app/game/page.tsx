'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { Difficulty } from '@/engine/types';
import GameTable from '@/components/game/GameTable';

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initGame = useGameStore(s => s.initGame);
  const phase = useGameStore(s => s.phase);

  useEffect(() => {
    if (phase === 'idle') {
      const difficulty = (searchParams.get('difficulty') || 'easy') as Difficulty;
      const beginner = searchParams.get('beginner') !== 'false';
      initGame(difficulty, beginner);
    }
  }, [phase, searchParams, initGame]);

  if (phase === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-text-secondary text-lg">배패 중...</div>
      </div>
    );
  }

  return <GameTable onBackToMenu={() => router.push('/')} />;
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-text-secondary text-lg">로딩 중...</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
