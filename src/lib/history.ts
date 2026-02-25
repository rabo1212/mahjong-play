/**
 * 게임 전적 기록 (localStorage)
 */

export interface GameRecord {
  date: string;          // ISO string
  difficulty: string;
  result: 'win' | 'lose' | 'draw';
  score: number;         // 화료 시 점수, 아니면 0
  yakuNames: string[];   // 성립된 역 이름들
  turns: number;         // 총 턴 수
}

const STORAGE_KEY = 'mahjong-history';
const MAX_RECORDS = 50;

export function getHistory(): GameRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecord(record: GameRecord) {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    history.unshift(record);
    if (history.length > MAX_RECORDS) history.length = MAX_RECORDS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage 불가 시 무시
  }
}

export function getStats() {
  const history = getHistory();
  const total = history.length;
  const wins = history.filter(r => r.result === 'win').length;
  const draws = history.filter(r => r.result === 'draw').length;
  const losses = total - wins - draws;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const avgScore = wins > 0
    ? Math.round(history.filter(r => r.result === 'win').reduce((s, r) => s + r.score, 0) / wins)
    : 0;

  return { total, wins, losses, draws, winRate, avgScore };
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
