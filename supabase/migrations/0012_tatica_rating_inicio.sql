-- ---------------------------------------------------------------------------
-- Tática com rating — o início pelo rating de entrada, e saltos pequenos.
--
-- Decisão do Doug de 15/9, depois de testar a 0011: o salto de +175 no primeiro
-- acerto era grande demais. O modo passa a:
--
-- - começar no **rating de entrada** que o professor anotou em `perfis.rating`,
--   com piso de 600 (o problema mais fácil do recorte);
-- - começar com **RD 80**, e não 350 — o salto fica em ~16 pontos e assenta em
--   ~11 (a tabela medida está em `lib/tatica/glicko2.ts`, `INICIO`).
--
-- Quem calcula é o servidor (`garantirPendente`), que sempre grava os valores
-- explícitos. Os `default` abaixo só acompanham a regra, para uma linha criada à
-- mão não nascer com os números velhos.
--
-- ## `rating_inicial`
--
-- O início muda de aluno para aluno, e o selo "+100" é **100 acima do início**.
-- Sem guardar o início, ele teria de ser adivinhado da primeira tentativa — e o
-- aluno que ainda não respondeu nada não teria de onde. Só acrescenta: nullable
-- para as linhas da 0011, e preenchido com o rating de antes da primeira
-- tentativa (ou o rating atual, se não houve nenhuma).
-- ---------------------------------------------------------------------------

alter table public.rating_tatica
  add column if not exists rating_inicial double precision;

update public.rating_tatica r
set rating_inicial = coalesce(
  (select t.rating_antes
     from public.tentativas_puzzle t
    where t.aluno = r.aluno and t.modo = 'rating' and t.rating_antes is not null
    order by t.criada_em, t.id
    limit 1),
  r.rating)
where r.rating_inicial is null;

comment on column public.rating_tatica.rating_inicial is
  'O rating com que o aluno começou o modo: o rating de entrada do perfil, com piso de 600. O selo "+100" é contado a partir dele.';

alter table public.rating_tatica alter column rating set default 600;
alter table public.rating_tatica alter column rating_maximo set default 600;
alter table public.rating_tatica alter column rd set default 80;
