/**
 * POST /api/game/[roomId]/action — 통합 게임 액션
 * 클라이언트 → 서버 : 액션 전달
 * 서버: 엔진 호출 → DB 저장 → Realtime broadcast
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  doDiscard, advanceTurn,
  executeChi, executePon, executeMinkan, executeAnkan, executeKakan,
  declareRon, declareTsumo, skipAction,
  checkTsumoWin,
} from '@/engine/game-manager';
import { serializeGameState } from '@/engine/dto';
import { aiChooseDiscard, aiRespondToActions, aiShouldKakan } from '@/ai/ai-player';
import { resolveTopAction } from '@/engine/action-resolver';
import { getAnkanOptions } from '@/engine/hand';
import type { GameState, PendingAction } from '@/engine/types';
import type { GameAction } from '@/lib/online-types';

/** 기본 payload 검증 */
function validatePayload(body: unknown): { action: GameAction; version: number } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.version !== 'number') return null;
  if (!b.action || typeof b.action !== 'object') return null;
  const a = b.action as Record<string, unknown>;
  if (typeof a.type !== 'string') return null;
  return { action: a as unknown as GameAction, version: b.version };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const authHeader = req.headers.get('authorization');
  const supabase = createAuthenticatedClient(authHeader);

  // 인증
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  // 참가자 확인
  const { data: playerRow } = await supabase
    .from('mahjong_room_players')
    .select('seat_index')
    .eq('room_id', roomId)
    .eq('player_id', user.id)
    .single();

  if (!playerRow) {
    return NextResponse.json({ error: '이 방의 참가자가 아닙니다' }, { status: 403 });
  }

  const seatIndex: number = playerRow.seat_index;

  // payload 검증
  const rawBody = await req.json().catch(() => null);
  const validated = validatePayload(rawBody);
  if (!validated) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  }
  const { action, version } = validated;

  // 게임 상태 조회 (service_role)
  const { data: gameRow } = await supabaseAdmin
    .from('mahjong_game_states')
    .select('state, version')
    .eq('room_id', roomId)
    .single();

  if (!gameRow) {
    return NextResponse.json({ error: '게임이 시작되지 않았습니다' }, { status: 404 });
  }

  // 낙관적 잠금: 버전 불일치 시 거부
  if (gameRow.version !== version) {
    return NextResponse.json({ error: '상태가 변경되었습니다. 다시 시도해주세요.', stale: true }, { status: 409 });
  }

  const originalState = gameRow.state as GameState;

  // 액션 실행
  let state = applyAction(originalState, seatIndex, action);

  // 무효 액션 체크 (상태가 변하지 않았으면 거부)
  if (state === originalState) {
    return NextResponse.json({ error: '지금은 할 수 없는 액션입니다' }, { status: 400 });
  }

  // AI 턴 자동 처리 (연쇄)
  state = processAITurns(state);

  // DB 저장 — CAS로 0행 매치 감지
  const newVersion = gameRow.version + 1;
  const { data: updateResult, error: updateError } = await supabaseAdmin
    .from('mahjong_game_states')
    .update({
      state,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId)
    .eq('version', gameRow.version)
    .select('version');

  if (updateError) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }

  // CAS 실패: 다른 요청이 먼저 버전을 올렸으면 0행 반환
  if (!updateResult || updateResult.length === 0) {
    return NextResponse.json({ error: '동시 요청 충돌. 다시 시도해주세요.', stale: true }, { status: 409 });
  }

  // 방 코드 가져오기 (broadcast 채널명용)
  const { data: room } = await supabaseAdmin
    .from('mahjong_rooms')
    .select('code')
    .eq('id', roomId)
    .single();

  // 각 플레이어별 DTO broadcast
  if (room) {
    const allPlayers = await supabaseAdmin
      .from('mahjong_room_players')
      .select('seat_index, is_ai')
      .eq('room_id', roomId);

    const channel = supabaseAdmin.channel(`room:${room.code}`);

    for (const p of allPlayers.data || []) {
      if (p.is_ai) continue;
      const dto = serializeGameState(state, p.seat_index);
      await channel.send({
        type: 'broadcast',
        event: `game_state:${p.seat_index}`,
        payload: { state: dto, version: newVersion },
      });
    }
  }

  // 요청자에게 즉시 응답
  const dto = serializeGameState(state, seatIndex);
  return NextResponse.json({ state: dto, version: newVersion });
}

/** 플레이어 액션을 게임 상태에 적용 (무효 시 원래 state 참조 그대로 반환) */
function applyAction(state: GameState, seatIndex: number, action: GameAction): GameState {
  switch (action.type) {
    case 'discard': {
      if (state.phase !== 'discard' || state.turnIndex !== seatIndex) return state;
      if (typeof action.tileId !== 'number') return state;
      return doDiscard(state, action.tileId);
    }
    case 'chi': {
      if (state.phase !== 'action-pending') return state;
      if (!hasPendingAction(state, seatIndex, 'chi')) return state;
      if (!Array.isArray(action.tileIds) || action.tileIds.length !== 2) return state;
      return executeChi(state, seatIndex, action.tileIds);
    }
    case 'pon': {
      if (state.phase !== 'action-pending') return state;
      if (!hasPendingAction(state, seatIndex, 'pon')) return state;
      return executePon(state, seatIndex);
    }
    case 'kan': {
      if (state.phase !== 'action-pending') return state;
      if (!hasPendingAction(state, seatIndex, 'kan')) return state;
      return executeMinkan(state, seatIndex);
    }
    case 'ankan': {
      if (state.phase !== 'discard' || state.turnIndex !== seatIndex) return state;
      if (typeof action.kanKind !== 'number') return state;
      return executeAnkan(state, seatIndex, action.kanKind);
    }
    case 'kakan': {
      if (state.phase !== 'discard' || state.turnIndex !== seatIndex) return state;
      if (typeof action.meldIndex !== 'number' || action.meldIndex < 0) return state;
      return executeKakan(state, seatIndex, action.meldIndex);
    }
    case 'tsumo': {
      if (state.phase !== 'discard' || state.turnIndex !== seatIndex) return state;
      return declareTsumo(state, seatIndex);
    }
    case 'ron': {
      if (state.phase !== 'action-pending') return state;
      if (!hasPendingAction(state, seatIndex, 'win')) return state;
      return declareRon(state, seatIndex);
    }
    case 'skip': {
      if (state.phase !== 'action-pending') return state;
      if (!state.pendingActions.some(a => a.playerId === seatIndex)) return state;
      return skipAction(state, seatIndex);
    }
    default:
      return state;
  }
}

/** pendingActions에 해당 플레이어의 액션이 있는지 확인 */
function hasPendingAction(state: GameState, seatIndex: number, actionType: string): boolean {
  return state.pendingActions.some(a => a.playerId === seatIndex && a.action === actionType);
}

/** AI 턴 연속 처리 (사람 차례가 올 때까지 반복) */
function processAITurns(state: GameState): GameState {
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (iterations++ < MAX_ITERATIONS) {
    if (state.phase === 'game-over') break;

    // action-pending: AI 응답 처리
    if (state.phase === 'action-pending') {
      const aiResponses = processAIPendingActions(state);
      if (aiResponses === null) {
        break; // 사람 플레이어의 응답 대기 중
      }
      state = aiResponses;
      continue;
    }

    // discard: 현재 턴 플레이어가 AI인지 확인
    if (state.phase === 'discard') {
      const currentPlayer = state.players[state.turnIndex];
      if (!currentPlayer.isAI) break; // 사람 차례 → 중단

      // AI 가깡 체크
      const kakanIdx = aiShouldKakan(state, state.turnIndex);
      if (kakanIdx !== null) {
        state = executeKakan(state, state.turnIndex, kakanIdx);
        continue;
      }

      // AI 암깡 체크
      const ankanKind = aiCheckAnkan(state, state.turnIndex);
      if (ankanKind !== null) {
        state = executeAnkan(state, state.turnIndex, ankanKind);
        continue;
      }

      // AI 쯔모 체크
      if (checkTsumoWin(state)) {
        state = declareTsumo(state, state.turnIndex);
        continue;
      }

      // AI 버리기
      const discardTile = aiChooseDiscard(state, state.turnIndex);
      state = doDiscard(state, discardTile);
      continue;
    }

    break;
  }

  return state;
}

/** AI 암깡 판단 */
function aiCheckAnkan(state: GameState, playerIdx: number): number | null {
  const player = state.players[playerIdx];
  const fullHand = player.drawnTile !== null
    ? [...player.hand, player.drawnTile]
    : [...player.hand];
  const options = getAnkanOptions(fullHand);
  if (options.length === 0) return null;

  // Easy: 암깡 안 함, Normal: 50%, Hard: 항상
  if (state.difficulty === 'easy') return null;
  if (state.difficulty === 'normal' && Math.random() > 0.5) return null;
  return options[0];
}

/** action-pending 상태에서 AI 응답 수집 및 처리 */
function processAIPendingActions(state: GameState): GameState | null {
  if (!state.lastDiscard) return null;

  const pendingPlayerIds = Array.from(new Set(state.pendingActions.map(a => a.playerId)));

  // 사람 플레이어가 pending에 있으면 대기
  for (const pid of pendingPlayerIds) {
    if (!state.players[pid].isAI) return null;
  }

  // 모두 AI → 자동 처리
  const aiDecisions: Array<{ playerId: number; action: PendingAction | null }> = [];

  for (const pid of pendingPlayerIds) {
    const playerActions = state.pendingActions.filter(a => a.playerId === pid);
    const decision = aiRespondToActions(state, pid, playerActions);
    aiDecisions.push({ playerId: pid, action: decision });
  }

  const chosen = aiDecisions.filter(d => d.action !== null).map(d => d.action!);

  if (chosen.length === 0) {
    return advanceTurn({ ...state, pendingActions: [] });
  }

  const topAction = resolveTopAction(chosen, state.lastDiscard.playerId);
  if (!topAction) {
    return advanceTurn({ ...state, pendingActions: [] });
  }

  switch (topAction.action) {
    case 'win':
      return declareRon(state, topAction.playerId);
    case 'kan':
      return executeMinkan(state, topAction.playerId);
    case 'pon':
      return executePon(state, topAction.playerId);
    case 'chi':
      return executeChi(state, topAction.playerId, topAction.tiles);
    default:
      return advanceTurn({ ...state, pendingActions: [] });
  }
}
