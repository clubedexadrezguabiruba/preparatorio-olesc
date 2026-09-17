-- ---------------------------------------------------------------------------
-- Tática com rating — a tentativa guarda os temas do problema.
--
-- Revisão de 15/9, item 9 (decisão do Doug): os temas fracos passam a contar
-- cada problema **por todos os temas do currículo que ele traz**, e não só pelo
-- arquivo de onde foi servido. Um problema que é garfo e cravada, servido do
-- arquivo de `fork`, contava só como garfo; e, quando um id está em dois temas,
-- o índice fica com o primeiro na ordem dos blocos — o que puxava a conta para
-- o bloco 1.
--
-- Os temas estão no disco (`public/puzzles/…`), não no banco. Ler os arquivos
-- de todos os temas a cada abertura da evolução seriam ~33 MB; guardar a lista
-- na hora da resposta custa uma coluna. Quem grava é `responderRating`
-- (`lib/tatica/gravar-rating.ts`), só com as tags que o currículo tem.
--
-- Só acrescenta. Nula nos outros modos e nas tentativas do modo rating
-- anteriores a esta migration — para essas, a leitura cai na regra antiga
-- (`temasDaTentativa`, em `lib/tatica/rating-historico.ts`).
-- ---------------------------------------------------------------------------

alter table public.tentativas_puzzle
  add column if not exists temas text[];

comment on column public.tentativas_puzzle.temas is
  'Só no modo rating: os temas do currículo que o problema traz (tags do Lichess), gravados na resposta. É por eles que os temas fracos contam. Nula nos outros modos e nas tentativas anteriores à 0014.';
