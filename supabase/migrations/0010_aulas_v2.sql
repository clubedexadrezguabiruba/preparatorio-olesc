-- ---------------------------------------------------------------------------
-- Fatia 7 do Editor v2 — o progresso da aula v2, por publicação e por revisão.
--
-- Aditiva: nenhuma coluna existente muda, nenhuma linha antiga é reescrita. Aplicada em
-- 13/09/2026 no Supabase único, que até 18/09/2026 só tem contas de teste (decisão do Doug).
--
-- ## As duas identidades (plano final §10)
--
-- - `publication_id`: o snapshot exato que o aluno jogou (`content/aulas-v2/<AULA>/
--   publicacoes/<id>.json`). É contra ele que o servidor rejulga — nunca contra a aula ativa.
-- - `assessment_revision`: o que foi avaliado (posição, objetivo, respostas, defesa, término,
--   ajuda). Título, feedback e narração não a mudam; por isso é ela, e não a publicação, que
--   guarda o domínio.
--
-- ## Idempotência
--
-- `tentativa_id` é gerado pelo navegador no começo de cada tentativa. O índice único faz o
-- retry da mesma tentativa encontrar a primeira linha em vez de criar outra — e a escada só
-- sobe quando a linha é nova (`lib/finais/gravar-v2.ts`). Linhas v1 continuam com a coluna nula.
-- ---------------------------------------------------------------------------

alter table public.tentativas_aula
  add column if not exists tentativa_id        uuid,
  add column if not exists publication_id      text,
  add column if not exists entidade_id         text,
  add column if not exists assessment_revision text,
  add column if not exists tentativa_numero    integer,
  add column if not exists politica_defensor   text,
  add column if not exists ajuda               boolean;

-- Índice único comum, e não parcial: `on conflict (tentativa_id)` do PostgREST precisa dele
-- inteiro. Nulos não colidem, então as linhas v1 convivem.
create unique index if not exists tentativas_aula_tentativa_id_key on public.tentativas_aula (tentativa_id);

comment on column public.tentativas_aula.tentativa_id is
  'Aula v2: id idempotente da tentativa, gerado no navegador. Nulo nas linhas v1.';
comment on column public.tentativas_aula.publication_id is
  'Aula v2: a publicação (snapshot) contra a qual a tentativa foi rejulgada.';
comment on column public.tentativas_aula.assessment_revision is
  'Aula v2: a revisão da avaliação efetivamente jogada (ar_ + sha256).';

-- A etapa `treino` entra, pelo mesmo padrão da 0005: acha o check antigo pelo conteúdo e o
-- troca por um que aceita o que já existia mais o novo.
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
  check (etapa in ('solo', 'pratica', 'revisao', 'treino'));

-- A linha v2 é inteira ou não é v2: as quatro identidades andam juntas, e treino só existe
-- em linha v2. É a rede embaixo de um bug de gravação, como os checks da 0007.
alter table public.tentativas_aula drop constraint if exists tentativas_aula_v2_coerente;
alter table public.tentativas_aula
  add constraint tentativas_aula_v2_coerente
  check (
    (tentativa_id is null) = (publication_id is null)
    and (tentativa_id is null) = (entidade_id is null)
    and (tentativa_id is null) = (assessment_revision is null)
    and (tentativa_id is null) = (tentativa_numero is null)
    and (etapa <> 'treino' or tentativa_id is not null)
    and (tentativa_numero is null or tentativa_numero >= 1)
    and (politica_defensor is null or politica_defensor in ('deterministica', 'fixa'))
  );

-- ---------------------------------------------------------------------------
-- avaliacoes_progresso — a escada por avaliação e por revisão
--
-- A forma de `finais_progresso` (0007), com duas colunas a mais na chave. Uma revisão nova da
-- mesma prática começa do zero, e a antiga **fica**: §10, "conquistas históricas não são
-- apagadas silenciosamente".
-- ---------------------------------------------------------------------------

create table if not exists public.avaliacoes_progresso (
  aluno               uuid not null references public.perfis (id) on delete cascade,
  aula                text not null,
  entidade_id         text not null,
  assessment_revision text not null,
  degrau              smallint not null default 0,
  revisar_em          timestamptz,
  tentativas          integer not null default 0,
  erros               integer not null default 0,
  aprendida_em        timestamptz,
  ultima_em           timestamptz not null default now(),
  -- `migrada-v1`: copiada de `finais_progresso` porque a revisão da prática v2 é equivalente à
  -- da v1 (fatia 7, migração explícita). `jogada`: nasceu de uma tentativa rejulgada.
  origem              text not null default 'jogada' check (origem in ('jogada', 'migrada-v1')),
  primary key (aluno, aula, entidade_id, assessment_revision),
  constraint avaliacoes_contas_possiveis check (erros >= 0 and tentativas >= erros),
  constraint avaliacoes_escada_coerente check (degrau >= 0 and (degrau = 0) = (revisar_em is null))
);

comment on table public.avaliacoes_progresso is
  'Aula v2: a escada de domínio por (aluno, aula, avaliação, revisão). Só o servidor escreve, depois de rejulgar contra a publicação jogada — ver lib/finais/gravar-v2.ts.';

alter table public.avaliacoes_progresso enable row level security;

drop policy if exists avaliacoes_le_o_seu on public.avaliacoes_progresso;
create policy avaliacoes_le_o_seu on public.avaliacoes_progresso
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

-- ---------------------------------------------------------------------------
-- tentativas_v2_sem_snapshot — a aba que jogou uma publicação que o servidor não tem
--
-- §10: "se o snapshot não estiver disponível no servidor, conservar a tentativa e pedir
-- reabertura, sem julgá-la contra a aula nova". Fica guardada para o professor; o aluno não lê.
-- ---------------------------------------------------------------------------

create table if not exists public.tentativas_v2_sem_snapshot (
  id             bigint generated always as identity primary key,
  aluno          uuid not null references public.perfis (id) on delete cascade,
  aula           text not null,
  publication_id text not null,
  tentativa_id   uuid not null unique,
  corpo          jsonb not null,
  criada_em      timestamptz not null default now()
);

comment on table public.tentativas_v2_sem_snapshot is
  'Aula v2: tentativa cuja publicação não estava no servidor. Guardada sem julgamento; só o professor lê.';

alter table public.tentativas_v2_sem_snapshot enable row level security;

drop policy if exists sem_snapshot_so_professor on public.tentativas_v2_sem_snapshot;
create policy sem_snapshot_so_professor on public.tentativas_v2_sem_snapshot
  for select to authenticated
  using (public.eh_professor());

-- ---------------------------------------------------------------------------
-- progresso_aula — sem contar o treino
--
-- A view resume tentativas de prática e revisão para o relatório. O treino v2 é aquecimento e
-- não entra nas contagens dela. Mesmas colunas, mesma ordem: `create or replace` basta.
-- ---------------------------------------------------------------------------

create or replace view public.progresso_aula
with (security_invoker = on) as
select
  aluno,
  aula,
  bool_or(etapa = 'solo'    and sucesso)  as solo_ok,
  bool_or(etapa = 'pratica' and sucesso)  as pratica_ok,
  count(*)::int                           as tentativas,
  max(criada_em)                          as ultima
from public.tentativas_aula
where etapa <> 'treino'
group by aluno, aula;

grant select on public.progresso_aula to authenticated;
