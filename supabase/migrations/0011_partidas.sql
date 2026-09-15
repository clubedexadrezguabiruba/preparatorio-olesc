-- 0011 — as partidas modelo como requisito de nível (docs/PARTIDAS-MODELO.md, bloco 4).
--
-- Aditiva: uma tabela nova, nenhuma coluna mexida. Uma linha por lance que o
-- aluno joga num momento de decisão — o errado, a alternativa boa e o certo.
-- "Partida concluída" é derivada daqui no servidor (lib/partidas/concluir.ts):
-- todo momento com um acerto, e o Desafio final acertado na primeira resposta,
-- sem ajuda. Nada disto é gravado pronto, pelo mesmo motivo de
-- tentativas_puzzle.acertou: o navegador manda o lance, e o servidor julga.
--
-- Molde: 0006_meiojogo.sql (tentativa_meiojogo).

create table if not exists public.tentativa_partida_momento (
  id           bigint generated always as identity primary key,
  aluno        uuid not null references public.perfis (id) on delete cascade,
  -- O slug de content/partidas/ (`morphy-isouard`). Texto solto: o outro lado é
  -- arquivo no repositório, como tentativa_meiojogo.dica.
  partida      text not null,
  -- O `n` do momento dentro da partida, a partir de 1.
  momento      smallint not null check (momento >= 1),
  -- A impressão digital do momento no dia da resposta: as oito primeiras casas do
  -- sha256 de FEN + lance esperado. Momento corrigido muda de versão, e as linhas
  -- de antes deixam de contar para ele.
  versao       text not null,
  -- O lance jogado, em UCI. Nunca um booleano sozinho.
  resposta_uci text not null check (resposta_uci ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'),
  -- Derivados no servidor, sempre. `boa` = uma das alternativasBoas: não é acerto
  -- e não é erro.
  acertou      boolean not null,
  boa          boolean not null default false,
  -- A ordem da resposta dentro do momento, contando só os erros antes dela
  -- (a alternativa boa não gasta). `primeira` é o corte do "de primeira".
  tentativa    smallint not null check (tentativa >= 1),
  primeira     boolean not null generated always as (tentativa = 1) stored,
  -- 0 nenhuma · 1 texto de ajuda lido · 2 casa de origem acesa · 3 lance revelado.
  apoio        smallint not null default 0 check (apoio between 0 and 3),
  tempo_ms     integer not null check (tempo_ms >= 0),
  criada_em    timestamptz not null default now(),
  check (not (acertou and boa))
);

comment on table public.tentativa_partida_momento is
  'Uma linha por lance jogado num momento de decisão das partidas modelo. Só o servidor escreve aqui — ver a política de RLS.';

create index if not exists partida_momento_aluno_idx
  on public.tentativa_partida_momento (aluno, partida, momento);

alter table public.tentativa_partida_momento enable row level security;

-- Só leitura: a do próprio aluno, e o professor lê todas. Nenhuma política de
-- insert, update ou delete — quem grava é a chave de serviço, em
-- lib/partidas/gravar.ts, com o aluno tirado do cookie de sessão.
drop policy if exists partida_momento_le_as_suas on public.tentativa_partida_momento;
create policy partida_momento_le_as_suas on public.tentativa_partida_momento
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());
