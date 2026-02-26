'use client';

import { useMemo } from 'react';
import { TileId, GamePhase, PendingAction } from '@/engine/types';
import { toKinds } from '@/engine/tiles';
import { calculateShanten, evaluateDiscards } from '@/ai/shanten';
import { getTileDisplayInfo } from '@/lib/tile-display';
import { TILE_LABELS } from '@/lib/constants';
import { isTenpai, getWaitingTiles } from '@/engine/win-detector';

interface TutorialCoachProps {
  phase: GamePhase;
  isMyTurn: boolean;
  hand: TileId[];
  drawnTile: TileId | null;
  meldCount: number;
  playerActions: PendingAction[];
  canTsumo: boolean;
  turnCount: number;
}

/** 액션 설명 */
const ACTION_INFO: Record<string, { name: string; hanja: string; desc: string }> = {
  chi: {
    name: '치',
    hanja: '吃',
    desc: '왼쪽 사람이 버린 패로 순자(연속 3장)를 완성합니다. 공개되며 부로 패가 됩니다.',
  },
  pon: {
    name: '펑',
    hanja: '碰',
    desc: '누구든 버린 패로 커쯔(같은 패 3장)를 완성합니다. 치보다 우선순위가 높아요.',
  },
  kan: {
    name: '깡',
    hanja: '槓',
    desc: '같은 패 4장을 모아 깡을 선언합니다. 왕패에서 1장을 추가로 뽑습니다.',
  },
  win: {
    name: '론',
    hanja: '榮',
    desc: '상대가 버린 패가 대기패와 일치! 론(영화)으로 화료를 선언하세요!',
  },
};

export default function TutorialCoach({
  phase,
  isMyTurn,
  hand,
  drawnTile,
  meldCount,
  playerActions,
  canTsumo,
  turnCount,
}: TutorialCoachProps) {
  // 향청수 계산
  const shantenInfo = useMemo(() => {
    const allIds = drawnTile !== null ? [...hand, drawnTile] : hand;
    const kinds = toKinds(allIds);

    if (drawnTile !== null) {
      // 14장 → 최선의 13장 향청수
      let best = 99;
      for (let i = 0; i < kinds.length; i++) {
        const remaining = [...kinds];
        remaining.splice(i, 1);
        best = Math.min(best, calculateShanten(remaining, meldCount));
      }
      return best;
    }
    return calculateShanten(kinds, meldCount);
  }, [hand, drawnTile, meldCount]);

  // 추천 버리기
  const recommendation = useMemo(() => {
    if (!isMyTurn || phase !== 'discard') return null;
    const allIds = drawnTile !== null ? [...hand, drawnTile] : hand;
    const kinds = toKinds(allIds);
    const evals = evaluateDiscards(kinds, meldCount);
    evals.sort((a, b) => a.shanten - b.shanten);
    if (evals.length === 0) return null;

    const best = evals[0];
    const worst = evals[evals.length - 1];
    const bestInfo = getTileDisplayInfo(best.kind);
    const bestLabel = TILE_LABELS[best.kind] || `${bestInfo.mainChar}${bestInfo.suitChar || ''}`;

    return { best, worst, bestLabel, bestInfo };
  }, [hand, drawnTile, meldCount, isMyTurn, phase]);

  // 텐파이 대기패
  const waitingInfo = useMemo(() => {
    const kinds = toKinds(hand);
    if (!isTenpai(kinds, meldCount)) return null;
    const waits = getWaitingTiles(kinds, meldCount);
    return waits.map(k => TILE_LABELS[k] || '').filter(Boolean);
  }, [hand, meldCount]);

  // 상황별 메시지 결정
  const tip = useMemo(() => {
    // 쯔모 가능
    if (canTsumo) {
      return {
        title: '쯔모! (自摸)',
        message: '대기패를 직접 뽑았습니다! 쯔모를 선언하면 화료입니다.',
        color: '#d4a84b',
        urgent: true,
      };
    }

    // 액션 가능 (치/펑/깡/론)
    if (phase === 'action-pending' && playerActions.length > 0) {
      const actions = playerActions.map(a => a.action);
      const parts: string[] = [];

      for (const act of actions) {
        const info = ACTION_INFO[act];
        if (info) {
          parts.push(`【${info.name} ${info.hanja}】 ${info.desc}`);
        }
      }

      return {
        title: '액션 선택!',
        message: parts.join('\n\n') + '\n\n필요 없으면 "패스"를 누르세요.',
        color: '#4a9fd9',
        urgent: true,
      };
    }

    // 내 턴 - 버리기
    if (phase === 'discard' && isMyTurn) {
      if (turnCount <= 1) {
        // 첫 턴
        return {
          title: '첫 번째 턴!',
          message: '패를 1장 뽑았습니다. 14장 중 1장을 버려야 합니다.\n패를 터치해서 선택 → 다시 터치하면 버립니다.',
          color: '#4ade80',
          urgent: false,
        };
      }

      // 텐파이 안내
      if (shantenInfo === 0 && waitingInfo && waitingInfo.length > 0) {
        return {
          title: '텐파이!',
          message: `화료까지 1장! 대기패: ${waitingInfo.join(', ')}\n론(상대 버림패) 또는 쯔모(직접 뽑기)로 화료하세요.`,
          color: '#d4a84b',
          urgent: true,
        };
      }

      // 추천 버리기 설명
      if (recommendation) {
        const { bestLabel } = recommendation;
        const shantenText = shantenInfo === 1 ? '텐파이까지 1장' :
          shantenInfo === 2 ? '텐파이까지 2장' :
          shantenInfo >= 3 ? `텐파이까지 ${shantenInfo}장` : '';

        let reason = '';
        if (shantenInfo >= 2) {
          reason = `${bestLabel}은(는) 면자(순자/커쯔)를 만들기 어려운 패입니다.`;
        } else if (shantenInfo === 1) {
          reason = `${bestLabel}을(를) 버리면 텐파이에 가장 가까워집니다!`;
        }

        return {
          title: `${shantenText ? shantenText + ' — ' : ''}패를 버리세요`,
          message: `추천: ${bestLabel} 버리기\n${reason}`,
          color: '#4ade80',
          urgent: false,
        };
      }

      return {
        title: '패를 버리세요',
        message: '면자(순자/커쯔)에 필요 없는 패를 골라 버리세요.',
        color: '#4ade80',
        urgent: false,
      };
    }

    // AI 턴
    if (phase === 'discard' && !isMyTurn) {
      return {
        title: 'AI 차례',
        message: 'AI가 패를 뽑고 버리는 중...\n상대 버림패를 잘 관찰하세요!',
        color: '#888',
        urgent: false,
      };
    }

    return null;
  }, [phase, isMyTurn, canTsumo, playerActions, turnCount, shantenInfo, recommendation, waitingInfo]);

  if (!tip) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '92%',
        maxWidth: '420px',
        zIndex: 9998,
        pointerEvents: 'none',
        animation: 'tutorialFadeIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(14, 14, 24, 0.92)',
          borderRadius: '14px',
          border: `1px solid ${tip.color}40`,
          padding: '12px 16px',
          boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${tip.color}20`,
          pointerEvents: 'auto',
        }}
      >
        {/* 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {tip.urgent && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: tip.color,
                animation: 'pulse 1.5s infinite',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: tip.color,
            }}
          >
            {tip.title}
          </span>
        </div>

        {/* 메시지 */}
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.75)',
            whiteSpace: 'pre-line',
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          {tip.message}
        </p>
      </div>

      <style>{`
        @keyframes tutorialFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
