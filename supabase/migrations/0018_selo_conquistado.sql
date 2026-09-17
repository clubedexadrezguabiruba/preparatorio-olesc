-- ---------------------------------------------------------------------------
-- 0018 — O selo gravado, a marca de início, e os números dos selos de puzzle.
-- (Doug, 17/9/2026: data de ganho, aviso de selo novo, selos V2.)
--
-- Aditiva: três objetos novos, nenhuma tabela existente muda.
--
-- ## selo_conquistado
--
-- Os selos continuam **derivados** do progresso (`lib/curso/selos.ts`). O que a derivação não
-- sabe é *quando*: o servidor, ao montar o painel e o perfil, grava o que acabou de derivar, e a
-- primeira gravação é a data. Uma linha por (aluno, selo), e **nunca apagada** pelo site — o
-- selo gravado não some mesmo que a derivação deixe de valer.
--
-- `visto_em` é o aviso "Selo novo": nulo até o aviso aparecer na tela, gravado pela server
-- action `marcarSelosVistos`. É o que faz o confete sair **uma vez só**.
--
-- ## selo_inicio
--
-- A primeira avaliação de um aluno grava tudo o que ele já tinha **já visto** (sem festa: no dia
-- em que isto entra, todo aluno antigo teria vinte confetes). A marca separa "primeira vez" de
-- "ainda não tem selo nenhum" — sem ela, o aluno novo que abriu o painel zerado teria o primeiro
-- selo de verdade gravado calado.
--
-- ## A RLS: o molde de `nivel_conquistado`
--
-- O aluno lê as linhas dele, o professor lê todas, e ninguém escreve pela chave pública: quem
-- grava é o servidor, com a chave de serviço, depois de conferir a sessão. Um `insert` do aluno
-- seria ele se dando um selo. A vitrine de um colega (`/turma/[id]`) **não** abre esta política:
-- ela lê pelo servidor (`lib/turma/vitrine.ts`), escolhendo as colunas, e nunca devolve a data.
--
-- ## puzzles_do_aluno
--
-- Os dois números dos selos V2, por aluno:
--
-- - `resolvidos`: puzzles **distintos** com ao menos uma tentativa certa, em qualquer modo.
--   Acertar de novo o mesmo puzzle (a revisão e a prova o servem outra vez) não conta dois.
-- - `melhor_janela`: os certos da **melhor** janela de 100 tentativas seguidas, em ordem de data
--   (empate pelo id). Nula com menos de 100 tentativas. É a pontaria: 80 nessa janela.
--
-- A conta é de janela (`rows between 99 preceding`), e o cliente JavaScript não faz isso sem
-- puxar milhares de linhas paginadas. `security_invoker = on`, como `progresso_tema` (0002):
-- a view roda com os privilégios de quem consulta, e a RLS de `tentativas_puzzle` continua
-- valendo — o aluno lê só a linha dele. `npm run db:rls`, seção 15, prova isso no banco.
-- ---------------------------------------------------------------------------

create table if not exists public.selo_conquistado (
  aluno          uuid not null references public.perfis (id) on delete cascade,
  -- O id do selo em `lib/curso/selos.ts` (`tatica-14`, `abertura-curso-brancas-francesa`).
  selo           text not null check (selo ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  conquistado_em timestamptz not null default now(),
  visto_em       timestamptz,
  primary key (aluno, selo)
);

comment on table public.selo_conquistado is
  'Os selos que o aluno ganhou, com a data. Derivados por lib/curso/selos.ts e gravados pelo servidor; nunca apagados pelo site.';
comment on column public.selo_conquistado.visto_em is
  'Quando o aviso "Selo novo" apareceu. Nulo: ainda não apareceu. A primeira avaliação grava tudo já visto (sem festa).';

alter table public.selo_conquistado enable row level security;

drop policy if exists "selo_conquistado: aluno lê os seus, professor lê todos" on public.selo_conquistado;
create policy "selo_conquistado: aluno lê os seus, professor lê todos"
  on public.selo_conquistado for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

create table if not exists public.selo_inicio (
  aluno uuid primary key references public.perfis (id) on delete cascade,
  em    timestamptz not null default now()
);

comment on table public.selo_inicio is
  'Marca que os selos do aluno já foram avaliados uma vez. Sem ela, a próxima avaliação grava tudo sem aviso.';

alter table public.selo_inicio enable row level security;

drop policy if exists "selo_inicio: aluno lê o seu, professor lê todos" on public.selo_inicio;
create policy "selo_inicio: aluno lê o seu, professor lê todos"
  on public.selo_inicio for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

create or replace view public.puzzles_do_aluno
with (security_invoker = on) as
select
  aluno,
  count(*)::int                                          as tentativas,
  count(distinct puzzle_id) filter (where acertou)::int  as resolvidos,
  max(certos_na_janela) filter (where posicao >= 100)::int as melhor_janela
from (
  select
    aluno,
    puzzle_id,
    acertou,
    row_number() over (partition by aluno order by criada_em, id) as posicao,
    count(*) filter (where acertou) over (
      partition by aluno order by criada_em, id
      rows between 99 preceding and current row
    ) as certos_na_janela
  from public.tentativas_puzzle
) as ordenadas
group by aluno;

comment on view public.puzzles_do_aluno is
  'Selos V2: puzzles distintos resolvidos e a melhor janela de 100 tentativas seguidas (pontaria). security_invoker: a RLS de tentativas_puzzle continua valendo.';

grant select on public.puzzles_do_aluno to authenticated, service_role;
