const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
(async () => {
  const db = new PGlite();
  const sql = fs.readFileSync('supabase/migrations/20261113_assign_designated_admin.sql', 'utf8');
  await db.exec(`create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create table public.hq_staff(user_id uuid primary key references auth.users(id), created_at timestamptz default now());
    alter table public.hq_staff enable row level security;
    insert into auth.users values ('00000000-0000-0000-0000-000000000001', 'RMMLVNC@gmail.com', null),
    ('00000000-0000-0000-0000-000000000002', 'member@example.com', now());`);
  await assert.rejects(db.exec(sql), /Register and confirm/);
  await db.exec('rollback');
  assert.equal((await db.query('select * from hq_staff')).rows.length, 0);
  await db.exec("update auth.users set email_confirmed_at = now() where lower(email) = 'rmmlvnc@gmail.com'");
  await db.exec(sql);
  await db.exec(sql);
  assert.deepEqual((await db.query('select user_id from hq_staff')).rows, [{user_id: '00000000-0000-0000-0000-000000000001'}]);
  await db.exec('set role authenticated');
  await assert.rejects(db.exec("insert into public.hq_staff(user_id) values ('00000000-0000-0000-0000-000000000002')"), /permission denied/);
  await db.close();
  console.log('Admin grant: confirmed email, case handling, repeat execution, member exclusion, and denied self-assignment passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
