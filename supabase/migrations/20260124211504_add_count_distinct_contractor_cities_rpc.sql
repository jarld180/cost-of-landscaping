CREATE OR REPLACE FUNCTION public.count_distinct_contractor_cities()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(DISTINCT city_id)::integer
  FROM public.contractors
  WHERE deleted_at IS NULL  -- Non-deleted only (soft-delete filter)
    AND city_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.count_distinct_contractor_cities() TO authenticated;

COMMENT ON FUNCTION public.count_distinct_contractor_cities() IS 
  'Returns count of distinct cities that have at least one non-deleted contractor. Used by admin dashboard.';
