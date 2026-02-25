import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          felt: '#1B5E37',
          dark: '#0D3B20',
          light: '#237A4B',
          shadow: '#0A2816',
        },
        panel: {
          DEFAULT: '#1A1A22',
          light: '#252530',
        },
        base: '#0E0E12',
        tile: {
          face: '#F2EADB',
          highlight: '#F8F3E8',
          shadow: '#D9CEBC',
          side: '#CEC3AD',
          'side-dark': '#B5A991',
          back: '#1D6B42',
          wan: '#B82025',
          pin: '#1A5CAB',
          sou: '#1E7D3F',
          honor: '#1C2833',
          'dragon-red': '#CC2229',
          'dragon-green': '#1A7A3C',
        },
        gold: {
          DEFAULT: '#D4A84B',
          light: '#E8C66A',
          dark: '#A67C2E',
        },
        action: {
          blue: '#4A9FD9',
          'blue-hover': '#5BB3ED',
          danger: '#D94040',
          success: '#3DAD5C',
          muted: '#6B6B7B',
        },
        text: {
          primary: '#F0EBE0',
          secondary: '#A09682',
          muted: '#6B6260',
          'on-tile': '#2A2420',
          'on-gold': '#1C1710',
        },
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        tile: ['"Noto Serif TC"', 'serif'],
      },
      boxShadow: {
        'tile': '0 3px 0 0 #CEC3AD, 0 4px 0 0 #B5A991, 0 6px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(0,0,0,0.06)',
        'tile-hover': '0 3px 0 0 #CEC3AD, 0 4px 0 0 #B5A991, 0 10px 16px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 0 1px rgba(0,0,0,0.06)',
        'tile-selected': '0 3px 0 0 #CEC3AD, 0 4px 0 0 #B5A991, 0 14px 20px rgba(0,0,0,0.4), 0 6px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 2px #D4A84B, 0 0 12px rgba(212,168,75,0.3)',
        'tile-back': '0 3px 0 0 #0D4828, 0 4px 0 0 #0A3A1E, 0 6px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)',
        'panel': '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        'gold-glow': '0 0 16px rgba(212,168,75,0.25), 0 0 40px rgba(212,168,75,0.1)',
      },
    },
  },
  plugins: [],
};
export default config;
