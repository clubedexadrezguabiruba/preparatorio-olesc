-- ---------------------------------------------------------------------------
-- FN1/B3 — O que o aluno fez nas aulas de finais.
--
-- Duas tabelas, porque são **dois tipos de verdade diferentes**, e a regra
-- editorial que separa as duas já está escrita em `0003_tarefas.sql:12-25`:
-- *existe verdade no servidor para reconferir?*
--
-- | etapa | existe o que reconferir? | quem grava |
-- |---|---|---|
-- | sem ajuda (4) e prática (5) | sim: **os lances jogados** | só a chave de serviço, depois de rejulgar |
-- | leitura ("assisti o exemplo") | não: é declaração | o próprio aluno, com RLS |
--
-- A tabela de cima é a de `tentativas_puzzle`; a de baixo é a de
-- `tarefa_conclusao`. Nenhuma das duas é desenho novo — o que é novo é a linha
-- entre elas passar **dentro da mesma feature**, e não entre features.
--
-- ## O que **não** mora aqui: a palavra "dominada"
--
-- Seria uma coluna de uma linha só, e ela congelaria a decisão errada. Domínio
-- depende do **formato** da aula (`docs/TRILHA-FINAIS.md`): a aula completa
-- exige a etapa sem ajuda **e** a prática, a curta só a prática, a de leitura só
-- a declaração. O formato mora na trilha, que é código versionado — e uma aula
-- pode mudar de formato entre um sábado e outro, quando o Doug rebaixa uma
-- curta da classe B para leitura.
--
-- Com uma coluna `dominada` aqui, essa edição teria de reescrever linhas de
-- histórico de aluno para continuar verdadeira. Do jeito que está, ela não
-- reescreve nada: as linhas dizem o que **aconteceu**, e o que elas
-- **significam** é lido em cima delas, pelo `lib/finais/progresso.ts` (B4).
--
-- ## `criada_em`, e não "na mesma sessão"
--
-- O selo na tela (`lib/lesson/mastery.ts`) exige as duas metades na **mesma
-- sessão**: é o critério D1 do currículo, e ele está certo lá — o selo é um
-- momento de aula. O banco conta em qualquer momento. A diferença não é
-- descuido: criança no 4G perde a aba, e cobrar do histórico a mesma sessão
-- transformaria a rede do aluno em parte do critério de aprendizagem.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- tentativas_aula — o que foi jogado
-- ---------------------------------------------------------------------------

create table if not exists public.tentativas_aula (
  id        bigint generated always as identity primary key,
  aluno     uuid not null references public.perfis (id) on delete cascade,
  -- O id da aula em `content/lessons/` (`N0-R-MATE`). Texto solto e não chave
  -- estrangeira, pelo mesmo motivo de `tarefa_conclusao.tarefa`: o outro lado
  -- é arquivo no repositório, não linha de tabela.
  aula      text not null,
  etapa     text not null check (etapa in ('solo', 'pratica')),
  sucesso   boolean not null,
  -- **Os lances, e não um booleano.** É a decisão de `tentativas_puzzle` levada
  -- um passo adiante: lá o servidor recebia os lances e guardava o veredito;
  -- aqui ele guarda os dois. Numa aula de final o *como* é a matéria — duas
  -- tentativas fracassadas com os mesmos oito lances dizem ao professor que o
  -- aluno tem um método errado, e não que ele teve azar.
  --
  -- Na etapa sem ajuda são os lances **do aluno**, inclusive os recusados: a
  -- peça voltou na tela, mas ele os pensou. Na prática são os lances **dos dois
  -- lados**, porque sem os do computador a partida não se reconstrói.
  lances    text[] not null,
  tempo_ms  integer not null check (tempo_ms >= 0),
  criada_em timestamptz not null default now()
);

comment on table public.tentativas_aula is
  'Uma linha por etapa jogada numa aula de finais. Só o servidor escreve, depois de reproduzir os lances — ver lib/finais/gravar.ts.';

create index if not exists tentativas_aula_aluno_idx on public.tentativas_aula (aluno, criada_em desc);
create index if not exists tentativas_aula_aula_idx  on public.tentativas_aula (aluno, aula);

-- ---------------------------------------------------------------------------
-- aula_lida — o que o aluno declara ter lido
-- ---------------------------------------------------------------------------

create table if not exists public.aula_lida (
  aluno   uuid not null references public.perfis (id) on delete cascade,
  aula    text not null,
  lida_em timestamptz not null default now(),
  -- A chave composta pelo motivo de `tarefa_conclusao`: dois toques no celular
  -- são a coisa mais provável de acontecer nesta tela, e quem recusa o segundo
  -- é o banco, não um `if` que alguém esquece de escrever na próxima tela.
  primary key (aluno, aula)
);

comment on table public.aula_lida is
  'Uma linha por aula de leitura declarada. O aluno grava a dele: não há lance para reconferir em "li o exemplo até o fim".';

-- ---------------------------------------------------------------------------
-- RLS
--
-- **`tentativas_aula` não tem política de `insert`, e é a decisão.** A aula
-- inteira roda no navegador — a árvore de lances chega ao celular em JSON, o
-- Stockfish da prática roda lá dentro. Se o `insert` fosse do aluno logado,
-- "dominei as 49 aulas" seria uma chamada de rede a escrever, e a coluna
-- "Finais" do relatório do professor nasceria ficção.
--
-- Quem grava é a chave de serviço, pela server action, **depois** de reproduzir
-- os lances pela árvore da aula (`lib/finais/gravar.ts`). É o mesmo desenho de
-- `tentativas_puzzle`, e pelo mesmo motivo.
--
-- Em `aula_lida`, ao contrário, o aluno grava — e o `with check` é a defesa
-- inteira: sem ele, um `insert` com o `aluno` trocado passaria, a política de
-- `select` esconderia a linha de quem a escreveu, e ela apareceria no painel da
-- vítima. A prova disso é o item 7 de `scripts/verificar-rls.ts`.
-- ---------------------------------------------------------------------------

alter table public.tentativas_aula enable row level security;
alter table public.aula_lida       enable row level security;

drop policy if exists tentativas_aula_le_as_suas on public.tentativas_aula;
create policy tentativas_aula_le_as_suas on public.tentativas_aula
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

drop policy if exists aula_lida_le_as_suas on public.aula_lida;
create policy aula_lida_le_as_suas on public.aula_lida
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

drop policy if exists aula_lida_marca_as_suas on public.aula_lida;
create policy aula_lida_marca_as_suas on public.aula_lida
  for insert to authenticated
  with check (aluno = (select auth.uid()));

drop policy if exists aula_lida_desmarca_as_suas on public.aula_lida;
create policy aula_lida_desmarca_as_suas on public.aula_lida
  for delete to authenticated
  using (aluno = (select auth.uid()));

-- Não há política de `update` em nenhuma das duas, e é de propósito. Tentativa
-- não muda de ideia: a próxima é uma linha nova, com a data de agora, e é assim
-- que o professor enxerga a evolução. Leitura desmarcada é linha apagada.

-- ---------------------------------------------------------------------------
-- progresso_aula
--
-- `security_invoker = on` pelo motivo que a `0002_progresso.sql:17-28` já
-- explicou por extenso: sem ela a view roda com os privilégios de quem a criou,
-- a RLS de `tentativas_aula` fica intacta e inútil, e qualquer aluno logado lê
-- o progresso da turma inteira por esta porta.
--
-- `bool_or` e não `max(case ...)`: a pergunta é "em **alguma** tentativa ele
-- conseguiu?", e é literalmente essa a palavra. Fracassar depois de ter
-- conseguido não desfaz o que foi feito — final não se desaprende.
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
group by aluno, aula;

comment on view public.progresso_aula is
  'Por aluno e aula: conseguiu a etapa sem ajuda, conseguiu a prática, quantas tentativas. Roda com os privilégios de quem consulta (security_invoker).';

-- O `grant` explícito pelo mesmo motivo da `progresso_tema`: view criada por
-- migration não herda o default privilege que o Supabase configura para tabelas
-- novas, e sem ele a consulta volta "permission denied for view" — um erro que
-- parece de RLS e não é.
grant select on public.progresso_aula to authenticated;
