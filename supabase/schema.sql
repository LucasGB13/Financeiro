-- Rode este arquivo no SQL Editor do projeto Supabase antes de publicar o site.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 60),
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('income','expense')),
  category text not null check (category in ('salary','home','food','transport','health','leisure','other')),
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions(user_id,date desc);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  remaining integer not null check (remaining between 1 and 600),
  icon text not null default '▤',
  created_at timestamptz not null default now()
);
create index if not exists bills_user_due_idx on public.bills(user_id,due_date);

create table if not exists public.savings_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salary numeric(12,2) not null default 0 check (salary >= 0),
  percent integer not null default 10 check (percent between 0 and 100),
  saved numeric(12,2) not null default 0 check (saved >= 0),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
alter table public.bills enable row level security;
alter table public.savings_plans enable row level security;

drop policy if exists "Users manage their own transactions" on public.transactions;
create policy "Users manage their own transactions" on public.transactions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their own bills" on public.bills;
create policy "Users manage their own bills" on public.bills
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their own savings plan" on public.savings_plans;
create policy "Users manage their own savings plan" on public.savings_plans
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.bills to authenticated;
grant select, insert, update, delete on public.savings_plans to authenticated;
