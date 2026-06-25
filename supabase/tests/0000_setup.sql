-- supabase/tests/0000_setup.sql
-- Creates the 'tests' schema used by all pgTAP test helper functions.
-- This file must sort before migration-numbered test files like 0024_*.test.sql.
-- It does NOT use BEGIN/ROLLBACK, so the schema creation auto-commits and
-- persists for all subsequent test files.
--
-- The tests schema is used to namespace helper functions like:
--   tests.make_user()  tests.make_post()  tests.add_comment()  etc.
-- Each test file redefines the helpers it needs within its own transaction.

CREATE SCHEMA IF NOT EXISTS tests;

SELECT plan(1);
SELECT pass('tests schema ready');
SELECT * FROM finish();
