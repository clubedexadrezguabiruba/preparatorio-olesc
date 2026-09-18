-- Uma rodada preserva a seleção e agrupa as respostas mesmo após F5 ou troca
-- de aparelho. Histórico anterior permanece intacto (rodada_id nula).
create table if not exists public.tatica_rodadas (
  id uuid primary key default gen_random_uuid(),
  aluno uuid not null references public.perfis(id) on delete cascade,
  chave text not null,
  numero integer not null check (numero > 0),
  modo text not null check (modo in ('aquecimento', 'serie', 'prova', 'prova-de-nivel')),
  tema text,
  puzzles jsonb not null check (jsonb_typeof(puzzles) = 'array' and jsonb_array_length(puzzles) > 0),
  criada_em timestamptz not null default now(),
  unique (aluno, chave, numero)
);

alter table public.tatica_rodadas enable row level security;
create policy "rodadas: aluno le as suas, professor le todas"
  on public.tatica_rodadas for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

alter table public.tentativas_puzzle
  add column if not exists rodada_id uuid references public.tatica_rodadas(id) on delete cascade;

-- NULL preserva as repetições legítimas do histórico e da revisão espaçada.
create unique index if not exists tentativa_puzzle_por_rodada
  on public.tentativas_puzzle (rodada_id, puzzle_id) where rodada_id is not null;
