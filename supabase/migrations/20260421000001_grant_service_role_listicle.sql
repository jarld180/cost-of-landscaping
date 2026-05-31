-- Fix: grant service_role full access to city_listicle_content
-- Service role bypasses RLS but still needs table-level GRANT.
GRANT ALL ON TABLE city_listicle_content TO service_role;
