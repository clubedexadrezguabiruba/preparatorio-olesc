-- ---------------------------------------------------------------------------
-- Tática com rating — todo aluno começa em 600 (Doug, 15/9).
--
-- A 0012 começava cada aluno no rating anotado no perfil. O Doug corrigiu no
-- mesmo dia: um aluno de 700 não pode começar num nível de 1100. Todos começam
-- em 600, o problema mais fácil do recorte; quem calcula é o servidor
-- (`INICIO` em `lib/tatica/glicko2.ts`). Esta migration só corrige o texto que
-- descreve a coluna — nenhum dado muda.
-- ---------------------------------------------------------------------------

comment on column public.rating_tatica.rating_inicial is
  'O rating com que o aluno começou o modo: 600 para todos (400 para quem jogou pela regra do primeiro dia). O selo "+100" é contado a partir dele.';
