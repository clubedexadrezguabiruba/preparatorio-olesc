-- ---------------------------------------------------------------------------
-- O modo `prova-de-nivel` entra no CHECK de `tentativas_puzzle`.
--
-- A prova de nível é o último passo de cada degrau: 12 puzzles sorteados dos
-- temas do nível e de todos os anteriores, **misturados e sem dizer o tema**.
-- Passa com 9.
--
-- ## Por que ela não tem tabela própria
--
-- Porque o resultado dela **são** estas 12 linhas, e a aprovação é a linha em
-- `nivel_conquistado` (0008). Uma tabela `prova_de_nivel` seria uma segunda
-- verdade sobre o mesmo evento — e a primeira coisa que aconteceria é as duas
-- discordarem numa reprovação parcial.
--
-- Sai de graça, junto: os 12 puzzles entram na fila de revisão espaçada como
-- qualquer outro erro, porque `lib/tatica/revisao.ts` reage a `acertou` e não
-- ao modo.
--
-- ## O CHECK, e por que a busca pelo nome
--
-- O CHECK de `modo` nasceu inline na 0001, e o Postgres o nomeou sozinho. A
-- 0005 já teve de caçá-lo pelo `pg_get_constraintdef` em vez de confiar no
-- nome provável, e deixou-o com nome explícito (`tentativas_puzzle_modo_check`)
-- — então aqui a caça não é mais necessária. O `drop ... if exists` fica
-- mesmo assim: repetir a migration não pode falhar.
--
-- `torneio` continua na lista e continua sem tela que o sirva. Ele estava lá
-- desde a 0001; tirá-lo seria uma migration que só serve para arrumar a
-- aparência de um CHECK.
-- ---------------------------------------------------------------------------

alter table public.tentativas_puzzle
  drop constraint if exists tentativas_puzzle_modo_check;

alter table public.tentativas_puzzle
  add constraint tentativas_puzzle_modo_check
  check (modo in ('aquecimento', 'serie', 'prova', 'torneio', 'revisao', 'prova-de-nivel'));

comment on column public.tentativas_puzzle.modo is
  'Onde o puzzle foi servido. As três etapas do tema (aquecimento, serie, prova) movem a barra do tema; revisao e prova-de-nivel não — progressoPorTema descarta o que não é etapa. torneio nunca teve tela.';
