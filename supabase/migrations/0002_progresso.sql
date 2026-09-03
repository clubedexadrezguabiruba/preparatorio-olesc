-- ---------------------------------------------------------------------------
-- F1/B1.1 — O progresso por tema.
--
-- Nenhuma tabela nova: o dado já está todo em `tentativas_puzzle`. O que falta
-- é a pergunta que três telas fazem — a página de tática, o painel do aluno e
-- o relatório do professor: *quantos deste tema, e quantos certos?*
--
-- ## Por que uma view e não três consultas
--
-- O cliente JavaScript do Supabase não faz `group by`. Sem esta view, cada
-- tela montaria a contagem à mão: ou puxando todas as linhas para o servidor e
-- somando em TypeScript (que fica lento no aluno que resolveu mil puzzles), ou
-- disparando uma consulta `count` por tema (que são 8 consultas para desenhar
-- uma lista de 8 cartões). Pior que os dois: três somas escritas em três
-- lugares, e a chance de o painel discordar do relatório.
--
-- ## `security_invoker` é a linha que importa
--
-- Uma view no Postgres roda, por padrão, com os privilégios de **quem a
-- criou** — aqui, o dono do banco. Isso ignoraria a RLS de
-- `tentativas_puzzle` inteira: qualquer aluno logado leria o progresso de
-- todos os outros por esta porta, com as políticas da tabela intactas e
-- inúteis.
--
-- `security_invoker = on` faz a view rodar com os privilégios de **quem
-- consulta**, e a política `tentativas_le_as_suas` volta a valer: o aluno vê
-- as linhas dele, o professor vê as de todos. A prova disso está em
-- `scripts/verificar-rls.ts`.
-- ---------------------------------------------------------------------------

create or replace view public.progresso_tema
with (security_invoker = on) as
select
  aluno,
  tema,
  modo,
  count(*)::int                                  as tentativas,
  count(*) filter (where acertou)::int           as acertos,
  -- Arredondado para inteiro: o relatório mostra segundos, e meio milissegundo
  -- de média não é informação sobre ninguém.
  round(avg(tempo_ms))::int                      as tempo_medio_ms,
  max(criada_em)                                 as ultima
from public.tentativas_puzzle
group by aluno, tema, modo;

comment on view public.progresso_tema is
  'Contagem por aluno, tema e modo. Roda com os privilégios de quem consulta (security_invoker), então a RLS de tentativas_puzzle continua valendo.';

-- O `grant` é explícito porque view criada por migration não herda o default
-- privilege que o Supabase configura para tabelas novas. Sem ele, a consulta
-- volta "permission denied for view" — um erro que parece de RLS e não é.
grant select on public.progresso_tema to authenticated;
