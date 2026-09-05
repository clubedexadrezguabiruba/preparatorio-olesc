-- ---------------------------------------------------------------------------
-- B5 — O repertório: quantas vezes seguidas o aluno acertou cada linha.
--
-- Uma tabela, com uma linha por (aluno, linha de abertura). O **conteúdo** das
-- linhas — os lances, os comentários, o nome — é arquivo versionado em
-- `public/repertorio/`, pelo mesmo motivo de `content/tarefas.json`: quem
-- escreve o repertório é o professor no editor, não um formulário. O que muda
-- por aluno é só o progresso, e é isso que mora aqui.
--
-- ## Aqui o aluno não escreve — é o modelo de `tentativas_puzzle`
--
-- Em `tarefa_conclusao` o aluno grava a dele, porque "assisti o vídeo" não tem
-- verdade nenhuma no servidor: não há o que reconferir, e uma política mais
-- dura só produziria teatro.
--
-- Aqui **há** verdade a proteger. O lance certo de cada linha está no JSON, e o
-- servidor sabe lê-lo: conferir a sequência que o aluno jogou é exatamente tão
-- possível quanto conferir a solução de um puzzle. Se o `insert` fosse do
-- aluno, "decorei as 42 linhas" seria uma chamada de rede a escrever — e é este
-- número que vai dizer, no sábado, quem já pode jogar a abertura no torneio.
--
-- Então: **nenhuma política de insert ou update, para ninguém**. A única chave
-- que passa é a de serviço, que roda só no servidor, e ela só escreve depois de
-- `lib/repertorio/gravar.ts` reconferir os lances contra o arquivo.
--
-- ## A chave primária composta
--
-- `(aluno, linha)` em vez de um id gerado, e sem índice extra: toda consulta
-- desta tabela é "o progresso deste aluno" ou "o progresso deste aluno nesta
-- linha", e as duas atacam o prefixo da própria chave. O relatório do professor
-- varre a tabela inteira de qualquer jeito — são 42 linhas por aluno.
--
-- A PK também é o que faz o `upsert` do servidor funcionar: `on conflict
-- (aluno, linha)` precisa de uma restrição única com exatamente essas colunas.
--
-- ## Por que `linha` é texto solto e não chave estrangeira
--
-- O outro lado é arquivo no repositório, não linha de tabela. O id é o hash dos
-- lances (`brancas-petroff-934fd6a6`, ver `lib/repertorio/linhas.ts`), então
-- **mexer nos lances de uma linha muda o id** — e o progresso de quem treinou a
-- linha antiga fica órfão, que é o comportamento certo: linha diferente é linha
-- nova, e o aluno recomeça nela. Mexer no comentário ou no nome não mexe no id.
-- ---------------------------------------------------------------------------

create table if not exists public.repertorio_progresso (
  aluno            uuid not null references public.perfis (id) on delete cascade,
  -- O id da linha em `public/repertorio/<cor>/<abertura>.json`.
  linha            text not null,
  -- Quantas vezes seguidas o aluno fechou a linha inteira sem errar. Erro
  -- zera. Três é "aprendida" — a constante mora em `lib/repertorio/treino.ts`,
  -- e não aqui, porque quem faz a conta é o TypeScript testado.
  acertos_seguidos integer not null default 0 check (acertos_seguidos >= 0),
  tentativas       integer not null default 0,
  erros            integer not null default 0,
  -- Quando a linha chegou aos três acertos seguidos pela primeira vez. **Nunca
  -- volta a nulo**: errar depois zera os acertos seguidos, não a data. O aluno
  -- aprendeu aquilo um dia, e a tela mostra a revisão, não o recomeço.
  aprendida_em     timestamptz,
  ultima_em        timestamptz not null default now(),
  primary key (aluno, linha),
  -- Erro que não é tentativa seria contagem impossível. O `check` está aqui, e
  -- não só no TypeScript, porque a chave de serviço ignora a RLS mas não ignora
  -- as restrições: é a última rede embaixo de um bug de aritmética.
  constraint repertorio_contas_possiveis check (erros >= 0 and tentativas >= erros)
);

comment on table public.repertorio_progresso is
  'Uma linha por (aluno, linha de abertura). Só o servidor escreve aqui, depois de reconferir os lances — ver a política de RLS.';

alter table public.repertorio_progresso enable row level security;

-- A única política, e é de leitura. Insert e update ficam de fora de propósito:
-- ver o cabeçalho.
drop policy if exists repertorio_le_o_seu on public.repertorio_progresso;
create policy repertorio_le_o_seu on public.repertorio_progresso
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());
