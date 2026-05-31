-- Grant service_role access to article_keywords and pages
-- Needed for the blog generation script which uses the service role key directly.
GRANT ALL ON article_keywords TO service_role;
GRANT ALL ON pages TO service_role;
