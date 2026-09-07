# F2 — onde paramos, e o que falta

> Reescrito em 2026-09-06, no fim da sessão que fechou os itens (a), (b) e (c) —
> os defeitos visuais, os três scripts contra o banco e os 30 links de vídeo.
> **A F2 está fechada.** O que sobra deste documento é o registro do que foi
> medido, as dívidas declaradas e as armadilhas. O plano completo continua em
> `C:\Users\Lenovo\.claude\plans\vamos-entrar-em-plan-keen-mochi.md`.

## Por que esta fase existiu

A revisão pedagógica de 2026-09-06 mostrou que o preparatório foi desenhado para
outra turma. A turma real é:

| | |
|---|---|
| Idade | 12 a 15 anos |
| Força | 700 a 1700 de rápidas no chess.com |
| Experiência | todos com dois ou mais torneios oficiais |
| Treino | **2 horas por dia, 6 dias por semana**, obrigatório |

Os três problemas que a F2 atacou: não existia repetição espaçada (e a tela
prometia o contrário); a obrigação de 2 h não era medida; e a trilha escondia o
futuro. Os três estão fechados, e agora **provados contra o banco**.

---

## Estado verde, medido nesta sessão

```
npm run typecheck        ✓
npm test                 ✓  428 testes (eram 414)
npm run lint             ✓
npm run build            ✓  49 rotas
npm run validate:content ✓  26 posições, 7 aulas, 30 dicas, 125 afirmações medidas
npm run apostila         ✓  caderno-1.pdf, 25 páginas, 61 diagramas
npm run db:migrar --listar ✓  5 de 5 aplicadas
npm run db:rls           ✓  36 afirmações, itens 8 e 9 novos
npm run db:tatica        ✓  32 afirmações, itens 7 a 10 novos
npm run db:finais        ✓  32 afirmações, itens 8 a 10 novos
npm run db:f2            ✓  os quatro números, na conta de ensaio
```

**A migration `0005_revisao.sql` está aplicada** no banco de produção. Não há
migration pendente.

---

## Os quatro números que fecham a F2

Medidos por `npm run db:f2` (`scripts/quatro-numeros-da-f2.ts`), que recria
`alunoteste` do zero, mede, e **deixa o rastro de pé** para o site ser aberto em
seguida. Rodada de 2026-09-06:

| | afirmação da tela | medido |
|---|---|---|
| 1 | "os que você errou voltam na prova" | dos **3** errados, **3** entre os 10 da prova |
| 2 | "eles voltam em dois dias" | hoje: **0**. Em `hoje+2`: **3**, todos no nível 1 |
| 3 | "a aula volta para você jogar de novo" | `etapa='revisao', posicao='pos-n0-ladder-freeborough-262'` |
| 4 | "você treinou tantos minutos hoje" | cartão **11 min** (4 tática + 7 finais) = view **658 000 ms** em 10 itens |

O nº 2 e o nº 4 foram conferidos **na tela de verdade**, com o navegador logado
como `alunoteste`: `/tatica/revisao` escreve "Nada para revisar hoje", e o
cartão do painel escreve "11 de 120 min · Tática 4 min · Finais 7 min".

---

## O que foi feito (a lista inteira)

### 1 a 5 — meio-jogo, telas, `/trilha`, documentos e `/professor/[aluno]`

- **`content/meio-jogo.json`**: 30 dicas com quiz, ids `m1`–`m30`, e — desde
  esta sessão — **os 30 links de vídeo** (ver "os vídeos", abaixo).
- **`lib/meiojogo/afirmacoes.ts`**: 26 afirmações conferíveis por chess.js. O
  gate cobra `FEN_ILEGAL`, `AFIRMACAO_FALSA`, `OBRA_NAO_REGISTRADA` e o teto de
  2 posições por obra protegida. Provado que morde, sabotando três dicas.
- **`app/meio-jogo/`**: lista, dica, quiz e a caixa "li". `Diagrama.tsx` monta o
  SVG no servidor, **zero JavaScript no cliente**.
- **`app/trilha/page.tsx`** + `lib/curso/mapa.ts`: o mapa do curso por degrau.
- **Bloco A**: `docs/00-PLANO-MESTRE.md`, `docs/CRONOGRAMA.md`,
  `content/tarefas.json` (27 tarefas, tipo novo `meiojogo`) e
  `apostila/caderno-1.md`.
- **Bloco F**: `app/professor/[aluno]/page.tsx`, com `serieDeDias()`.

### a) Os oito defeitos visuais — todos corrigidos e reconferidos na tela

Um subagente leu as capturas do build de **produção** (`next build && next
start`, nunca `next dev` — o indicador circular do Next cobre palavra) e mediu
cada correção. O que mudou:

1. **Transbordo das pastilhas na `/trilha`.** A causa era `min-width: auto` em
   item de grade e de flex: o cartão crescia além da coluna e o `truncate` da
   pastilha nunca cortava, porque `max-w-full` resolvia contra a largura do
   próprio conteúdo. `min-w-0` no cartão e no `<li>`. Medido depois: folga de
   16 a 23 px CSS entre a pastilha mais à direita e a borda do cartão, em 768 e
   em 1200 px; zero pixel de pastilha nas calhas entre colunas.
2. **Negrito de markdown cru.** `lib/texto/negrito.ts` (função pura, 9 testes) e
   `components/texto/Negrito.tsx`. Sem biblioteca de markdown e sem
   `dangerouslySetInnerHTML`: uma regra só, `**assim**`, e o que ela não
   reconhece passa como texto literal. Zero `**` nas capturas.
3. **Contraste.** `tinta-muda` é a única tinta isenta do piso de 4,5:1, e a
   isenção existe porque ela **não carrega informação**. A revisão pegou dois
   sítios que carregavam; a varredura que se seguiu achou mais 22 — "abre no
   Sábado 3", "Não começou", "(meta 70%)", o número do bloco, a contagem do
   professor. **24 linhas subiram para `tinta-fraca`.** O que sobra em
   `tinta-muda` é o que a isenção sempre disse que era: `placeholder` e
   travessão `aria-hidden`. Menor tinta de texto em qualquer captura agora:
   `#535a56`, 6,14:1.
4. **O tracejado dizendo duas coisas.** `ItemDoNivel.aberto: boolean` virou
   `situacao: "aberto" | "por-abrir" | "em-escrita"` mais `sabado`, com a regra
   ordenada (a data primeiro) em `lib/curso/trilha.ts`. A pastilha fechada traz
   um sufixo irredutível (`· Sáb 3`, `· em escrita`) e é o **nome** que encolhe.
   A legenda no topo só nomeia os estados que a página está usando — hoje são
   dois, porque nenhuma pastilha está "em escrita".
5. **Buracos brancos.** `items-start` na grade, e **três colunas em todo
   degrau**: onde um módulo não tem item, entra um cartão tracejado que diz por
   quê (`MODULO[…].vazio`). Os 8 blocos de tática caem todos no degrau 1 porque
   `nivelDoBloco` usa o **piso** da faixa, e todos começam abaixo de 1000 de
   rápidas — não é defeito da conta, é o desenho do curso, e agora está escrito
   na tela.
6. **Anterior/Próxima cortando no meio da palavra.** `line-clamp-2` e `min-w-0`
   no lugar de `truncate`.
7. **Casas do tabuleiro pálidas — corrigido pela metade, e a metade que falta
   tem preço conhecido.** Ver "dívidas declaradas".
8. **O quiz trocava a letra pelo ✓.** A letra a/b/c fica **sempre**; o ✓ (na
   certa) e o ✗ (na escolhida errada) entram à direita do texto. E o estado de
   erro foi fotografado pela primeira vez (`.scratch/fotos/15-quiz-erro.png`) —
   ele existia no código e ninguém o tinha visto renderizado.

### b) Os três scripts contra o banco

- **`verificar-rls.ts`** ganhou os itens **8** (`partida_do_dia` e `dica_lida`
  pelo molde de `aula_lida`: o aluno grava a dele e não a do outro) e **9** (a
  view `minutos_por_dia`). O item 9 é o que faltava na régua inteira: **uma view
  não tem RLS própria** — a `minutos_por_dia` só não vaza o dia do vizinho
  porque foi criada com `security_invoker = on`. O número que prova: o admin vê
  as 2 linhas semeadas, a aluna vê 1.
- **`verificar-tatica.ts`** ganhou os itens **7 a 10**: `origem` em toda linha
  nova; a fila vazia hoje, com os errados em `hoje+2` e **nada** em `hoje+1`; a
  prova servindo os errados de volta; o modo `revisao` gravando; e o acerto
  adiantado **não** subindo o puzzle de nível. O item 10 cruza o fuso do SQL
  (`at time zone 'America/Sao_Paulo'`) com o do TypeScript (`hojeNoBrasil`) — os
  dois estão escritos à mão em linguagens diferentes e discordariam em silêncio
  entre 21h e a meia-noite, que é justamente quando a criança treina.
- **`verificar-finais.ts`** ganhou os itens **8 a 10**: a revisão numa posição de
  revisão vira linha **com** a posição gravada; a posição da **prática** é
  recusada (a conferência é contra `reviewPositionIds`, não contra a existência
  no pacote); sem posição é recusada; posição inventada é recusada; e
  `agendaDeRevisao` devolve `hoje+3` na primeira rodada.

As contagens fixas foram ajustadas: `linhasDaAna` vai a `QUANTOS + 2` depois da
revisão em tática, e a de finais vai de 4 para 5. As chamadas recusadas **não**
viram linha — é o que separa "recusado" de "gravado como fracasso", e as duas
contagens provam isso.

### c) Os 30 links de vídeo — **preenchidos e conferidos**

A decisão anterior ("não dá para conferir daqui que um vídeo existe") **caiu**:
esta sessão tem o MCP do Playwright, e o YouTube abre. O que foi feito:

1. busca no YouTube para cada uma das 30 dicas, pela sugestão em português;
2. escolha por título, canal e duração (3 a 25 min), com preferência forte por
   português do Brasil;
3. **conferência um a um pelo oEmbed do YouTube**, que devolve 200 só para vídeo
   existente, público e embutível — e traz o **título canônico**.

O passo 3 pegou um erro que teria entrado calado: a **página de busca traduz o
título** de vídeo em inglês para o idioma de quem procura, e dois vídeos em
inglês foram escolhidos como se fossem em português. O oEmbed mostrou o título
real; um deles (`m16`) foi trocado por um equivalente brasileiro, e o outro
(`m9`) ficou, marcado `(em inglês)` no próprio título.

- **29 em português, 1 em inglês** (`m9`, "melhore a sua pior peça" — não há
  vídeo brasileiro dedicado ao tema).
- O esquema de `lib/meiojogo/dicas.ts` passou a **recusar** url que não seja
  `https://www.youtube.com/watch?v=` mais os 11 caracteres do id.
- Dois testes novos em `dicas.test.ts`: toda dica tem link, nenhum link se
  repete, e o título é o do YouTube (e não a antiga sugestão "Buscar: …").
  Provado que mordem: sabotando link encurtado, link nulo e título de sugestão,
  os três foram recusados.
- Para reconferir depois: `node .scratch/conferir-videos.mjs` (lê o
  `content/meio-jogo.json` e bate contra o YouTube). Última rodada: **30
  conferidos, 0 com problema.**

**O limite, dito onde aparece:** o link foi aberto e o vídeo existe, é público e
tem aquele título e aquele canal. **Ninguém assistiu aos 30.** A tela escreve
isso embaixo do link — "Link conferido: o vídeo existe e é gratuito. Quem
escolhe o que entra na aula é o professor" —, pela mesma disciplina do quiz, que
diz de quem é o julgamento em vez de vendê-lo como fato. Os dois links mais
frágeis, por não haver vídeo brasileiro dedicado ao tema, são **m15** (bloqueio
do peão passado) e **m20** (contar atacantes e defensores): o escolhido é o
vizinho mais próximo, e vale assistir antes do sábado.

---

## Dívidas declaradas (nada disto é esquecimento)

1. **As casas do tabuleiro estão a 1,81:1, e não a 2,29:1.** A revisão comparou
   com o marrom do lichess.org (`#f0d9b5`/`#b58863` = 2,29:1); o comentário do
   `globals.css` falava do marrom do **pacote** `chessground` (preto a 20% sobre
   a clara = 1,58:1). As duas coisas se chamam "marrom do Lichess" e não são a
   mesma. O que foi comprado de graça: clarear a casa **clara** (88,5% → 93% de
   claridade, croma 0,019 → 0,04) não custa nada ao orçamento das marcas, porque
   quem cobra 3:1 é sempre a casa escura — medido, a pior folga continua sendo
   os mesmos +0,11 do pincel do corte. Resultado: 1,58 → **1,81:1** (+15%).
   Chegar aos 2,29 exige escurecer a casa escura até 65%, e aí caem abaixo de
   3:1 o destino de lance legal, o realce do último lance, o pré-lance e o
   pincel da peça defendida — cujo conserto empurraria `pincel-defendida` de 44%
   para 35%, onde ele encosta em `destino` (38%) e os dois verdes do vocabulário
   pedagógico deixam de ser distinguíveis. Está escrito no `globals.css`.
2. **O vazio no degrau 1 da `/trilha` em desktop.** Com os cartões parando na
   altura do próprio conteúdo, a coluna de tática (31 temas) fica ~785 px CSS
   mais alta que as outras duas, e sobra branco à direita. É o defeito antigo
   **resolvido pela metade**: não há mais cartão vazio esticado, mas há mancha
   branca. Sair dela é distribuir a tática em subcolunas ou pôr um "ver mais" —
   nenhum dos dois é de graça, e nenhum dos dois é ilegibilidade.
3. **O `placeholder` dos campos de login mede 3,06:1.** É a isenção registrada
   em `pares.ts`, com o motivo: cada `placeholder` do site repete o que o rótulo
   acima do campo já diz por extenso, em `tinta-fraca`.
4. **Espaço duplo antes do `·` em pastilha truncada** (~4 px CSS). O espaço que
   precedia a palavra cortada sobrevive ao `text-overflow`. Cosmético.
5. **`m9` está em inglês** e **`m15`/`m20`** são o vizinho mais próximo do tema.
   Ver acima.

---

## Armadilhas que já custaram tempo

- **`npx prettier`**: o projeto **não** usa prettier. Editar à mão.
- **`outputFileTracingIncludes`**: toda rota nova que lê `content/` ou
  `public/puzzles/` por caminho entra na lista do `next.config.ts`, ou falha em
  produção com `ENOENT` — em silêncio.
- **`useSearchParams`** numa rota estática exige `<Suspense>`.
- **`server-only`**: um módulo com `import "server-only"` **estoura no
  `npm test`**. Função pura que o teste precisa não pode morar em módulo de
  servidor. Foi por isso que `PUZZLES_POR_TEMA` mudou de arquivo, e é por isso
  que `escolherPuzzles` saiu de dentro da página.
- **`lib/diagrama/extrair.ts` importa `node:fs`.** Nunca importe valor de lá num
  componente; `tabuleiro.ts` já foi desacoplado.
- **`min-width: auto`** é o padrão de item de grade e de flex, e foi a causa do
  defeito nº 1. Todo `truncate` dentro de grade ou flex precisa de `min-w-0` no
  ancestral, senão ele nunca corta.
- **A página de busca do YouTube traduz título.** Para saber o título e o idioma
  reais, use o oEmbed: `https://www.youtube.com/oembed?url=…&format=json`.
- **Contagens que passam a incluir repetidos** (a prova) e revisões
  (`progresso_aula.tentativas`): nenhuma decide domínio nem tarefa. Documentar,
  não filtrar — mas a **barra** é limitada em `montarMapa`, senão passaria de
  100%.
- **O banco é o de produção** (memória `um-banco-so`). Os scripts criam contas
  próprias e as apagam; o `db:f2` recria `alunoteste` e deixa o rastro.
- **Heredoc grande no Bash falha** neste ambiente. Para script longo, escreva o
  arquivo com a ferramenta de escrita e rode depois.
- **`.scratch/`** é gitignorado e guarda o que vale reusar: `fotos.mjs` (tira as
  capturas), `conferir-videos.mjs` (rebate os 30 links contra o YouTube),
  `pendurados.ts`, `conferir.ts`, `taticas.ts`.
