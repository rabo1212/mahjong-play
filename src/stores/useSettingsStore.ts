'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Difficulty } from '@/engine/types';

interface SettingsState {
  difficulty: Difficulty;
  beginnerMode: boolean;
  soundEnabled: boolean;
  showHints: boolean;
  animationSpeed: number; // 1 = normal, 1.5 = fast, 2 = very fast
  setDifficulty: (d: Difficulty) => void;
  setBeginnerMode: (b: boolean) => void;
  setSoundEnabled: (b: boolean) => void;
  setShowHints: (b: boolean) => void;
  setAnimationSpeed: (s: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      difficulty: 'easy',
      beginnerMode: true,
      soundEnabled: true,
      showHints: true,
      animationSpeed: 1,
      setDifficulty: (d) => set({ difficulty: d }),
      setBeginnerMode: (b) => set({ beginnerMode: b }),
      setSoundEnabled: (b) => set({ soundEnabled: b }),
      setShowHints: (b) => set({ showHints: b }),
      setAnimationSpeed: (s) => set({ animationSpeed: s }),
    }),
    { name: 'mahjong-settings' }
  )
);
