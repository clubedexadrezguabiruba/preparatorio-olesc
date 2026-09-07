-- ---------------------------------------------------------------------------
-- Bloco 4 — o registro do treino de meio-jogo, e o terceiro ramo dos minutos
--
-- Até aqui meio-jogo só tinha `dica_lida`: uma declaração de leitura, sem
-- número. O treino dos degraus 2, 3 e 4 (§2.1 do plano didático) produz o
-- primeiro dado de meio-jogo que não é declaração — o aluno toca numa casa, e
-- quem julga é `respostaDaTarefa`, a mesma função do gate de conteúdo.
--
-- ## A tabela nasce completa, e é de propósito
--
-- Nenhuma das colunas abaixo se retrofita depois de haver linha de aluno de
-- verdade: acrescentar `apoio` no meio do piloto deixaria metade do relatório
-- com "não sei se houve apoio", que é pior que não ter a coluna. O custo de
-- criá-las agora é uma linha de SQL cada; o custo de criá-las depois é uma
-- semana de dados que não se comparam com a outra.
--
-- ## Roda antes do deploy
--
-- Tabela e view novas: o código que está no ar não as conhece e continua
-- funcionando. A ordem contrária — deploy antes da migration — faria o
-- primeiro toque de aluno estourar em "relation does not exist". A regra é a
-- da 0005 (`0005_revisao.sql:24-29`): **migrar primeiro**.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. tentativa_meiojogo — uma linha por resposta dada
--
-- Molde de `tentativas_puzzle` (`0001_fundacao.sql:52`): RLS ligada, **só
-- política de `select`**, e nenhuma de `insert`. Quem escreve é a chave de
-- serviço, do servidor, depois de julgar — e o navegador manda a casa tocada,
-- nunca um `acertou` (a regra de `lib/tatica/gravar.ts:30-40`).
--
-- Aqui isso é ainda mais necessário que na tática: o conteúdo do treino é
-- servido ao navegador para a tela poder responder no instante do toque, e a
-- `resposta` de cada item viaja junto. Um `insert` do aluno seria "escreva o
-- seu relatório".
-- ---------------------------------------------------------------------------

create table if not exists public.tentativa_meiojogo (
  id           bigint generated always as identity primary key,
  aluno        uuid not null references public.perfis (id) on delete cascade,

  -- `m12`, e o id do item dentro dela (`m12-d2-a`, `m12-d4`). Texto solto pelo
  -- motivo de `dica_lida.dica`: o outro lado é arquivo no repositório.
  dica         text not null,
  item         text not null,

  -- A tarefa de `lib/meiojogo/exercicios.ts` (`peao-isolado`) — é ela, e não a
  -- dica, que a fila de revisão do Bloco 6 vai agrupar: duas dicas podem
  -- treinar o mesmo traço.
  conceito     text not null,

  -- O degrau, em duas palavras: achar o traço no tabuleiro, ou escolher a
  -- razão. Elas não se somam no relatório, e é por isso que ficam separadas
  -- por coluna e não por um número de "acertos".
  habilidade   text not null check (habilidade in ('reconhecimento', 'aplicacao')),

  -- De onde vem o veredito: `fato` quando uma função o decide (a casa), e
  -- `curado` quando quem decide é o autor da dica (a razão). O relatório do
  -- professor escreve os dois com palavras diferentes, e esta coluna é o que
  -- torna isso possível sem consultar o conteúdo.
  nivel_evidencia text not null check (nivel_evidencia in ('fato', 'curado')),

  -- A impressão digital do item no dia em que foi respondido — as oito
  -- primeiras casas do sha256 sobre o que define a resposta (posição, lado,
  -- tarefa, casas aceitas; na aplicação, a pergunta e as opções). Um item
  -- corrigido muda de versão, e as linhas de antes deixam de se comparar com
  -- as de depois. Sem isso, "40% erraram" mistura duas perguntas diferentes.
  versao       text not null,

  -- A casa tocada (`d5`) ou a letra da alternativa (`a`). **Nunca um
  -- booleano**: com o que foi respondido guardado, um enunciado ambíguo se
  -- descobre relendo as respostas erradas — e com um booleano, não.
  resposta     text not null,

  -- Derivado no servidor, sempre.
  acertou      boolean not null,

  -- Cinco cliques até acertar não são cinco exercícios. `tentativa` é a
  -- ordem da resposta dentro do dia, e `primeira` é o corte que quase todo
  -- relatório quer — gerada, para não haver como as duas discordarem.
  tentativa    smallint not null check (tentativa >= 1),
  primeira     boolean not null generated always as (tentativa = 1) stored,

  -- 0 nenhum · 1 convite · 2 realce · 3 solução vista. Pedir ajuda não é
  -- errar: é isto que separa "acertou sozinho" de "acertou com a escada", e as
  -- duas linhas do relatório nunca se somam.
  apoio        smallint not null default 0 check (apoio between 0 and 3),

  -- A posição é nova para este aluno, ou ele já a viu num dia anterior. É a
  -- coluna que a revisão espaçada do Bloco 6 vai precisar, e que não se
  -- recupera depois: gravada errada hoje, ela não tem como ser recalculada.
  inedita      boolean not null,

  -- Sinal contextual, e não medida de aprendizagem: pode ser releitura, volta
  -- à página ou compreensão rápida. O grampo de meia hora é o de
  -- `lib/tatica/gravar.ts:28` — acima disso é aba esquecida aberta.
  tempo_ms     integer not null check (tempo_ms >= 0),
  criada_em    timestamptz not null default now()
);

comment on table public.tentativa_meiojogo is
  'Uma linha por resposta dada no treino de meio-jogo. Só o servidor escreve aqui — ver a política de RLS.';

create index if not exists meiojogo_aluno_idx    on public.tentativa_meiojogo (aluno, criada_em desc);
create index if not exists meiojogo_item_idx     on public.tentativa_meiojogo (aluno, item);
-- O agrupamento da fila de revisão do Bloco 6: "o que este aluno viu deste
-- conceito, e quando".
create index if not exists meiojogo_conceito_idx on public.tentativa_meiojogo (aluno, conceito);

alter table public.tentativa_meiojogo enable row level security;

drop policy if exists meiojogo_le_as_suas on public.tentativa_meiojogo;
create policy meiojogo_le_as_suas on public.tentativa_meiojogo
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

-- Sem política de insert, update ou delete. Ver o cabeçalho.

-- ---------------------------------------------------------------------------
-- 2. minutos_por_dia — o terceiro ramo
--
-- Meio-jogo contribuía com zero minuto para a meta diária, porque a view só
-- somava tática e finais. `create or replace` e `lib/curso/hoje.ts` tipando
-- `bloco: string`: nada quebra do lado do TypeScript.
--
-- O dia continua sendo o de Guabiruba, e a soma continua em milissegundos —
-- quem arredonda é a tela, uma vez, depois de somar os blocos.
-- ---------------------------------------------------------------------------

create or replace view public.minutos_por_dia
with (security_invoker = on) as
select
  aluno,
  dia,
  bloco,
  sum(tempo_ms)::int as tempo_ms,
  count(*)::int      as itens
from (
  select aluno,
         (criada_em at time zone 'America/Sao_Paulo')::date as dia,
         'tatica'::text as bloco,
         tempo_ms
  from public.tentativas_puzzle
  union all
  select aluno,
         (criada_em at time zone 'America/Sao_Paulo')::date,
         'finais'::text,
         tempo_ms
  from public.tentativas_aula
  union all
  select aluno,
         (criada_em at time zone 'America/Sao_Paulo')::date,
         'meiojogo'::text,
         tempo_ms
  from public.tentativa_meiojogo
) t
group by aluno, dia, bloco;

comment on view public.minutos_por_dia is
  'Soma de tempo_ms por aluno, dia (America/Sao_Paulo) e bloco (tatica/finais/meiojogo). Roda com os privilégios de quem consulta (security_invoker).';

grant select on public.minutos_por_dia to authenticated;
