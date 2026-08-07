-- Repertório do dia: uma linha por data, com a lista (ordenada) de hinos
-- escolhidos e o nome de quem montou.
create table if not exists repertorios (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  criado_por text default '',
  hino_ids jsonb not null default '[]'::jsonb,
  observacoes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garante no máximo um repertório por dia (permite "upsert" ao editar).
create unique index if not exists repertorios_data_idx on repertorios (data);

-- Se a tabela já existir e você quiser habilitar leitura/escrita pública
-- (mesmo esquema simples usado pela tabela "hinos"), ajuste as policies de
-- Row Level Security do projeto Supabase da mesma forma que foi feito para
-- a tabela "hinos".
