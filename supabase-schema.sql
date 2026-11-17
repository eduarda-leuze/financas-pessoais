-- FinançasPessoais – Supabase Schema
-- Execute isso no SQL Editor do Supabase

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Categories
create table if not exists categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text check (type in ('expense', 'income')) not null default 'expense',
  color text not null default '#6b7280',
  icon text not null default '📦',
  keywords text[] not null default '{}',
  created_at timestamptz default now()
);

-- Transactions
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  account_id uuid,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  paid_date date,
  status text check (status in ('paid', 'pending', 'overdue')) not null default 'pending',
  type text check (type in ('expense', 'income')) not null default 'expense',
  source text check (source in ('manual', 'import')) not null default 'manual',
  month integer not null check (month between 1 and 12),
  year integer not null,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table categories enable row level security;
alter table transactions enable row level security;

-- Policies: users only see their own data
create policy "categories: own data" on categories
  for all using (auth.uid() = user_id);

create policy "transactions: own data" on transactions
  for all using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists transactions_user_month_year on transactions(user_id, month, year);
create index if not exists transactions_category_id on transactions(category_id);
create index if not exists categories_user_id on categories(user_id);
