-- create_organization() calls gen_random_bytes() (from the pgcrypto extension),
-- which Supabase installs into the `extensions` schema. The function was created
-- in 0011 with `set search_path = public`, so under SECURITY DEFINER the call
-- resolved against `public` only and failed at runtime with:
--   "function gen_random_bytes(integer) does not exist"
--
-- Widen the function's search path to include `extensions`. This is non-destructive
-- (it only changes the resolution path, not the body) and is the Supabase-recommended
-- way to let SECURITY DEFINER functions reach extension functions.
alter function public.create_organization(text, text) set search_path = public, extensions;
