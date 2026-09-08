-- ---------------------------------------------------------------------------
-- A escada de finais: uma aula deixa de ser dominada para sempre.
--
-- ## O que estava errado, e é uma frase do próprio banco
--
-- A `progresso_aula` resume `tentativas_aula` com `bool_or`, e o comentário
-- dela diz por extenso: *"fracassar depois de ter conseguido não desfaz o que
-- foi feito — final não se desaprende"*. É bonito e é falso. Uma vitória, uma
-- vez, marcava a aula como dominada até o fim do curso; o aluno de 11 anos que
-- deu o mate de torre numa terça não sabe dá-lo no sábado, e o site dizia que
-- sabia.
--
-- A troca é a escada que o repertório já usa (`0005_repertorio_revisao.sql`):
-- **três passadas em dias distintos e espaçados**. As mesmas duas colunas, o
-- mesmo `check`, a mesma divisão de trabalho — os intervalos moram em
-- `DEGRAUS_EM_DIAS`, em `lib/finais/escada.ts`, e **não aqui**. Quem faz a
-- conta é o TypeScript testado; uma segunda cópia em SQL seria uma segunda
-- opinião sem teste, do tipo que só aparece quando as duas discordam na frente
-- do aluno.
--
-- ## Por que tabela nova, e não colunas em `tentativas_aula`
--
-- Porque `tentativas_aula` é **log de evento**: uma linha por etapa jogada, com
-- os lances, que nunca sofre `update` — é o que permite ao professor ver a
-- evolução na sequência de linhas. Degrau e data de revisão são **estado por
-- (aluno, aula)**, e um estado só tem sentido numa linha só. Enfiá-lo no log
-- obrigaria a reescrever a última linha a cada partida, e a pergunta "em que
-- degrau ele está?" viraria um `distinct on` ordenado em vez de uma leitura.
--
-- A forma é a de `repertorio_progresso`, campo por campo, e isso é de propósito:
-- as duas tabelas respondem à mesma pergunta sobre coisas diferentes, e a
-- semelhança é o que deixa `lib/finais/escada.ts` ser uma cópia conferível de
-- `lib/repertorio/treino.ts` em vez de um primo distante.
--
-- ## A ordem é migration primeiro, deploy depois
--
-- O inverso quebra: o `gravar.ts` novo nomeia `degrau` e `revisar_em` no
-- `upsert`, e o PostgREST recusa a chamada inteira com coluna que não existe.
-- Nesta ordem a janela é a inofensiva — por alguns minutos o código antigo
-- grava só em `tentativas_aula`, e a tabela nova fica vazia esperando.
--
-- Sem índice novo: são dezenas de linhas por aluno, e toda consulta ataca o
-- prefixo da chave primária `(aluno, aula)`.
-- ---------------------------------------------------------------------------

create table if not exists public.finais_progresso (
  aluno        uuid not null references public.perfis (id) on delete cascade,
  -- O id da aula em `content/lessons/`. Texto solto, nunca chave estrangeira:
  -- a mesma decisão da `0004_finais.sql`, e é ela que deixou a demolição de
  -- 2026-09-08 apagar o corpus inteiro sem tocar no banco.
  aula         text not null,
  -- O degrau da escada. **0 é "fora da escada"** — aula nunca vencida, ou
  -- derrubada por um erro antes de estar aprendida.
  degrau       smallint not null default 0,
  -- Quando a aula volta a valer degrau. Nulo se e só se `degrau` é 0.
  revisar_em   timestamptz,
  -- Quantas passadas o aluno tentou, e quantas perdeu. Contadas aqui, e não
  -- lidas do log, porque a escada é a única coisa que as usa e ela já escreve
  -- nesta linha: somar do log a cada leitura seria pagar duas vezes.
  tentativas   integer not null default 0,
  erros        integer not null default 0,
  -- Quando a aula chegou ao degrau de "aprendida" pela primeira vez. **Nunca
  -- volta a nulo**: errar depois derruba o degrau, não a data. O aluno aprendeu
  -- aquilo um dia, e a tela mostra a revisão, não o recomeço.
  aprendida_em timestamptz,
  ultima_em    timestamptz not null default now(),
  primary key (aluno, aula),
  -- Erro que não é tentativa seria contagem impossível. O `check` está aqui, e
  -- não só no TypeScript, porque a chave de serviço ignora a RLS mas não ignora
  -- as restrições: é a última rede embaixo de um bug de aritmética.
  constraint finais_contas_possiveis check (erros >= 0 and tentativas >= erros),
  -- A coerência, e só ela. O que este `check` afirma é a invariante que
  -- `lib/finais/escada.ts` mantém e `escada.test.ts` cobra por escrito —
  -- "degrau 0 se e só se sem data" —, e nada além dela. Ele **não** amarra
  -- `aprendida_em` ao degrau, pelo mesmo motivo da 0005: amarrar transformaria
  -- uma divergência de código numa recusa do banco na cara do aluno.
  constraint finais_escada_coerente
    check (degrau >= 0 and (degrau = 0) = (revisar_em is null))
);

comment on table public.finais_progresso is
  'Uma linha por (aluno, aula de finais): em que degrau da escada ela está e quando volta. Só o servidor escreve, depois de reconferir os lances — ver a política de RLS. Os intervalos de cada degrau moram em DEGRAUS_EM_DIAS, em lib/finais/escada.ts.';
comment on column public.finais_progresso.degrau is
  'Degrau da escada de revisão; 0 é fora da escada. Aprendida no degrau 3.';
comment on column public.finais_progresso.revisar_em is
  'Quando a aula volta a ser cobrada. Nulo se e só se degrau = 0.';

alter table public.finais_progresso enable row level security;

-- A única política, e é de leitura. `insert` e `update` ficam de fora de
-- propósito, como em `tentativas_aula` e em `repertorio_progresso`: quem
-- escreve é o servidor com a chave de serviço, depois de reproduzir os lances.
-- Uma política de escrita aqui deixaria o navegador do aluno subir de degrau
-- sozinho, que é exatamente o que a escada não pode permitir.
drop policy if exists finais_le_o_seu on public.finais_progresso;
create policy finais_le_o_seu on public.finais_progresso
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

-- ---------------------------------------------------------------------------
-- Quem já venceu uma aula entra na escada onde estava
--
-- A regra velha dava "dominada" a quem tivesse `pratica_ok` — uma vitória, uma
-- vez. Essas aulas entram no **degrau 1**, e não no 3: o aluno provou que
-- venceu uma vez, que é literalmente o que o degrau 1 quer dizer. Dar-lhe o 3
-- seria carimbar de "aprendida" uma aula que ele nunca repetiu num segundo dia
-- — o defeito que esta migration existe para consertar.
--
-- Elas nascem **vencidas** (a última tentativa foi há dias), o que é o certo:
-- a aula aparece na fila da próxima sessão, e é essa passada que começa a dar
-- à palavra "aprendida" o sentido novo.
--
-- O `on conflict do nothing` é o que torna a migration repetível: rodar de novo
-- não rebaixa ninguém que já subiu.
--
-- A etapa `solo` entra na conta como sucesso porque, no formato antigo, a aula
-- completa só era dominada com as duas metades — e quem tem `pratica` com
-- sucesso já basta para o degrau 1. Ler só a prática é o certo aqui: é ela que
-- virou a etapa "sem ajuda" do formato novo.
-- ---------------------------------------------------------------------------

insert into public.finais_progresso (aluno, aula, degrau, revisar_em, tentativas, erros, ultima_em)
select
  aluno,
  aula,
  1                                                 as degrau,
  max(criada_em) + interval '1 day'                 as revisar_em,
  count(*) filter (where etapa in ('pratica', 'revisao'))::int  as tentativas,
  count(*) filter (where etapa in ('pratica', 'revisao') and not sucesso)::int as erros,
  max(criada_em)                                    as ultima_em
from public.tentativas_aula
group by aluno, aula
having bool_or(etapa in ('pratica', 'revisao') and sucesso)
on conflict (aluno, aula) do nothing;

-- ---------------------------------------------------------------------------
-- A view antiga fica, e o comentário dela deixa de mentir
--
-- `progresso_aula` continua servindo ao relatório do professor — "quantas
-- tentativas, quando foi a última" — e é ela que o `verificar-finais` lê. O que
-- ela **não** decide mais é se a aula está aprendida: isso passou a ser o
-- degrau, e o comentário abaixo diz isso para quem abrir o banco antes do
-- código.
--
-- `solo_ok` fica de pé com as linhas históricas: a etapa saiu do formato em
-- 2026-09-08, e apagar o passado do aluno para arrumar o presente do código
-- seria caro e mentiroso.
-- ---------------------------------------------------------------------------

comment on view public.progresso_aula is
  'Por aluno e aula: o que já foi conseguido em ALGUMA tentativa, quantas tentativas, quando foi a última. NÃO diz se a aula está aprendida — quem diz é finais_progresso.degrau, desde 2026-09-08. A coluna solo_ok guarda linhas de uma etapa que não existe mais no formato.';
