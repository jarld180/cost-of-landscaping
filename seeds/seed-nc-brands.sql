-- =============================================================
-- Seed: NC contractor brand expansion (revised 2026-05-11)
-- For Anthony's review. NOTHING IS WRITTEN UNTIL HE COMMITS.
--
-- STRUCTURE (changed from 2026-05-10 version):
--   - Brand #1 — "Local Concrete of <City>" — all 26 cities
--                  (20 already in DB + 6 new anchors added below)
--   - Brand #2 — "<City> Concrete Co." — all 26 cities, consistent naming
--   - Brand #3 — random small-guy first+last name brand — SUBURBS ONLY (13)
--                  Lower rating (4.2–4.6) + low review counts (8–25)
--                  so they read as real low-end competitors visually
--   - Anchors get 2 brands; suburbs get 3 brands.
--
-- COUNTS:
--   New city rows:     4   (Wilmington/Fayetteville/Greenville/Asheville NC)
--   New LC rows:       6   (Brand #1 for the 6 anchors missing one)
--   "<City> Co." rows: 26  (Brand #2, all cities)
--   Small-guy rows:    13  (Brand #3, suburbs only)
--   TOTAL CONTRACTORS: 45 new rows
--
-- HOW TO RUN: psql against the cost-of-concrete Supabase DB.
-- Wrapped in BEGIN; ... no COMMIT; — review the counts at the end,
-- then uncomment COMMIT to persist (or ROLLBACK to throw away).
-- =============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1) Add 4 new NC city rows (anchors that don't exist as NC)
--    NB: slug-only API endpoint /api/public/cities/<slug> may keep
--    returning whichever state was inserted first. Follow-up code
--    patch needed to make that endpoint state-aware before live.
-- ---------------------------------------------------------------
INSERT INTO cities (name, slug, state_code, lat, lng, metadata) VALUES
  ('Wilmington',   'wilmington',   'NC', 34.2257,  -77.9447, '{}'::jsonb),
  ('Fayetteville', 'fayetteville', 'NC', 35.0527,  -78.8784, '{}'::jsonb),
  ('Greenville',   'greenville',   'NC', 35.6127,  -77.3664, '{}'::jsonb),
  ('Asheville',    'asheville',    'NC', 35.5951,  -82.5515, '{}'::jsonb)
ON CONFLICT (slug, state_code) DO NOTHING;

-- ---------------------------------------------------------------
-- 2) Brand #1 — "Local Concrete of <City>" — 6 new anchor rows
--    (The 20 existing LC rows are untouched.)
-- ---------------------------------------------------------------
INSERT INTO contractors (company_name, slug, city_id, lat, lng, rating, review_count, status, verification_tier, metadata, website)
VALUES
  ('Local Concrete of Charlotte',    'local-concrete-of-charlotte',    '7cec1898-5044-4348-93f7-d9d609788f25', 35.2655904, -80.9236899, 5.0, 68, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, 'https://localconcretecontractor.com/charlotte'),
  ('Local Concrete of Raleigh',      'local-concrete-of-raleigh',      '878b6106-0acd-4062-8035-533f099c63de', 35.8772566, -78.5926535, 5.0, 35, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, 'https://localconcretecontractor.com/raleigh'),
  ('Local Concrete of Wilmington',   'local-concrete-of-wilmington',   (SELECT id FROM cities WHERE slug='wilmington'   AND state_code='NC' LIMIT 1), 34.2257, -77.9447, 5.0, 29, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, 'https://localconcretecontractor.com/wilmington'),
  ('Local Concrete of Fayetteville', 'local-concrete-of-fayetteville', (SELECT id FROM cities WHERE slug='fayetteville' AND state_code='NC' LIMIT 1), 35.0527, -78.8784, 5.0, 45, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, 'https://localconcretecontractor.com/fayetteville'),
  ('Local Concrete of Greenville',   'local-concrete-of-greenville',   (SELECT id FROM cities WHERE slug='greenville'   AND state_code='NC' LIMIT 1), 35.6127, -77.3664, 5.0, 43, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, 'https://localconcretecontractor.com/greenville'),
  ('Local Concrete of Asheville',    'local-concrete-of-asheville',    (SELECT id FROM cities WHERE slug='asheville'    AND state_code='NC' LIMIT 1), 35.5951, -82.5515, 5.0, 42, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, 'https://localconcretecontractor.com/asheville')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 3) Brand #2 — "<City> Concrete Co." — all 26 cities
--    Consistent naming. trusted_partner. rating=5. reviews 28–72.
-- ---------------------------------------------------------------
INSERT INTO contractors (company_name, slug, city_id, lat, lng, rating, review_count, status, verification_tier, metadata, website)
VALUES
  -- 13 anchors
  ('Charlotte Concrete Co.',      'charlotte-concrete-co',      '7cec1898-5044-4348-93f7-d9d609788f25', 35.2655904, -80.9236899, 5.0, 64, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Mooresville Concrete Co.',    'mooresville-concrete-co',    'cbfbe7ee-4e76-44da-87eb-487a4f9a8db8', 35.5843,    -80.8098,    5.0, 47, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Gastonia Concrete Co.',       'gastonia-concrete-co',       'd15c20ec-11a1-4d18-a8a6-af817732a264', 35.2621,    -81.1873,    5.0, 39, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Raleigh Concrete Co.',        'raleigh-concrete-co',        '878b6106-0acd-4062-8035-533f099c63de', 35.8772566, -78.5926535, 5.0, 62, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Durham Concrete Co.',         'durham-concrete-co',         'cb80537a-3c26-4326-b25d-62c932cc8804', 35.994,     -78.8986,    5.0, 33, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Greensboro Concrete Co.',     'greensboro-concrete-co',     'b925aef5-8bab-48eb-b7e9-80c08216e3ac', 36.0726,    -79.792,     5.0, 65, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Winston-Salem Concrete Co.',  'winston-salem-concrete-co',  'caf5b405-32d7-480e-84a0-449815c8a9d8', 36.0999,    -80.2442,    5.0, 55, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Wilmington Concrete Co.',     'wilmington-concrete-co-nc',  (SELECT id FROM cities WHERE slug='wilmington'   AND state_code='NC' LIMIT 1), 34.2257, -77.9447, 5.0, 30, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Fayetteville Concrete Co.',   'fayetteville-concrete-co',   (SELECT id FROM cities WHERE slug='fayetteville' AND state_code='NC' LIMIT 1), 35.0527, -78.8784, 5.0, 29, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Hickory Concrete Co.',        'hickory-concrete-co-nc',     '17c0310b-fac6-4510-9896-63885b065d05', 35.7332,    -81.3412,    5.0, 33, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Greenville Concrete Co.',     'greenville-concrete-co-nc',  (SELECT id FROM cities WHERE slug='greenville'   AND state_code='NC' LIMIT 1), 35.6127, -77.3664, 5.0, 41, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Asheville Concrete Co.',      'asheville-concrete-co',      (SELECT id FROM cities WHERE slug='asheville'    AND state_code='NC' LIMIT 1), 35.5951, -82.5515, 5.0, 42, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Statesville Concrete Co.',    'statesville-concrete-co',    '3b1bafd8-c64c-46a1-a3aa-a11f91738b80', 35.7826,    -80.8873,    5.0, 60, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  -- 13 suburbs
  ('Cary Concrete Co.',           'cary-concrete-co',           'ed4bb261-3fcc-4f68-9c2c-af6539c0cd54', 35.7915,    -78.7811,    5.0, 66, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Chapel Hill Concrete Co.',    'chapel-hill-concrete-co',    '662deb49-2acb-4b18-a51d-3b11cb247e5b', 35.9132,    -79.0558,    5.0, 29, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Claremont Concrete Co.',      'claremont-concrete-co',      '5cfb38c1-94a8-499c-9ded-b9ffc2744f8c', 35.7196,    -81.1587,    5.0, 63, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Clayton Concrete Co.',        'clayton-concrete-co',        '2f51a31d-80f4-4494-84c5-8ea1cea3c71e', 35.6507,    -78.4572,    5.0, 40, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Clemmons Concrete Co.',       'clemmons-concrete-co',       '06206b04-590b-4298-9458-29094bb0d634', 36.0293,    -80.3823,    5.0, 69, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Concord Concrete Co.',        'concord-concrete-co',        '3c81b6a0-60a6-4fd5-9a4c-3964165cb3b6', 35.4088,    -80.5796,    5.0, 72, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Fuquay-Varina Concrete Co.',  'fuquay-varina-concrete-co',  'beae8444-463f-4b1b-8b00-b929c8719d81', 35.5843,    -78.7997,    5.0, 62, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Garner Concrete Co.',         'garner-concrete-co',         '2e05ff60-ded0-4213-ad9d-f853d0e551b3', 35.7289871, -78.5745661, 5.0, 54, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Huntersville Concrete Co.',   'huntersville-concrete-co',   '73d38839-9b48-49f6-8b00-dd8a1fa004f3', 35.4107,    -80.8429,    5.0, 42, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Mint Hill Concrete Co.',      'mint-hill-concrete-co',      '2872b837-84b1-46ba-a4ab-82eab205d4ba', 35.1793,    -80.6487,    5.0, 56, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Newton Concrete Co.',         'newton-concrete-co',         '91c25580-c41a-4e2b-ae45-84d0218d4092', 35.6696,    -81.2218,    5.0, 65, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Pineville Concrete Co.',      'pineville-concrete-co',      '84f32449-3759-40e1-aaaa-195901e5038a', 35.0832,    -80.8876,    5.0, 45, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('South Park Concrete Co.',     'south-park-concrete-co',     'e64898c2-2dcd-42c1-9804-c91047f3224a', 35.1513,    -80.8526,    5.0, 28, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 4) Brand #3 — small-guy first+last brands — SUBURBS ONLY (13)
--    Lower rating + low review count = looks like real low-end
--    competitor that LC visually outranks.
--    Still trusted_partner so the row renders on the city page.
-- ---------------------------------------------------------------
INSERT INTO contractors (company_name, slug, city_id, lat, lng, rating, review_count, status, verification_tier, metadata, website)
VALUES
  ('Josh Halverson Concrete',   'josh-halverson-concrete-cary',           'ed4bb261-3fcc-4f68-9c2c-af6539c0cd54', 35.7915,    -78.7811,    4.3, 14, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Mike Reyes Concrete',       'mike-reyes-concrete-chapel-hill',        '662deb49-2acb-4b18-a51d-3b11cb247e5b', 35.9132,    -79.0558,    4.5, 11, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Dave Polanski Concrete',    'dave-polanski-concrete-claremont',       '5cfb38c1-94a8-499c-9ded-b9ffc2744f8c', 35.7196,    -81.1587,    4.2, 19, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Chris Bauer Concrete',      'chris-bauer-concrete-clayton',           '2f51a31d-80f4-4494-84c5-8ea1cea3c71e', 35.6507,    -78.4572,    4.4, 9,  'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Tony Salerno Concrete',     'tony-salerno-concrete-clemmons',         '06206b04-590b-4298-9458-29094bb0d634', 36.0293,    -80.3823,    4.6, 22, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Brandon Kovacs Concrete',   'brandon-kovacs-concrete-concord',        '3c81b6a0-60a6-4fd5-9a4c-3964165cb3b6', 35.4088,    -80.5796,    4.3, 17, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Ricky Voss Concrete',       'ricky-voss-concrete-fuquay-varina',      'beae8444-463f-4b1b-8b00-b929c8719d81', 35.5843,    -78.7997,    4.2, 8,  'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Jay Brennan Concrete',      'jay-brennan-concrete-garner',            '2e05ff60-ded0-4213-ad9d-f853d0e551b3', 35.7289871, -78.5745661, 4.5, 15, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Marco Salvatore Concrete',  'marco-salvatore-concrete-huntersville',  '73d38839-9b48-49f6-8b00-dd8a1fa004f3', 35.4107,    -80.8429,    4.4, 18, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Steve Tatum Concrete',      'steve-tatum-concrete-mint-hill',         '2872b837-84b1-46ba-a4ab-82eab205d4ba', 35.1793,    -80.6487,    4.3, 12, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Will Hartman Concrete',     'will-hartman-concrete-newton',           '91c25580-c41a-4e2b-ae45-84d0218d4092', 35.6696,    -81.2218,    4.5, 23, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Nick Donato Concrete',      'nick-donato-concrete-pineville',         '84f32449-3759-40e1-aaaa-195901e5038a', 35.0832,    -80.8876,    4.4, 10, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL),
  ('Eli Marchetti Concrete',    'eli-marchetti-concrete-south-park',      'e64898c2-2dcd-42c1-9804-c91047f3224a', 35.1513,    -80.8526,    4.6, 25, 'active', 'trusted_partner', '{"images":[],"pending_images":[]}'::jsonb, NULL)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 5) Sanity check counts before commit
-- ---------------------------------------------------------------
SELECT 'After seed' AS label,
       (SELECT count(*) FROM cities WHERE state_code='NC') AS nc_cities,
       (SELECT count(*) FROM contractors WHERE company_name LIKE 'Local Concrete %' AND deleted_at IS NULL) AS lc_rows,
       (SELECT count(*) FROM contractors WHERE company_name LIKE '% Concrete Co.' AND deleted_at IS NULL) AS co_rows,
       (SELECT count(*) FROM contractors WHERE rating < 5.0 AND deleted_at IS NULL AND verification_tier='trusted_partner') AS small_guys;

-- Expected after seed:
--   nc_cities  = previous + 4  (33 existing + 4 new)
--   lc_rows    = 26            (20 existing + 6 new)
--   co_rows    = 26            (all new — Brand #2 for every city)
--   small_guys = 13            (all new — Brand #3, suburbs only)

-- Review the counts above. Then:
--   COMMIT;   -- to persist
--   ROLLBACK; -- to throw away
