-- ==============================
-- MahjongPlay 전적 증가 RPC 함수
-- Supabase SQL Editor에서 실행
-- ==============================

-- total_games 증가
CREATE OR REPLACE FUNCTION increment_games(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE mahjong_profiles
  SET total_games = total_games + 1
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- total_wins 증가
CREATE OR REPLACE FUNCTION increment_wins(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE mahjong_profiles
  SET total_wins = total_wins + 1
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
