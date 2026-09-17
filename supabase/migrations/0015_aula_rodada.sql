-- ---------------------------------------------------------------------------
-- Curso de abertura — a progressão da aula por vez (regras 16 e 17).
-- Especificação do Editor v2, §18.1 (decisões do Doug, 16/9/2026).
--
-- ## O que faltava
--
-- Nada registrava "o aluno concluiu a aula". `aula_lida` tem uma linha por aluno e aula, a
-- explicação não grava, e `tentativas_aula` é por etapa. Sem isso, a aula não sabe se é a
-- 1ª, a 2ª ou a 3ª vez do aluno — e é a vez que decide o que ele pode pular.
--
-- ## Uma linha por rodada
--
-- Uma **rodada** é uma passada pela aula, do começo até a conclusão. A linha nasce quando o
-- aluno abre a aula, junta as etapas feitas (`etapas_feitas`, que é também o "retomar de onde
-- parou") e ganha `concluida_em` quando a última etapa obrigatória fecha. A vez é o número de
-- rodadas concluídas mais um.
--
-- ## Só o servidor escreve
--
-- Como `tentativas_aula`: o aluno lê as dele, e quem escreve é a server action com o cliente
-- admin, depois de conferir que a etapa existe na publicação — e, no treino e no move trainer,
-- que o jogo de verdade foi gravado nesta rodada.
--
-- Aditiva: nenhuma tabela existente muda.
-- ---------------------------------------------------------------------------

create table if not exists public.aula_rodada (
  aluno          uuid not null references public.perfis (id) on delete cascade,
  -- O id da aula de abertura (`AB-BRANCAS-FRANCESA-B`). Texto solto, como em `tentativas_aula`:
  -- o outro lado é arquivo no repositório.
  aula           text not null,
  rodada         integer not null check (rodada >= 1),
  -- A publicação com que a rodada começou. Uma publicação nova no meio não apaga o que foi feito.
  publication_id text not null,
  etapas_feitas  text[] not null default '{}',
  iniciada_em    timestamptz not null default now(),
  atualizada_em  timestamptz not null default now(),
  concluida_em   timestamptz,
  primary key (aluno, aula, rodada)
);

comment on table public.aula_rodada is
  'Curso de abertura: uma linha por passada do aluno por uma aula AB-. A vez é o número de rodadas concluídas + 1. Só o servidor escreve.';
comment on column public.aula_rodada.etapas_feitas is
  'Os ids de etapa do fluxo feitos nesta rodada — pular conta como feita. É também de onde a aula retoma.';

create index if not exists aula_rodada_aluno_idx on public.aula_rodada (aluno, aula, concluida_em);

alter table public.aula_rodada enable row level security;

drop policy if exists "aula_rodada: aluno lê as suas, professor lê todas" on public.aula_rodada;
create policy "aula_rodada: aluno lê as suas, professor lê todas"
  on public.aula_rodada for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());
