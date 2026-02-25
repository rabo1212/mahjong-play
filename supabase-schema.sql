-- ==============================
-- MahjongPlay 온라인 대국 스키마
-- Supabase SQL Editor에서 실행
-- (믿독 프로젝트 공유: mahjong_ 접두사)
-- ==============================

-- 1. 플레이어 프로필
CREATE TABLE IF NOT EXISTS mahjong_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '플레이어',
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mahjong_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "프로필 본인 읽기" ON mahjong_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "프로필 본인 쓰기" ON mahjong_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "프로필 본인 수정" ON mahjong_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. 게임 방
CREATE TABLE IF NOT EXISTS mahjong_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(4) NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES mahjong_profiles(id),
  status TEXT NOT NULL DEFAULT 'waiting',
  difficulty TEXT NOT NULL DEFAULT 'easy',
  beginner_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mahjong_rooms_code ON mahjong_rooms(code);
CREATE INDEX IF NOT EXISTS idx_mahjong_rooms_status ON mahjong_rooms(status);

ALTER TABLE mahjong_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "방 누구나 읽기" ON mahjong_rooms
  FOR SELECT USING (true);
CREATE POLICY "방 인증 유저 생성" ON mahjong_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "방 호스트 수정" ON mahjong_rooms
  FOR UPDATE USING (auth.uid() = host_id);

-- 3. 방 참가자
CREATE TABLE IF NOT EXISTS mahjong_room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES mahjong_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  seat_index INTEGER NOT NULL,
  is_ai BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(room_id, seat_index),
  UNIQUE(room_id, player_id)
);

ALTER TABLE mahjong_room_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "참가자 누구나 읽기" ON mahjong_room_players
  FOR SELECT USING (true);
CREATE POLICY "참가자 인증 유저 생성" ON mahjong_room_players
  FOR INSERT WITH CHECK (auth.uid() = player_id OR is_ai = true);
CREATE POLICY "참가자 본인 수정" ON mahjong_room_players
  FOR UPDATE USING (auth.uid() = player_id);
CREATE POLICY "참가자 삭제" ON mahjong_room_players
  FOR DELETE USING (auth.uid() = player_id);

-- 4. 게임 상태 (서버 권위)
CREATE TABLE IF NOT EXISTS mahjong_game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES mahjong_rooms(id) ON DELETE CASCADE UNIQUE,
  state JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  turn_deadline TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mahjong_game_states ENABLE ROW LEVEL SECURITY;

-- game_states는 API Route(service_role)만 읽고 쓰기
-- 클라이언트는 Realtime broadcast로만 상태 수신
CREATE POLICY "게임 상태 서비스만" ON mahjong_game_states
  FOR ALL USING (auth.role() = 'service_role');

-- 5. 게임 기록
CREATE TABLE IF NOT EXISTS mahjong_game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES mahjong_rooms(id),
  winner_id UUID,
  players JSONB NOT NULL,
  result JSONB NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mahjong_game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "기록 누구나 읽기" ON mahjong_game_history
  FOR SELECT USING (true);
CREATE POLICY "기록 서비스만 쓰기" ON mahjong_game_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ==============================
-- 익명 인증 활성화 확인:
-- Supabase 대시보드 > Authentication > Providers > Anonymous Sign-Ins 활성화
-- ==============================
