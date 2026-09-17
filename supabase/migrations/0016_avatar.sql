-- ---------------------------------------------------------------------------
-- 0016 — O avatar do aluno.
--
-- O aluno escolhe um de dez desenhos (peças de xadrez com cara e humor), e só
-- isso: o nome, o usuário, o papel, a equipe, o tabuleiro e o rating continuam
-- sendo do professor.
--
-- ## Uma coluna, com a lista no `check`
--
-- `avatar` guarda o id do desenho (`lib/avatar/avatares.ts`). Nulo é "ainda não
-- escolheu", e a tela mostra um peão neutro. O `check` repete a lista do código
-- de propósito: se a server action um dia deixar passar um id errado, o banco
-- recusa. A cópia é conferida por `lib/avatar/avatares.test.ts`, que lê este
-- arquivo e compara as duas listas.
--
-- ## A política `perfis_atualiza_o_seu` sai
--
-- Ela nasceu na 0001 e deixava o aluno logado dar `update` na **linha inteira**
-- do próprio perfil, pela chave pública: trocar o nome, o rating e até
-- `papel = 'professor'`. Nenhuma tela usava essa porta — todo `update` em
-- `perfis` do site é do professor ou de script, pela chave de serviço. Com o
-- avatar, a regra passa a ser escrita: o aluno muda **só o avatar**, e muda pela
-- server action `escolherAvatar` (`app/perfil/acoes.ts`), que confere a sessão,
-- valida o id e grava apenas essa coluna com a chave de serviço.
--
-- Sem política de `update`, a RLS faz o `update` do aluno sumir calado (zero
-- linhas). `npm run db:rls`, seção 14, prova isso no banco.
-- ---------------------------------------------------------------------------

alter table public.perfis
  add column if not exists avatar text null;

alter table public.perfis drop constraint if exists perfis_avatar_valido;
alter table public.perfis
  add constraint perfis_avatar_valido check (
    avatar is null or avatar in ('peao-heroi', 'peao-ninja', 'peao-promovido', 'torre-oculos', 'torre-foguete', 'cavalo-dj', 'cavalo-unicornio', 'bispo-soneca', 'dama-cafe', 'rei-sufoco')
  );

comment on column public.perfis.avatar is
  'O desenho que o aluno escolheu (id de lib/avatar/avatares.ts). Nulo: peão neutro. Só a server action escolherAvatar grava.';

drop policy if exists perfis_atualiza_o_seu on public.perfis;
