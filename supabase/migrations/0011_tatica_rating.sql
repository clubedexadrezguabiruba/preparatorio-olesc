-- ---------------------------------------------------------------------------
-- Tática com rating — o modo do Puzzles Rated do Chess.com.
--
-- Problemas misturados, e o rating do aluno sobe e desce a cada um (Glicko-2,
-- o método do clube: `lib/tatica/glicko2.ts`). O plano inteiro está em
-- `docs/TATICA-RATING.md`.
--
-- ## Só acrescenta
--
-- Uma tabela nova, três colunas nullable e um valor a mais num CHECK. O código
-- que está no ar não lê nada disso e continua gravando como sempre; por isso a
-- migration roda **antes** do deploy (a regra da `0005_revisao.sql`), e o banco
-- de teste, que é o mesmo das outras frentes, não quebra ninguém.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. rating_tatica — uma linha por aluno
--
-- ## Por que tabela separada, e não `perfis.rating`
--
-- `perfis` tem a política `perfis_atualiza_o_seu` (0001): o aluno logado
-- atualiza a própria linha. Um rating morando ali seria um `update` do
-- navegador a escrever — "subi para 2400" sem resolver nada. Aqui **ninguém
-- escreve** além da chave de serviço, que só o servidor tem, e o servidor só
-- escreve depois de julgar os lances (`lib/tatica/gravar-rating.ts`).
--
-- E `perfis.rating` já é outra coisa: o rating de entrada que o professor
-- anota, que a página do aluno mostra como tal.
--
-- ## Casas decimais
--
-- `double precision`, e não inteiro: o Glicko-2 devolve frações, e arredondar
-- a cada puzzle acumularia erro (quem ganha +0,4 cinquenta vezes ficaria
-- parado). Quem arredonda é a tela.
--
-- ## O problema pendente
--
-- `puzzle_pendente` é o problema que o servidor serviu e ainda não recebeu
-- resposta. Ele é sorteado **no servidor** e fica gravado: recarregar a página
-- traz o mesmo, e o aluno não foge de um difícil nem escolhe um fácil pelo id.
-- É também a trava contra resposta em dobro: o `update` que grava o resultado
-- exige `puzzle_pendente = <o respondido>`, e só um dos dois pedidos casa.
--
-- `tema_pendente` é a origem do problema — o arquivo de onde
-- `puzzlePorId(origem, id)` lê a solução (uma tag de tema, ou `rating-base`).
-- `pendente_desde` é o relógio do servidor para o tempo, que é gravado e não
-- mexe no rating nem aparece em tela nenhuma (decisão do Doug, 15/9).
-- ---------------------------------------------------------------------------

create table if not exists public.rating_tatica (
  aluno             uuid primary key references public.perfis (id) on delete cascade,
  rating            double precision not null default 400 check (rating between 100 and 3000),
  rd                double precision not null default 350 check (rd between 30 and 350),
  volatilidade      double precision not null default 0.06 check (volatilidade between 0.01 and 0.15),
  sequencia         integer not null default 0 check (sequencia >= 0),
  melhor_sequencia  integer not null default 0 check (melhor_sequencia >= 0),
  rating_maximo     double precision not null default 400,
  resolvidos        integer not null default 0 check (resolvidos >= 0),
  puzzle_pendente   text,
  tema_pendente     text,
  pendente_desde    timestamptz,
  atualizado_em     timestamptz not null default now()
);

comment on table public.rating_tatica is
  'O rating de tática de cada aluno (Glicko-2) e o problema pendente. Só a chave de serviço escreve; o aluno lê a sua linha e o professor lê todas.';

alter table public.rating_tatica enable row level security;

drop policy if exists rating_tatica_le_a_sua on public.rating_tatica;
create policy rating_tatica_le_a_sua on public.rating_tatica
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

-- Sem `insert`, `update` nem `delete` para ninguém: a mesma decisão de
-- `tentativas_puzzle`, e pelo mesmo motivo.

-- ---------------------------------------------------------------------------
-- 2. tentativas_puzzle: o rating de antes e de depois
--
-- Nulas nos outros modos. É delas que sai o gráfico de evolução (o último
-- rating de cada dia) e o "+8 / −12" de cada tentativa na lista do aluno —
-- sem uma segunda tabela de histórico que pudesse discordar desta.
-- ---------------------------------------------------------------------------

alter table public.tentativas_puzzle
  add column if not exists rating_antes  double precision,
  add column if not exists rating_depois double precision,
  add column if not exists rd_depois     double precision;

comment on column public.tentativas_puzzle.rating_antes is
  'Só no modo rating: o rating do aluno antes deste problema. Nula nos outros modos.';
comment on column public.tentativas_puzzle.rating_depois is
  'Só no modo rating: o rating do aluno depois deste problema. Nula nos outros modos.';
comment on column public.tentativas_puzzle.rd_depois is
  'Só no modo rating: o RD do aluno depois deste problema. Nula nos outros modos.';

-- ---------------------------------------------------------------------------
-- 3. O modo `rating` entra no CHECK, no molde da 0009
-- ---------------------------------------------------------------------------

alter table public.tentativas_puzzle
  drop constraint if exists tentativas_puzzle_modo_check;

alter table public.tentativas_puzzle
  add constraint tentativas_puzzle_modo_check
  check (modo in ('aquecimento', 'serie', 'prova', 'torneio', 'revisao', 'prova-de-nivel', 'rating'));

comment on column public.tentativas_puzzle.modo is
  'Onde o puzzle foi servido. As três etapas do tema (aquecimento, serie, prova) movem a barra do tema; revisao, prova-de-nivel e rating não — progressoPorTema descarta o que não é etapa. O erro no modo rating vai para a revisão do dia, e não para a prova do tema. torneio nunca teve tela.';

-- O gráfico e a tabela da turma leem só as linhas do modo rating de um aluno,
-- em ordem de data.
create index if not exists tentativas_rating_idx
  on public.tentativas_puzzle (aluno, criada_em)
  where modo = 'rating';
