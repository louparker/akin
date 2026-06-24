-- Migration: 0027_authors_read_own_content.sql
-- CRITICAL-PATH: RLS
--
-- Fixes soft-delete (status active→deleted) for authenticated users.
--
-- PostgreSQL requires a row modified by UPDATE to remain visible under the
-- table's SELECT policies. The existing "anyone reads active <x>" policies only
-- expose status='active' rows, so when an author set status='deleted' the NEW
-- row matched no SELECT policy and RLS rejected the UPDATE with
--   "new row violates row-level security policy".
-- This was latent because the pgTAP suite only ever exercised soft-delete as the
-- bypassing `postgres` role — never as an authenticated client. 0025 relaxed the
-- UPDATE policy but did not address row visibility, so delete still failed.
--
-- Fix: a permissive SELECT policy letting authors read their OWN *deleted*
-- posts/comments. Scoped to status='deleted' on purpose — that is exactly the
-- new row a soft-delete produces, and nothing more. Active-content visibility is
-- still governed entirely by the block/removal-aware "anyone reads active"
-- policies, so a removed user still cannot see their own active comments on a
-- post they were removed from. No email / auth.users.id is exposed — author_id
-- is the requester's own id, and the app's list queries filter status='active'
-- anyway.
--
-- Rollback:
--   DROP POLICY IF EXISTS "authors read own deleted posts"    ON public.posts;
--   DROP POLICY IF EXISTS "authors read own deleted comments" ON public.comments;

CREATE POLICY "authors read own deleted posts"
  ON public.posts FOR SELECT
  USING (author_id = auth.uid() AND status = 'deleted');

CREATE POLICY "authors read own deleted comments"
  ON public.comments FOR SELECT
  USING (author_id = auth.uid() AND status = 'deleted');
