-- ---------------------------------------------------------------------------
-- O nível conquistado: o eixo do curso deixa de ser a data.
--
-- O site organizava o curso em quatro semanas presas a datas, e a semana era o
-- único portão. Ela não servia a uma turma de 700 a 1700 — todos recebiam a
-- mesma coisa no mesmo dia, ninguém adiantava nem revisava fora de hora — e
-- **nem funcionava**: os 36 temas já estavam todos escritos e `temaAberto()`
-- devolvia `true` para todos.
--
-- No lugar dela, cinco degraus. O aluno sobe fechando o que o degrau pede
-- (tática, finais e repertório) e passando na prova do nível. A regra inteira
-- mora em `lib/curso/nivel.ts`, testada; esta tabela guarda **o que ele já
-- conquistou**, e nada mais.
--
-- ## Log, e não uma coluna mutável em `perfis`
--
-- É a doutrina de `tentativas_puzzle`: só insere, nunca atualiza nem apaga.
-- Uma coluna `perfis.nivel` precisaria de `greatest(atual, novo)` em toda
-- escrita, e de alguém lembrando disso para sempre. Aqui **subir é `insert` e
-- descer é impossível** — a monotonia vem da forma da tabela, não da disciplina
-- de quem escreve.
--
-- E ela responde de graça a pergunta que o professor vai fazer em novembro:
-- *quando* cada aluno cruzou cada nível. Uma coluna mutável teria apagado isso.
--
-- ## Por que o nível é gravado e não derivado
--
-- Porque o requisito de finais de um nível é `min(declarado, publicado)`:
-- publicar uma aula nova **sobe** o requisito. Se o nível fosse recalculado a
-- cada carregamento, publicar rebaixaria quem já passou — o aluno veria o site
-- tirar dele um selo que ele ganhou. `lib/curso/nivel.test.ts` tem essa queda
-- escrita como teste, para que ninguém "simplifique" isto de volta.
--
-- ## `smallint`, e não o slug do nível
--
-- O rótulo vai mudar quando a conversão FIDE for revista — hoje o nível 3 se
-- chama "1000–1200". Guardar o número faz da renomeação uma mudança de texto;
-- guardar `'1000-1200'` faria dela uma migration, para sempre.
--
-- ## Sem política de `insert`
--
-- Como em `finais_progresso` e `repertorio_progresso`: quem concede é o
-- servidor com a chave de serviço, depois de reconferir `prontoParaProva` e
-- contar os acertos da prova. Uma política de escrita deixaria o navegador do
-- aluno se promover sozinho — exatamente o que a progressão sequencial não pode
-- permitir. O cliente manda "terminei a prova"; nunca "me promova".
--
-- ## Sem backfill em SQL
--
-- Pela doutrina de `0007_finais_escada.sql`: quem faz a conta é o TypeScript
-- testado, e uma segunda cópia da regra em SQL seria uma segunda opinião sem
-- teste. Quando houver turma para conceder, o backfill é um script que chama
-- `prontoParaProva` sobre ela.
--
-- Sem índice novo: são no máximo cinco linhas por aluno, e toda consulta ataca
-- o prefixo da chave primária `(aluno, nivel)`.
--
-- **Nenhuma tabela para a prova de nível.** O resultado dela são 12 linhas em
-- `tentativas_puzzle` com `modo = 'prova-de-nivel'`, e a aprovação é a própria
-- linha aqui. Uma tabela `prova_de_nivel` seria uma segunda verdade sobre o
-- mesmo evento.
-- ---------------------------------------------------------------------------

create table if not exists public.nivel_conquistado (
  aluno          uuid not null references public.perfis (id) on delete cascade,
  nivel          smallint not null check (nivel between 1 and 5),
  conquistado_em timestamptz not null default now(),
  primary key (aluno, nivel)
);

comment on table public.nivel_conquistado is
  'Log de conquista: uma linha por (aluno, nível) no momento em que ele passou na prova daquele nível. Só insere — subir é insert, descer é impossível. Quem escreve é o servidor com chave de serviço, depois de reconferir prontoParaProva() de lib/curso/nivel.ts.';
comment on column public.nivel_conquistado.nivel is
  'O número do degrau, 1 a 5. Número e não slug: o rótulo FIDE muda, o degrau não.';
comment on column public.nivel_conquistado.conquistado_em is
  'Quando o aluno cruzou este nível. É a metade da tabela que uma coluna mutável em perfis teria apagado.';

alter table public.nivel_conquistado enable row level security;

-- A única política, e é de leitura. Ver o cabeçalho: escrever é do servidor.
drop policy if exists nivel_le_o_seu on public.nivel_conquistado;
create policy nivel_le_o_seu on public.nivel_conquistado
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());
