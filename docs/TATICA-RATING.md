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

## Execução — 15/9 (onde paramos)
Os cinco pontos de parada estão feitos, cada um num commit da branch `tatica-rating`
(`d267c47`, `52bf70b`, `9a9739c`, `4ea1cad`, `cc4fed8`). A migration `0011` está aplicada
no banco de teste. **Não foi publicado nada no `main`.**

**Números medidos:**
- Glicko-2: o exemplo do Glickman bate a 0,01 (a conta exata dá 1464,051; o artigo
  arredonda no meio). Cinco casos batem com a função SQL do vtracer, rodada numa
  transação desfeita.
- A partir de 400: +201/−152 contra um problema de 450, **+302/−99 contra 600**,
  +383/−71 contra 700 (o plano estimava ≈ +420).
- **O CSV não tem problemas de 400 a 600.** O menor rating é 545; há 117 abaixo de 600,
  e nenhum passa nos filtros. A base ficou em 600–650 e 650–700: 6.000 problemas, 1,05 MB.
- Índice: 147.026 puzzles (34.961 repetidos entre temas saíram), 3,92 MB.
- `filtrar-puzzles.ts` refatorado regravou os 224 arquivos de tema idênticos.
- Portões: typecheck, lint, 1.352 testes, build, conteúdo, 34/34 mutações e repertório
  `--check`, todos verdes. `db:tatica:rating` com 40 afirmações; `db:tatica` com 39;
  `db:rls` com 56 (a seção 6, do professor, pulada sem o PIN).
- Navegador (1366×768 e 360×740, contas descartáveis já apagadas): F5 traz o mesmo
  problema; acerto, erro com solução e Enter; rede caída com "Tentar de novo"; o palco não
  rola; evolução, temas fracos, revisão do dia, professor e painel conferidos.

**Decididas pelo Doug (15/9, depois da execução):**
1. **O início fica em 400**, mesmo com os problemas começando em ~600 (1º acerto +302).
2. **Os selos `rating` ficam no fim da lista**, para não tirar do painel o próximo selo de
   finais. O convite para o modo fica no cartão do painel.
3. **O achado das 1.000 linhas é corrigido nesta branch** (ver abaixo).

**Correção lateral feita:** a tabela de alunos de `/professor` tinha o título "Rating" sem
célula desde `394f75d`, e o nível aparecia embaixo dele. A célula voltou, com o título
"Rating de entrada".

**Corrigido depois, por decisão do Doug:** `puzzlesJaVistos()` e `linhasDeTentativas()`
(`lib/tatica/progresso.ts`) liam numa consulta só, e o Supabase corta em 1.000 linhas sem
aviso. Reproduzido contra o banco: com 1.005 tentativas, as duas leram 1.000. Em ordem de
data, as perdidas eram as **mais novas**, então os erros recentes de um aluno veterano não
chegariam à revisão do dia. Agora as duas paginam (`lib/supabase/paginar.ts`), e o mesmo
script leu 1.005. O teste de `paginar.test.ts` falha com a consulta única e passa com a
paginada.

**Achado lateral, não corrigido:**
- `/nivel/[n]/prova` lê o disco e não está em `outputFileTracingIncludes` (já registrado acima).

## Mudança depois do teste do Doug — 15/9: salto pequeno
O Doug testou e achou os saltos grandes demais (+175 no primeiro acerto, e o problema pulando
junto). Pediu progressão "de 10 ou 20 em 20". Decidido por ele, no pop-up:

- **RD inicial 80, e não 350** (`lib/tatica/glicko2.ts`, `INICIO`). A fórmula é a mesma; muda
  a incerteza inicial. Medido: seis acertos seguidos dão +17 +17 +16 +16 +16 +15, e com o uso
  o salto assenta em ~11 (300 respostas simuladas). De 600 a 1000 são ~31 acertos.
- **Todo aluno começa em 600** (`INICIO.rating`). Houve uma versão intermediária que começava
  no rating anotado no perfil; o Doug corrigiu no mesmo dia ("como que o meu aluno de 700 vai
  começar no nível 1100?"). O rating do perfil não entra. Migration `0013` só corrige o texto
  da coluna.
- **Janela de escolha ±20**, depois ±50, ±100, ±200 e ±400 (`lib/tatica/rating-escolher.ts`).
  Há mais de mil problemas a ±20 de 1200.
- **Migration `0012_tatica_rating_inicio.sql`** (aplicada no banco de teste): coluna
  `rating_inicial` e os defaults novos. O selo "+100" passou a contar do início de cada aluno
  (`rating-mais-100`); os de 1000/1200/1400 exigem ao menos um problema resolvido.
- Conferido: `db:tatica:rating` com 44 afirmações (conta com 1250 anotado no perfil começa em
  600, nenhum salto acima de 20, próximo problema a até 20 pontos); no navegador, Correto +17 e
  +15, Incorreto −16.

**Defeito achado no caminho e corrigido:** com a leitura nova de `garantirPendente`, a página
respondia "não deu para servir um problema" com a linha já no banco. Causa: o Next reaproveita
a resposta de `fetch` GET idênticos durante a montagem da página (a "memoização"), e a segunda
leitura da linha devolvia a primeira. Fix: `abortSignal` novo em `lerLinha`
(`lib/tatica/gravar-rating.ts`), a saída que a documentação do Next indica. O script do banco
não roda dentro do Next e não pegava isso; o roteiro de navegador falhava antes e passa depois.

**A conta `alunoteste`** jogou 27 problemas pela regra antiga (400 → 1419, RD 350). O modo
rating dela foi zerado a pedido do Doug; ela recomeça em 600.

**Falta:** o teste humano do Doug, o "pode publicar" e, depois dele, `git push origin
HEAD:main` e `git worktree remove`.

## Pente fino de 15/9 — o que o Doug escolheu, e o que ficou de fora

Com o modo pronto, dois assistentes leram o código: um pelo lado do aluno e do professor,
outro pela parte técnica. O Doug escolheu da lista: corrigir os quatro defeitos, e fazer os
itens 5 (dizer a tática no erro, **sem link**), 6 (rever a solução), 7 (dizer quando jogar),
9 (temas fracos) e 10 (a tabela da turma).

**Fora, por decisão dele:** dar pesos aos temas na mistura (item 8) e mostrar o tempo ao
professor (item 13). O item 11 (erros lotando a revisão) fica para **medir depois de uma
semana com a turma** — nada foi mexido. O item 12 (modo aquecimento antes das rodadas)
segue sem decisão.

**Além da lista, decisão do Doug:** a frase "Problemas misturados. Errou um lance, o
problema acaba" **sai da tela de jogo** ("estranha e ruim"). O cartão de `/tatica` guarda o
que ela dizia de útil.

### Os quatro defeitos, com o antes e o depois medidos

| # | Defeito | Onde | Prova |
|---|---|---|---|
| 1 | A coluna "7 dias" do professor lia a semana da turma numa consulta só, e a API corta em 1.000 linhas: quem jogou **depois** das mil primeiras respostas da turma aparecia com "±0". | `lib/tatica/rating-turma.ts` (novo, com `todasAsPaginas`) | `db:tatica:rating` §12, contra o banco: com 1.000 linhas de um aluno e 5 de outro, o segundo lia **0 problemas e ±0** antes; agora lê 5, 3 acertos e +50. |
| 2 | O relógio do próximo problema começava na resposta do anterior, com teto de 30 min — e esse tempo **soma na meta do dia** (`minutos_por_dia`). Fechar a aba e voltar amanhã dava meia hora de "treino" num problema. | `gravar-rating.ts`: `garantirPendente` regrava `pendente_desde` ao servir, e o teto do modo cai para **5 min** | `db:tatica:rating` §7: três horas de pendente davam 1.800.000 ms; agora a reabertura mede **76 ms**, e a aba esquecida sem reabrir para em 300.000 ms. |
| 3 | **Segunda chance sem querer:** a tela percebe o lance errado antes do servidor. Sem internet nessa hora, um F5 trazia o mesmo problema zerado e o aluno jogava o lance certo. | `lib/tatica/rating-guardada.ts` (novo) + `Rodada.tsx`: a resposta é guardada no aparelho antes de sair e reenviada ao abrir | `tatica:rating:tela -- segunda-chance`: antes, depois do F5 o cartão dizia "Encontre o melhor lance" e o banco tinha **0 tentativas**; agora diz "Incorreto" e o banco tem o erro. |
| 4 | Toda exceção do servidor chegava à tela como "Sem conexão", com a internet do aluno boa. | `rating.ts` (`respostaProtegida`), `acoes.ts`, fase `falha` na tela | `lib/tatica/rating.test.ts`: exceção vira `falhaDoServidor`, e o cartão passa a dizer "O servidor não conferiu" com "Tentar de novo". |

### As melhorias

- **Item 5 — a tática no erro.** O cartão diz "A tática: Garfo. Uma peça ataca duas ao mesmo
  tempo." (nome e resumo de `blocos.ts`, até dois nomes). Sem link, como o Doug pediu.
- **Item 6 — rever a solução.** A linha certa vira quadros (`lib/tatica/solucao.ts`, com
  teste): o "Próximo" só libera depois do último quadro, ◀ ▶ (e ← →) andam pela linha, e uma
  **seta vermelha** marca o lance que o aluno jogou, na posição do erro.
- **Item 7 — quando jogar.** `PROBLEMAS_POR_DIA` = **70** (a proposta era 15; o Doug subiu o
  teto). Os cartões de `/tatica` e do painel dizem "Depois da revisão e da série do tema: até
  70 problemas por dia"; a tela de jogo conta "hoje 7 de 70" e, no 70º, troca para
  "70 hoje · já pode parar". Não trava nada.
- **Item 9 — temas fracos.** O mínimo por tema vai de 5 para **15**, e cada problema conta
  por **todos** os temas do currículo que traz. Para isso, a migration aditiva
  **`0014_tatica_rating_temas.sql`** (aplicada no banco de teste) guarda `temas` na tentativa:
  a alternativa era abrir ~33 MB de arquivos a cada abertura da evolução. Tentativa antiga,
  sem a coluna, cai na regra de antes.
- **Item 10 — a tabela da turma.** Colunas novas: **Na semana**, **Acerto na semana** e
  **Última vez** (`semanaDoAluno` e `ultimaVez`, puras, com teste). "±0" sozinho não separava
  quem ficou parado de quem jogou e empatou.

### Verificação desta rodada

- **Portões:** typecheck, lint, **1.377 testes** (eram 1.352), build, conteúdo, 34/34
  mutações e repertório `--check`.
- **Banco:** `db:tatica:rating` com **49 afirmações**; `db:rls` verde.
- **Navegador:** `npm run tatica:rating:tela` (novo, `scripts/conferir-tatica-rating.ts`) com
  **48 afirmações** em cinco cenários — segunda chance, erro e solução a 1366×768 **e a
  360×740**, acerto com a contagem do dia, e a tabela do professor. A página **não rola** no
  erro nas duas telas (0 px). Contas descartáveis, apagadas no fim; o rating da `alunoteste`
  não se mexe.
- **Dois defeitos do próprio roteiro**, achados e corrigidos (não eram do site): medir as
  setas antes de a animação assentar, e jogar o segundo lance enquanto o adversário respondia
  — o tabuleiro trava nessa fase de propósito.
- **Falta:** o teste humano do Doug (o arrasto de peça só se prova com a mão) e o item 11,
  para medir com a turma.

## Nunca dois mates curtos seguidos — 16/9

No teste humano, o Doug achou os problemas pouco misturados: "vem muitos mate em um na
sequência, ou mate em dois". **Medido no índice**, a parte de problemas que são mate em 1 ou
em 2 a ±20 do aluno:

| Rating | Mate em 1 | Mate em 2 | Sem mate |
|---|---|---|---|
| 600 | 28% | 52% | 17% |
| 750 | 50% | 38% | 13% |
| 900 | 27% | 26% | 43% |
| 1200 | 10% | 18% | 63% |

A causa é o recorte, e não um defeito do sorteio: os problemas fáceis do Lichess são quase
todos mate, e o sorteio trata todo problema igual.

**Decisão do Doug** (entre "nunca 2 seguidos", "no máximo 1 a cada 3" e deixar): **nunca dois
mates curtos seguidos**. Depois de um mate em 1 ou em 2, o próximo não é mate curto — se
houver outro na janela em que a escolha de sempre acharia problema, ou na seguinte. Não
havendo, vale a escolha de sempre. O mate não sai do modo, e o rating continua justo: o
problema vem da mesma faixa.

- **Índice:** `rating-indice.json` ganhou um `1` no fim da linha dos mates curtos (pelos temas
  do próprio problema, `eMateCurto` em `lib/tatica/rating.ts`). 147.026 problemas, **38.379
  marcados**, 3,99 MB (era 3,92).
- **Escolha:** `escolherPorRating(…, { evitarMateCurto })`, ligada por `responderRating` com
  os temas do problema que acabou de ser respondido.
- **Antes e depois**, 100 problemas seguidos com o rating parado (mesma semente):

  | Rating | Antes: mates / pares seguidos | Depois | Maior distância depois |
  |---|---|---|---|
  | 600 | 81 / 64 | 46 / **0** | 20 |
  | 750 | 87 / 74 | 48 / **0** | 20 |
  | 900 | 46 / 23 | 32 / **0** | 20 |
  | 1200 | 34 / 16 | 23 / **0** | 20 |
  | 540 | — | 46 / **0** | 100 |

- **Defeito achado no caminho:** a primeira versão procurava o não-mate só a ±20 e ±50 do
  rating. O script do banco pegou: abaixo de 600 (onde o índice começa) a regra desistia, e
  **6 de 10** mates respondidos serviam outro mate. Agora ela parte da primeira janela em que a
  escolha acharia problema. O teste "abaixo do índice" falhava antes e passa depois; o script
  deu **10 de 10**.
- **Verificação:** os sete portões (1.382 testes), `db:tatica:rating` com **50 afirmações**, e
  `tatica:rating:tela` com **54**, incluindo o cenário novo `mistura-dos-mates` (três mates
  errados na tela, nenhum próximo mate curto).
