-- Run once in Supabase SQL Editor. Safe to run again: no existing data is deleted.
begin;
create table if not exists public.bb_account_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),
 state_values jsonb not null default '{}'::jsonb check(jsonb_typeof(state_values)='object'),
 updated_at timestamptz not null default now()
);
alter table public.bb_account_state enable row level security;
revoke all on public.bb_account_state from anon, authenticated;
grant select on public.bb_account_state to authenticated;
drop policy if exists bb_read_own_state on public.bb_account_state;
create policy bb_read_own_state on public.bb_account_state for select to authenticated using((select auth.uid())=user_id);

create or replace function public.bb_validate_recipe(r jsonb) returns void language plpgsql set search_path='' as $$
declare i jsonb; t jsonb;
begin
 if jsonb_typeof(r) is distinct from 'object' or coalesce(r->>'recipe_id','') !~ '^[A-Za-z0-9_-]{1,100}$' or coalesce(length(trim(r->>'name')),0) not between 1 and 180 or coalesce(length(trim(r->>'category')),0) not between 1 and 70 or jsonb_typeof(r->'tags') is distinct from 'array' or jsonb_typeof(r->'ingredients') is distinct from 'array' or length(coalesce(r->>'cooking_notes',''))>10000 then raise exception 'INVALID_RECIPE'; end if;
 if jsonb_array_length(r->'ingredients')>300 then raise exception 'TOO_MANY_INGREDIENTS'; end if;
 for t in select value from jsonb_array_elements(r->'tags') loop if jsonb_typeof(t)<>'string' or length(t#>>'{}')>100 then raise exception 'INVALID_TAG'; end if; end loop;
 for i in select value from jsonb_array_elements(r->'ingredients') loop
  if coalesce(i->>'ingredient_id','') !~ '^[A-Za-z0-9_-]{1,100}$' or coalesce(length(i->>'ingredient_name'),0) not between 1 and 150 or length(coalesce(i->>'unit',''))>20 or length(coalesce(i->>'quantity',''))>40 then raise exception 'INVALID_INGREDIENT'; end if;
 end loop;
end $$;

create or replace function public.bb_validate_state(p_values jsonb) returns void language plpgsql set search_path='' as $$
declare k text; v jsonb; o jsonb; r jsonb; entry jsonb; name text; item jsonb; field text; basis text; n jsonb;
begin
 if jsonb_typeof(p_values) is distinct from 'object' or octet_length(p_values::text)>2000000 then raise exception 'INVALID_STATE'; end if;
 for k,v in select * from jsonb_each(p_values) loop
  if k not in ('boschetto-v1','boschetto-calendar-v1','boschetto-shopping-v1','boschetto-nutrition-v1') or jsonb_typeof(v)<>'string' then raise exception 'INVALID_STATE'; end if;
  o:=(v#>>'{}')::jsonb;if jsonb_typeof(o) is distinct from 'object' then raise exception 'INVALID_STATE'; end if;
  if k='boschetto-v1' then
   if o?'customRecipes' then for r in select value from jsonb_array_elements(o->'customRecipes') loop perform public.bb_validate_recipe(r); end loop; end if;
   if o?'editedRecipes' then for name,r in select * from jsonb_each(o->'editedRecipes') loop perform public.bb_validate_recipe(r); if name<>r->>'recipe_id' then raise exception 'INVALID_RECIPE_ID'; end if; end loop; end if;
   foreach field in array array['individual','selected','checked'] loop if o?field then for item in select value from jsonb_array_elements(o->field) loop if jsonb_typeof(item)<>'string' or length(item#>>'{}')>300 then raise exception 'INVALID_SELECTION'; end if; end loop; end if; end loop;
   foreach field in array array['amounts','units'] loop if o?field then for name,item in select * from jsonb_each(o->field) loop if jsonb_typeof(item)<>'string' or length(item#>>'{}')>40 then raise exception 'INVALID_QUANTITY'; end if; end loop; end if; end loop;
   if o?'recipeTags' then for name,r in select * from jsonb_each(o->'recipeTags') loop for item in select value from jsonb_array_elements(r) loop if jsonb_typeof(item)<>'string' or length(item#>>'{}')>100 then raise exception 'INVALID_TAG'; end if; end loop; end loop; end if;
   if o?'manualItems' then for iTem in select value from jsonb_array_elements(o->'manualItems') loop if coalesce(item->>'ingredient_id','') !~ '^[A-Za-z0-9_-]{1,100}$' or coalesce(length(item->>'ingredient_name'),0) not between 1 and 150 or length(coalesce(item->>'unit',''))>20 or length(coalesce(item->>'quantity',''))>40 then raise exception 'INVALID_INGREDIENT'; end if; end loop; end if;
  elsif k='boschetto-calendar-v1' then
   for name,r in select * from jsonb_each(o) loop
    if name !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_DATE'; end if;
    if jsonb_typeof(r)='string' then if r#>>'{}' !~ '^[A-Za-z0-9_-]{1,100}$' then raise exception 'INVALID_RECIPE_ID'; end if;
    else
     if jsonb_typeof(r) is distinct from 'array' or jsonb_array_length(r)>100 then raise exception 'INVALID_CALENDAR'; end if;
     for entry in select value from jsonb_array_elements(r) loop if coalesce(entry->>'id','') !~ '^[A-Za-z0-9_-]{1,100}$' or coalesce(entry->>'recipeId','') !~ '^[A-Za-z0-9_-]{1,100}$' then raise exception 'INVALID_CALENDAR'; end if; end loop;
    end if;
   end loop;
  elsif k='boschetto-shopping-v1' then
   foreach field in array array['order','excluded'] loop if o?field then for item in select value from jsonb_array_elements(o->field) loop if jsonb_typeof(item)<>'string' or length(item#>>'{}')>400 then raise exception 'INVALID_SHOPPING'; end if; end loop; end if; end loop;
  else
   for name,r in select * from jsonb_each(o) loop
    if name !~ '^[A-Za-z0-9_-]{1,100}$' or coalesce(r->>'basis','') not in ('100g','portion') or jsonb_typeof(r->'values') is distinct from 'object' then raise exception 'INVALID_NUTRITION'; end if;
    foreach basis in array array['100g','portion'] loop foreach field in array array['kcal','protein','carbs','fat'] loop n:=r->'values'->basis->field; if n is not null and n<>'null'::jsonb then if jsonb_typeof(n)<>'number' then raise exception 'INVALID_NUTRITION'; end if; if (n#>>'{}')::numeric<0 then raise exception 'NEGATIVE_NUTRITION'; end if; end if; end loop; end loop;
   end loop;
  end if;
 end loop;
end $$;

create or replace function public.bb_has_data(p_values jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; o jsonb; f text;
begin
 for k,v in select * from jsonb_each(p_values) loop
  o:=(v#>>'{}')::jsonb;
  if k='boschetto-v1' then
   foreach f in array array['customRecipes','individual','manualItems','selected'] loop if jsonb_array_length(coalesce(o->f,'[]'::jsonb))>0 then return true; end if; end loop;
   foreach f in array array['editedRecipes','recipeTags','amounts','units'] loop if coalesce(o->f,'{}'::jsonb)<>'{}'::jsonb then return true; end if; end loop;
  elsif k='boschetto-shopping-v1' then if jsonb_array_length(coalesce(o->'order','[]'::jsonb))>0 or jsonb_array_length(coalesce(o->'excluded','[]'::jsonb))>0 then return true; end if;
  elsif o<>'{}'::jsonb then return true;
  end if;
 end loop;return false;
end $$;

create or replace function public.bb_get_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise insufficient_privilege using message='LOGIN_REQUIRED'; end if;
 insert into public.bb_account_state(user_id) values(uid) on conflict(user_id) do nothing;
 select jsonb_build_object('revision',revision,'values',state_values) into result from public.bb_account_state where user_id=uid;
 return result;
end $$;

create or replace function public.bb_save_state(p_revision bigint,p_values jsonb,p_import boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); previous public.bb_account_state; next_revision bigint;
begin
 if uid is null then raise insufficient_privilege using message='LOGIN_REQUIRED'; end if;
 if p_revision is null or p_revision<0 then raise exception 'INVALID_REVISION'; end if;
 perform public.bb_validate_state(p_values);
 insert into public.bb_account_state(user_id) values(uid) on conflict(user_id) do nothing;
 select * into previous from public.bb_account_state where user_id=uid for update;
 if previous.revision<>p_revision then raise exception using errcode='40001',message='STATE_CONFLICT'; end if;
 if p_import and public.bb_has_data(previous.state_values) then raise exception using errcode='40001',message='IMPORT_REQUIRES_EMPTY_STATE'; end if;
 update public.bb_account_state set state_values=p_values,revision=revision+1,updated_at=now() where user_id=uid returning revision into next_revision;
 return jsonb_build_object('revision',next_revision);
end $$;
revoke all on function public.bb_validate_recipe(jsonb), public.bb_validate_state(jsonb), public.bb_has_data(jsonb) from public,anon,authenticated;
revoke all on function public.bb_get_state(), public.bb_save_state(bigint,jsonb,boolean) from public,anon;
grant execute on function public.bb_get_state(), public.bb_save_state(bigint,jsonb,boolean) to authenticated;
commit;
