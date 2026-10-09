create table if not exists public.clearinghouse_transactions (
  id uuid primary key default gen_random_uuid(),
  claim_control_number text not null,
  idempotency_key text not null unique,
  stedi_transaction_id text,
  stedi_claim_id text,
  kind text not null,
  status text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.clearinghouse_transactions enable row level security;
