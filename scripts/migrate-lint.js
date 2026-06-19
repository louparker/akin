#!/usr/bin/env node
/*
 * Lints supabase/migrations/*.sql for destructive SQL patterns that need
 * either an explicit naming convention or human review before merging.
 *
 * Catches:
 *   - TRUNCATE          (always blocked)
 *   - DELETE FROM ...   without a WHERE clause (always blocked)
 *   - DROP TABLE        (blocked unless the migration file is named NNNN_drop_*.sql)
 *   - ALTER TABLE ... DROP COLUMN  (warn — needs human review, doesn't fail)
 *
 * Why: a single accidental TRUNCATE or unguarded DELETE in a migration runs
 * against every environment the migration touches, including prod. This lint
 * runs locally via `pnpm migrate:lint` and in CI on every PR.
 *
 * The parser strips line + block comments and splits on top-level semicolons.
 * It does NOT understand dollar-quoted blocks ($$ ... $$), so a destructive
 * statement *inside* a PL/pgSQL function body could slip through. That's fine
 * for our purposes — function bodies are SECURITY DEFINER and reviewed
 * manually as CRITICAL-PATH per CLAUDE.md.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

const errors = [];
const warns = [];

function stripCommentsAndStrings(sql) {
  // Strip block comments first (greedy across newlines).
  let out = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // Strip line comments.
  out = out.replace(/--[^\n]*/g, '');
  // Strip dollar-quoted bodies so we don't lint inside CREATE FUNCTION blocks.
  // Match $tag$ ... $tag$ (tag may be empty).
  out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, '');
  return out;
}

function splitStatements(sql) {
  // Naive split on `;` — adequate after dollar-quoted bodies are stripped.
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normaliseWhitespace(stmt) {
  return stmt.replace(/\s+/g, ' ').trim();
}

function lintFile(filePath) {
  const basename = path.basename(filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const cleaned = stripCommentsAndStrings(raw);
  const statements = splitStatements(cleaned);

  for (const stmt of statements) {
    const normalised = normaliseWhitespace(stmt);
    const upper = normalised.toUpperCase();

    if (/^TRUNCATE\b/.test(upper)) {
      errors.push(
        `${basename}: TRUNCATE statement at top level. ` +
          `Not allowed without an ADR. Statement: ${normalised.slice(0, 80)}…`,
      );
      continue;
    }

    if (/^DELETE\s+FROM\b/.test(upper) && !/\bWHERE\b/.test(upper)) {
      errors.push(
        `${basename}: unguarded DELETE FROM (no WHERE clause). ` +
          `Statement: ${normalised.slice(0, 80)}…`,
      );
      continue;
    }

    if (/^DROP\s+TABLE\b/.test(upper)) {
      if (!/^\d+_drop_/.test(basename)) {
        errors.push(
          `${basename}: DROP TABLE only allowed in migrations named ` +
            `'NNNN_drop_*.sql' with an ADR entry. Statement: ${normalised.slice(0, 80)}…`,
        );
      }
      continue;
    }

    if (/^ALTER\s+TABLE\b.*\bDROP\s+COLUMN\b/.test(upper)) {
      warns.push(
        `${basename}: ALTER TABLE … DROP COLUMN. ` +
          `Needs human review for backfill / dependent code. Statement: ${normalised.slice(0, 80)}…`,
      );
    }
  }
}

function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`migrate-lint: ${MIGRATIONS_DIR} does not exist.`);
    process.exit(2);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(MIGRATIONS_DIR, f));

  for (const file of files) {
    try {
      lintFile(file);
    } catch (err) {
      errors.push(`${path.basename(file)}: lint crashed: ${err.message}`);
    }
  }

  if (warns.length > 0) {
    console.error('\nMigration lint warnings:');
    for (const w of warns) console.error(`  - ${w}`);
  }

  if (errors.length > 0) {
    console.error('\nMigration lint errors:');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} error(s) in ${files.length} migration(s).`);
    process.exit(1);
  }

  console.log(`migrate-lint: clean (${files.length} migration(s) checked).`);
}

main();
