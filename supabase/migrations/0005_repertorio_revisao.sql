-- ---------------------------------------------------------------------------
-- A escada da revisão: quando cada linha do repertório volta a ser cobrada.
--
-- Até aqui `repertorio_progresso` contava três acertos seguidos e chamava isso
-- de "aprendida". O número era honesto e o que ele media não: três passadas
-- limpas na mesma tarde, com a posição ainda na retina do aluno, marcavam a
-- linha como sabida. O que o aluno vai ter no tabuleiro no sábado é outra
-- coisa, e ela tem nome — repetição espaçada.
--
-- Duas colunas resolvem: em que degrau a linha está, e quando ela vence. Os
-- **intervalos** de cada degrau não estão aqui, e isso é deliberado: eles moram
-- em `DEGRAUS_EM_DIAS`, em `lib/repertorio/treino.ts`, pelo mesmo motivo de
-- `ACERTOS_PARA_APRENDER`. Quem faz a conta é o TypeScript testado, e uma
-- segunda cópia em SQL seria uma segunda opinião sem teste — do tipo que só
-- aparece quando as duas discordam na frente do aluno.
--
-- ## A ordem é migration primeiro, deploy depois
--
-- O inverso quebra tudo: o `gravar.ts` novo nomeia `degrau` e `revisar_em` no
-- `upsert`, e o PostgREST recusa a chamada inteira com coluna que não existe —
-- toda gravação de repertório passaria a falhar. Nesta ordem, a janela é o
-- contrário: por alguns minutos o código **antigo** grava sem as duas colunas,
-- e os defaults cuidam disso.
--
-- É por essa janela que o `check` abaixo é frouxo de propósito. Ele **não**
-- amarra `aprendida_em` ao degrau: se amarrasse, o `gravar.ts` antigo — que
-- marca `aprendida_em` no terceiro acerto seguido e não conhece degrau nenhum —
-- escreveria uma linha que o banco recusa, e o aluno veria "não deu para
-- gravar" sem ter feito nada de errado.
--
-- Sem índice novo: são ~500 linhas na tabela inteira, e toda consulta continua
-- atacando o prefixo da chave primária `(aluno, linha)`.
-- ---------------------------------------------------------------------------

alter table public.repertorio_progresso
  -- O degrau da escada. **0 é "fora da escada"** — linha nunca treinada, ou
  -- derrubada por um erro antes de ser aprendida.
  add column if not exists degrau     smallint not null default 0,
  -- Quando a linha volta a valer degrau. Nulo se e só se `degrau` é 0.
  add column if not exists revisar_em timestamptz;

comment on column public.repertorio_progresso.degrau is
  'Degrau da escada de revisão; 0 é fora da escada. Os intervalos estão em DEGRAUS_EM_DIAS, em lib/repertorio/treino.ts.';
comment on column public.repertorio_progresso.revisar_em is
  'Quando a linha volta a ser cobrada. Nulo se e só se degrau = 0.';

-- ---------------------------------------------------------------------------
-- Quem já treinou entra na escada onde estava
--
-- O `and degrau = 0` nos dois `update` é o que os torna repetíveis: rodar a
-- migration de novo não rebaixa ninguém que já subiu.
-- ---------------------------------------------------------------------------

-- Quem já era "aprendido" pela regra velha entra no degrau 3, vencendo um dia
-- depois da última passada. Como essa passada foi há semanas, a linha nasce
-- **vencida** — que é o certo: o aluno vai revisá-la na primeira sessão, e é
-- essa revisão que dá à palavra "aprendida" o sentido novo.
update public.repertorio_progresso
   set degrau = 3, revisar_em = ultima_em + interval '1 day'
 where aprendida_em is not null and degrau = 0;

-- Quem tinha 1 ou 2 acertos seguidos entra no degrau correspondente. O número
-- coincide de propósito: os degraus 1 e 2 são exatamente "acertou uma vez" e
-- "acertou duas vezes", e o que a escada acrescenta é a exigência de que as
-- vezes caiam em dias diferentes.
update public.repertorio_progresso
   set degrau = acertos_seguidos, revisar_em = ultima_em + interval '1 day'
 where aprendida_em is null and acertos_seguidos between 1 and 2 and degrau = 0;

-- ---------------------------------------------------------------------------
-- A coerência, e só ela
--
-- A última rede embaixo de um bug de aritmética: a chave de serviço ignora a
-- RLS, mas não ignora as restrições. O que este `check` afirma é a invariante
-- que `lib/repertorio/treino.ts` mantém e `treino.test.ts` cobra por escrito —
-- "degrau 0 se e só se sem data" —, e nada além dela.
-- ---------------------------------------------------------------------------

alter table public.repertorio_progresso
  drop constraint if exists repertorio_escada_coerente;
alter table public.repertorio_progresso
  add constraint repertorio_escada_coerente
    check (degrau >= 0 and (degrau = 0) = (revisar_em is null));
