# Táticas com rating

## Contexto
O Doug quer, dentro de Tática, um modo como o Puzzles Rated do Chess.com: problemas misturados, o
rating do aluno sobe e desce a cada problema, e a evolução fica visível.

- **Referência:** `C:\Users\Lenovo\Desktop\recruta64-vtracer`. O cdxguabirubaCLAUDE tem código igual.
- **Copiamos o método, não os arquivos.**
  - Lá, a lógica vive em SQL amarrado a avatar, missões e feed.
  - Aqui, o servidor julga em TypeScript (`lib/tatica/gravar.ts`) e os puzzles estão em
    `public/puzzles/*.json` (176 mil).
  - Já temos o juiz que aceita mate alternativo (`lib/tatica/conferir.ts`), o tabuleiro
    (`components/board/ChessBoard.tsx`) e os sons (`lib/sound.ts`).

**Vem do clube, igual:**
- Glicko-2 com τ=0,5.
- Limites: rating 100–3000, RD 30–350, volatilidade 0,01–0,15.
- Início 400, RD 350, volatilidade 0,06.
- Placar: 1 para acerto, 0 para erro.
- Janela de escolha ±100, depois ±200, depois ±400.
- Um lance errado encerra o problema como falha.
- Mostra +X/−Y e a sequência de acertos.

**Fica de fora:** o botão pular (nunca foi liberado lá), o valor de reserva 1000 e a recusa de mate alternativo.

## Decisões
**Do Doug (15/9):**
- Início 400. O tempo não mexe no rating.
- Entram: o gráfico de evolução, a solução mostrada após erro, o professor vendo o rating e os erros voltando na revisão do dia.
- A entrada é um cartão no topo de `/tatica`.

**Do Doug, após a revisão em Fable (15/9):**
- **Problemas de 400 a 700 só para este modo.** Saem do CSV do Lichess (`dados/lichess_db_puzzle.csv`) com os mesmos filtros de qualidade: popularidade ≥ 50, jogadas ≥ 100, RD ≤ 100.
  - O piso 700 dos temas **não muda**.
  - Assim o aluno em 400 recebe problemas na altura dele, e o salto do 1º acerto cai muito em relação aos ≈ +420 contra um problema de 700.
- **Não repete nada que o aluno já viu, em qualquer modo** (`puzzlesJaVistos()` em
  `lib/tatica/progresso.ts:149`).
- **O erro no modo rating vai só para a revisão do dia, não para a prova do tema.** Para isso, entra
  `"rating"` na lista de `lib/tatica/serie.ts:113`.
- **O tempo não aparece em tela nenhuma.** Ele é gravado, medido pelo servidor (`now() - pendente_desde`), mas não mexe no rating e não é mostrado.

## Onde e quando: pasta separada, pronto antes de 18/09
O Doug vai trabalhar em outros assuntos ao mesmo tempo. Por isso o trabalho roda numa **cópia
isolada**: um *worktree* (uma segunda pasta do mesmo projeto, com a sua própria branch; o que
muda nela não mexe na pasta principal), seguindo `docs/COMO-TRABALHAR-COM-BRANCHES.md`.

- **Preparação:**
  1. `git fetch origin`.
  2. `git worktree add ../preparatorio-olesc-rating -b tatica-rating origin/main`.
  - A branch nasce do `main` do GitHub, não do `modo-editor`. Assim o modo rating pode ir para o ar sem esperar o Editor v2, que tem 17 commits ainda não publicados.
- **Montar a pasta nova:**
  - `npm install`;
  - copiar `.env.local` da pasta principal;
  - o CSV do Lichess é lido direto de `preparatorio-olesc/dados/`, sem cópia de 570 MB;
  - o servidor de teste roda na porta 3001, para não brigar com a 3000 da outra sessão.
- **Commits:** um commit na branch `tatica-rating` a cada ponto de parada, com os portões verdes.
- **Banco:** o banco de teste é o mesmo das outras sessões. A migration só acrescenta, então não quebra o trabalho paralelo.
- **Juntar:**
  1. `git fetch` e `git merge origin/main` dentro da branch.
  2. Portões.
  3. `git push origin HEAD:tatica-rating`, para você conferir o preview na Vercel.
  4. Só com o seu "pode publicar": migration aplicada e `git push origin HEAD:main`.
  - **Pontos de conflito possíveis:** o `modo-editor` já mexeu em `app/professor/[aluno]/page.tsx`, `app/painel/`, `lib/curso/selos.ts`, `next.config.ts` e `package.json`. Confiro antes de juntar e aviso.
- **Calendário** (hoje é 15/9):

  | Dia | Pontos de parada |
  |---|---|
  | 15–16/9 | 1–2 |
  | 16–17/9 | 3–4 |
  | 17/9 | 5 e o teste humano |
  | 18/9 cedo | publicar |

  - **Se apertar:** o ponto 5 (painel e selos) é o que sai por último. Ele fica para depois sem quebrar nada.
- **Fim:** o worktree é removido depois do merge (`git worktree remove`).

## Implementação

### 1. Fórmula e escolha (código puro, com teste)
- **`lib/tatica/glicko2.ts`**
  - O núcleo `glicko2(jogador, resultados: {rating, rd, placar}[])` segue o formato do artigo do Glickman e é portado de `recruta64-vtracer/.../20260217200000_fix_revanche_queue_definitive.sql:46-175`. Um puzzle é o caso de um resultado só.
  - **O RD do puzzle é constante (75)**, porque o nosso recorte não guarda o RD (`lib/tatica/puzzles.ts:16-25`). Isso fica escrito no arquivo.
  - O banco guarda os valores com casas decimais, e a tela arredonda.
- **`scripts/base-rating.ts`** (`npm run puzzles:base-rating`)
  - Lê o CSV e grava `public/puzzles/rating-base/<faixa>.json` para 400–500, 500–600 e 600–700.
  - Usa o mesmo formato de `Puzzle` e os mesmos filtros de `filtrar-puzzles.ts`, que o script importa em vez de copiar.
  - Tem um teto por faixa, a medir. A meta é algo como 3.000 por faixa, cerca de 1–2 MB no total.
- **`banco.ts` passa a entender a origem `rating-base`.** Com isso, `puzzlePorId("rating-base", id)` acha esses problemas. A gravação, a revisão (`revisao/page.tsx:58`) e a conferência funcionam sem caminho especial. O nome mostrado na revisão é "Tática rating".
- **`scripts/indice-rating.ts`** (`npm run puzzles:indice-rating`)
  - Gera `public/puzzles/rating-indice.json` com linhas `[id, origem, rating]`, ordenadas por rating. A origem é o tema ou `rating-base`.
  - Remove ids repetidos de forma determinística: fica o primeiro tema na ordem de `BLOCOS`, que é o arquivo de onde `puzzlePorId(origem, id)` lê.
  - O servidor guarda o índice em memória, no padrão de cache de `banco.ts:22-27`.
- **`lib/tatica/rating-escolher.ts`**
  - `escolherPorRating(indice, rating, vistos, sorteio)` faz busca binária no array ordenado e usa a janela ±100/±200/±400.
  - Se a janela vier vazia, pega o puzzle mais próximo. Isso acontece abaixo de 400 e acima de 2100, e o teste cobre os dois lados.

### 2. Banco — migration aditiva `supabase/migrations/0011_tatica_rating.sql`
- **Tabela `rating_tatica`**
  - Colunas: `aluno` (chave, ligada a perfis), `rating`, `rd`, `volatilidade`, `sequencia`, `melhor_sequencia`, `rating_maximo`, `resolvidos`, `puzzle_pendente`, `tema_pendente`, `pendente_desde`, `atualizado_em`.
  - RLS: o aluno lê a sua linha; o professor (`eh_professor()`) lê todas; ninguém escreve, só a chave de serviço.
  - O comentário da migration explica por que é tabela separada: `perfis_atualiza_o_seu` (`0001:121-125`) deixaria o aluno editar o próprio `perfis.rating`.
- **`tentativas_puzzle`** ganha as colunas `rating_antes`, `rating_depois` e `rd_depois`, nulas nos outros modos.
- **O CHECK `tentativas_puzzle_modo_check`** é recriado com `'rating'`, no padrão de `0009_prova_de_nivel.sql:33-37`.
- **`lib/tatica/serie.ts`**
  - `Modo`, `MODOS_GRAVAVEIS` e `NOME_DO_MODO` (:71-79) ganham `rating`.
  - A linha :113 passa a ignorar `rating`.
- **`scripts/verificar-rls.ts`** ganha duas afirmações: o aluno B não lê a linha do A, e o aluno não atualiza a própria linha.

### 3. Servidor — `lib/tatica/gravar-rating.ts` + `app/tatica/rating/acoes.ts`
- **`garantirPendente(aluno)`** é idempotente: pode ser chamado de novo sem efeito duplicado.
  1. Cria a linha inicial com `upsert ignoreDuplicates`.
  2. Se não há pendente, sorteia e grava com `update ... where puzzle_pendente is null`, junto com `pendente_desde = now()`.
  3. Se o pendente sumiu do disco (`puzzlePorId` devolve `null`), limpa e sorteia de novo.
  - Consequência: recarregar a página traz o mesmo problema. Não dá para fugir de um difícil nem escolher um fácil pelo id.
- **`responderRating(puzzleId, lances)`** pega o `aluno` de `perfilAtual()`, nunca do corpo da chamada. Ordem, que é a trava contra corrida:
  1. lê a linha, julga com `conferirSolucao` e calcula o Glicko-2 e o tempo (`now() - pendente_desde`, com teto de 30 min);
  2. **primeiro** faz `update rating_tatica set ... puzzle_pendente = próximo where aluno = X and puzzle_pendente = P` com `.select()`;
  3. se o update voltou 0 linhas, recusa sem gravar nada;
  4. **só então** insere em `tentativas_puzzle`, com `tema = origem = tema do índice` e `modo = 'rating'`.
  - Devolve `{acertou, delta, rating, sequencia, solucao, proximo}`.
  - Um parágrafo no arquivo aceita o risco conhecido: a solução está no JSON público, como já documentam `gravar.ts:60-66` e `conferir.ts`.
- **`next.config.ts`**: `/tatica/rating` entra em `outputFileTracingIncludes` com `./public/puzzles/**`. O glob já pega `rating-base/` e o índice.
- **`package.json`**: `db:tatica:rating` roda com `node --conditions=react-server`, como o `db:tatica`.

### 4. Tela de jogo — `app/tatica/rating/page.tsx` + `Rodada.tsx`
- **Antes de começar**, ler o guia de `node_modules/next/dist/docs/` (regra do AGENTS.md).
- **`Rodada.tsx` é um componente próprio.** `Serie.tsx` não é extraído: tem 794 linhas acopladas a dica, voz do professor e trilha, e fica intocado.
  - Usa `ChessBoard`, `lanceCerto` e `posicaoInicial`, `applyUci`, os sons e os tempos `ABERTURA_MS` e `RESPOSTA_MS`.
  - `BotaoDeSom` sai de `Serie.tsx:422` para `components/`, exportado.
- **Moldura da tela:** altura fechada, sem Cabeçalho, envolta em `VistaDoTabuleiro` (padrão de `[tema]/page.tsx:103`).
- **Acerto:** "Correto! +8" e a sequência com 🔥; passa sozinho ao próximo em 1,5 s.
- **Erro:** "Incorreto −12"; o tabuleiro joga a linha certa, lance a lance, e espera o botão "Próximo" (ou Enter).
- **Falha de rede:** a tela não avança e oferece "Tentar de novo". A trava torna o reenvio seguro.
- **Cartão no topo de `app/tatica/page.tsx`:** rating, melhor sequência, botão Jogar e o link "Ver evolução".

### 5. Evolução e professor
- **`app/tatica/rating/evolucao/page.tsx`**, com `Cabecalho atual="tatica"`:
  - o gráfico mostra o último rating de cada dia e a linha do recorde;
  - os números: rating, máximo, resolvidos e % de acerto;
  - as últimas tentativas.
- **O gráfico:** `components/tatica/GraficoRating.tsx` desenha em SVG, sem biblioteca nova. `lib/tatica/rating-historico.ts` é uma função pura, com teste. Leio a skill `dataviz` antes de desenhar.
- **Temas fracos** (na evolução): os 3 temas com pior acerto no modo rating.
  - Só entram temas com um mínimo de tentativas (proposta: 5).
  - Cada tema leva um link para a sua série em `/tatica/[tema]`.
  - O cálculo é a função pura `temasFracos(tentativas)` em `rating-historico.ts`, com teste.
  - Os problemas de 400–700 (`rating-base`) contam pelos temas que o próprio problema traz (`temas[]`).
- **`app/professor/[aluno]/`:**
  - um bloco com o **"rating de tática"**, rotulado para não confundir com o "rating de entrada" que já aparece em `page.tsx:134`;
  - o mesmo gráfico e os temas fracos.
- **Tabela da turma** em `app/professor/page.tsx`: aluno, rating de tática, variação nos últimos 7 dias e resolvidos.
  - Quem nunca jogou aparece com "—".
  - Só o professor vê; o aluno não tem ranking.

### 6. Painel e selos
- **`app/painel/page.tsx`:** o rating de tática com uma minicurva de 30 dias, usando o mesmo `GraficoRating` em versão compacta, com link para a evolução.
  - Quem nunca jogou vê um convite para o modo.
- **`lib/curso/selos.ts`:** família nova `rating`, calculada (não gravada), no mesmo estilo dos selos existentes.
  - `ParaOsSelos` ganha `ratingTatica: { maximo, melhorSequencia } | null`, lido de `rating_tatica`.
  - Selos, com os números como proposta do Doug e em `DEGRAUS`:
    - "+100" = máximo ≥ 500;
    - 1000, 1200 e 1400 = máximo atingido;
    - "10 seguidos" = melhor sequência ≥ 10.
  - Usa o **máximo**, não o atual: selo ganho não se perde num dia ruim.
  - Os testes vão em `lib/curso/selos.test.ts`. `app/painel/Selos.tsx` ganha o ícone da família nova.

## Pontos de parada (cada um com número medido)
1. **Fórmula, índice e escolha.**
   - Teste do exemplo do Glickman (três partidas: 1500/200 → 1464,06 / 151,52 / 0,05999).
   - Três casos conferidos contra o SQL do clube.
   - O +X do primeiro acerto e o −Y do primeiro erro saindo de 400, contra um problema de ~450.
   - Quantos problemas de 400–700 saíram do CSV por faixa, e quantos MB.
   - O tamanho do índice em MB e o número total de puzzles.
2. **Banco e servidor.** Migration aplicada. `db:tatica:rating` com as afirmações contadas:
   - o pendente é exigido;
   - lances forjados são recusados;
   - o rating muda;
   - `Promise.all` de duas respostas iguais grava **exatamente uma** linha;
   - um pendente que sumiu do disco é substituído;
   - o tempo é medido no servidor.
   - Mais `db:rls` com as duas afirmações novas.
3. **Tela de jogo e cartão.** Sete portões verdes.
4. **Evolução, temas fracos e professor** (aluno e tabela da turma). Sete portões verdes.
5. **Painel e selos.** Sete portões verdes, o número de testes de selos e o teste humano do Doug.

## Verificação
- **Testes de código puro:** `node --test` em `glicko2`, `rating-escolher` e `rating-historico`.
- **Contra o banco**, só com conta de teste (prazo 18/09): `npm run db:migrar`, depois `db:tatica:rating`, `db:tatica` e `db:rls`.
- **Sete portões:** typecheck, lint, test, build, validate:content, validate:mutations e repertório `--check`.
- **Teste humano do Doug:**
  - jogar 10 problemas e errar um de propósito, vendo a solução;
  - recarregar no meio e ver que volta o mesmo problema;
  - no dia seguinte, ver o erro na revisão;
  - conferir o gráfico, os temas fracos, a página do aluno e a tabela da turma no professor;
  - ver o rating no painel e um selo acender.
  - O arrasto de peça só se prova com a mão.

## Cuidados
- A pasta principal tem alterações de outra frente (`docs/TRILHA-FINAIS.md`, `lib/finais/trilha*`, `N0-LADDER`). O worktree não as enxerga e não mexe nelas.
- A migration só acrescenta; nada é apagado. Ela é aplicada antes do deploy (regra da `0005_revisao.sql:24-29`).
- **Achado lateral, fora do escopo:** `/nivel/[n]/prova` lê o disco e não está em `outputFileTracingIncludes`. Esse defeito é anterior a este plano. Aviso, e não corrijo em silêncio.
