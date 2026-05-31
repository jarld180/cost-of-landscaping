-- Grant service_role access to all tables missing proper grants
-- These tables were created in the April 20 migrations without service_role grants.
-- Service role bypasses RLS but still needs table-level GRANT in PostgreSQL.
GRANT ALL ON TABLE leads TO service_role;
GRANT ALL ON TABLE admin_notifications TO service_role;
GRANT ALL ON TABLE article_keywords TO service_role;
GRANT ALL ON TABLE city_listicle_content TO service_role;
GRANT ALL ON TABLE contractor_verifications TO service_role;
GRANT ALL ON TABLE pages TO service_role;
GRANT ALL ON TABLE page_templates TO service_role;
GRANT ALL ON TABLE zip_codes TO service_role;
GRANT ALL ON TABLE ai_article_jobs TO service_role;
GRANT ALL ON TABLE ai_article_job_steps TO service_role;
GRANT ALL ON TABLE ai_personas TO service_role;
GRANT ALL ON TABLE ai_article_evals TO service_role;
GRANT ALL ON TABLE ai_golden_examples TO service_role;
GRANT ALL ON TABLE ai_prompt_versions TO service_role;
GRANT ALL ON TABLE business_claims TO service_role;
GRANT ALL ON TABLE badge_embed_logs TO service_role;
GRANT ALL ON TABLE background_jobs TO service_role;
GRANT ALL ON TABLE import_jobs TO service_role;
GRANT ALL ON TABLE system_logs TO service_role;
GRANT ALL ON TABLE contractors TO service_role;
GRANT ALL ON TABLE cities TO service_role;
GRANT ALL ON TABLE service_types TO service_role;
GRANT ALL ON TABLE contractor_service_types TO service_role;
GRANT ALL ON TABLE reviews TO service_role;
GRANT ALL ON TABLE menus TO service_role;
GRANT ALL ON TABLE menu_items TO service_role;
GRANT ALL ON TABLE account_profiles TO service_role;

-- Also grant sequence access
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Ensure future tables also get proper grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
