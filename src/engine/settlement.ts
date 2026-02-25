/**
 * MCR 점수 정산 계산
 */

export interface Settlement {
  winnerId: number;
  isTsumo: boolean;
  totalPoints: number;
  /** 각 플레이어 점수 변동 (양수=수입, 음수=지출) */
  playerDeltas: number[];
  /** 개별 지불 흐름 */
  payments: { from: number; to: number; amount: number }[];
}

/**
 * MCR 정산 규칙:
 * - 쯔모: 각 패자가 (총점 + 8)점 지불
 * - 론: 방총자가 (총점 + 24)점, 나머지 2명 각 8점 지불
 */
export function calculateSettlement(
  winnerId: number,
  totalPoints: number,
  isTsumo: boolean,
  fromPlayerId?: number,
): Settlement {
  const playerDeltas = [0, 0, 0, 0];
  const payments: { from: number; to: number; amount: number }[] = [];

  if (isTsumo) {
    const perLoser = totalPoints + 8;
    for (let i = 0; i < 4; i++) {
      if (i === winnerId) continue;
      playerDeltas[i] = -perLoser;
      payments.push({ from: i, to: winnerId, amount: perLoser });
    }
    playerDeltas[winnerId] = perLoser * 3;
  } else {
    // 론: 방총자가 (총점 + 8×3), 나머지 2명은 각 8점
    if (fromPlayerId === undefined) {
      // 방어: 론인데 방총자 정보 없으면 쯔모 취급
      return calculateSettlement(winnerId, totalPoints, true);
    }
    const discardPay = totalPoints + 8 * 3;
    for (let i = 0; i < 4; i++) {
      if (i === winnerId) continue;
      if (i === fromPlayerId) {
        playerDeltas[i] = -discardPay;
        payments.push({ from: i, to: winnerId, amount: discardPay });
      } else {
        playerDeltas[i] = -8;
        payments.push({ from: i, to: winnerId, amount: 8 });
      }
    }
    playerDeltas[winnerId] = discardPay + 8 * 2;
  }

  return { winnerId, isTsumo, totalPoints, playerDeltas, payments };
}
