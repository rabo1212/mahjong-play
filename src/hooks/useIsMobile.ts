'use client';

import { useState, useEffect } from 'react';

/** 640px 이하를 모바일로 판정 (Tailwind sm 브레이크포인트 기준) */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
