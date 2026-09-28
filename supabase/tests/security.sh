#!/bin/bash
# Security checks for supabase/migrations/0001_accounts.sql against a plain PostgreSQL
# database (no Supabase needed). supabase-stub.sql stands in for the bits of Supabase the
# migration relies on: auth.users, auth.uid() and the anon/authenticated roles.
#
# Usage (needs psql and a throwaway Postgres you can create databases on):
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres bash supabase/tests/security.sh
set -u
DIR=$(cd "$(dirname "$0")" && pwd)
DB=overload_security_test
psql -d postgres -qc "drop database if exists $DB" -c "create database $DB" >/dev/null
psql -d $DB -q -v ON_ERROR_STOP=1 -f "$DIR/supabase-stub.sql" || { echo "FAIL setting up the Supabase stub"; exit 1; }
psql -d $DB -q -v ON_ERROR_STOP=1 -f "$DIR/../migrations/0001_accounts.sql" 2>/dev/null || { echo "FAIL migration"; exit 1; }
psql -d $DB -q -v ON_ERROR_STOP=1 -f "$DIR/../migrations/0001_accounts.sql" 2>/dev/null || { echo "FAIL migration re-run"; exit 1; }
echo "PASS migration runs, and can be re-run"
FAILED=0
Q() { psql -d $DB -Atq -v ON_ERROR_STOP=1 -c "$1" 2>&1; }
expect_ok()   { out=$(Q "$2"); if [ $? -eq 0 ]; then echo "PASS $1 ${out:+→ $out}"; else echo "FAIL $1 → $out"; FAILED=1; fi; }
# expect_fail NAME PATTERN SQL: must be refused, with an error matching PATTERN (so a
# check can't pass for the wrong reason, e.g. a missing table).
expect_fail() {
  out=$(Q "$3"); code=$?
  err=$(echo "$out" | grep -o 'ERROR:.*' | head -1)
  if [ $code -ne 0 ] && echo "$err" | grep -qE "$2"; then echo "PASS $1 (refused: $err)";
  else echo "FAIL $1 → ${err:-allowed: $out}"; FAILED=1; fi
}
A=11111111-1111-1111-1111-111111111111; B=22222222-2222-2222-2222-222222222222
as_user() { echo "set role authenticated; set request.jwt.claim.sub = '$1'; $2"; }
as_anon() { echo "set role anon; $1"; }

Q "insert into public.allowed_emails (email) values ('owner@example.com'), ('Friend@Example.com')" >/dev/null
expect_ok   "invited email can sign up"                 "insert into auth.users (id, email) values ('$A', 'owner@example.com')"
expect_ok   "invite match ignores letter case"          "insert into auth.users (id, email) values ('$B', 'friend@example.com')"
expect_fail "uninvited email is refused"                "not on the invite list" "insert into auth.users (email) values ('stranger@example.com')"

expect_ok   "user A can create their own row"           "$(as_user $A "insert into public.user_state (user_id, state) values ('$A', '{\"unit\":\"kg\"}')")"
expect_ok   "user B can create their own row"           "$(as_user $B "insert into public.user_state (user_id, state) values ('$B', '{\"unit\":\"lb\"}')")"
expect_fail "user A cannot create a row for B"          "row-level security" "$(as_user $A "insert into public.user_state (user_id, state) values ('$B', '{}') on conflict (user_id) do nothing; insert into public.user_state (user_id, state) values (gen_random_uuid(), '{}')")"
seen=$(Q "$(as_user $A "select count(*) || ' row(s), unit=' || string_agg(state->>'unit', ',') from public.user_state")")
if [ "$seen" = "1 row(s), unit=kg" ]; then echo "PASS user A sees only their own row"; else echo "FAIL user A can see other rows → $seen"; FAILED=1; fi
touched=$(Q "$(as_user $A "with u as (update public.user_state set state='{\"hacked\":true}' where user_id='$B' returning 1) select count(*) from u")")
b_unit=$(Q "select state->>'unit' from public.user_state where user_id='$B'")
if [ "$touched" = "0" ] && [ "$b_unit" = "lb" ]; then echo "PASS user A updating B's row changes nothing"; else echo "FAIL user A updated B's row ($touched, $b_unit)"; FAILED=1; fi
expect_fail "user A cannot move their row to B's id"    "row-level security" "$(as_user $A "update public.user_state set user_id='$B' where user_id='$A'")"
expect_ok   "user A can update their own row (upsert)"  "$(as_user $A "insert into public.user_state (user_id, state) values ('$A', '{\"unit\":\"lb\"}') on conflict (user_id) do update set state = excluded.state returning state->>'unit'")"
expect_fail "user A cannot delete rows"                 "permission denied" "$(as_user $A "delete from public.user_state")"
expect_fail "signed-in users cannot read the invite list" "permission denied" "$(as_user $A "select * from public.allowed_emails")"
expect_fail "signed-in users cannot add to invite list" "permission denied" "$(as_user $A "insert into public.allowed_emails values ('x@y.z')")"
expect_fail "logged-out requests cannot read user data" "permission denied" "$(as_anon "select * from public.user_state")"
expect_fail "logged-out requests cannot read invite list" "permission denied" "$(as_anon "select * from public.allowed_emails")"
expect_fail "users cannot call the invite function"     "permission denied|trigger functions can only be called as triggers" "$(as_user $A "select public.enforce_invite_list()")"
expect_fail "oversized state is refused"                "user_state_size" "$(as_user $A "update public.user_state set state = jsonb_build_object('x', repeat(md5(random()::text), 70000)) where user_id='$A'")"

psql -d postgres -qc "drop database $DB" >/dev/null
exit $FAILED
