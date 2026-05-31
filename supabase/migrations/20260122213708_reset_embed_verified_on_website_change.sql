-- Reset embed_verified when contractor changes their website
-- This ensures that changing the website URL requires re-verification
-- by having the badge served from the new domain.

CREATE OR REPLACE FUNCTION reset_embed_verified_on_website_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.website IS DISTINCT FROM NEW.website THEN
    NEW.embed_verified := false;
    NEW.embed_verified_at := NULL;
    NEW.embed_verified_domain := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_embed_verified_on_website_change
  BEFORE UPDATE ON contractors
  FOR EACH ROW
  EXECUTE FUNCTION reset_embed_verified_on_website_change();

COMMENT ON TRIGGER trg_reset_embed_verified_on_website_change ON contractors
  IS 'Resets embed verification when contractor website changes';
