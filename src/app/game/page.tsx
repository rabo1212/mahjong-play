'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { Difficulty } from '@/engine/types';
import GameTable from '@/components/game/GameTable';
import OnlineGameTable from '@/components/game/OnlineGameTable';

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode'); // 'online' or null (local)
  const roomId = searchParams.get('roomId');
  const roomCode = searchParams.get('code');

  // 로컬 모드: 세션 기반 초기화
  const phase = useGameStore(s => s.phase);
  const startSession = useSessionStore(s => s.startSession);

  useEffect(() => {
    if (mode === 'online') return;
    if (phase === 'idle') {
      // 튜토리얼 모드: easy + beginner 강제
      if (mode === 'tutorial') {
        startSession('easy', true);
      } else {
        const difficulty = (searchParams.get('difficulty') || 'easy') as Difficulty;
        const beginner = searchParams.get('beginner') !== 'false';
        startSession(difficulty, beginner);
      }
    }
  }, [mode, phase, searchParams, startSession]);

  // 온라인 모드: 필수 파라미터 누락 시 로비로 리다이렉트
  if (mode === 'online' && (!roomId || !roomCode)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base gap-3">
        <p className="text-text-secondary">잘못된 접근입니다.</p>
        <button
          onClick={() => router.push('/lobby')}
          className="px-4 py-2 rounded-lg bg-panel text-text-secondary text-sm cursor-pointer hover:bg-panel-light transition-colors"
        >
          로비로 돌아가기
        </button>
      </div>
    );
  }

  // 온라인 모드
  if (mode === 'online' && roomId && roomCode) {
    return (
      <OnlineGameTable
        roomId={roomId}
        roomCode={roomCode}
        onBackToMenu={() => router.push('/lobby')}
      />
    );
  }

  // 튜토리얼 모드
  if (mode === 'tutorial') {
    if (phase === 'idle') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-base">
          <div className="text-text-secondary text-lg">배패 중...</div>
        </div>
      );
    }
    return <GameTable onBackToMenu={() => router.push('/')} tutorialMode />;
  }

  // 로컬 모드
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
