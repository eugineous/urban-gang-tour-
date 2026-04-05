-- Knowledge base storage for PPP TV AI brain
create table if not exists knowledge_base (
  id text primary key,
  title text not null default '',
  content text not null default '',
  updated_at timestamptz not null default now()
);
