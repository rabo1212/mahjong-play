/** TileKind → TileId 변환 (표시용, 각 종류의 첫 번째 인스턴스) */
export function kindToDisplayId(kind: number): number {
  const suit = Math.floor(kind / 10);
  const num = kind % 10;
  if (suit >= 1 && suit <= 3) return (suit - 1) * 36 + (num - 1) * 4;
  if (suit === 4) return 108 + (num - 1) * 4;
  if (suit === 5) return 124 + (num - 1) * 4;
  if (suit === 6) return 136 + (num - 1);
  return 0;
}
