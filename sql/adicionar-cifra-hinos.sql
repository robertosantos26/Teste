-- Execute este SQL no Supabase SQL Editor para permitir salvar cifras
-- tanto nos hinos do Coral quanto nos hinos da Banda.

alter table public.hinos
  add column if not exists category text not null default 'coral',
  add column if not exists tom text not null default '',
  add column if not exists cifra text not null default '';

-- Garante que hinos antigos sem categoria sejam exibidos na aba Coral.
update public.hinos
set category = 'coral'
where category is null or btrim(category) = '';

-- Opcional, mas recomendado: limita as categorias aceitas pelo app.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hinos_category_check'
      and conrelid = 'public.hinos'::regclass
  ) then
    alter table public.hinos
      add constraint hinos_category_check
      check (category in ('coral', 'banda'));
  end if;
end $$;

comment on column public.hinos.category is 'Lista em que o hino aparece: coral ou banda.';
comment on column public.hinos.tom is 'Tom original da cifra do hino, por exemplo G, Am, Bb ou D.';
comment on column public.hinos.cifra is 'Letra cifrada com acordes entre colchetes, independente do campo lyrics.';
