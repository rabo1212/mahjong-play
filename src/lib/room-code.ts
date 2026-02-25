/**
 * 4자리 방 코드 생성
 * 영문 대문자 (I, O, L 제외하여 혼동 방지)
 */
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // 23자 (I,O,L 제외)

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
