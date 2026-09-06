-- ---------------------------------------------------------------------------
-- F2 — Revisão espaçada, o dia de hoje, a partida do dia e as dicas de
-- meio-jogo.
--
-- Nasceu da revisão pedagógica de 2026-09-06: a turma real tem 600–1500 de
-- rápidas, 11–15 anos, e vai treinar 2 h por dia. Com esse volume um aluno erra
-- de 5 a 8 puzzles por dia, e até aqui nenhum deles voltava — e a tela dizia o
-- contrário ("os que você errou voltam misturados na prova"). Esta migration é
-- o que torna a frase verdadeira.
--
-- ## Nenhuma tabela de "fila"
--
-- A fila de revisão é **derivada** das linhas que já existem, pelo mesmo
-- motivo de `progresso_aula` não ter a coluna `dominada` (0004, §17-29): o
-- banco guarda o que aconteceu, e o que isso significa é lido em cima, por
-- função pura com teste (`lib/tatica/revisao.ts`, `lib/finais/revisao.ts`).
-- Uma tabela `fila_revisao(devido_em, nivel)` seria uma segunda verdade que o
-- servidor teria de manter sincronizada a cada gravação — e um bug ali não se
-- consertaria relendo o histórico.
--
-- O que entra, então: um valor a mais em dois CHECKs, duas colunas nullable,
-- duas tabelas de declaração do aluno e uma view.
--
-- ## Roda antes do deploy, e é compatível com o código que está no ar
--
-- As colunas novas são nullable e os CHECKs só relaxam. O servidor antigo
-- continua gravando sem `origem` e sem `posicao`; o novo passa a gravá-las. A
-- ordem contrária (deploy antes da migration) faria o insert novo falhar por
-- coluna inexistente — daí a regra: migrar primeiro.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. tentativas_puzzle: o modo `revisao`, e de que arquivo o puzzle veio
--
-- O CHECK de `modo` foi criado inline na 0001 e o Postgres o nomeou sozinho
-- (`tentativas_puzzle_modo_check`, quase certamente — mas "quase" não serve).
-- Procurá-lo pelo catálogo em vez de pelo nome é o que impede um
-- `drop constraint if exists` que não acha nada, não reclama, e deixa o CHECK
-- velho recusando 'revisao' em silêncio no primeiro puzzle do dia.
-- ---------------------------------------------------------------------------

do $$
declare nome text;
begin
  for nome in
    select conname from pg_constraint
    where conrelid = 'public.tentativas_puzzle'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%modo%'
  loop
    execute format('alter table public.tentativas_puzzle drop constraint %I', nome);
  end loop;
end $$;

alter table public.tentativas_puzzle
  add constraint tentativas_puzzle_modo_check
  check (modo in ('aquecimento', 'serie', 'prova', 'torneio', 'revisao'));

-- A prova mistura temas: 5 dos 10 puzzles vêm do arquivo de outro tema. A
-- linha guardava só `tema` (onde o aluno estava), e sem saber de que arquivo o
-- puzzle veio a revisão não o reencontra no disco (`puzzlePorId(origem, id)`).
-- Nullable de propósito: o código no ar ainda não a escreve, e uma linha
-- gravada entre a migration e o deploy não pode falhar.
alter table public.tentativas_puzzle
  add column if not exists origem text;

-- O que já existe ganha a melhor aproximação: fora da prova, origem = tema.
update public.tentativas_puzzle set origem = tema where origem is null;

comment on column public.tentativas_puzzle.origem is
  'A tag por cujo arquivo o puzzle foi servido. Igual a `tema` fora da prova. Nula só em linhas anteriores à 0005 (aí vale `tema`).';

-- ---------------------------------------------------------------------------
-- 2. tentativas_aula: a etapa `revisao`, e qual posição foi jogada
-- ---------------------------------------------------------------------------

do $$
declare nome text;
begin
  for nome in
    select conname from pg_constraint
    where conrelid = 'public.tentativas_aula'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%etapa%'
  loop
    execute format('alter table public.tentativas_aula drop constraint %I', nome);
  end loop;
end $$;

alter table public.tentativas_aula
  add constraint tentativas_aula_etapa_check
  check (etapa in ('solo', 'pratica', 'revisao'));

-- Uma aula tem até duas posições de revisão, e `lances` não se reconstrói sem
-- saber de qual FEN a partida saiu. Nula em `solo` e `pratica`: ali a posição
-- é a da aula, e está no arquivo.
alter table public.tentativas_aula
  add column if not exists posicao text;

comment on column public.tentativas_aula.posicao is
  'Só em etapa = revisao: o id da posição jogada (content/positions). Conferido pelo servidor contra as posições de revisão da aula antes de gravar.';

-- ---------------------------------------------------------------------------
-- 3. partida_do_dia — "joguei a partida de hoje"
--
-- A rotina de 2 h termina com uma partida de 15+10 no chess.com, e não há
-- como reconferir isso do servidor (não existe API aberta por nome de usuário
-- lá). Então é declaração, pela regra editorial de 0003 e de `aula_lida`: o
-- aluno grava a dele, com RLS. O dia é calculado **no servidor**
-- (`hojeNoBrasil`), nunca vem do navegador; a chave composta recusa o segundo
-- toque.
-- ---------------------------------------------------------------------------

create table if not exists public.partida_do_dia (
  aluno       uuid not null references public.perfis (id) on delete cascade,
  dia         date not null,
  marcada_em  timestamptz not null default now(),
  primary key (aluno, dia)
);

comment on table public.partida_do_dia is
  'Uma linha por dia em que o aluno declara ter jogado a partida de casa. O aluno grava a dele; o dia é o de Guabiruba, calculado pelo servidor.';

alter table public.partida_do_dia enable row level security;

drop policy if exists partida_le_as_suas on public.partida_do_dia;
create policy partida_le_as_suas on public.partida_do_dia
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

drop policy if exists partida_marca_as_suas on public.partida_do_dia;
create policy partida_marca_as_suas on public.partida_do_dia
  for insert to authenticated
  with check (aluno = (select auth.uid()));

drop policy if exists partida_desmarca_as_suas on public.partida_do_dia;
create policy partida_desmarca_as_suas on public.partida_do_dia
  for delete to authenticated
  using (aluno = (select auth.uid()));

-- Sem `update`, como nas outras: marcação não muda de ideia.

-- ---------------------------------------------------------------------------
-- 4. dica_lida — as dicas de meio-jogo que o aluno declarou ter lido
--
-- Meio-jogo tem mais de 7 peças: a tablebase não julga, e não há lance para
-- reconferir. A dica é leitura, vídeo e um quiz de plano cujo juiz é o autor.
-- "Li" é declaração, pelo molde exato de `aula_lida`.
-- ---------------------------------------------------------------------------

create table if not exists public.dica_lida (
  aluno   uuid not null references public.perfis (id) on delete cascade,
  -- O id da dica em `content/meio-jogo.json` (`m1`). Texto solto, como
  -- `aula_lida.aula`: o outro lado é arquivo no repositório.
  dica    text not null,
  lida_em timestamptz not null default now(),
  primary key (aluno, dica)
);

comment on table public.dica_lida is
  'Uma linha por dica de meio-jogo declarada lida. O aluno grava a dele.';

alter table public.dica_lida enable row level security;

drop policy if exists dica_le_as_suas on public.dica_lida;
create policy dica_le_as_suas on public.dica_lida
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

drop policy if exists dica_marca_as_suas on public.dica_lida;
create policy dica_marca_as_suas on public.dica_lida
  for insert to authenticated
  with check (aluno = (select auth.uid()));

drop policy if exists dica_desmarca_as_suas on public.dica_lida;
create policy dica_desmarca_as_suas on public.dica_lida
  for delete to authenticated
  using (aluno = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. minutos_por_dia — quanto tempo o aluno treinou em cada dia, por bloco
--
-- A obrigação é de 2 h por dia, e o que se mede tem de ser visível: o painel
-- mostra os minutos de hoje, e o relatório do professor mostra 14 dias da
-- turma inteira. Somar 14 dias × 12 alunos por `group by` é coisa de view, não
-- de supabase-js — o mesmo argumento da `progresso_tema` (0002).
--
-- O dia é o de Guabiruba, não o do servidor: `criada_em` é timestamptz e o
-- corte à meia-noite tem de ser a meia-noite de lá — ver `lib/curso/calendario.ts`
-- para o mesmo argumento no TypeScript. O fuso fica escrito nos dois lugares;
-- `scripts/verificar-tatica.ts` prova que os dois concordam (uma linha gravada
-- agora aparece na view com `dia = hojeNoBrasil()`).
--
-- Soma em milissegundos, e não em minutos: quem arredonda é a tela, uma vez,
-- depois de somar os blocos — dois puzzles de 59,6 s são 2 minutos, não 1+1.
-- Cabe em int: 2 h/dia são 7,2 milhões.
-- ---------------------------------------------------------------------------

create or replace view public.minutos_por_dia
with (security_invoker = on) as
select
  aluno,
  dia,
  bloco,
  sum(tempo_ms)::int as tempo_ms,
  count(*)::int      as itens
from (
  select aluno,
         (criada_em at time zone 'America/Sao_Paulo')::date as dia,
         'tatica'::text as bloco,
         tempo_ms
  from public.tentativas_puzzle
  union all
  select aluno,
         (criada_em at time zone 'America/Sao_Paulo')::date,
         'finais'::text,
         tempo_ms
  from public.tentativas_aula
) t
group by aluno, dia, bloco;

comment on view public.minutos_por_dia is
  'Soma de tempo_ms por aluno, dia (America/Sao_Paulo) e bloco (tatica/finais). Roda com os privilégios de quem consulta (security_invoker).';

-- O `grant` explícito pelo motivo da `progresso_tema`: view criada por
-- migration não herda o default privilege das tabelas novas, e sem ele a
-- consulta volta "permission denied for view" — um erro que parece de RLS e
-- não é.
grant select on public.minutos_por_dia to authenticated;
