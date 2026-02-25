import { TileKind } from '@/engine/types';

/**
 * 타일 렌더링 정보
 * 한자 + 수트 표시 + CSS 클래스를 반환
 */

/** 만수 숫자 한자 */
const WAN_CHARS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 통수: 숫자를 동그라미 개수로 표현 */
const PIN_CHARS = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

/** 삭수: 숫자 */
const SOU_CHARS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 풍패 한자 */
const WIND_CHARS: Record<number, string> = { 1: '東', 2: '南', 3: '西', 4: '北' };

/** 화패 한자 */
const FLOWER_CHARS: Record<number, string> = {
  1: '梅', 2: '蘭', 3: '菊', 4: '竹',
  5: '春', 6: '夏', 7: '秋', 8: '冬',
};

export interface TileDisplayInfo {
  mainChar: string;      // 메인 문자 (한자/숫자)
  suitChar: string;      // 수트 표시 (萬/筒/索 등)
  colorClass: string;    // CSS 클래스 (tile-char-wan 등)
  suitType: 'wan' | 'pin' | 'sou' | 'wind' | 'dragon-red' | 'dragon-green' | 'dragon-white' | 'flower';
  isBlank: boolean;      // 백판 여부
}

export function getTileDisplayInfo(kind: TileKind): TileDisplayInfo {
  const suitCode = Math.floor(kind / 10);
  const num = kind % 10;

  switch (suitCode) {
    case 1: // 만수
      return {
        mainChar: WAN_CHARS[num],
        suitChar: '萬',
        colorClass: 'tile-char-wan',
        suitType: 'wan',
        isBlank: false,
      };
    case 2: // 통수
      return {
        mainChar: PIN_CHARS[num],
        suitChar: '',
        colorClass: 'tile-char-pin',
        suitType: 'pin',
        isBlank: false,
      };
    case 3: // 삭수
      return {
        mainChar: SOU_CHARS[num],
        suitChar: '索',
        colorClass: 'tile-char-sou',
        suitType: 'sou',
        isBlank: false,
      };
    case 4: // 풍패
      return {
        mainChar: WIND_CHARS[num] || '',
        suitChar: '',
        colorClass: 'tile-char-wind',
        suitType: 'wind',
        isBlank: false,
      };
    case 5: // 삼원패
      if (num === 1) return { mainChar: '中', suitChar: '', colorClass: 'tile-char-dragon-red', suitType: 'dragon-red', isBlank: false };
      if (num === 2) return { mainChar: '發', suitChar: '', colorClass: 'tile-char-dragon-green', suitType: 'dragon-green', isBlank: false };
      return { mainChar: '', suitChar: '', colorClass: 'tile-char-dragon-white', suitType: 'dragon-white', isBlank: true };
    case 6: // 화패
      return {
        mainChar: FLOWER_CHARS[num] || '',
        suitChar: num <= 4 ? '花' : '季',
        colorClass: num <= 4 ? 'tile-char-dragon-red' : 'tile-char-pin',
        suitType: 'flower',
        isBlank: false,
      };
    default:
      return { mainChar: '?', suitChar: '', colorClass: '', suitType: 'wan', isBlank: false };
  }
}
