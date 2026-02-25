/**
 * POST /api/game/[roomId]/action — 통합 게임 액션
 * 클라이언트 → 서버 : 액션 전달
 * 서버: 엔진 호출 → DB 저장 → Realtime broadcast
 *
 * action-pending 시 응답 수집 모드:
 * - 인간 플레이어 응답을 collectedResponses에 저장
 * - 전원 응답 완료 시 AI 응답 추가 → 우선순위로 resolve
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

  // 게임 오버 시 전적 반영
  if (state.phase === 'game-over' && originalState.phase !== 'game-over') {
    await handleGameOver(roomId, state);
  }

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

// ============================================================
// 액션 적용
// ============================================================

/** 플레이어 액션을 게임 상태에 적용 (무효 시 원래 state 참조 그대로 반환) */
function applyAction(state: GameState, seatIndex: number, action: GameAction): GameState {
  // discard 단계 액션 (즉시 실행)
  switch (action.type) {
    case 'discard': {
      if (state.phase !== 'discard' || state.turnIndex !== seatIndex) return state;
      if (typeof action.tileId !== 'number') return state;
      return doDiscard(state, action.tileId);
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
  }

  // action-pending 단계: 응답 수집 모드
  if (state.phase !== 'action-pending') return state;

  switch (action.type) {
    case 'skip': {
      if (!state.pendingActions.some(a => a.playerId === seatIndex)) return state;
      // 스킵: pending에서 제거 + 이미 수집된 응답에서도 제거 (혹시 있으면)
      const afterSkip = skipAction(state, seatIndex);
      const cleaned = {
        ...afterSkip,
        collectedResponses: (afterSkip.collectedResponses || [])
          .filter(r => r.playerId !== seatIndex),
      };
      // 모든 인간 pending이 해결되었는지 확인 → resolve 시도
      return tryResolveCollected(cleaned);
    }
    case 'chi': {
      if (!hasPendingAction(state, seatIndex, 'chi')) return state;
      if (!Array.isArray(action.tileIds) || action.tileIds.length !== 2) return state;
      const chosenAction = state.pendingActions.find(
        a => a.playerId === seatIndex && a.action === 'chi'
      )!;
      return collectResponse(state, seatIndex, { ...chosenAction, tiles: action.tileIds });
    }
    case 'pon': {
      if (!hasPendingAction(state, seatIndex, 'pon')) return state;
      const chosenAction = state.pendingActions.find(
        a => a.playerId === seatIndex && a.action === 'pon'
      )!;
      return collectResponse(state, seatIndex, chosenAction);
    }
    case 'kan': {
      if (!hasPendingAction(state, seatIndex, 'kan')) return state;
      const chosenAction = state.pendingActions.find(
        a => a.playerId === seatIndex && a.action === 'kan'
      )!;
      return collectResponse(state, seatIndex, chosenAction);
    }
    case 'ron': {
      if (!hasPendingAction(state, seatIndex, 'win')) return state;
      const chosenAction = state.pendingActions.find(
        a => a.playerId === seatIndex && a.action === 'win'
      )!;
      return collectResponse(state, seatIndex, chosenAction);
    }
    default:
      return state;
  }
}

/**
 * 인간 플레이어의 응답을 collectedResponses에 추가 후 resolve 시도
 */
function collectResponse(state: GameState, playerId: number, action: PendingAction): GameState {
  const responses = state.collectedResponses || [];
  // 이미 응답한 플레이어면 무시
  if (responses.some(r => r.playerId === playerId)) return state;

  const newState: GameState = {
    ...state,
    collectedResponses: [...responses, { playerId, action }],
  };

  return tryResolveCollected(newState);
}

/**
 * 모든 인간 pending 플레이어가 응답(수집 또는 스킵)했는지 확인
 * → 완료 시 AI 응답 추가 → 우선순위 resolve → 실행
 */
function tryResolveCollected(state: GameState): GameState {
  if (state.phase !== 'action-pending') return state;
  if (!state.lastDiscard) return state;

  const responses = state.collectedResponses || [];
  const pendingPlayerIds = Array.from(new Set(state.pendingActions.map(a => a.playerId)));

  // 아직 응답 안 한 인간 플레이어가 있는지
  for (const pid of pendingPlayerIds) {
    if (state.players[pid].isAI) continue; // AI는 자동 처리
    if (responses.some(r => r.playerId === pid)) continue; // 이미 응답함
    return state; // 아직 대기 중인 인간 있음 → 상태 저장만
  }

  // 모든 인간 응답 완료 → AI 응답 수집
  const allChosen: PendingAction[] = responses.map(r => r.action);

  for (const pid of pendingPlayerIds) {
    if (!state.players[pid].isAI) continue;
    const playerActions = state.pendingActions.filter(a => a.playerId === pid);
    const decision = aiRespondToActions(state, pid, playerActions);
    if (decision) {
      allChosen.push(decision);
    }
  }

  // collectedResponses 초기화
  const cleanState: GameState = { ...state, collectedResponses: [] };

  // 아무도 액션하지 않음 → 다음 턴
  if (allChosen.length === 0) {
    return advanceTurn({ ...cleanState, pendingActions: [] });
  }

  // 우선순위 resolve
  const topAction = resolveTopAction(allChosen, state.lastDiscard.playerId);
  if (!topAction) {
    return advanceTurn({ ...cleanState, pendingActions: [] });
  }

  // 최우선 액션 실행
  switch (topAction.action) {
    case 'win':
      return declareRon(cleanState, topAction.playerId);
    case 'kan':
      return executeMinkan(cleanState, topAction.playerId);
    case 'pon':
      return executePon(cleanState, topAction.playerId);
    case 'chi':
      return executeChi(cleanState, topAction.playerId, topAction.tiles);
    default:
      return advanceTurn({ ...cleanState, pendingActions: [] });
  }
}

/** pendingActions에 해당 플레이어의 액션이 있는지 확인 */
function hasPendingAction(state: GameState, seatIndex: number, actionType: string): boolean {
  return state.pendingActions.some(a => a.playerId === seatIndex && a.action === actionType);
}

// ============================================================
// AI 턴 처리
// ============================================================

/** AI 턴 연속 처리 (사람 차례가 올 때까지 반복) */
function processAITurns(state: GameState): GameState {
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (iterations++ < MAX_ITERATIONS) {
    if (state.phase === 'game-over') break;

    // action-pending: 인간 응답 대기 확인
    if (state.phase === 'action-pending') {
      const pendingPlayerIds = Array.from(new Set(state.pendingActions.map(a => a.playerId)));
      const hasHumanPending = pendingPlayerIds.some(pid => !state.players[pid].isAI);

      if (hasHumanPending) {
        // 인간이 있으면 tryResolveCollected에서 처리
        break;
      }

      // AI만 남음 → 즉시 처리
      const resolved = processAIOnlyPending(state);
      if (!resolved) break;
      state = resolved;
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

  if (state.difficulty === 'easy') return null;
  if (state.difficulty === 'normal' && Math.random() > 0.5) return null;
  return options[0];
}

/** action-pending에서 AI만 남은 경우 즉시 처리 */
function processAIOnlyPending(state: GameState): GameState | null {
  if (!state.lastDiscard) return null;

  const pendingPlayerIds = Array.from(new Set(state.pendingActions.map(a => a.playerId)));
  const aiDecisions: PendingAction[] = [];

  for (const pid of pendingPlayerIds) {
    const playerActions = state.pendingActions.filter(a => a.playerId === pid);
    const decision = aiRespondToActions(state, pid, playerActions);
    if (decision) aiDecisions.push(decision);
  }

  if (aiDecisions.length === 0) {
    return advanceTurn({ ...state, pendingActions: [] });
  }

  const topAction = resolveTopAction(aiDecisions, state.lastDiscard.playerId);
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

// ============================================================
// 게임 종료 처리
// ============================================================

/** 게임 오버 시 전적 반영 + 방 상태 업데이트 */
async function handleGameOver(roomId: string, state: GameState) {
  // 방 상태 → finished
  await supabaseAdmin
    .from('mahjong_rooms')
    .update({ status: 'finished' })
    .eq('id', roomId);

  // 전적 반영 (인간 플레이어만)
  const { data: players } = await supabaseAdmin
    .from('mahjong_room_players')
    .select('player_id, seat_index, is_ai')
    .eq('room_id', roomId);

  if (!players) return;

  for (const p of players) {
    if (p.is_ai) continue;
    // total_games + 1
    await supabaseAdmin.rpc('increment_games', { p_id: p.player_id });
    // 승자면 total_wins + 1
    if (state.winner === p.seat_index) {
      await supabaseAdmin.rpc('increment_wins', { p_id: p.player_id });
    }
  }
}
