-- ---------------------------------------------------------------------------
-- F1/B1.2 — A tarefa de casa marcada pelo aluno.
--
-- Uma tabela, e só a metade que é do banco. A **tarefa** em si (o texto, a
-- meta, o link) é conteúdo versionado em `content/tarefas.json` — ver o
-- comentário de `lib/tarefas/tarefas.ts` para o porquê de não existir tabela
-- `tarefas`. O que muda por aluno e por dia é **quem marcou o quê**, e é isso
-- que mora aqui.
--
-- ## Aqui o aluno escreve, e em `tentativas_puzzle` não — a diferença
--
-- Em `tentativas_puzzle` o `insert` não tem política nenhuma: só a chave de
-- serviço grava, depois de o servidor reconferir o lance. O motivo era que
-- existe uma verdade a proteger — o lance certo está no JSON do puzzle, e o
-- navegador é do aluno.
--
-- "Assisti o vídeo" não tem verdade nenhuma no servidor. Não há o que
-- reconferir, e uma política mais dura só produziria teatro: um botão que o
-- professor aperta no sábado para liberar o que o aluno diz ter feito em casa
-- na quarta. A caixa é uma **declaração** do aluno, e o desenho assume isso.
--
-- O que fica protegido é o que dá para proteger: a tarefa de tática **não tem
-- caixa**. Ela é contada de `tentativas_puzzle`, que o aluno não escreve.
-- Marcar tarefa de vídeo é dizer que assistiu; não é jeito de fabricar puzzle
-- resolvido.
--
-- ## A chave primária composta
--
-- `(aluno, tarefa)` em vez de um id gerado. Marcar duas vezes — dois toques no
-- celular, a rede lenta, o botão apertado de novo — é a coisa mais provável de
-- acontecer nesta tela, e assim é o banco que recusa a segunda, e não um
-- `if` que alguém pode esquecer de escrever na próxima tela.
-- ---------------------------------------------------------------------------

create table if not exists public.tarefa_conclusao (
  aluno     uuid not null references public.perfis (id) on delete cascade,
  -- O id da tarefa em `content/tarefas.json` (`s1-coordenadas`). Texto solto e
  -- não chave estrangeira, porque o outro lado é arquivo no repositório, não
  -- linha de tabela. Renomear um id no JSON órfã as marcações de quem já a
  -- fez — por isso o id é escrito à mão e o esquema zod cobra o formato.
  tarefa    text not null,
  feita_em  timestamptz not null default now(),
  primary key (aluno, tarefa)
);

comment on table public.tarefa_conclusao is
  'Uma linha por tarefa marcada. O aluno grava a dele: não há o que reconferir em "assisti o vídeo".';

create index if not exists tarefa_conclusao_tarefa_idx
  on public.tarefa_conclusao (tarefa);

alter table public.tarefa_conclusao enable row level security;

drop policy if exists tarefas_le_as_suas on public.tarefa_conclusao;
create policy tarefas_le_as_suas on public.tarefa_conclusao
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

-- O `with check` é o que impede o aluno de marcar tarefa **no nome de outro**.
-- Sem ele, um `insert` com `aluno` trocado passaria: a política de select
-- esconderia a linha do autor, e ela apareceria no painel da vítima.
drop policy if exists tarefas_marca_as_suas on public.tarefa_conclusao;
create policy tarefas_marca_as_suas on public.tarefa_conclusao
  for insert to authenticated
  with check (aluno = (select auth.uid()));

drop policy if exists tarefas_desmarca_as_suas on public.tarefa_conclusao;
create policy tarefas_desmarca_as_suas on public.tarefa_conclusao
  for delete to authenticated
  using (aluno = (select auth.uid()));

-- Não há política de `update`, e é de propósito: uma marcação não muda de
-- ideia. Desmarcar é apagar a linha, e marcar de novo cria outra, com a data
-- de agora — que é a data certa.
