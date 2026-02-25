/**
 * Supabase Admin 클라이언트 (service_role 키)
 * API Route에서 RLS 우회, Realtime broadcast 등에 사용
 * 절대 클라이언트에 노출하지 않을 것
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
