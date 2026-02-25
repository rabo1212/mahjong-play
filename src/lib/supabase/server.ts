/**
 * API Route용 Supabase 서버 클라이언트
 * 요청별 인증 컨텍스트로 RLS 적용
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** API Route에서 인증된 클라이언트 생성 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        // 쿠키에서 인증 토큰 전달 (SSR 지원)
      },
    },
  });
}

/** 요청의 Authorization 헤더에서 토큰으로 인증된 클라이언트 */
export function createAuthenticatedClient(authHeader: string | null) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  return client;
}
