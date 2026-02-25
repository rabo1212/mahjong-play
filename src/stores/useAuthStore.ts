'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';

interface AuthStore {
  userId: string | null;
  nickname: string;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** 닉네임으로 익명 로그인 */
  signInAnonymous: (nickname: string) => Promise<void>;
  /** 기존 세션 복원 */
  restoreSession: () => Promise<void>;
  /** 로그아웃 */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      userId: null,
      nickname: '플레이어',
      isAuthenticated: false,
      isLoading: false,

      signInAnonymous: async (nickname: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;

          const userId = data.user?.id ?? null;
          if (userId) {
            // 프로필 upsert (테이블이 없으면 스킵)
            await supabase
              .from('mahjong_profiles')
              .upsert({ id: userId, nickname }, { onConflict: 'id' })
              .select();
          }

          set({ userId, nickname, isAuthenticated: true, isLoading: false });
        } catch (e) {
          console.error('Auth error:', e);
          set({ isLoading: false });
        }
      },

      restoreSession: async () => {
        set({ isLoading: true });
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const userId = data.session.user.id;
            // 프로필에서 닉네임 가져오기
            const { data: profile } = await supabase
              .from('mahjong_profiles')
              .select('nickname')
              .eq('id', userId)
              .single();

            set({
              userId,
              nickname: profile?.nickname ?? get().nickname,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ userId: null, isAuthenticated: false });
      },
    }),
    {
      name: 'mahjong-auth',
      partialize: (state) => ({ nickname: state.nickname }),
    }
  )
);
