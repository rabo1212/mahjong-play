/**
 * 게임 세션 관리 (동풍전 4라운드)
 * Phase E: 온라인 대국 전 라운드 시스템 기반
 */
import { GameState, Difficulty } from './types';
import { createInitialGameState, startGame } from './game-manager';

export interface GameSession {
  sessionId: string;
  difficulty: Difficulty;
  beginnerMode: boolean;
  currentRound: number;       // 0~3 (동1국~동4국)
  maxRounds: number;           // 동풍전: 4
  scores: number[];            // 4명 점수
  roundHistory: RoundResult[];
}

export interface RoundResult {
  round: number;
  winner: number | null;
  points: number;
  yakuNames: string[];
}

/** 간단한 ID 생성 */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 세션 생성 (동풍전 기본) */
export function createSession(difficulty: Difficulty, beginnerMode: boolean): GameSession {
  return {
    sessionId: generateSessionId(),
    difficulty,
    beginnerMode,
    currentRound: 0,
    maxRounds: 4,
    scores: [25000, 25000, 25000, 25000],
    roundHistory: [],
  };
}

/** 현재 라운드 GameState 생성 */
export function createRoundState(session: GameSession): GameState {
  const state = createInitialGameState(session.difficulty, session.beginnerMode);
  // 라운드에 따라 장풍 유지 (동풍전은 항상 동풍)
  // 딜러(동가)는 라운드에 따라 변경
  return startGame({
    ...state,
    roundWind: 41, // 동풍전: 항상 동
  });
}

/** 라운드 결과 기록 + 점수 반영 */
export function recordRoundResult(
  session: GameSession,
  gameState: GameState,
): GameSession {
  const winner = gameState.winner;
  const points = gameState.winResult?.scoring.totalPoints ?? 0;
  const yakuNames = gameState.winResult?.scoring.yakuList.map(y => y.yaku.nameKo) ?? [];

  const newScores = [...session.scores];
  if (winner !== null) {
    // 화료: 승자에게 점수 추가 (단순화된 점수 계산)
    const basePoints = points * 100;
    newScores[winner] += basePoints;
    // 다른 3명에서 균등 차감
    const perPlayer = Math.floor(basePoints / 3);
    for (let i = 0; i < 4; i++) {
      if (i !== winner) newScores[i] -= perPlayer;
    }
  }

  return {
    ...session,
    currentRound: session.currentRound + 1,
    scores: newScores,
    roundHistory: [
      ...session.roundHistory,
      { round: session.currentRound, winner, points, yakuNames },
    ],
  };
}

/** 세션 종료 여부 */
export function isSessionOver(session: GameSession): boolean {
  return session.currentRound >= session.maxRounds;
}

/** 최종 순위 (점수 내림차순) */
export function getFinalRanking(session: GameSession): { playerId: number; score: number }[] {
  return session.scores
    .map((score, playerId) => ({ playerId, score }))
    .sort((a, b) => b.score - a.score);
}
