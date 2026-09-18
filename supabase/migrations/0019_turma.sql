-- ---------------------------------------------------------------------------
-- 0019 — A turma: OLESC ou testadores (Doug, 18/9/2026).
--
-- O Doug vai criar, além das contas dos alunos, contas de teste para colegas
-- dele. Essas contas não são da OLESC nem de equipe nenhuma, e os dois grupos
-- não se enxergam: aluno da OLESC não vê testador na grade "A turma" nem abre a
-- vitrine dele, e vice-versa. O professor vê todos.
--
-- ## Uma coluna, com a lista no `check`
--
-- `turma` nasce `'olesc'` para toda conta que já existe — é onde todas estão
-- hoje — e o gatilho de criação lê `turma` dos metadados, como já lia a equipe.
-- A lista `('olesc', 'testadores')` é repetida em `lib/turma/turma.ts`
-- (`TURMAS`); `lib/turma/turma.test.ts` lê este arquivo e compara as duas.
--
-- ## Testador não tem equipe
--
-- As equipes M e F são da OLESC. A segunda regra do `check` impede um testador
-- com equipe — senão o painel diria "Equipe masculina" para quem não é.
--
-- ## Quem muda a turma
--
-- Só o professor, pela chave de serviço. O aluno não tem política de `update`
-- em `perfis` desde a 0016 — não há porta para ele se mudar de turma.
-- ---------------------------------------------------------------------------

alter table public.perfis
  add column if not exists turma text not null default 'olesc';

alter table public.perfis drop constraint if exists perfis_turma_valida;
alter table public.perfis
  add constraint perfis_turma_valida check (turma in ('olesc', 'testadores'));

alter table public.perfis drop constraint if exists perfis_testador_sem_equipe;
alter table public.perfis
  add constraint perfis_testador_sem_equipe check (turma = 'olesc' or equipe is null);

comment on column public.perfis.turma is
  'olesc (os alunos e as equipes M/F) ou testadores (contas de teste de colegas). Um grupo não vê o outro na turma.';

create index if not exists perfis_turma_idx on public.perfis (turma);

create or replace function public.ao_criar_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, usuario, nome, papel, equipe, tabuleiro, rating, turma)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'usuario', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'nome', 'Sem nome'),
    coalesce(new.raw_user_meta_data ->> 'papel', 'aluno'),
    nullif(new.raw_user_meta_data ->> 'equipe', ''),
    nullif(new.raw_user_meta_data ->> 'tabuleiro', '')::smallint,
    nullif(new.raw_user_meta_data ->> 'rating', '')::integer,
    coalesce(nullif(new.raw_user_meta_data ->> 'turma', ''), 'olesc')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
