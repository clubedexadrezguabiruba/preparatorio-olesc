# Modo editor — onde paramos

> **Atualização de 10/09/2026:** o Doug aprovou o
> [`EDITOR-V2-PLANO-FINAL.md`](EDITOR-V2-PLANO-FINAL.md). Ele substitui a proposta v2 e
> passa a reger a continuação. As seções históricas abaixo continuam registrando o que
> existia antes dessa aprovação.

> **Especificação funcional de 11/09/2026:**
> [`EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md`](EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md)
> reúne todas as funções, interações e critérios de aceite do produto. Outro agente deve
> ler plano + especificação antes deste diário; este arquivo diz o estado, não redefine
> o produto.

**Data:** 2026-09-12. **Branch:** `modo-editor`, à frente do `origin` (o push é decisão
do Doug, não consequência de commitar). A menção
histórica a “Bloco 2 suspenso” nas seções antigas explica a interrupção que levou à
nova arquitetura; não rege mais o trabalho.

## Estado de hoje, em vinte linhas

Este arquivo é longo e cronológico. Se você só precisa saber onde estamos, é aqui — e
cada linha aponta a seção que conta a história inteira.

**Fechado:**

- **Bloco 0/A inteiro** — legalidade dos lances, diagnóstico localizado na tela,
  regressão de conteúdo e proveniência/certificação. Ver “o Bloco 0/A fechado”.
- **Corpus e tetos (§17)** — linha de 500 meios-lances, árvore de 1.000 nós, e seis
  tetos com o número medido atrás de cada um. Ver “Bloco B começa pelo freio”.
- **Importar PGN (§13.1)** — auditoria do que a varredura não lê, relatório de perdas
  antes de aplicar, lote transacional, recusa explícita de variante não padrão. Ver
  “o importador de PGN” e “a tela de importar”.
- **Cor do desenho** — as quatro cores do Lichess atravessam do PGN ao tabuleiro. Ver
  “a cor do desenho, como no Lichess”.
- **Navegação por teclado (§7)** — ← → ↑ ↓, Home e End andam na árvore; o foco segue a
  seta; campo de texto engole o atalho. **Falta a conferência humana da tecla real.**
  Ver “o teclado anda na árvore”.
- **Desenhar com o botão direito (§10.2)** — seta e casa acesa nascem com o mouse, nas
  quatro cores do Lichess, e cada desenho entra no Desfazer. **Falta a conferência
  humana do gesto real.** Ver “desenhar com o botão direito”.
- **Reordenar capítulos (§8.2)** — a coluna segue a ordem única do fluxo; arrastar muda
  o capítulo como um slide, o menu oferece a mesma ação pelo teclado e um Desfazer
  devolve a ordem anterior. Ver “reordenar capítulos no fluxo”.
- **Adicionar capítulo (§8.3)** — três das cinco portas: posição inicial, montador de
  peças e FEN colada. **Teste humano aprovado**, inclusive os três arrastos. Ver
  “adicionar capítulo e montar a posição”.
- **Trocar a posição inicial de um capítulo (§9)** — poda a partir do primeiro lance
  ilegal de cada ramo, irmãos legais preservados, textos afetados marcados para
  revisão, e a cascata que revalida as análises filhas e netas. Ver “trocar a posição
  inicial de um capítulo”.
- **As sete fatias de 11/9 (§8.3, §8.4, §9, §11.3, §14, §5.2, §19.2)** — renomear,
  duplicar e excluir capítulo com impacto; as três ações contextuais do lance; o menu
  do lance com as onze ações no botão direito e no `•••`; o escritor e as quatro saídas
  de PGN; “Nova aula” com id derivado e a porta da aula vazia; e a lista das revisões
  pendentes. Um calculador de impacto só (`lib/editor-v2/impacto.ts`) atende às quatro
  edições que perdem nós. Ver “sete fatias numa rodada”.

- **Paleta clicável de desenho (§10.2 e §25)** — seta, casa, cor e limpar em botões; a
  cor sem Shift/Alt, com os atalhos ainda valendo. Fecha a fatia 3 do roteiro. **Falta a
  conferência humana do clique**, e com ela a reprodução de um defeito consertado: o
  clique esquerdo apagava o desenho inteiro da posição. Ver “a paleta clicável de
  desenho”.

**Aberto, na ordem:**

1. **Prévia, reprodução e comparação** (§15) — fatia 5 do roteiro. É a que fecha o
   piloto de rei e peão que motivou o v2.
2. **Editor de treinos** (§16), **publicação v2** (§20), **repertório** (§21), **barra
   Stockfish** (§23) e **importar por URL do Lichess** (§13.2) continuam fora, sem
   redução de escopo.

**Dívida conhecida e não paga:** a lista de lances mostra ~10 lances por vez em
1366×768; se incomodar, o espaço sai do bloco de edição abaixo dela.

**Isto não declara o editor pronto.** O roteiro de §27 tem as fatias 1, 2, 3 e 4
fechadas; as fatias 5 a 10 continuam abertas.

Este arquivo existe para outro agente (ou outra conta) continuar de onde este
parou, sem ter a conversa na mão. O plano inteiro está em
[`MODO-EDITOR-PLANO.md`](MODO-EDITOR-PLANO.md), ao lado deste — ele foi copiado
para cá justamente porque morava fora do repositório e ia se perder na troca.

> **Leia o plano antes de escrever código.** Ele traz as dez decisões, a régua
> de uso ("leigo edita sem instrução"), o que fica fora e por quê, e a divisão
> em seis blocos. Este arquivo só diz o que já foi feito e o que mudou de rota.

---

## Atualização vigente — fundação e piloto do Editor v2

Entregue em 10/09/2026, após a aprovação do plano final:

- contrato Zod do documento v2, diagnóstico estrutural de IDs, raízes, ciclos,
  órfãos, dois pais, percursos e referências;
- adaptador **somente leitura** do formato atual para v2. A N1-KPK vira uma
  análise, um capítulo explícito, 13 narrações e 11 lances sem alterar o JSON v1;
- reconstrução de FEN e SAN por nó; comandos transacionais para capítulo,
  comentário, NAG, novo lance, variante principal e exclusão de ramo;
- Undo/Redo, recuperação em IndexedDB, autosave separado em `.editor/v2/`,
  escrita atômica, `baseHash`, conflito e exclusão mútua no servidor;
- rota paralela `/editor/v2/finais/[aula]` e botão **Abrir v2** na bancada. O
  editor antigo e o conteúdo publicado continuam intactos;
- piloto visual com capítulos, tabuleiro, painel, narração, comentários e os
  seis símbolos. Jogar continuação existente navega; lance divergente cria
  variante;
- após teste do Doug, o painel deixou de recuar a linha principal a cada lance:
  agora é **vertical**, numerado e no mesmo eixo. Só variantes reais recebem
  recuo curto, limitado a dois níveis visuais — uma partida de 60 lances não
  vira uma escada.

Evidência executada: 772 testes do repositório verdes; 6 testes focados v2
verdes; tipos, lint e build Next verdes após o ajuste visual;
conteúdo verde com 38 consultas de tablebase vindas do cache; repertório
`--check` verde. No navegador real foram conferidos login de professor, abertura
da N1-KPK, seleção por painel e tabuleiro, comentário, NAG, autosave, dois Undo,
Redo e restauração do estado original.

Continuação da mesma rodada: a variante real foi preservada e medida no
navegador. A linha principal inteira ficou em `x=29`; os oito lances da variante
ficaram em `x=41`, sempre no mesmo eixo — 12 px de recuo, sem escada. O
comportamento passou para função pura e teste automatizado. O validador também
passou a detectar ciclos entre posições iniciais de análises. Tipos, lint e os
8 testes focados v2 ficaram verdes.

Continuação seguinte: o conflito agora aparece como estado próprio, nunca
sobrescreve silenciosamente e oferece **Baixar minha cópia** ou **Abrir versão
do disco**. Ao abrir a versão do disco, a edição local continua preservada no
IndexedDB. Falha do IndexedDB ganhou aviso verdadeiro e exportação manual; o
autosave no disco continua sendo tentado. Tipos, lint e 8 testes v2 ficaram
verdes após essa mudança.

Ensaio seguinte concluído com a N0-LADDER: duas abas partiram do mesmo hash; A
gravou, B recebeu conflito sem sobrescrever; B abriu a versão do disco somente
depois do ACK do IndexedDB; sua cópia sobreviveu ao reload; A restaurou o arquivo
original sem apagar a recuperação de B; e “Descartar” apagou somente a cópia de
B. A chave do IndexedDB passou de `aula` para `aula + sessão da aba`. O teste
também revelou e corrigiu uma promessa prematura: a interface não diz mais que
preservou antes da confirmação do armazenamento local. A N0-LADDER terminou sem
o comentário temporário.

Continuação do contrato: `PraticaV2` agora conserva posição, lado, objetivo e
configuração do Stockfish; `TreinoV2` ganhou perfil (final certificado ou linha
autoral), propriedade e estado da fonte independentes, receita versionada,
questões por posição, respostas com feedback, erros nomeados, defesa e próxima
questão, término por ramo, dicas, obrigatoriedade e revisão da avaliação. O
adaptador v1 preserva a ordem `capítulo → treino → prática`. Na N1-KPK, os seis
nós do treino guiado viram seis questões: `c6c7` conserva `e7e6 → n2` e o fim
conserva `b7b8q → promotion`. Os três arquivos de aula atuais foram adaptados
em memória sem erro e sem alteração de bytes.

O campo `praticas` tem compatibilidade de leitura com os rascunhos v2 anteriores.
O rascunho real da N1-KPK, já com a variante criada pelo Doug, continuou válido
com 20 nós e reapareceu igual depois de duas recargas no navegador. As duas abas
temporárias da N0-LADDER usadas no ensaio de conflito foram fechadas, e o
rascunho v1 que elas recriavam — byte a byte igual ao publicado — foi removido.

Evidência desta continuação: 779 testes do repositório e 12 testes focados v2
verdes; tipos, lint, build, conteúdo (38 consultas de tablebase, todas do cache),
42/42 mutações vermelhas e repertório `--check` verdes.

Continuação final desta rodada: o download da cópia em conflito foi testado no
navegador. O JSON baixado continha exatamente a edição da aba B, validou no
schema e não sobrescreveu a versão da aba A. Os arquivos temporários da
N0-LADDER e o download de ensaio foram removidos depois da conferência.

O Bloco 0/A avançou no contrato conceitual: o documento v2 agora representa
metadados didáticos, introduções, proveniência por hash, exceções editoriais,
catálogo de erros e mensagens, e certificação separada da autoria. O diagnóstico
passou a ter código, gravidade e localização precisa. O fluxo enumera também as
introduções e recusa entidades ausentes ou repetidas. Rascunhos antigos continuam
legíveis e são enriquecidos em memória somente quando sua origem ainda possui o
hash esperado; isso preservou o rascunho local real da N1-KPK, inclusive sua
variante de 20 nós, sem regravá-lo à força no disco.

Evidência deste checkpoint: 785 testes do repositório e 18 testes focados v2
verdes; tipos, lint completo, build Next, validação de conteúdo (38 consultas de
tablebase, todas do cache) e repertório `--check` verdes. A validação de mutações
foi **interrompida de propósito a pedido do Doug**, quando 37 das 42 mutações já
tinham sido corretamente rejeitadas. Portanto, ela não falhou, mas também não
foi concluída para estas alterações.

**Primeiro ponto exato a retomar:** executar `npm run validate:mutations` até o
fim e exigir 42/42 mutações vermelhas. Depois, concluir os portões v2 ainda
abertos para legalidade/proveniência/certificação e ligar o diagnóstico
localizado à ação visual de ir ao problema. Só então avançar ao Bloco B
(importação/leitura de PGN, teclado e corpus de partidas longas). Este commit é
um checkpoint seguro; não declara o Bloco 0/A nem o plano inteiro concluídos.

## Continuação — o portão da legalidade e o diagnóstico na tela

**As mutações foram concluídas: 42 de 42 vermelhas**, duas vezes — antes e depois
das mudanças desta rodada. O número não é herdado de commit anterior.

### O portão que faltava: legalidade dos lances

O validador v2 emitia 35 códigos e **nenhum** julgava se os lances são jogáveis.
Quem conferia era o desenhador do painel, e o modo de reprovar era **estourar uma
exceção** (`arvore.ts`) — que apaga a tela inteira em vez de dizer qual lance está
errado. Pior do que o código sugeria: o `throw new Error("lance ilegal no nó …")`
daquele arquivo **nunca roda**, porque a chess.js 1.4 estoura dentro do próprio
`move()` antes dele. O professor receberia `Invalid move: {...}`, em inglês.

Agora `problemasDaAulaV2(aula, positions?)` e `validarAulaV2(valor, positions?)`
aceitam as posições e, com elas, julgam legalidade. Quatro decisões que mordem:

- **`positions` é opcional, e isso é contrato.** Quem tem o pacote (tela, gate)
  recebe o julgamento de legalidade; quem só julga a forma do documento
  (recuperação local, rascunho colado) chama sem e recebe **exatamente** o veredicto
  de antes. Há teste que fixa isso nos dois sentidos.
- **Poda por ramo, não por árvore** (plano final §5): achado o lance impossível, o
  ramo para ali e os irmãos continuam sendo julgados. Sem isso um erro viraria uma
  cascata que esconde o único que importa — há teste medindo "1 erro, e não um por
  lance restante".
- **Árvore quebrada não é percorrida com tabuleiro.** Ciclo, filho ausente, nó órfão
  ou dois pais impedem o percurso; a legalidade só roda em análise cuja forma fechou.
  Um "lance ilegal" num grafo quebrado seria consequência, não causa.
- **Um tabuleiro só, com `undo`.** O percurso é em profundidade, cada lance jogado
  uma vez. `arvore.ts` continua recalculando desde a raiz por nó — ver a dívida de
  desempenho abaixo.

Códigos novos: `LANCE_ILEGAL`, `LANCE_AUSENTE`, `POSICAO_INEXISTENTE`.

### O diagnóstico chegou à tela

`lib/editor-v2/diagnostico-visual.ts` (novo) traduz a localização estruturada no
vocabulário do professor e diz para onde a tela deve ir. `analise-n1-kpk / node-7`
vira **"o 2º lance do capítulo «Rei e peão contra rei»"**, com botão *Ir para o
problema*. Cobre lance do percurso, posição de partida, lance de variante, quadro
de introdução, pergunta e resposta de treino, prática, etapa do fluxo e a aula.

Duas regras que a implementação fixa:

- **Sem destino navegável, sem botão.** "Esta aula não declara seus metadados" é da
  aula inteira; um botão ali não levaria a lugar nenhum, e um botão que não faz nada
  ensina a desconfiar dos outros.
- **Ordinal concorda em gênero.** "o 3º lance", "a 3ª etapa", "a 2ª pergunta". A
  primeira versão escrevia "a 2º pergunta" na tela de um professor de português.

Na tela (`PainelDeProblemas.tsx`, novo): lista com os bloqueantes na frente, cada
item marcado *impede* ou *aviso*, e um resumo de uma linha — "2 problemas impedem a
publicação · 1 aviso" —, porque "3 problemas" não responde se dá para publicar.

**E o editor deixou de quebrar.** A reconstrução de posições em `EditorV2.tsx` está
sob `try`: quando um lance impossível impede montar o tabuleiro, a tela mostra a
lista de problemas e uma frase explicando por que o tabuleiro sumiu, em vez de uma
página em branco. O painel de lances cai para o UCI cru e continua clicável, então o
professor ainda alcança o lance errado. Nada é corrigido sozinho.

### Evidência desta continuação

**802 testes** do repositório verdes (eram 785), sendo **17 novos focados no v2** —
7 do portão de legalidade e 10 do tradutor. Tipos, lint, build Next, validação de
conteúdo (38 consultas de tablebase, todas do cache), repertório `--check` e
**42/42 mutações** verdes. O rascunho real `.editor/v2/N1-KPK.json` não foi tocado:
20 nós, e a impressão digital conferida antes e depois
(`92879926bfb4439b9d66ff8695566129c576424ec0ea7d14e60627cca3f7d243`).

### O que esta rodada NÃO cobre

- **A rodada de navegador não foi feita.** `/editor/v2/finais/N1-KPK` pede login de
  professor, e o agente não usa credencial do Doug. Falta conferir na tela: a aula
  real abrindo sem problema na lista; uma aula **temporária** quebrada de propósito
  mostrando a frase certa e o botão levando ao lance; e a remoção da temporária.
- **Proveniência e certificação** continuam abertos como portões: hoje o validador
  confere se o registro **existe** (`POSICAO_SEM_PROVENIENCIA`,
  `CERTIFICACAO_SEM_PROVENIENCIA`), não se ele **bate** com o conteúdo.
- **Dívida de desempenho medida por leitura, não por benchmark:**
  `sansDaAnalise` chama `quadroDoNo` para cada nó, e `quadroDoNo` rejoga a partida
  desde a raiz — custo quadrático. **Paga na continuação seguinte; ver abaixo.**

## Continuação — a partida de 60 lances, medida e acelerada

### O que foi exercitado no navegador (com o Doug logado)

`/editor/v2/finais/N1-KPK` abriu com o rascunho real: tabuleiro, 20 lances, **nenhum
problema na lista**. Numa cópia **temporária** da N0-LADDER, quebrada de propósito:
*"1 problema impede a publicação"*, a frase nomeando o lance e o capítulo, o tabuleiro
substituído pela explicação, e **"Ir para o problema" marcou o nó certo** (o 2º lance).
Com a cópia válida: comentário escrito chegou ao disco, NAG aplicado, e
**Desfazer/Refazer voltaram um gesto por vez** (comentário, depois símbolo) e
devolveram o estado original.

**Corpus de partida longa:** 60 lances completos (120 meios-lances) e 3 variantes em
profundidades 2, 30 e 80 — 124 nós. A regra visual do Doug **se manteve**: a lista
inteira tem só **duas** posições horizontais (linha principal e variante), **13 px** de
recuo, **zero rolagem horizontal**. Numeração correta até `60.Rh7+`.

### A dívida de desempenho: 758 ms → 24 ms

`mapaDaAnalise` (novo, em `arvore.ts`) percorre a análise **uma vez**, com um tabuleiro
e `undo`, e devolve posição, SAN e numeração de todos os nós. `sansDaAnalise` e
`rotulosDaAnalise` passaram a ser leituras dele; a tela faz **uma** chamada em vez de
três, e o mapa **não depende do nó selecionado** — trocar de lance na lista não
recalcula a árvore.

Medido em Node, sem navegador no meio, na árvore de 121 nós, média de 20 execuções:

| | Antes | Depois |
|---|---|---|
| Calcular a árvore inteira | **757,8 ms** | **24,1 ms** |

**32× mais rápido.** Na tela, com relógio confiável, a mediana de selecionar um lance
ficou em **72 ms** (60, 66, 67, 72), abaixo do alvo de 100 ms do plano (§17).

Teste de regressão conta as chamadas em vez de cronometrar: `jogadas === nós - 1`,
um lance por nó. Cronômetro em teste falha sozinho em máquina lenta; contagem não.

### Uma correção: as primeiras medidas de tela estavam infladas

A primeira rodada relatou "1,1 s por clique" usando `requestAnimationFrame` duplo
para esperar o render. **Neste navegador um rAF duplo VAZIO custa 392 ms**, e às vezes
trava em 1 s exato. O problema era real — 758 ms de conta de verdade —, mas o número
de tela não era o da conta. **Protocolo para as próximas rodadas:** medir com
`setTimeout(0)` (custa 1 ms aqui), nunca com `requestAnimationFrame`, e confirmar com
medida em Node quando o que se quer é o custo do algoritmo.

### Outras duas coisas que a rodada ensinou

- **O navegador embutido nunca tem foco** (`document.hasFocus() === false`), então
  `elemento.blur()` não dispara nada e campos que salvam ao sair do campo parecem
  quebrados. É preciso despachar `focusout` à mão. Isso me fez julgar um comentário
  como perdido quando ele estava correto.
- **O tabuleiro não aceita lance por evento simulado.** Quatro tentativas (ponteiro,
  mouse, na peça, clique-clique); o chessground não seleciona. É o que o plano já
  prevê (§19). **Arrastar peça continua sendo teste humano**, do Doug.

### O que a rodada NÃO cobre, e é o próximo ponto

- **A lista de lances não rola por dentro.** **Paga na continuação seguinte; ver
  abaixo.**
- **Proveniência e certificação:** **fechados na continuação seguinte; ver abaixo.**

## Continuação — a lista de lances passa a rolar por dentro

Com 60 lances, a lista tinha **4.420 px** e empurrava a página para **5.452 px**:
quem rolava era a página, e o tabuleiro saía da tela justamente enquanto o professor
procurava um lance lá embaixo.

O conserto é o mesmo que o editor v1 já tinha aprendido: **altura fechada** no `main`,
`min-h-0` na linha de baixo (sem ele um filho flex nunca encolhe abaixo do próprio
conteúdo) e rolagem própria em cada coluna.

**Duas correções que só apareceram medindo:**

1. Pôr `overflow-y-auto` também na coluna dos lances **desabou a lista para 0 px** —
   quem rola ali é a `<ol>`, e a coluna precisa apenas ceder altura. A `PainelDeLances`
   também passou a reclamar a altura que sobra (`flex-1`), senão encolhia a zero.
2. **A altura fechada vale só a partir de `lg`.** Em tela estreita as três colunas
   empilham, e altura fechada espremia a lista a zero — medido em 375 px. Abaixo de
   `lg` a página volta a rolar como antes. O plano (§16) diz que o alvo da autoria é o
   desktop; isto não promete paridade no celular, só evita quebrar o que funcionava.

Medido em **1366×768**, com a partida de 60 lances e 123 lances na lista:

| O quê | Antes | Depois |
|---|---|---|
| Lista de lances | cresce até 4.420 px | **rola por dentro**, 369 px visíveis (~10 lances) |
| Página na vertical | 5.452 px, rolando | **768 px, sem rolagem** |
| Tabuleiro ao rolar a lista | saía da tela | **fica parado e inteiro na tela** (560 px) |
| Rolagem horizontal | não | **não** |
| Recuo das variantes | 13 px, duas posições | **13 px, duas posições** |

Conferido em 375×812 que a tela estreita não regrediu: a lista não desaba e a página
rola como antes.

**Fica declarado:** 369 px mostram cerca de 10 lances por vez. É utilizável e não foi
ajustado; se incomodar, o espaço sai do bloco de edição embaixo da lista.

Evidência desta continuação: **806 testes** do repositório verdes, **39 focados no
v2**; tipos, lint, build Next, conteúdo (38 consultas de tablebase, todas do cache),
repertório `--check` e **42/42 mutações** verdes. Artefatos temporários da N0-LADDER
removidos. O rascunho real `.editor/v2/N1-KPK.json` continua com 20 nós e a mesma
impressão digital (`92879926…`).

---

## Continuação — proveniência e certificação: o Bloco 0/A fechado

O validador conferia se a revisão **existe**; nunca se ela **bate**. Uma aula podia
registrar "posição aprovada, conteúdo tal" e a posição ter mudado depois: a frase
continuava no arquivo, agora descrevendo outra coisa. É o buraco que o plano final
nomeia em §12 e §9.

### As três regras, e por que as severidades são diferentes

| Código | Severidade | O que pega |
|---|---|---|
| `PROVENIENCIA_CADUCA` | **aviso** | o `conteudoHash` registrado não é mais o da posição no arquivo |
| `PROVENIENCIA_DIVERGE` | **aviso** | a aula diz `approved` e o arquivo da posição diz `candidate` |
| `CERTIFICACAO_SEM_APROVACAO` | **erro** | um treino diz "conferido" sobre posição que a aula não registra como aprovada |

**Os dois primeiros são avisos de propósito.** Descrevem o mundo de fora mudando —
alguém mexeu no arquivo da posição depois de a revisão ter sido registrada. Travar o
salvamento prenderia o professor num rascunho que ele não consegue nem guardar, por um
estrago que não foi ele que fez; o plano (§7) diz que o rascunho aceita pendência
identificada e que quem exige tudo em ordem é a publicação. **Quando a publicação v2
existir, estas duas passam a impedir** — está escrito no código, junto da regra.

**O terceiro é erro** porque não descreve o mundo de fora: é o documento contradizendo
a si mesmo, e quem escreveu desfaz na hora. O adaptador nunca o produz — ele carimba
`herdada-v1` justamente para não inventar confirmação que ninguém fez, e há teste
fixando isso.

### Onde cada conferência roda, e por quê

O hash vem do `node:crypto`, que **não existe no navegador**. Então:

- `hashDoConteudo` saiu para `lib/editor-v2/hash.ts` e é **a mesma função** que o
  adaptador usa para registrar e o validador usa para conferir. Duas cópias divergiriam
  no dia em que alguém mexesse numa delas, e o sintoma seria "toda posição está caduca"
  — alarme falso que ensina a ignorar o alarme. Há teste fixando a igualdade.
- `problemasDaAulaV2(aula, positions?, hashDaPosicao?)` recebe o hash **injetado**.
  Sem ele, as conferências de conteúdo simplesmente não são afirmadas — nem viram aviso
  falso, nem silêncio enganoso.
- A página (servidor) confere a proveniência na abertura e manda o resultado pronto
  para a tela em `problemasDaOrigem`. Não é gambiarra: a proveniência responde "o
  arquivo da posição mudou", e isso não muda enquanto o professor escreve. O que muda a
  cada tecla — forma, referências, legalidade — continua sendo recalculado na tela.

### Evidência

**813 testes** do repositório verdes, **46 focados no v2** (7 novos nesta rodada);
tipos, lint, build Next, conteúdo (38 consultas de tablebase, todas do cache),
repertório `--check` e **42/42 mutações** verdes. As 3 aulas reais passam no portão
novo sem acusar nada. Na tela, a N1-KPK real abriu com tabuleiro, 19 lances e
**nenhum problema** — o portão não produz alarme falso no conteúdo que existe.

### O Bloco 0/A está fechado

Os quatro portões que faltavam foram fechados nesta sequência: **legalidade dos
lances**, **diagnóstico localizado na interface**, **regressão de conteúdo** (as aulas
v1 continuam íntegras e jogáveis) e **proveniência/certificação**. A diferença entre
aviso e erro bloqueante passou a ser decidida por regra escrita, não por acidente.

**Isto não declara o editor pronto.** O Bloco B inteiro continua aberto.

### O próximo ponto exato: Bloco B

1. **Importação e leitura de PGN** (plano §11): reaproveitar `lib/repertorio/pgn.ts`,
   auditar tokens não reconhecidos, relatório de perdas antes de aplicar, lote
   transacional. O writer não é pré-requisito do importador.
2. **Navegação por teclado** (§16): setas para andar na árvore, atalhos só fora de
   campo de texto, foco visível. **Não pode ser verificada pelo agente** — a tecla não
   chega à página do navegador embutido; é teste humano do Doug.
3. **Corpus e limites** (§17): a partida de 60 lances já é fixture e está medida; falta
   a linha de 500 meios-lances e a árvore de 1.000 nós, com os limites de bytes, nós e
   profundidade declarados antes de liberar a importação.

**Dívida conhecida, medida e não paga:** a lista de lances mostra ~10 lances por vez em
1366×768; se incomodar, o espaço sai do bloco de edição abaixo dela.

---

## Continuação — Bloco B começa pelo freio: o corpus grande e os tetos

**Por que o corpus veio antes do importador.** O plano final (§17) manda declarar os
limites de bytes, nós e profundidade **antes** de liberar a importação. Na ordem
contrária o importador nasceria sem teto: um PGN de torneio inteiro entraria, a tela
tentaria montar a árvore e o professor receberia uma página branca — sem aviso e sem
nada para consertar. Então o Bloco B começa pelo freio de mão.

### As duas fixtures que faltavam, e por que elas são geradas

`lib/editor-v2/corpus.ts` (novo) constrói a linha de **500 meios-lances** e a árvore de
**1.000 nós** com comentários e variantes. Elas são **reconstruídas** a cada execução, a
partir de uma semente fixa, em vez de guardadas em JSON: 500 lances gravados seriam
dezenas de milhares de bytes de conteúdo que ninguém consegue revisar num diff, e que
viram lixo silencioso no dia em que o esquema mudar. Semente fixa, e não `Math.random`:
teste que falha só às terças é pior que teste nenhum.

Duas regras fazem a linha chegar aos 500 sem virar absurdo: captura é desempatada por
último (senão o sorteio come as peças e a partida morre afogada por volta do lance 40),
e lance que dá mate ou afogamento é recusado, porque são os únicos que zeram os lances
legais. Repetição e regra dos 50 **não** são recusadas — o plano diz que a linha longa é
fixture de navegação, "não necessariamente partida competitiva concluída pelas regras de
empate".

### Os tetos, e o número medido atrás de cada um

`lib/editor-v2/limites.ts` (novo). Medido em 11/09/2026, Node 24 no Windows, **mediana de
20 execuções em processo limpo**:

| O quê | Lances | Prof. | Bytes | Percorrer a árvore | Validar |
|---|---|---|---|---|---|
| N1-KPK (real) | 11 | 11 | 13 KB | 1 ms | 1 ms |
| linha de 500 | 500 | 500 | 33 KB | 69 ms | 180 ms |
| árvore de 1.000 | 1.000 | 317 | 94 KB | 289 ms | 278 ms |
| linha **no teto** | 1.000 | 1.000 | 66 KB | 328 ms | 335 ms |
| árvore **no teto** | 2.000 | 625 | 191 KB | 611 ms | 571 ms |

Daí saem os tetos: **2.000 lances por análise** (no teto, abrir custa ~1,2 s, ainda
abaixo do alvo de 2 s do plano e já sem folga para dobrar de novo), **4.000 por aula**,
**1.000 meios-lances de profundidade** (o dobro da partida mais longa já jogada em
torneio; medida, a recursão não chega perto de estourar a pilha), **2 MB** por arquivo,
**4.000 comentários** e **4.000 desenhos**.

Acima do teto o professor lê os **dois** números, nunca "aula grande demais":
*"esta análise tem 2.100 lances e o limite é 2.000"*. Saber que precisa cortar cem, e não
dois, é a diferença entre consertar e desistir.

### Três decisões que mordem

- **Teto é erro, e erro não tranca o salvamento.** No v2 `severidade: "erro"` significa
  *impede a publicação* — o painel escreve "impede" e o rascunho continua gravando. É o
  que o plano (§7) manda: o rascunho aceita pendência identificada. Um teto que travasse
  o salvamento prenderia o professor dentro de um arquivo grande demais para ele
  conseguir encolher.
- **Os tetos rodam sem o pacote de posições.** Legalidade e proveniência precisam das
  posições; tamanho, não. Quem recupera um rascunho local, sem pacote nenhum, ainda
  precisa saber que o arquivo não cabe — e há teste fixando isso.
- **A medida da profundidade não é recursiva.** O que ela mede é justamente árvore funda;
  medi-la com recursão seria o medidor estourando antes do medido.

### A primeira medição estava errada, e o erro é do método

A primeira rodada relatou **176 ms** para a árvore de 1.000 nós. A execução seguinte, com
mais fixtures vivas na memória do mesmo processo, relatou **468 ms** para exatamente a
mesma conta. A diferença era pressão de memória do próprio medidor.

`scripts/medir-corpus-v2.ts` (novo) passou a rodar **um processo por caso**, com cinco
execuções de aquecimento descartadas, e a relatar **mediana e p95** em vez de média. Os
números repetem: duas execuções seguidas da árvore de 2.000 deram 613 e 612 ms. É o
mesmo tipo de armadilha do `requestAnimationFrame` de 10/09 — o cronômetro medindo o
cronômetro.

### Evidência desta continuação

**822 testes** do repositório verdes (eram 813), sendo **9 novos** em
`lib/editor-v2/limites.test.ts`; tipos, lint, build Next, conteúdo (38 consultas de
tablebase, todas do cache), repertório `--check` e **42/42 mutações** verdes, rodados
depois desta mudança e não herdados. O rascunho real `.editor/v2/N1-KPK.json` continua
intocado, com a mesma impressão digital (`92879926…`). Nenhum arquivo temporário ficou.

**Não houve rodada de navegador, e não devia haver:** esta mudança é de biblioteca e de
script; nada na tela muda enquanto nenhuma aula encostar num teto, e nenhuma encosta.

### O que esta rodada NÃO cobre

- **Orçamento de expansão de treino** (§17) continua aberto: ele é teto do derivador, e
  o derivador ainda não existe. Está escrito no código, junto dos outros tetos.
- **O aviso de aproximação** — "você está em 1.900 dos 2.000" — não existe. A decisão foi
  não inventar barulho de interface antes de o importador ter onde mostrá-lo: quem vai
  dizer isso é o relatório de perdas da importação, com o número na mão antes de aplicar.

### O próximo ponto exato

**Importação e leitura de PGN** (plano §11), agora com o freio pronto:
`medidasDaAulaV2` já devolve os seis números que o relatório de perdas precisa mostrar
antes de aplicar. O buraco medido no leitor atual (`lib/repertorio/pgn.ts`) é a auditoria
que o plano exige: a varredura **descarta em silêncio** tudo que a expressão regular não
reconhece — não há token de "não entendi isto", e portanto não há como listar as perdas.
É por aí que o importador começa.

Depois dele, **navegação por teclado** (§16), que é teste humano do Doug — a tecla não
chega à página do navegador embutido.

---

## Continuação — o importador de PGN, medido no estudo real do Doug

### Primeiro o buraco que o plano manda tapar: a varredura descartava em silêncio

`lib/repertorio/pgn.ts` lia o PGN com uma expressão regular de alternativas. O que ela
não casava **sumia**: nenhum token, nenhum aviso, nenhum jeito de saber que sumiu. O
plano (§11) proíbe exatamente isso — "auditar tokens não reconhecidos… não descartar
tokens silenciosamente" —, porque o importador precisa mostrar as perdas antes de aplicar.

A correção não é uma alternativa nova na expressão regular. Uma alternativa "qualquer
coisa" competiria com as outras e roubaria o que elas deviam pegar. O não reconhecido é o
**buraco entre um casamento e o seguinte**, mais o rabo depois do último. Cada jogo passou
a carregar seu `naoReconhecidos`.

Medido nos 15 arquivos PGN que existem entre o repertório do projeto e a pasta de
downloads do Doug — 56 jogos: **zero achados**. A auditoria não é barulhenta. E num PGN
quebrado de propósito ela acha: `1. e4 ¿¿ e5` devolve `¿¿`, e `1. e4 {sem fechar` devolve
o `{s` órfão — junto com a prosa virando SAN de mentira, que é o outro sintoma da mesma
chave aberta.

### O importador: ler nunca aplica

`lib/editor-v2/importar-pgn.ts` (novo) tem duas metades, e a separação é o ponto:

- `lerImportacaoPgn` **não toca em aula nenhuma**. Lê o arquivo, monta o que entraria e
  devolve, jogo por jogo, o título, os lances, as variantes, os comentários, o que é
  recusado e o que se perde.
- `aplicarImportacaoPgn` é a única que muda o documento, e só com a lista escolhida.

**O lote é transação de verdade:** a aula nova é montada inteira numa cópia, conferida na
cópia, e só então devolvida. Se qualquer jogo escolhido for recusado, ou se o conjunto
estourar os tetos de §17, **nada** entra e o motivo volta nomeado, com "Nada foi
aplicado" escrito na frase. Meia importação deixa a aula num estado que o professor não
pediu e não sabe descrever.

**Recusa é na porta** (variante que não é xadrez padrão, jogo sem lance, FEN inicial
impossível). **Perda não recusa**: lance impossível, token não reconhecido, cor de seta.
Jogar fora vinte variantes certas por causa de uma torta seria o oposto do que se quer.

### Duas mudanças de contrato que a importação exigiu

1. **Uma análise pode começar numa FEN crua** (`inicio: { tipo: "fen" }`). Era isso ou
   fabricar um arquivo de posição na importação — e §12 é categórico: "FEN importada não é
   posição automaticamente aprovada". Fabricar daria ao material de fora a mesma aparência
   do material revisado, e o professor perderia o único sinal que separa os dois. Agora a
   diferença é estrutural, e o validador diz `FEN_IMPORTADA_SEM_REVISAO` (aviso; vira
   impeditivo quando a publicação v2 existir).

   **Com uma exceção:** partida que começa do começo não gera aviso. A posição inicial do
   xadrez não é material de ninguém e não tem o que revisar; vinte avisos que não pedem
   trabalho ensinariam a ignorar os que pedem.

2. **O nó guarda as diretivas cruas** (`diretivas`). `desenhos` guarda o que a tela sabe
   desenhar, e a tela deste projeto desenha **numa cor só** — o `G` de verde e o `R` de
   vermelho do Lichess não têm onde morar ali. Então a seta aparece na tela, a cor é
   **anunciada como perda**, e o texto original (`[%cal Ge2e4]`) fica guardado inteiro e
   opaco, de onde a cor volta num round-trip futuro. Nada ali é interpretado.

   O cabeçalho do PGN também ficou: `origemPgn` guarda tags, resultado e o que não foi
   reconhecido. Sem ele o professor não teria como voltar à origem do que edita.

### O teste com o arquivo de verdade, e os dois defeitos que ele achou

Rodado nos quatro PGNs da pasta de downloads — **42 jogos, 1.524 lances**:

| Arquivo | Jogos | Lances | Comentários | Perdas |
|---|---|---|---|---|
| Estudo P1 do Lichess (12 capítulos) | 12 | 170 | 88 | 0 |
| P1.07 sozinho | 1 | 6 | 6 | 0 |
| Caro-Kann comentado | 9 | 259 | 259 | 0 |
| 20 partidas canônicas | 20 | 1.089 | 0 | 0 |

Todos validam no esquema, todas as árvores são percorridas com tabuleiro sem erro, e a
única queixa do validador é a que o plano manda existir.

Conferência independente, contada no texto do arquivo e não perguntada ao código: o
capítulo P1.07 tem linha principal de 2 lances, três variantes (`1.Kg1`, `1.Kh3`,
`1...Kg4 2.Kg2`) e 6 comentários. O importador devolveu **6 lances, 3 variantes, 6
comentários**. Bate.

**Os dois defeitos que só o arquivo real (e o teste) mostraram:**

1. **153 identificadores repetidos.** Os ids de nó são únicos na **aula inteira**, não
   dentro da análise — e 12 capítulos numerados `no-1`, `no-2`… colidiram todos. Lendo o
   código de um capítulo só, isso é invisível. Agora o id do lance carrega o apelido do
   capítulo.
2. **Um lance impossível matava as variantes que eram alternativas a ele.** O `( … )` do
   PGN quer dizer "em vez deste lance": as variantes saem da **mesma** posição que ele.
   Podar o ramo é cortar o que vem *depois* do lance impossível, não o que estava *ao
   lado*. Um teste escrito para essa regra ficou vermelho e apontou o lugar.

### Evidência desta continuação

**841 testes** do repositório verdes (eram 822), sendo **19 novos** — 4 da auditoria do
leitor de PGN e 15 do importador; tipos, lint, build Next, conteúdo (38 consultas de
tablebase, todas do cache), repertório `--check` e **42/42 mutações** verdes, rodados
depois desta mudança. O rascunho real `.editor/v2/N1-KPK.json` continua com a mesma
impressão digital (`92879926…`). Nenhum arquivo temporário ficou.

### O que esta rodada NÃO cobre

- **Não há tela.** O importador é biblioteca: o professor ainda não tem onde soltar um
  arquivo, ver o relatório, escolher os capítulos e clicar em aplicar. **É o próximo
  passo exato.**
- **Importação por URL do Lichess** (§11) não entra ainda — arquivo exportado primeiro.
- **Exportar** continua fora: o plano diz que o escritor não é pré-requisito do
  importador, e o round-trip só é prometido quando houver escritor para provar.
- **A cor do desenho não chega à tela.** Está preservada no arquivo e anunciada como
  perda; fazer a tela desenhar em cores é decisão de interface, não de importação.

---

## Continuação — a cor do desenho, como no Lichess

A rodada anterior guardava a seta e **jogava a cor fora**, anunciando-a como perda. O
Doug recusou, e com razão: anotar em verde, vermelho e amarelo é metade do que uma seta
diz. Agora a cor atravessa inteira — do PGN ao arquivo, e do arquivo ao tabuleiro.

### O documento

`corDesenhoV2Schema` tem as quatro cores do Lichess pelo nome: **verde, vermelho,
amarelo, azul**. `[%cal Ge2e4]` vira `{ de: "e2", para: "e4", cor: "verde" }`. Guardar o
nome, e não a letra do exportador, é o que deixa o arquivo legível num diff e
independente de quem exportou.

**Cada entrada aceita duas formas, e isso é a promessa que protege o que já existe.** A
forma curta (`["e2","e4"]`) é a das três aulas v1, e sem cor declarada a tela desenha com
os pincéis de sempre — ligar a cor **não repinta sozinho** o conteúdo publicado. Há teste
fixando que as duas formas dão exatamente o mesmo resultado que davam antes.

Não há `transform` no schema: o que entra é o que sai. Um schema que normalizasse faria o
editor gravar de volta um arquivo reescrito que o professor não pediu.

### O azul é o caso difícil, e a decisão está declarada

**Este projeto não tem azul de propósito.** A seta era azul até 8/9/2026 e foi trocada
porque *o tabuleiro é azul*: a marca sumia dentro do cenário, e está medido na folha que
qualquer azul acima de 50% de claridade reprova o piso de 3:1 contra a casa clara.

Então o azul do Lichess é **desenhado** com o roxo do plano. **No arquivo ele continua
sendo `"azul"`** — a escolha do professor é preservada inteira, e no dia em que o
tabuleiro deixar de ser azul basta trocar uma linha. O que não se pode é gravar "roxo"
onde o professor escreveu azul.

Contraste das quatro contra as duas casas, calculado em 11/09/2026:

| Cor | Pincel | Casa clara | Casa escura |
|---|---|---|---|
| verde | `pincel-defendida` | 5,83:1 | **3,23:1** |
| vermelho | `pincel-pendurada` | 12,60:1 | 6,99:1 |
| amarelo | `pincel-alternativa` | 6,31:1 | 3,50:1 |
| azul → roxo | `pincel-plano` | 8,53:1 | 4,73:1 |

As quatro passam o piso de 3:1 nas duas casas; o verde na casa escura é o mais apertado.

**Limitação declarada, não escondida:** verde e amarelo separam-se por apenas **1,08:1**
de luminância — em escala de cinza são quase a mesma cor. Quem os separa é a matiz (152
contra 75), que é a mesma solução que a folha já usa para os três verdes do tabuleiro. O
Lichess tem exatamente o mesmo problema. Se incomodar, o conserto é afastar a claridade
de um dos dois, e isso é decisão do Doug.

### A tela passou a desenhar

O tabuleiro do editor v2 **não desenhava nada** — o canal de desenho nunca tinha sido
ligado ali. Agora as setas e casas acesas do lance selecionado aparecem, pelo canal dos
desenhos automáticos (`shapes`). O canal de quem desenha com o mouse continua desligado:
**mostrar** o desenho que veio do arquivo é esta rodada; **desenhar** com o botão direito
é gesto que entra com o painel de edição.

### A guarda contra o defeito mudo

Um nome de pincel errado não dá erro: o chessground desenha com o padrão dele, ou nada. A
seta some e parece que o professor não desenhou. `ChessBoard` passou a conferir, na
montagem, que todo pincel que a paleta do autor pede existe na tabela — e grita no
console se não existir. É a mesma regra que já valia para o token ausente.

### Evidência desta continuação

**847 testes** do repositório verdes (eram 841), sendo **6 novos** — 3 das cores no
tabuleiro e 3 do importador. Tipos, lint, build, conteúdo, repertório `--check` e
**42/42 mutações** verdes.

**No navegador**, em 1366×768, sem login (a rodada do editor v2 pede credencial do Doug):
a aula pública N0-LADDER abriu, o tabuleiro desenhou o corte e o selo como antes, e o
console ficou **sem uma única mensagem** — o que é a prova de que a guarda nova não
disparou, ou seja, os quatro pincéis existem. Medidos no navegador, os quatro tokens
resolvem para cores reais, nenhum ausente.

**O que falta ver na tela, e é teste do Doug:** uma seta verde e uma vermelha importadas
de um PGN, desenhadas no editor v2. Nenhum dos quatro PGNs da pasta de downloads traz
`[%cal]`, então esse caminho está provado por teste e por medida de cor, não por
fotografia.

---

## Continuação — a tela de importar, exercitada no navegador

O importador existia como biblioteca desde a rodada anterior; o professor não tinha onde
usá-lo. Agora há um botão **Importar PGN** no cabeçalho do editor v2 e uma janela que
segue a ordem da decisão: escolher o arquivo, **ver o que ele tem**, marcar o que entra,
e só então aplicar. O botão de aplicar não existe antes do relatório, porque antes do
relatório não há decisão — só aposta.

### Três decisões da tela

- **Recusa trava a caixa; perda não.** Um capítulo recusado aparece riscado, com o motivo
  em vermelho e a caixa desmarcada **e desabilitada**: o que não pode entrar não pode ser
  escolhido por engano. Perda aparece em âmbar, uma linha cada, e não impede nada — quem
  aplica sem ler pelo menos leu.
- **O número do rodapé responde antes.** "Com o que está marcado, a aula fica com 17 de
  4.000 lances" é a pergunta que o professor faria depois de aplicar. Passando do teto, o
  botão trava e diz por quê, em vez de deixar aplicar e devolver um erro que ele não sabe
  desfazer.
- **A leitura espera 300 ms.** Ler 20 partidas custa 145 ms, medido; sem a espera, um
  texto colado e depois ajustado à mão relê o arquivo a cada tecla e a caixa trava.

### Importar é um comando, e cabe num Desfazer

`IMPORTAR_JOGOS` entrou em `comandos.ts`. Doze capítulos de uma vez é a edição mais cara
que o editor faz, e é exatamente a que o professor mais vai querer desfazer quando vir
que escolheu o arquivo errado. A recusa do importador vira a mensagem da tela sem ser
reescrita: *"o jogo 2 não pode ser importado: … Nada foi aplicado"* diz o que fazer;
"não deu certo" não diria.

Foco (§16): ao abrir, vai para a caixa de texto; `Esc` fecha; o `Tab` não escapa da
janela; ao fechar, o foco volta para o botão que abriu.

### A rodada de navegador — e desta vez com fotografia da cor

Feita em **1366×768**, na **N0-LADDER** (cópia temporária), nunca na N1-KPK real. Num
arquivo de três jogos — um capítulo real do estudo P1 do Doug, um Chess960 e um com
defeito de propósito:

| O que a tela mostrou | Confere? |
|---|---|
| "3 jogo(s) no arquivo · **2 podem entrar**" | sim |
| P1.07 — 6 lances, 3 variantes, 6 comentários | sim, contado no PGN |
| Chess960 riscado, *"não entra — este jogo é de Chess960…"* | sim |
| duas perdas do jogo torto: o `¿¿` e o `Qh8` impossível | sim |
| "a aula fica com **17** de 4000 lances" (9 + 6 + 2) | sim |
| aplicar: dois capítulos novos, tela pulou para o primeiro | sim |
| aviso de proveniência da FEN importada, com *Ir para o problema* | sim |
| **Desfazer** devolveu a aula a um capítulo e ao estado "✓ salvo" | sim |

**A cor, medida no tabuleiro de verdade.** Selecionando o lance que trazia
`[%cal Gh2h1,Rf3f2]`, o desenho saiu com **duas linhas**, uma em
`lab(36,89% -47,5 29,2)` e outra em `lab(7,36% 61,5 18,4)` — exatamente os tokens do
verde e do vermelho. No lance com `[%csl Yh1]`, um círculo em `lab(35,89% 20,9 75,8)`, o
amarelo. É a fotografia que faltava na rodada da cor.

Console sem uma mensagem em toda a sessão. Artefatos temporários removidos
(`.editor/v2/N0-LADDER.json` e o rascunho v1 que a abertura recria). O rascunho real
`.editor/v2/N1-KPK.json` continua com a mesma impressão digital (`92879926…`).

### Evidência desta continuação

**849 testes** verdes (eram 847), sendo 2 novos do comando de importação; tipos, lint,
build, conteúdo, repertório `--check` e **42/42 mutações** verdes.

### O que esta rodada NÃO cobre

- **Importar por URL do Lichess** (§11) continua fora: arquivo exportado primeiro.
- **Desenhar com o botão direito** no editor v2 ainda não existe — a tela **mostra** o
  desenho que veio do arquivo, não deixa criar um.
- **Escolher onde o capítulo entra.** Os importados vão para o fim do fluxo, na ordem do
  arquivo. Reordenar capítulos é gesto que ainda não existe no editor v2.
- **Renomear na hora de importar.** O título vem do `ChapterName`; mudar depois, pelo
  campo "Nome do capítulo", funciona.

### O próximo ponto exato

**Navegação por teclado** (§16): setas para andar na árvore, atalhos só fora de campo de
texto, foco visível. A tecla não chega à página do navegador embutido, então a
conferência final é teste humano do Doug.

---

## Continuação — o teclado anda na árvore (11/9/2026)

### O que o professor ganha

Com o cursor fora de um campo de texto:

| Tecla | O que faz |
|---|---|
| ← | volta um lance, para o pai; na posição inicial, para |
| → | avança um lance, pelo primeiro filho — a linha principal |
| ↑ ↓ | andam **na lista desenhada**, entrada por entrada, variantes incluídas |
| Home | volta à posição inicial |
| End | desce até o fim da linha atual, seguindo o primeiro filho |

O lance selecionado pelo teclado **recebe o foco** e rola para dentro da vista
(`block: "nearest"`, o mínimo necessário — a lista não dá um pulo quando o lance já
estava à vista). A linha de ajuda fica escrita acima da lista: atalho que ninguém
descobre não existe.

### Três decisões, e o porquê de cada uma

**↑ ↓ seguem a tela, não a árvore.** Poderiam pular entre irmãos, mas aí haveria uma
ordem secreta que o olho não vê. Andando na ordem desenhada, o cursor anda como o olho
anda — e a variante aparece no caminho, em vez de precisar ser caçada.

**Qualquer modificador devolve a tecla.** Ctrl, Alt, Meta ou Shift junto com a seta faz
o atalho deixar de ser nosso. É o espaço do navegador e do Desfazer/Refazer (Ctrl+Z), e
roubá-lo quebraria os dois.

**Campo de texto engole o atalho (§16).** Escrever dentro do comentário do lance e ver o
lance mudar por baixo do texto seria perder o que se estava escrevendo sem entender por
quê. `INPUT`, `TEXTAREA`, `SELECT`, `contenteditable` e `role="textbox"` bloqueiam. A
janela de importação aberta também bloqueia: lá as setas são da janela.

Detalhe de implementação que evita um defeito silencioso: o atendedor de teclado é
registrado **uma vez**. A árvore chega por uma caixinha (`useRef`) atualizada depois de
cada desenho, e o nó atual vem da própria `setNodeId`. Reinstalar o ouvinte a cada lance
selecionado é o caminho curto para perder uma tecla no meio da troca.

### Evidência desta continuação

A conta — dado o documento, o nó e a ação, qual nó fica selecionado — mora num arquivo
puro e é provada em Node, sem tela: **8 testes novos**, incluindo o ciclo no documento
que não pode travar o End e o nó que deixou de existir. **857 testes** verdes (eram
849); tipos, lint, build, conteúdo, repertório `--check` e **42/42 mutações** verdes.

No navegador embutido, em 1366×768, com a N0-LADDER: a linha de ajuda aparece; a
sequência → → → ← ↓ End Home levou a seleção a Rg4, Kd2, R1g3, Kd2, R1g3, Rg1# e
“Posição inicial”, e o `activeElement` acompanhou a seleção em cada passo; a mesma seta
disparada de dentro do `textarea` não mexeu na seleção.

**Isto prova o manipulador, não o teclado** (§19). Evento disparado por script não é
tecla: a página do navegador embutido nunca tem foco. **A conferência da tecla real
continua sendo teste humano do Doug** — abrir o editor v2, clicar num lance e usar as
setas.

Artefatos temporários removidos. O rascunho real `.editor/v2/N1-KPK.json` continua com a
mesma impressão digital (`92879926…`).

### O que esta rodada NÃO cobre

- **A tecla real**, pelo motivo acima.
- **Atalhos de edição** (apagar lance, promover variante por tecla) continuam fora:
  §16 pede navegação, e edição por tecla sem confirmação é perda de trabalho.
- **Desenhar com o botão direito**, **reordenar capítulos**, **URL do Lichess** e
  **exportar PGN** seguem abertos, na mesma ordem.

### O próximo ponto exato

**Desenhar com o botão direito** no editor v2: hoje o canal `shapes` do tabuleiro só
mostra o desenho que veio do arquivo; criar seta e casa acesa com o mouse exige o canal
`desenhavel` e um comando novo no histórico, para caber no Desfazer.

---

## Continuação — desenhar com o botão direito (11/9/2026)

### O que o professor ganha

O tabuleiro do editor v2 deixou de ser só vitrine do desenho que veio do arquivo: agora
o desenho **nasce ali**, com o mouse, nas quatro cores do Lichess.

| Gesto | Cor |
|---|---|
| botão direito arrastando | seta verde; clicando sem arrastar, casa acesa verde |
| Shift + botão direito | vermelho |
| Alt + botão direito | azul (desenhado com o roxo do plano — ver "a cor do desenho") |
| Shift + Alt + botão direito | amarelo |

Repetir o mesmo gesto na mesma casa apaga o traço; repetir com outra cor troca a cor.
Cada mudança **entra no histórico**: um Ctrl+Z devolve o desenho anterior, inclusive
quando o gesto foi apagar. E há um botão **"Apagar desenhos desta posição"** embaixo do
tabuleiro, com a legenda das quatro cores ao lado — ferramenta de desenho descobrível
sem botão direito é exigência do §16, e atalho que ninguém descobre não existe.

O desenho pertence **à posição selecionada**, como no arquivo: trocar de lance troca o
desenho, e voltar ao lance traz o dele de volta.

### Três decisões, e o porquê de cada uma

**O comando guarda a lista inteira, não "acrescente esta seta".** É o que o tabuleiro
sabe dizer: o chessground devolve o conjunto de formas depois de cada gesto, inclusive
quando o gesto foi apagar. Um comando de acrescentar teria de adivinhar, por diferença,
o que o professor fez.

**Pincel desconhecido é descartado, não adivinhado.** Se um dia chegar uma forma com
pincel fora das quatro cores, ela não vira cor inventada no arquivo do professor.

**A cópia crua do desenho sai junto.** Um nó importado guarda `[%cal …]`/`[%csl …]` como
texto opaco, para o round-trip do PGN (§11). Isso é o mesmo desenho guardado duas vezes:
se o professor apagasse uma seta e o texto cru ficasse, a exportação ressuscitaria a
seta apagada. Ao reescrever o desenho de um nó, só essas duas diretivas saem —
`[%clk]`, `[%anno]` e o que o próximo exportador inventar continuam intactos e opacos.

Uma porta a menos no Desfazer: gesto sem efeito não vira passo. O tabuleiro avisa da
mudança mais vezes do que ela acontece — um clique com o botão esquerdo numa casa vazia
já devolve a lista —, e sem essa porta o histórico encheria de passos que não desfazem
nada.

### Evidência desta continuação

A tradução entre a forma do tabuleiro e o desenho do arquivo mora num arquivo puro e é
provada em Node, sem tela: **10 testes novos** — as quatro cores de ida e volta, o
pincel desconhecido, o desenho vazio que não vira campo no arquivo, a diretiva crua que
sai e o relógio que fica, o comando que não cria passo quando nada muda. **867 testes**
verdes (eram 857); tipos, lint, build, conteúdo, repertório `--check` e **42/42
mutações** verdes.

No navegador embutido, em 1366×768, com a N0-LADDER: quatro desenhos gravados no arquivo
(seta vermelha a1–a8, seta azul h1–h4, casa verde e5, casa amarela d4) aparecem no
tabuleiro pelo canal novo, cada um na sua cor; "Apagar desenhos desta posição" apagou os
quatro e "Desfazer" trouxe os quatro de volta. Nenhum erro no console.

**Isto prova o caminho do dado, não o gesto** (§19): o tabuleiro não aceita botão direito
por evento simulado. **A conferência do gesto real continua sendo teste humano do
Doug** — abrir o editor v2, desenhar com o botão direito nas quatro cores, trocar de
lance e voltar.

Artefatos temporários removidos. O rascunho real `.editor/v2/N1-KPK.json` continua com a
mesma impressão digital (`92879926…`).

### O que esta rodada NÃO cobre

- **O gesto real**, pelo motivo acima.
- **Paleta clicável** (escolher a cor num botão, em vez de segurar Shift/Alt): a legenda
  mostra as quatro cores, mas ainda não se desenha clicando nelas.
- A legenda e o botão ficam **abaixo do tabuleiro**, e em 1366×768 exigem uma rolagem
  curta da coluna do meio — a mesma dívida de altura já registrada para a lista de
  lances.
- **URL do Lichess** e **exportar PGN** seguem abertos.

### O próximo ponto exato

**Paleta clicável de desenho**: escolher a cor num controle visível, sem exigir que o
professor conheça Shift/Alt.

---

## Reordenar capítulos no fluxo, entregue em 11/9/2026

A coluna de capítulos agora mostra a ordem que está em `fluxo`, a única ordem
pedagógica do documento. O cadastro de capítulos não é reordenado nem ganha campo de
posição: ele continua sendo cadastro, e a etapa inteira — com o mesmo ID — é que muda
de lugar no fluxo.

Há dois caminhos para o mesmo gesto:

- arrastar o capítulo como um slide; a metade de cima ou de baixo de cada cartão é o
  alvo, e uma linha marca onde ele cairá sem fazer a coluna mudar de altura;
- abrir `•••` e escolher **Mover para cima** ou **Mover para baixo**. O menu recebe
  foco e funciona pelo teclado, como exige o §5 do plano.

Cada movimento é um comando transacional. Desfazer e Ctrl+Z devolvem a etapa ao lugar
anterior; soltar no vão que já ladeia o capítulo devolve o mesmo objeto e não polui o
histórico. A seleção acompanha a identidade do capítulo, não o número que ele passou a
ocupar. Ao reabrir a aula, o primeiro capítulo também é escolhido pela ordem do fluxo,
e não pela ordem acidental do cadastro.

Dois testes novos cobrem a etapa real se movendo sem trocar IDs nem reordenar o
cadastro, o Desfazer e o gesto sem efeito. Os sete portões passaram: tipos, lint,
**869 testes**, build, conteúdo, **42/42 mutações** e repertório `--check`.

No navegador autenticado, em 1366×768, a N0-LADDER recebeu dois capítulos temporários.
O menu abriu por teclado e moveu o último para cima; Desfazer e Refazer restauraram as
duas ordens; o arrasto real levou o capítulo selecionado ao início; o autosave gravou;
e, depois de recarregar, a lista manteve a ordem do fluxo e abriu no primeiro capítulo
dessa ordem. O console ficou sem erros. Os arquivos temporários da N0-LADDER foram
removidos no fim.

### O próximo ponto exato

**Paleta clicável de desenho**: transformar a legenda das quatro cores em escolha de
pincel que funcione sem Shift/Alt, preservando o gesto atual do Lichess.

---

## Adicionar capítulo e montar a posição, entregue em 11/9/2026

Até aqui um capítulo só nascia de importação de PGN. Agora nasce da tela: o botão
**Adicionar capítulo**, junto à coluna da esquerda, abre um diálogo com três das cinco
portas de §8.3 — **posição inicial**, **montar posição** e **colar FEN**. A quarta
(PGN) continua na janela de importar, e a janela diz isso em voz alta em vez de fingir
que tem cinco abas. A quinta (URL do Lichess) continua não existindo.

### O montador não é um segundo tabuleiro

O `ChessBoard` já sabia montar desde o B8.4 — `movable.free`, `deleteOnDropOff` e
`events.change` estão documentados na prop `montagem` dele. O que faltava era a
**paleta**, e paleta não é tabuleiro: a peça começa **fora** dele. Quem sabe fazer esse
gesto é o próprio chessground (`api.dragNewPiece`), e a prop `montagem` ganhou um
`aoLigar` que entrega esse punho ao montador — mais um `porPeca`, que é o equivalente
**sem arrasto** exigido por §25: clique na peça, clique na casa.

As peças da paleta são as **mesmas** do tabuleiro. O sprite mora no `cburnett.css` do
pacote, preso ao seletor `.cg-wrap piece.<peça>.<cor>`; por isso o contêiner da paleta
também é `.cg-wrap`, e um bloco novo em `globals.css` desfaz as três coisas que ele
herda e que ali não fazem sentido (rebordo, sombra e o posicionamento a 12,5%). Um
segundo jogo de imagens daria duas damas ligeiramente diferentes na mesma tela — e a de
arrastar não seria a que cai no tabuleiro.

### Duas regras que a chess.js não cobre, e que um montador comete o tempo todo

Medido em 11/9/2026: `validateFen("4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1")` devolve
`{ok:true}` — quatro direitos de roque sem uma torre no tabuleiro. E
`validateFen("4k3/8/8/8/8/8/8/4K3 w - e6 0 1")` também — casa de en passant sem peão
nenhum que pudesse ter passado por ela. As duas são exatamente o que sai de um montador
em que o professor não mexeu nas opções avançadas.

`problemaDosCamposDaFen` passou a cobrir as duas, e `problemaDaPosicaoMontada` soma esse
juízo ao `fenProblem` de sempre. **Fora** do `fenProblem`, de propósito: ele responde
"dá para jogar aqui?" e é o juiz do gate sobre conteúdo publicado; endurecê-lo mudaria o
veredicto sobre material já aprovado sem ninguém ter pedido. As caixinhas de roque que a
posição não permite se desmarcam sozinhas, e ficam desabilitadas com o motivo escrito.

Nada disso afirma alcançabilidade histórica (§11 do plano final). A tela diz "esta
posição não serve: o roque curto das brancas está marcado, mas não há rei em e1 e torre
em h1" — o que o projeto consegue provar, e só.

### Os ids nascem antes do comando, e é por isso que o Refazer devolve o mesmo capítulo

`prepararNovoCapitulo` confere o formulário e decide os quatro ids (`analise-…`,
`capitulo-…`, `etapa-capitulo-…`, `no-…-0`) **sem tocar na aula**. O comando
`ADICIONAR_CAPITULO` só carrega o que já foi decidido. Se o id nascesse dentro do
executor, cada Refazer fabricaria um capítulo **parecido** com outro id — e qualquer
narração, treino ou etapa que apontasse para ele ficaria apontando para um fantasma.

Um apelido só é aceito quando os **quatro** ids que ele gera estão livres: conferir só o
do capítulo deixaria passar a colisão do nó raiz, que é a que ninguém enxerga lendo a
tela. Dois capítulos chamados "Oposição" viram `capitulo-oposicao` e
`capitulo-oposicao-2`.

A etapa entra **depois** da etapa do capítulo selecionado, e o seletor "Entra…" permite
escolher outro lugar ou o fim da aula. O cadastro de capítulos continua sendo cadastro:
o novo é o último dele e o segundo do fluxo ao mesmo tempo. **Não há segunda ordem.**

A análise nasce com `inicio: { tipo: "fen" }`, como a importada, e pelo mesmo motivo de
§12: FEN que não passou por revisão de proveniência não pode ganhar a aparência de
posição aprovada. O validador emite `FEN_IMPORTADA_SEM_REVISAO` como **aviso** — o
trabalho que falta, não um defeito da criação. A posição inicial do xadrez é a exceção e
não gera aviso nenhum.

### Evidência desta continuação

**Os sete portões verdes:** tipos, lint, **890 testes** (17 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 17 testes novos cobrem: recusa de nome vazio com o campo apontado; cinco posições
impossíveis recusadas em português; `prepararNovoCapitulo` não tocando na aula; a
criação inteira com ids estáveis e documento válido; a posição inicial padrão sem aviso
de proveniência; a etapa entrando depois do capítulo atual e no fim quando não há
escolha; o cadastro não virando segunda ordem; Desfazer removendo capítulo, análise e
etapa e Refazer devolvendo **os mesmos quatro ids**; nomes repetidos; nome que não vira
id; aplicação repetida recusada; a composição da FEN com o roque em ordem canônica; e os
roques possíveis por posição.

**No navegador autenticado, com a N0-LADDER:**

- o diálogo abriu com o foco no campo do nome, `aria-modal`, e `Esc` fechou devolvendo o
  foco ao botão que o abriu;
- confirmar sem nome manteve o diálogo aberto e escreveu a recusa; confirmar com
  `8/8/8/8/8/8/4k3/4K3 w - - 0 1` respondeu "esta posição não serve: reis adjacentes
  (e1 e e2)" **sem apagar o nome nem a FEN já digitados**;
- a porta da FEN criou o capítulo, que entrou logo depois do selecionado, foi escolhido
  sozinho e abriu na sua posição inicial, com três peças no tabuleiro e o painel dizendo
  "Arraste uma peça no tabuleiro para criar o primeiro lance";
- Desfazer tirou o capítulo inteiro; Refazer devolveu `capitulo-rei-e-peao-pela-mao`,
  `analise-rei-e-peao-pela-mao`, `no-rei-e-peao-pela-mao-0` e a etapa — os mesmos ids,
  conferidos no arquivo gravado;
- o autosave gravou e, depois de recarregar, a ordem do fluxo continuou
  `introdução → capítulo → capítulo → treino → prática`;
- **o montador foi exercitado com o ponteiro real**: Limpar esvaziou o tabuleiro (e
  apagou sozinho os quatro roques), rei branco em e1, rei preto em e5 e peão branco em
  e2 foram postos pelo caminho sem arrasto, e a linha de veredicto passou de "falta o
  rei branco" a "Posição válida" com `8/8/8/4k3/8/8/4P3/4K3 w - - 0 1`;
- o capítulo montado foi criado e gravado com exatamente essa FEN;
- em **1366×768** a janela com o montador aberto mede 1.031 px e rola por dentro, mas o
  rodapé é grudado: o botão **Criar capítulo** fica visível em `top 703`, e não há
  rolagem horizontal;
- o console ficou limpo. Uma reclamação do React sobre a etiqueta `<piece>` apareceu e
  foi paga: o elemento passou a ser escrito como HTML cru, de duas listas fechadas do
  próprio arquivo.

Os arquivos temporários `content/rascunhos/lessons/N0-LADDER.json` e
`.editor/v2/N0-LADDER.json` foram removidos no fim. O SHA-256 de
`.editor/v2/N1-KPK.json` continua
`92879926bfb4439b9d66ff8695566129c576424ec0ea7d14e60627cca3f7d243`, conferido antes e
depois. Nenhuma aula publicada foi tocada.

### Uma armadilha de medição, para quem vier depois

Duas vezes o ensaio pareceu achar um defeito que não existia, e as duas causas valem
mais que o susto:

1. **O tabuleiro "parou de desenhar".** Com o painel do navegador atrás de outra janela,
   o `requestAnimationFrame` não roda, e o chessground redesenha por ele: `cg-board`
   fica sem filho nenhum enquanto a FEN no estado do React está certa. Uma fotografia
   traz a página de volta e os 32 `<piece>` reaparecem. **Leia a FEN do estado, não a
   contagem de peças no DOM**, quando o painel estiver escondido.
2. **Seis cliques no mesmo lote viraram três peões.** Clique disparado por ferramenta
   chega mais rápido que o React consegue confirmar o estado, e o `armada` que o
   tabuleiro enxerga é o anterior. Um clique por chamada, com a leitura entre eles,
   devolveu o resultado correto. Nenhum professor clica seis vezes em 16 ms.

### O que esta rodada NÃO cobre

- Os três arrastos do montador **já foram conferidos pelo Doug** (seção abaixo); o
  que continua valendo é a regra de método: gesto de arrastar não se prova por script,
  porque o chessground recusa evento não confiável
  (`if (!(s.trustAllEvents || e.isTrusted)) return`, `drag.js:6`).
- **Aula vazia.** O botão vive junto à lista de capítulos, e a tela ainda mostra "esta
  aula ainda não tem capítulo editável" quando não há nenhum. Enquanto "Nova aula"
  (§5.2) não existir, isso não acontece na prática — mas a porta precisa nascer junto
  com ela.
- **Continuam abertas, sem redução de escopo:** importação por URL do Lichess; writer e
  exportação de PGN; as ações contextuais de §8.3 (**mostrar esta variante na aula**,
  **começar desta posição**, **duplicar como independente**); **trocar a posição inicial
  de um capítulo que já existe**, com poda por ramo e marcação para revisão (§9);
  renomear/duplicar/excluir capítulo com impacto (§8.4); editor completo de treinos;
  publicação v2; repertório; e a barra Stockfish.
- A paleta clicável de **desenho** (a cor sem Shift/Alt) continua aberta — é outra
  paleta, e não foi tocada aqui.

### Teste humano do montador — 11/9/2026, aprovado

Doug exercitou os três gestos que o script não alcança, e os três passaram: **arrastar
peça da paleta para o tabuleiro**, **arrastar peça já posta para outra casa** e
**arrastar para fora para remover**. Com isso, §9 fica coberto nesta fatia pelas duas
vias — o arrasto e o equivalente por clique.

No mesmo teste ele montou, do zero, um capítulo de **dois peões contra cavalo**
(`3k4/4n3/8/8/2PP4/8/8/4K3 w - - 0 1`) e jogou nele até 30 nós. Esse trabalho está no
autosave local `.editor/v2/N1-KPK.json`, que **não** é versionado e **não** é conteúdo
publicado.

**A lição de protocolo, para a próxima rodada:** o teste foi feito na N1-KPK porque foi
para lá que o endereço do agente apontou, e a N1-KPK é justamente o rascunho protegido
do combinado. O endereço de ensaio é `/editor/v2/finais/N0-LADDER`, e só ele.

### O próximo ponto exato

**Trocar a posição inicial de um capítulo existente** (§9): o montador já existe e já
sabe compor e validar a posição; o que falta é o cálculo de impacto — quais ramos
continuam legais, poda a partir do primeiro lance ilegal de cada ramo, irmãos legais
preservados, e comentários/narrações/desenhos/treinos afetados marcados para revisão,
tudo numa transação com Desfazer.

---

## Trocar a posição inicial de um capítulo, entregue em 11/9/2026

Até aqui a posição inicial de um capítulo nascia com ele e não mudava mais. Agora o
botão **Trocar a posição inicial…**, na coluna da esquerda logo abaixo do nome do
capítulo, abre o montador **já carregado com a posição de agora**, mostra as duas FENs
lado a lado e recalcula o estrago a cada peça movida.

### A regra é uma frase, e ela decide tudo

§5 do plano final: *"podar no primeiro lance ilegal de cada ramo; não descartar os
ramos legais"*. Duas coisas saem daí, e as duas têm teste:

1. **O ramo cortado mantém o prefixo legal.** Uma linha que só fica ilegal no 8º lance
   conserva os sete primeiros — eles continuam sendo lances legais de uma partida que
   agora começa noutro lugar. Cortar o ramo inteiro jogaria fora trabalho válido.
2. **Os irmãos não se contaminam.** O percurso é uma busca em profundidade com **um**
   tabuleiro que desfaz o lance ao voltar, igual ao de `mapaDaAnalise`: cada irmão
   parte da posição do pai, então um ramo morto não mata o vizinho.

### O que a máquina sabe, e o que ela se recusa a fingir que sabe

Ela sabe dizer que um lance ficou ilegal. Ela **não** sabe dizer que um comentário
ficou mentiroso — "o rei branco já está na oposição" continua gramaticalmente perfeito
e factualmente falso. Por isso nasceu `revisaoPendenteV2Schema`: um campo `revisao`
opcional no nó (cobre comentário e desenhos), na narração e no quadro de introdução,
com `motivo` de lista fechada. Tudo o que sobrevive à troca é marcado.

A marca é **aviso, nunca erro** — o documento continua válido e o autosave continua
gravando. Ela aparece no painel de problemas como `REVISAO_PENDENTE` e, junto do
comentário e da narração, como uma tarja com o botão **Já reli**, que é um comando
desfazível como qualquer outro. Marca sem porta de saída seria armadilha.

**Um defeito de tabela que isto destapou, e foi pago junto.** `problemasDaAulaV2`
considerava "saudável" a análise que não acrescentasse **nenhum** problema no seu laço
— e o portão de legalidade só roda nas análises saudáveis. O primeiro aviso posto
naquele laço (a marca de revisão) teria calado a conferência de legalidade exatamente
na análise que acabou de mudar de chão. Agora só **erro** derruba a saúde da análise.

### Por que existem bloqueios, e não só podas

Um nó podado pode ser apontado **de fora** da análise: por um treino, por um quadro de
introdução, por outra análise que comece nele. §5 manda "cancelar, remover
explicitamente os dependentes ou materializar os dependentes como independentes" — e
nenhuma das três é escolha de máquina. Então a troca **para**, diz o nome de quem
depende, e o botão fica desabilitado. Medido na aula real: tirar o rei preto de e7 na
N1-KPK mata `1…Ke6` e os dez lances seguintes, e o treino guiado — que tem questões em
cinco deles — bloqueia a troca inteira.

Cancelar nunca custa nada, porque `calcularTrocaDePosicao` **só lê**. É o mesmo par de
`novo-capitulo.ts`: quem calcula não escreve, e o comando carrega o plano já decidido —
é isso que faz o Refazer repetir a mesma poda, e não uma terceira.

### O que a troca reabre

- **Proveniência.** Quando a análise larga uma posição revisada e **nada mais na aula a
  usa**, a revisão volta a `candidate`. Os treinos afetados não contam como "ainda
  usam": é a mesma troca que reabre a certificação deles, e um selo que acabou de voltar
  a pendente não atesta coisa nenhuma.
- **Certificação e avaliação.** Todo treino que pisa nesta análise volta a
  `revisaoAvaliacao: "pendente"`, a certificação volta a `estado: "pendente"`, e a
  `fonte` passa a `alterada` quando havia receita. A `propriedade` **não** muda — §8:
  fonte alterada e personalizado são condições distintas, e só um ajuste autoral
  personaliza.
- **Percursos.** O `caminho` do capítulo é truncado no primeiro nó podado; um
  `inicioNodeId` podado devolve o capítulo à raiz com percurso vazio.

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/trocar-posicao.ts` | **novo** — o cálculo do impacto, a poda, os bloqueios, a aplicação e o `semRevisao` |
| `lib/editor-v2/trocar-posicao.test.ts` | **novo** — 20 testes |
| `components/editor-v2/DialogoTrocarPosicao.tsx` | **novo** — a janela: duas FENs, colar FEN, o montador reusado e o impacto ao vivo |
| `lib/editor-v2/modelo.ts` | `revisaoPendenteV2Schema`, o campo `revisao` em três lugares, o aviso `REVISAO_PENDENTE` e o conserto da saúde da análise |
| `lib/editor-v2/comandos.ts` | `TROCAR_POSICAO_INICIAL` e `REVISAO_RESOLVIDA` |
| `lib/editor-v2/novo-capitulo.ts` | `camposDaFen` — o caminho de volta da FEN para os seis campos do montador |
| `components/editor-v2/Montador.tsx` | `CamposDaMontagem` passa a ser o tipo compartilhado |
| `components/editor-v2/EditorV2.tsx` | o botão, a janela e as duas tarjas de "Já reli" |

O montador **não** foi duplicado e `problemaDaPosicaoMontada` continua sendo o único
juiz de posição, como o combinado mandava. `fluxo` não foi tocado: trocar a posição de
um capítulo não mexe na ordem da aula.

### Evidência — e o buraco dela

**Os sete portões verdes:** tipos, lint, **912 testes** (22 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 20 testes novos cobrem: as recusas em português (FEN vazia, sem os seis campos,
posição impossível, e trocar uma posição por ela mesma); calcular sem tocar na aula; as
duas FENs e o nome de cada ramo cortado com a numeração do painel (`1. e4`, `2. e4`); a
poda a partir do primeiro ilegal e só dali; o irmão legal sobrevivendo, com o pai
perdendo só o filho que caiu; o documento continuando válido e a árvore inteira legal na
posição nova; comentário e desenho sobreviventes marcados e os podados sumindo com o nó;
a narração do lance podado removida e as outras marcadas; o percurso truncado e o início
reiniciado; o treino com avaliação, fonte e certificação reabertas; a proveniência
reaberta quando fica órfã e mantida quando outra parte da aula ainda a usa; o quadro de
introdução marcado; os três bloqueios (treino, introdução, análise dependente) com nome
e com a aula intacta; Desfazer devolvendo a aula inteira e Refazer devolvendo os mesmos
ids; e o "Já reli" desfazível.

**No navegador autenticado, com a N0-LADDER:**

- o botão abriu a janela com o montador **já carregado** com a posição do capítulo
  (`8/8/8/8/8/4k3/6R1/6RK w - - 0 1`), as duas FENs lado a lado, e trocar a posição por
  ela mesma foi recusado com "esta já é a posição inicial deste capítulo";
- colar `k7/8/8/8/8/8/6R1/6RK` (rei preto tirado de e7 para a8) escreveu na hora
  **`1… Kd2` deixa de ser legal — saem 8 lances, dele em diante**: o `1. Rg4` de antes
  dele sobreviveu, que é a regra da fatia inteira, medida na tela;
- no mesmo instante a tarja vermelha nomeou o **«Treino guiado»** e o botão **Trocar a
  posição** ficou desabilitado — o bloqueio de §5 acontecendo de verdade, não em teste;
- com um peão preto em a7 (que não atrapalha nenhum dos nove lances) nada foi podado, a
  troca aplicou, e o painel de problemas passou a mostrar **17 avisos**: 16 marcas de
  revisão mais o `FEN_IMPORTADA_SEM_REVISAO` que a análise ganha ao passar a começar
  numa FEN crua;
- **Desfazer** levou os avisos a 0 e devolveu a aula inteira; **Refazer** trouxe os 17
  de volta com as mesmas tarjas;
- **Já reli** tirou uma marca só (17 → 16 avisos, 2 → 1 tarja);
- o autosave gravou, e o arquivo em disco trazia `inicio` na FEN nova, 10 nós, 12 de 13
  narrações marcadas, 3 quadros marcados e o treino em `pendente / alterada / pendente`;
- **depois de recarregar a página**, os 16 avisos, os 9 lances e a tarja continuavam lá;
- em **1366×768** a janela mede 975 px e rola por dentro, com o rodapé grudado: o botão
  **Trocar a posição** fica em `top 703`, e não há rolagem horizontal;
- `Esc` fechou devolvendo o foco ao botão que abriu, e o console ficou limpo.

### O teste humano — 11/9/2026, e os dois defeitos que ele achou

Doug exercitou os três gestos que o script não alcança, e os três passaram: **arrastar
peça da paleta para o tabuleiro**, **arrastar peça já posta para outra casa** e
**arrastar para fora para remover**.

O mais convincente foi o primeiro. Ele largou uma **dama preta em d5** — e o impacto
respondeu `1. Rg4` deixa de ser legal. A torre continuava em g2: o lance não morreu por
falta de peça, morreu porque a dama nova **cravou a torre** na diagonal d5–h1, que
termina no rei branco. É regra de xadrez calculada na posição nova, e não contagem de
peças.

**Defeito 1 — o véu fechava a janela no meio do arrasto.** Soltar a peça fora do
tabuleiro termina com o ponteiro no véu escuro, e o navegador dispara o `click` no
ancestral comum entre onde o botão desceu e onde subiu: o próprio véu, que fechava a
janela. A montagem ia junto. O véu passou a exigir que o gesto tenha **começado** nele
— e a mesma correção foi para o **Adicionar capítulo**, que tinha o defeito idêntico e
escapou do teste de 11/9 por sorte de onde a peça caiu. As duas condições foram
conferidas na tela depois: arrastar para fora remove a peça e a janela fica; clicar na
área escura sem arrastar continua fechando.

**Defeito 2 — a contagem do bloqueio somava repetidos.** A tarja dizia *"«Treino
guiado» usa **12** lances que a posição nova torna ilegal"* numa árvore que só tinha 8
para perder: as três listas do treino (início, questões e receita de origem) se
sobrepõem, e eram somadas cruas. Agora conta lances distintos, e o teste que cobria o
caso foi corrigido junto. Confirmado na tela: com 9 nós podados, a tarja diz 9.

**Defeito 3 — o "Já reli" engolia a narração inteira.** O botão vivia dentro do
`<label>` do campo, então o nome acessível dele era *"Narração mostrada ao aluno
Marcada para revisão… O rei preto anda para onde quiser… Já reli"* — o parágrafo
inteiro anunciado como nome de um botão de duas palavras (§25). A tarja e o botão
saíram de dentro do rótulo; o nome acessível agora é **"Já reli"**, conferido na árvore
de acessibilidade.

O `content/rascunhos/lessons/N0-LADDER.json` que apareceu durante a rodada foi removido
no fim; `.editor/v2/N0-LADDER.json` nunca chegou a existir. O SHA-256 de
`.editor/v2/N1-KPK.json` é
`4be602ca224f065f630efe11948b696e33dbaa95a5fdfc12c03a6c912eacb822`, **igual** antes e
depois. Nenhuma aula publicada foi tocada.

### O que esta fatia NÃO cobre

- **A cascata sobre análise dependente.** Uma análise que comece num nó desta muda de
  tabuleiro junto, e a árvore dela também precisaria ser revalidada. Hoje isso
  **bloqueia** a troca, com o nome do capítulo. Nenhum conteúdo atual cai nesse caso —
  "começar desta posição" (§8.3) ainda não existe, e é ela que criaria
  `inicio: { tipo: "referencia" }`. Quando existir, esta cascata precisa nascer junto.
- **Limpar a marca de um quadro de introdução.** `semRevisao` trata nó e narração; o
  quadro é marcado e ainda não tem botão, porque o editor de introdução não tem tela.
- **Continuam abertas, sem redução de escopo:** importação por URL do Lichess; writer e
  exportação de PGN; as ações contextuais de §8.3 (**mostrar esta variante na aula**,
  **começar desta posição**, **duplicar como independente**); renomear/duplicar/excluir
  capítulo com impacto (§8.4); editor completo de treinos; publicação v2; repertório;
  e a barra Stockfish.

### Uma lição de método, para quem vier depois

**Os três defeitos desta rodada foram achados pelo gesto humano, não pelo teste.** Os
912 testes automáticos estavam verdes com o véu fechando a janela, com a contagem
somando repetidos e com o rótulo engolido — e os três são exatamente o tipo de coisa
que só aparece com um ponteiro de verdade numa tela de verdade. O corolário prático: um
diálogo com montador dentro precisa do ensaio de arrastar **antes** de ser dado por
pronto, e o arrasto que termina fora do tabuleiro é o caso que mais vale testar, porque
é o único que sai da janela.

### O próximo ponto exato

Com esta fatia fechada, o que segue em §8.4 e §8.3 é: **renomear, duplicar e excluir
capítulo com impacto transitivo** — o mesmo par calcular/aplicar desta fatia, com os
mesmos bloqueios, aplicado à exclusão; e as três ações contextuais (**mostrar esta
variante na aula**, **começar desta posição**, **duplicar como independente**). A
segunda delas é a que cria `inicio: { tipo: "referencia" }`, e é com ela que a cascata
bloqueada aqui precisa nascer.

---

## Sete fatias numa rodada, entregues em 11/9/2026

Esta foi uma rodada longa: sete fatias de uma vez, com os portões rodados ao longo do
caminho e **um** teste humano no fim. O que entrou:

| § | Fatia |
|---|---|
| 8.4 | Renomear, duplicar e excluir capítulo, com impacto |
| 8.3 | As três ações contextuais do lance |
| 9 | A cascata que antes bloqueava |
| 11.3 | O menu do lance: botão direito e `•••` com o mesmo conjunto |
| 14 | Writer e exportação de PGN |
| 5.2 | Nova aula, e a porta da aula vazia |
| 19.2 | A lista das revisões pendentes |

### A decisão que organizou a rodada: um calculador de impacto, não quatro

Quatro edições diferentes desta rodada perdem nós — trocar a posição inicial, excluir
capítulo com a análise, excluir a partir de um lance, substituir a continuação — e as
quatro fazem **a mesma pergunta**: quem aponta para o que vai sumir, e com que nome o
professor o conhece?

A primeira resposta já existia, escrita dentro de `trocar-posicao.ts`. O caminho barato
seria copiá-la três vezes; o resultado seriam quatro opiniões sobre o que é uma
dependência, divergindo no dia em que só uma fosse corrigida. Então ela saiu de lá para
`lib/editor-v2/impacto.ts`, **antes** de qualquer fatia nova ser escrita, e as quatro
passaram a usar a mesma conta. `trocar-posicao.ts` encolheu; nenhum dos 20 testes dele
mudou de veredicto por causa da mudança.

### As três saídas de §5, e a que não cabe em todo mundo

O plano final manda "cancelar, remover explicitamente os dependentes ou materializar os
dependentes como independentes". Nenhuma das três é escolha de máquina, então a tela
pergunta **item por item**, e o botão de confirmar fica desabilitado com a conta do que
falta ("Faltam decidir 2 dependentes").

A terceira não serve a todos, e dizer isso em voz alta foi parte do trabalho:

- uma **análise** que começa num nó desta materializa-se guardando a FEN daquele nó;
- um **quadro de introdução** faz o mesmo, trocando a referência pela FEN;
- um **treino** não faz. Toda questão dele nomeia um `{analiseId, nodeId}`, e o schema
  não sabe representar uma questão sem esse endereço; materializar um treino exigiria
  copiar a árvore que ele percorre, e isso é o editor de treinos (§16). A opção fica
  **desabilitada com o motivo escrito na tela**, e não só num `title` — §11.3 pede o
  motivo, e `title` só aparece para quem já parou o mouse em cima.

A FEN da materialização é resolvida **no cálculo** e viaja dentro do plano, porque
aplicá-la depois seria perguntar a posição de um nó que já não existe.

### A cascata: o bloqueio de ontem deixou de ser a resposta

A fatia anterior bloqueava a troca quando outra análise começava num nó desta, e o
diário registrou por quê: "começar desta posição" não existia, nenhum conteúdo caía
nesse caso, e revalidar uma segunda árvore era trabalho sem cliente. A fatia §8.3 desta
rodada criou exatamente o cliente.

Agora a troca **enfileira** as filhas: para cada análise que começa num nó que
**sobreviveu**, a poda calcula a FEN nova daquele nó e revalida a árvore dela com a
mesma regra — primeiro ilegal de cada ramo, irmãos preservados, sobreviventes marcados
—, na mesma transação. E atravessa as netas: uma análise que começa na filha entra na
fila atrás dela. `visitadas` existe porque o validador aceita e acusa ciclos entre
inícios de análises, e percorrer um deles aqui seria um laço infinito num documento que
o professor ainda não consertou.

**Um caso continua bloqueando, e é outro caso.** Quando o nó de origem da filha é
justamente um dos podados, ela não mudou de chão — ela ficou **sem** chão, e aí §5
manda devolver a decisão a quem é dela. A diferença entre "mudou de tabuleiro" e "ficou
sem tabuleiro" é a fatia inteira, e as duas foram medidas na tela (abaixo).

### As três ações de §8.3 são três coisas, e a tela explica qual

| Ação | O que copia | Do que continua dependendo |
|---|---|---|
| Mostrar esta variante | nada | dos próprios lances da partida |
| Começar desta posição | nada | só da posição escolhida |
| Duplicar como independente | tudo daqui para baixo | de nada |

As três dividem o mesmo formulário — nome, orientação, onde entra — e por isso moram
numa janela só; o que muda entre elas é explicação, não campo, e três janelas iguais com
um parágrafo diferente ensinariam o professor a pular o parágrafo. O parágrafo traz o
número real: "esta posição e 6 lances daqui para baixo são copiados".

Na duplicação, **o lance selecionado vira a raiz da cópia e larga o `uci`**: a posição
que ele produzia agora é o chão da análise nova. O comentário, os desenhos, os símbolos
e as diretivas opacas dele vão junto — são da posição, e a posição é a mesma.

### O escritor de PGN, e o aviso do plano que ele respeita

§6 do plano final é um aviso explícito: "a conversão atual [de `annotations.ts`] não
preserva necessariamente as cores de autoria. A exportação não pode prometer preservação
de cor usando uma conversão que a descarta".

`escrever-pgn.ts` **não passa por `annotations.ts`**. Ele lê `no.desenhos`, onde a cor
está guardada com o nome dela, e escreve a letra do Lichess direto — a mesma tabela da
importação, no sentido inverso. Medido no ciclo: `[%cal Ge2e4,Rd1h5]` entra, vira seta
verde e seta vermelha, e sai `[%cal Ge2e4,Rd1h5]`.

Sobra um caso em que a cor **não** atravessa, e ele é anunciado em vez de escondido: as
setas na forma curta do material v1 (`["e2","e4"]`) não declaram cor. Saem em verde, e
cada uma vira uma perda declarada com o nome da casa.

**Uma regra só, nos dois sentidos:** `%cal` e `%csl` são sempre reconstruídos a partir
de `desenhos`, que é o que o professor edita. As outras diretivas guardadas saem
verbatim. A exceção que fecha a regra é o `%cal` com uma letra de cor que o editor não
modela — o importador a recusou e anunciou a perda; se o escritor a descartasse também,
quem perdeu na importação perderia de novo, agora em silêncio. Ela é reemitida.

E o que **não** cabe num PGN é dito com a contagem desta aula, não num parágrafo fixo:
"13 narrações ficam de fora", "1 treino não cabe". Aviso genérico o professor aprende a
pular; um que diz *quantas* ele lê.

### Nova aula, e o beco que ela teria criado

Até aqui, uma aula sem capítulo mostrava "esta aula ainda não tem capítulo editável" e
mais nada. Enquanto "Nova aula" não existia, ninguém chegava lá. Com ela, **toda** aula
recém-criada chega — e a primeira coisa que o professor veria seria um aviso sem botão.

A porta da aula vazia nasceu junto, como o diário da fatia anterior pediu: o mesmo
título, os mesmos dois botões que criam conteúdo, e o mesmo diálogo da coluna da
esquerda.

O identificador é **derivado** do título e do nível (`N2-PEAO-DE-TORRE-NA-SETIMA`,
`EX-ENSAIO-DE-AULA-NOVA`) e mostrado desabilitado enquanto o professor digita. §5.2 diz
que o professor não digita ids internos; ele também não pode ficar sem ver o que vai
virar nome de arquivo, URL e chave do progresso do aluno.

**A aula extra ganhou um campo `nivel` nos metadados.** §22 exige nível explícito, e o
`EX-` não traz número nenhum; sem o campo, a única forma de declará-lo seria editar a
trilha à mão, que é código. As aulas do curso continuam sem ele: o `N2` do id já responde,
e duas fontes seriam duas respostas.

A tela diz, em voz alta, o que ela **não** faz: pôr a aula na trilha do curso é passo
separado, porque a trilha é uma lista em código.

### O buraco das revisões pendentes, fechado pelos dois lados

`semRevisao` tratava nó e narração. O **quadro de introdução** era marcado pela troca de
posição e não tinha como ser desmarcado, porque o editor de introdução não tem tela —
uma marca sem porta de saída é uma armadilha, e §5 manda resolvê-las antes de publicar.
Ele passou a ser um terceiro caso do mesmo comando.

E nasceu a lista de §19.2: um `<details>` fechado que diz quantas são, e que abre com o
**trecho** de cada texto marcado, o endereço em português, um botão que leva até lá e um
"Já reli". Ela é fechada por padrão porque é lista de trabalho, não alarme: dezesseis
linhas abertas no alto empurrariam o tabuleiro para fora da janela.

**"Já reli todas" fica no fim da lista, não ao lado do cabeçalho**, e pede confirmação.
Ao lado do cabeçalho ela seria o primeiro botão da tela, e apagaria dezesseis avisos com
um clique de quem só queria fechar o painel. É uma ação só no histórico: um Ctrl+Z
devolve as dezesseis.

### Um casco de diálogo, e o defeito do véu pago uma vez só

Havia duas janelas com o mesmo casco de acessibilidade escrito duas vezes, e esta rodada
acrescentaria cinco. Sete cópias de um contrato de foco são sete chances de uma
envelhecer sozinha — e a prova já estava no diário: o defeito do véu que fechava a janela
no meio do arrasto existia nas **duas**, e só uma tinha sido exercitada.

`components/editor-v2/Dialogo.tsx` guarda o contrato inteiro: `role="dialog"`,
`aria-modal`, foco ao abrir, `Tab` que não escapa, `Esc` que fecha, rodapé grudado — e a
regra do véu, que só fecha quando o gesto **começou** nele.

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/impacto.ts` | **novo** — o calculador de impacto comum, os dependentes e as três saídas de §5 |
| `lib/editor-v2/capitulo.ts` | **novo** — duplicar e excluir capítulo (§8.4) |
| `lib/editor-v2/acoes-do-lance.ts` | **novo** — as três ações de §8.3, o corte de §11.3 e a lista do menu |
| `lib/editor-v2/escrever-pgn.ts` | **novo** — o writer de PGN (§14) |
| `lib/editor-v2/nova-aula.ts` | **novo** — o id derivado e a aula vazia válida (§5.2) |
| `lib/editor-v2/revisoes.ts` | **novo** — a lista de §19.2 |
| `lib/editor-v2/trocar-posicao.ts` | a cascata, e o impacto tirado daqui para `impacto.ts` |
| `lib/editor-v2/comandos.ts` | seis comandos novos, e `REVISOES_RESOLVIDAS` |
| `lib/editor-v2/modelo.ts` | `metadados.nivel`, para a aula extra declarar o nível |
| `lib/editor-v2/rascunhos.ts` | `idsDeDocumentosV2`, e a pasta v2 passando a aceitar `EX-` |
| `lib/editor/rascunhos.ts` | `caminhoDeAula` ganha o schema da pasta — ver o defeito abaixo |
| `components/editor-v2/Dialogo.tsx` | **novo** — o casco de todas as janelas |
| `components/editor-v2/PainelDeResolucoes.tsx` | **novo** — a escolha por dependente |
| `components/editor-v2/MenuDoLance.tsx` | **novo** — o menu do botão direito e do `•••` |
| `components/editor-v2/DialogoDoLance.tsx` | **novo** — as três ações de §8.3 numa janela |
| `components/editor-v2/DialogoDeCorte.tsx` | **novo** — excluir a partir daqui e substituir continuação |
| `components/editor-v2/DialogoExcluirCapitulo.tsx`, `DialogoDuplicarCapitulo.tsx` | **novos** — §8.4 |
| `components/editor-v2/DialogoExportar.tsx` | **novo** — as quatro saídas de §14 |
| `components/editor-v2/ListaDeRevisoes.tsx` | **novo** — §19.2 |
| `components/editor-v2/FormularioDeNovaAula.tsx` | **novo** — §5.2 |
| `app/editor/v2/nova/page.tsx` | **nova** — a porta de "Nova aula" |
| `app/editor/v2/acoes.ts` | `criarAulaV2` |
| `app/editor/page.tsx` | "+ Nova aula" e a lista dos rascunhos que só existem no v2 |
| `app/editor/v2/finais/[aula]/page.tsx` | abre também a aula que não tem v1 por trás |
| `components/editor-v2/EditorV2.tsx`, `PainelDeLances.tsx`, `ListaDeCapitulos.tsx` | a ligação de tudo, e a porta da aula vazia |

`fluxo` continua sendo a única fonte da ordem dos capítulos, e o montador continua sendo
um só, com `problemaDaPosicaoMontada` como único juiz de posição.

### Evidência

**Os sete portões verdes:** tipos, lint, **967 testes** (55 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 55 testes novos cobrem, por fatia:

- **cascata (3):** a filha revalidada com a FEN nova do nó de origem e o comentário dela
  marcado; a neta atravessada; e a filha cujo nó de origem foi podado continuando a
  bloquear;
- **§8.4 (12):** nome vazio que não apaga o anterior; a duplicação que não toca na aula e
  decide todos os ids de uma vez; a cópia com ids novos, percurso e narração remapeados,
  atribuição conservada e a prova de independência (editar o original não a alcança); a
  cópia de um capítulo que começava numa referência materializando a FEN; Desfazer e
  Refazer com os mesmos ids; excluir só o capítulo sem levar a análise, com o aviso de
  órfã; a recusa de levar a análise compartilhada, nomeando quem mais a usa; as contagens
  reais do que vai junto; a recusa sem escolha para cada dependente; remover e
  materializar na mesma transação; a análise dependente removida levando o capítulo dela;
  e a exclusão inteira voltando com um Desfazer;
- **§8.3 e §11.3 (15):** a variante mostrada sem copiar lance nenhum; a promoção posterior
  que **não** muda o percurso escolhido; começar desta posição criando `referencia` com
  continuação vazia; a duplicação materializando a FEN, largando o `uci` da raiz e
  trazendo as narrações; excluir a partir daqui contra substituir continuação; as
  contagens e o percurso cortado; a recusa de excluir a posição inicial; o bloqueio com
  nome e a materialização que o resolve; o Desfazer do corte; e as onze ações do menu,
  com as impossíveis desabilitadas e o motivo;
- **§14 (16):** sete **expectativas independentes** — o PGN da posição padrão sem
  FEN/SetUp, a variante depois do lance que ela substitui, o número forçado depois do
  comentário, os símbolos colados e o `$140`, a FEN de agora e não a do cabeçalho
  importado, a seta v1 em verde com a perda declarada, e a chave no comentário — mais
  nove de round-trip: a árvore idêntica depois do ciclo, as cores atravessando inteiras,
  o NAG sem botão e o `[%clk]` sobrevivendo, a cor desconhecida reemitida, o desenho
  apagado que **não** ressuscita, a variante com a FEN do ponto de partida, o `[Event]`
  preservado, a ordem do fluxo e as contagens do que não cabe;
- **§5.2 e §19.2 (9):** o id derivado com acentos resolvidos; a aula vazia válida e sem
  aviso nenhum; a extra declarando o nível no documento e a do curso não; as quatro
  recusas apontando o campo; os três tipos de marca com trecho e endereço; o quadro de
  introdução que agora se resolve; "Já reli todas" como uma ação só; o desenho sem
  comentário listado pelo que ele é; e a aula extra **gravada e relida em disco**.

**No navegador autenticado, com a N0-LADDER:**

- o `•••` de um lance abriu as onze ações de §11.3, com "Tornar linha principal"
  desabilitada dizendo "este lance já é a linha principal da posição anterior" e "Criar
  treino daqui" dizendo "o editor de treinos ainda não existe";
- **mostrar esta variante** criou «A escada, passo 2» e a lista de lances continuou com
  os mesmos 9 — nenhuma análise nova, nenhum lance copiado;
- **começar desta posição** a partir de `3. Rg2` criou um capítulo que abriu dizendo
  "Arraste uma peça no tabuleiro para criar o primeiro lance" — continuação vazia, como
  §4 manda;
- **a cascata, medida nos dois sentidos.** Com o rei preto no lugar e um peão a mais, a
  janela da troca escreveu *"O capítulo «Derivada do passo 3» começa nesta partida e muda
  de tabuleiro junto: a árvore dele continua inteira de pé"* e o botão **ficou
  habilitado**. Com o rei preto tirado de e3 para a8, o mesmo capítulo voltou a aparecer
  como bloqueio — *"começa num lance que a posição nova torna ilegal"* —, ao lado do
  «Treino guiado» com 8 lances;
- **excluir a partir de `3. Rg2`** mostrou 5 lances, 7 narrações pelo texto, o percurso
  cortado e o treino reaberto; os dois dependentes com escolha própria; o treino com
  "Tornar independente" apagado e o motivo escrito embaixo; e o rodapé dizendo "Faltam
  decidir 2 dependentes" enquanto o botão estava desabilitado. Com «remover o treino» e
  «tornar independente» o capítulo, a exclusão aconteceu — e o capítulo derivado passou a
  acusar `FEN_IMPORTADA_SEM_REVISAO`, que é exatamente o que materializar faz;
- **um Desfazer** devolveu os 5 lances, o treino e a referência da filha, juntos;
- **Exportar** mostrou as quatro saídas e o texto antes de copiar. O PGN do capítulo saiu
  com `[SetUp "1"]`, `[FEN "8/8/8/8/8/4k3/6R1/6RK w - - 0 1"]` e
  `1. Rg4 Kd2 2. R1g3 Kc1 3. Rg2 Kb1 4. Re2 Ka1 5. Rg1# *`. "PGN de todas as partidas"
  trouxe os dois jogos, e o segundo com a FEN **resolvida** da referência
  (`8/8/8/8/6R1/8/6R1/2k4K b - - 5 3`). O rodapé disse "13 narrações ficam de fora" e "1
  treino não cabe";
- **a lista de revisões** apareceu com 16 textos depois da troca, e os três primeiros
  eram os **quadros da introdução** — os que antes não tinham botão. Um "Já reli" levou
  17 avisos a 16 e 16 marcas a 15; "Já reli todas", com a confirmação, levou a 1 aviso; um
  Desfazer devolveu as 15;
- **Nova aula:** o identificador `EX-ENSAIO-DE-AULA-NOVA` apareceu enquanto o título era
  digitado, a aula foi criada, o navegador foi levado a ela, e a tela mostrou a **porta da
  aula vazia** — "Esta aula ainda não tem capítulo", com "+ Adicionar capítulo" e
  "Importar PGN". O capítulo criado ali abriu no editor completo, com "✓ salvo".

Os arquivos temporários `content/rascunhos/lessons/N0-LADDER.json`,
`.editor/v2/N0-LADDER.json` e `.editor/v2/EX-ENSAIO-DE-AULA-NOVA.json` foram removidos no
fim. O SHA-256 de `.editor/v2/N1-KPK.json` continua
`4be602ca224f065f630efe11948b696e33dbaa95a5fdfc12c03a6c912eacb822`, conferido antes e
depois. Nenhuma aula publicada foi tocada.

### O defeito que 966 testes não pegaram, e o navegador pegou no primeiro clique

Criar a primeira aula extra pela tela devolveu **uma tela de erro de servidor**. A causa,
com arquivo e linha: `caminhoDeAula` (`lib/editor/rascunhos.ts:96`) conferia todo id com
`lessonIdSchema`, que é `^N[0-9]+-[A-Z0-9-]+$`. O `EX-` que `aulaIdV2Schema` aceita — e
que o próprio §22 exige — era recusado na hora de escrever o arquivo.

**Por que nenhum teste chegou perto.** Todos os testes que usam aula extra a fabricam
**em memória** (`EX-TROCA`, `EX-CAPITULO`, `EX-PGN`…), e memória não tem guardião de
caminho. Nenhum tinha escrito uma em disco.

O conserto foi dar a `caminhoDeAula` o schema da pasta: o v1 continua com o id do curso,
a pasta do v2 passa o dela. **As duas travas continuam de pé** — a expressão regular sem
barra nem ponto, e a conferência do caminho resolvido —, e o teste novo cobre as duas:
grava um `EX-…` de verdade num diretório temporário, relê, e confere que `../fora`
continua estourando.

A lição de método, para quem vier depois: **um schema que aceita uma forma nova não prova
que o caminho inteiro a aceita.** O teste que vale é o que leva a forma nova até o disco.

### O que esta rodada NÃO cobre

- **Os gestos de ponteiro.** Arrastar peça no montador, arrastar capítulo para reordenar,
  desenhar com o botão direito e abrir o menu com o botão direito do mouse continuam
  sendo teste humano: o chessground recusa evento não confiável, e um `click` disparado
  por ferramenta prova o manipulador, não o gesto.
- **"Desfazer tudo"** usa `window.confirm`, que o navegador embutido não responde; ele
  não foi exercitado nesta rodada.
- **Um ruído de console honesto:** o painel do navegador guarda as duas linhas do erro de
  servidor **anterior** ao conserto do `EX-`, e o leitor de console não as limpa na
  navegação. Depois do conserto, a página recarrega com todas as requisições em 200 e
  desenha normalmente.
- **Continuam abertas, sem redução de escopo:** importação por URL do Lichess (§13.2);
  editor completo de treinos (§16); publicação v2 (§20); repertório (§21); e a barra
  Stockfish (§23). Nenhuma saiu do escopo do projeto.
- A paleta clicável de **desenho** (a cor sem Shift/Alt) continua aberta.
- **"Criar treino daqui"** aparece no menu **desabilitada, com motivo** — ela nasce com
  §16, e aparecer apagada é melhor do que sumir sem explicação.

### O próximo ponto exato

O roteiro de §27 tem as fatias 1, 2 e 4 fechadas, e a 3 (ferramentas de desenho e edição
contextual) quase — falta a **paleta clicável de cor**, que é o que torna o desenho
descobrível sem Shift/Alt (§10.2 e §25).

Depois dela, a fatia 5 do roteiro: **reprodução, pausas, velocidades e comparação**
(§15). Ela é a que fecha o piloto que motivou o v2 — "uma posição de rei e peão: linha
correta até o empate, retorno ao ponto de escolha e linha errada até a derrota, na mesma
aula" —, e agora ela tem com que ser feita: "mostrar esta variante na aula" existe, e é
por ela que os dois capítulos de comparação nascem.

A importação por URL do Lichess (§13.2) segue deliberadamente fora: é a única que depende
de rede, e isso é outra classe de risco.

---

## A paleta clicável de desenho, entregue em 12/9/2026

Fecha a fatia 3 do roteiro de §27. Até aqui o desenho do editor só nascia do botão
direito, e a cor só se escolhia segurando Shift, Alt ou os dois. §10.2 pede o contrário
em voz alta — *"a tela também possui ferramentas clicáveis: seta, casa, cor e limpar,
**para que o recurso seja descoberto sem conhecer atalhos**"* —, e §25 repete pelo outro
lado: *"ação de botão direito tem equivalente em botão/teclado"*.

Agora desenhar é: escolher **Seta** ou **Casa**, escolher a cor, clicar nas casas.
Nenhuma tecla segurada. **Os atalhos continuam valendo**, e a legenda deles ficou dentro
da paleta, porque quem já aprendeu o Shift continua precisando dela — e porque é ela que
explica por que a mesma cor aparece de dois jeitos.

### Uma sala, duas portas, e uma regra só

O chessground, no `addShape` (`draw.js`), faz três coisas com o traço novo: se já existe
um com **as mesmas pontas** e a **mesma cor**, apaga; se existe com cor diferente, troca
a cor; se não existe, acrescenta. A paleta repete isso à risca, em
`lib/editor-v2/paleta-de-desenho.ts`. Duas portas para o mesmo desenho com duas regras
diferentes seriam duas maneiras de o professor se enganar.

A seta precisa de dois cliques, porque o tabuleiro só sabe falar de uma casa por vez.
Entre os dois, a paleta guarda a origem e a tela diz em voz alta que está esperando o
destino. **Clicar duas vezes na mesma casa desiste da seta**, e não vira casa acesa:
acender casa é a outra ferramenta, e adivinhar qual delas o professor queria seria
inventar intenção.

`Esc` sai por degraus — primeiro esquece a seta pela metade, depois devolve o tabuleiro
ao movimento de peça. Clicar na ferramenta que já está ligada também a desliga. Um modo
em que não se sabe sair é uma armadilha.

### O defeito que a paleta destapou: o clique esquerdo apagava o desenho inteiro

Para a paleta funcionar, o clique esquerdo na casa precisa chegar ao editor. Ao ligar
esse caminho, apareceu um defeito que já existia — e que apagava trabalho do professor.

**A causa, com arquivo e linha.** O `drag.start` do chessground
(`node_modules/@lichess-org/chessground/dist/drag.js:17-20`) começa assim:

```js
if (!previouslySelected && s.drawable.enabled &&
    (s.drawable.eraseOnMovablePieceClick || !piece || piece.color !== s.turnColor))
    drawClear(s);
```

e o `clear` (`draw.js:65-71`) zera as formas **e avisa o `onChange`** com a lista vazia.
Num tabuleiro do Lichess isso é o certo: a seta é rabisco de análise, e o primeiro clique
limpa a mesa. Num editor de autoria é perda de trabalho — o desenho é conteúdo do
arquivo. Um clique numa casa vazia apagava as setas da posição sem ninguém pedir.

**Por que ignorar toda lista vazia não serve.** Apagar o último traço com o botão direito
também chega ao `onChange` com a lista vazia, e é um gesto legítimo. O que separa os dois
é o `drawable.current`: o traço apagado pelo botão direito chega com o gesto **ainda de
pé** (o `end` chama `addShape` antes do `cancel`), e a limpeza do clique chega sem gesto
nenhum. O conserto é essa linha, em `components/board/ChessBoard.tsx`, e devolve ao
tabuleiro as formas que o React já tinha.

**A honestidade da evidência.** Este defeito foi **lido no código do pacote, não
reproduzido na tela**: `drag.start` sai na primeira linha quando o evento não é confiável
(`drag.js:6`), então nenhum script chega até ele. Ele entra no roteiro do teste humano
abaixo como item 6, e é o único desta rodada cuja *reprodução* ainda falta — a causa e o
conserto estão escritos.

### Três decisões de acabamento

**A cor escolhida não se anuncia só pela cor.** §25 é explícito: *"estado não depende
apenas de cor: seleção usa forma/texto/borda"*. Cada botão traz o nome da cor escrito e,
quando é o escolhido, ganha o aro e o `✓`.

**A bolinha mostra a cor com que o traço vai sair.** O azul do professor é desenhado com
o pincel `plano` deste site — a explicação inteira está em `annotations.ts`. Mostrar um
azul diferente do que aparece no tabuleiro seria mentir na etiqueta.

**Com a ferramenta na mão, ninguém move peça.** `movable.color` vira `undefined`, e com
isso `isMovable` é falso para toda casa: nenhuma peça arrasta e nenhuma fica selecionada.
`viewOnly` não serviria — ele barra o `drag.start` inteiro, e o toque na casa nunca
chegaria ao editor. O interruptor entra pelo **efeito de sincronização**, e não na
criação: `desenhavel` e `montagem` são lidas uma vez e exigiriam `key`, mas este modo
liga e desliga o tempo todo.

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/paleta-de-desenho.ts` | **novo** — a máquina de estados: ferramenta, cor, seta pela metade e a regra do segundo clique |
| `components/editor-v2/PaletaDeDesenho.tsx` | **novo** — os botões, a instrução que muda sozinha e a legenda dos atalhos |
| `components/board/ChessBoard.tsx` | a prop `desenhando` e a guarda contra o `drawClear` do clique |
| `components/editor-v2/EditorV2.tsx` | o estado da paleta, o clique na casa e o `Esc` |

O estado da paleta é **da sessão, não do documento**: qual ferramenta está na mão não é
conteúdo da aula, e por isso não entra no autosave nem no Desfazer. O que entra no
Desfazer é o traço, pelo mesmo comando `DEFINIR_DESENHOS` do botão direito.

Uma nota de React, para quem vier depois: a seta pela metade guarda **o lance em que
começou**, e a origem pendurada é *derivada* — trocar de lance a esquece sem custar um
efeito que chama `setState`. O lint do projeto recusa esse efeito, e com razão: é cascata
de render.

### Evidência

**Os sete portões verdes:** tipos, lint, **982 testes** (15 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 15 testes novos cobrem: o clique que não desenha nada enquanto nenhuma ferramenta
está na mão; a casa acesa num clique; o azul saindo no pincel `plano` e voltando "azul"
no arquivo; os dois cliques da seta e o primeiro que não desenha; o segundo clique na
mesma casa desistindo; a repetição com a mesma cor apagando e com outra cor trocando; a
seta e a casa da mesma origem convivendo; o resto do desenho intocado; o botão da
ferramenta ligada desligando; a troca de ferramenta esquecendo a origem e a troca de cor
**não** esquecendo; a instrução da tela batendo com o estado; e o caminho inteiro —
paleta → formas → arquivo —, com **apagar o último traço omitindo o campo** em vez de
gravar lista vazia, que é o que §10.2 exige.

**O que esta rodada NÃO prova, e por quê.** Nenhum clique no tabuleiro foi exercitado:
o `drag.start` do chessground sai na primeira linha quando o evento não é confiável
(`drag.js:6`), e o navegador embutido desta sessão caiu na tela de login — a porta do
editor exige professor autenticado (`lib/editor/acesso.ts`). Tudo o que depende de ver a
tela está no roteiro numerado abaixo.

### O teste humano desta fatia — o roteiro numerado

Abrir `/editor/v2/finais/N0-LADDER` (e **só** esse endereço; a N1-KPK é o rascunho
protegido), em 1366×768:

1. **A paleta aparece?** Embaixo do tabuleiro devem estar três botões — Mover peças,
   Seta, Casa —, quatro botões de cor com o nome escrito, e "Apagar desenhos desta
   posição".
2. **Casa acesa num clique.** Clicar em **Casa**, escolher **vermelho**, clicar em `d4`.
   A casa acende em vermelho. Clicar em `d4` de novo: apaga. Clicar em `d4`, trocar para
   **amarelo**, clicar em `d4`: troca a cor, sem empilhar dois traços.
3. **Seta em dois cliques.** Clicar em **Seta**, **verde**, clicar em `e2` — a frase
   embaixo deve dizer "Seta de e2: clique na casa de destino" — e clicar em `e4`. A seta
   verde nasce.
4. **Desistir.** Clicar em **Seta**, clicar em `a1`, clicar em `a1` de novo: nada é
   desenhado, e a frase volta ao início. `Esc` no meio de uma seta faz o mesmo.
5. **Nenhuma peça se mexe com a ferramenta na mão.** Com **Seta** ou **Casa** ligada,
   tentar arrastar uma torre: ela não deve sair do lugar, e nenhum lance novo pode
   aparecer na lista.
6. **O defeito consertado — este é o item importante.** Voltar a **Mover peças**,
   desenhar duas ou três setas (pela paleta ou pelo botão direito) e então **clicar com
   o botão esquerdo numa casa vazia**. Os desenhos **têm de continuar lá**. Antes deste
   conserto eles sumiam todos.
7. **O desenho é da posição.** Desenhar em um lance, andar para o seguinte (`→`), voltar
   (`←`): o desenho tem de voltar com ele.
8. **Desfazer.** `Ctrl+Z` depois de cada traço devolve o desenho anterior, inclusive
   quando o gesto foi apagar.
9. **Os gestos antigos continuam.** Botão direito arrastando (verde), com Shift
   (vermelho), com Alt (azul) e com Shift+Alt (amarelo).
10. **Apagar desenhos desta posição** apaga só a posição atual — conferir que o lance
    vizinho manteve o dele.

### O que esta fatia NÃO cobre

- **Desenhar pelo teclado.** A paleta tira o Shift/Alt do caminho, mas apontar a casa
  continua sendo gesto de ponteiro — como mover peça, que também não tem caminho de
  teclado no editor. Não é regressão; é uma porta que ainda não existe, e fica escrita
  aqui para não ser dada por fechada.
- **A espessura.** Continua 10 para todas as cores no desenho livre, como §10.2 manda; a
  paleta não oferece escolha de espessura, e não deve oferecer.
- **Alvo/dica de treino.** §10.2 separa desenho explicativo de alvo de treino em dois
  contextos. O segundo nasce com o editor de treinos (§16) e não existe ainda.

### O próximo ponto exato

A fatia 5 do roteiro de §27: **prévia, reprodução e comparação** (§15).

---

## Como ligar o editor

```bash
echo EDITOR_LOCAL=1 >> .env.local
npm run dev            # e entrar como professor (usuário `doug`)
```

`/editor` lista as aulas. O link "Editar" aparece em `/finais` e em
`/professor`. Sem a variável — ou em build de produção, ou na Vercel — a rota
responde **404**, inclusive para o professor logado.

Trocar o PIN de qualquer conta: `node scripts/trocar-pin.ts <usuario> [pin]`.

`.claude/launch.json` existe só para a ferramenta de navegador do agente subir
esse mesmo `npm run dev` sozinha, em vez de deixar um terminal solto aberto.
Ele não muda nada de quem roda o servidor à mão.

---

## O que o Bloco 1 entregou

**Todos os portões verdes** em 2026-09-10: `typecheck`, `lint`, `npm test`
(712 testes, 40 novos), `validate:content`, `validate:mutations` (39/39
vermelhas), `build`, `repertorio:compilar --check`.

### Arquivos novos

| Arquivo | O que é |
|---|---|
| `lib/editor/local.ts` | A tranca de ambiente (`editorLigado`). Três condições. |
| `lib/editor/acesso.ts` | `exigirEditor()` — `server-only`, 404 + `professorAtual()`. |
| `lib/editor/rascunhos.ts` | A camada de disco: `baseHash`, `.tmp`+`rename`, autosave. |
| `lib/editor/fila.ts` | Fila single-flight de gravação (roda no navegador). |
| `lib/editor/gate.ts` | As duas passadas (A+B), o lock, `podePublicar`, `publicar`. |
| `lib/editor/saida-do-gate.ts` | O leitor do JSONL do gate. |
| `app/editor/acoes.ts` | As Server Actions. Nenhuma `route.ts`. |
| `app/editor/page.tsx` | O índice das aulas. |
| `app/editor/finais/[aula]/page.tsx` | O palco do editor. |
| `components/editor/Editor.tsx` | A casca: status, Conferir, Publicar. |
| `components/editor/Lapis.tsx` | O lapisinho (texto inline). |
| `components/editor/ListaDeDiagramas.tsx` | A coluna de miniaturas. |
| `components/editor/Miniatura.tsx` | Tabuleiro de selo, em glifos Unicode. |
| `scripts/trocar-pin.ts` | Dá PIN novo a conta que já existe. |

### Arquivos tocados

- `scripts/validate-content.ts` — ganhou `--jsonl` (aditivo, ver abaixo).
- `lib/lesson/schema.ts` — ganhou `professor?: { adaptouEm, nota? }`.
- `lib/finais/conteudo.ts` — `pacoteDaAula(lesson)` extraída de `lerPacote`.
- `components/lesson/LessonPlayer.tsx` — `startAt.passo`, `startAt.pausado`,
  `aoAndar`, e o objeto `edicao` (render-props do lápis).
- `components/lesson/IntroStage.tsx`, `ObjectiveStage.tsx` — `passoInicial`,
  `pausadoInicial`, `edicaoDaFala`, `edicaoDaTecnica`.
- `app/finais/page.tsx`, `app/professor/page.tsx` — links "Editar".
- `.gitignore` (`.editor/`), `.env.example`, `README.md`.

### A medida do bloco, cumprida

Fala da N1-KPK trocada pelo editor → conferir (A+B) → publicar. O
`git diff content/` mostrou **1 linha de fala + as 3 linhas do carimbo**, e nada
mais nas outras 543. Passada A verde, passada B verde, 38 posições de tablebase,
**0 pela rede**. Conferência A+B em **0,6 s**; publicação em 0,3 s. (O gate
inteiro roda hoje em 0,28 s — são 3 aulas; isso cresce quando as 49 chegarem.)

Cobertos por teste: duas gravações concorrentes → a mais nova vence; JSON
alterado por fora → recusa com "mudou fora do editor"; processo morto entre o
`.tmp` e o `rename` → o arquivo anterior está inteiro.

---

## Três decisões que **não** estão no plano

Quem continuar precisa saber destas, porque contrariam o que o plano supunha.

### 1. O Zod é juiz, nunca escritor

`lessonSchema.parse()` devolve as chaves **na ordem do schema**, não na ordem do
arquivo. Se o editor salvasse o objeto que o Zod devolve, mudar uma fala
reescreveria as 547 linhas da N1-KPK e o `git diff` deixaria de dizer o que o
professor mudou — que é a medida do bloco.

Por isso a verdade na tela é `cru`: o JSON **cru**, com a ordem de chaves do
arquivo, editado por espalhamento (`{...obj, campo: novo}`, que preserva a
posição de chave existente). O Zod entra só para julgar e para montar o objeto
que o player usa. **Todo bloco seguinte tem de manter isso.**

### 2. `--jsonl` é aditivo, e tem de continuar sendo

`scripts/mutation-check.ts` (linhas 1021-1036) junta stdout e stderr do gate e
procura o formato humano de duas linhas (`✖ [CODIGO] onde` + a mensagem). Se o
`--jsonl` suprimisse a saída humana, as 39 mutações quebrariam. Então os eventos
JSON saem **junto** com o texto, e `lib/editor/saida-do-gate.ts` ignora toda
linha que não seja um objeto JSON com `tipo`.

O `fail()` do gate não tem campo `aula`: a identificação vive dentro da string
`onde`, em cinco formatos. `aulaDoOnde` e `diagramaDoOnde` extraem por padrão,
com teste — em vez de tocar em ~60 pontos de chamada dentro do gate.

### 3. `server-only` ficou fora da camada de disco

O pacote `server-only` só é vazio sob a condição `react-server`, e
`npm test` (`node --test`) roda sem ela. Pôr o marcador em
`lib/editor/rascunhos.ts` trocaria os testes de concorrência e de interrupção
por nenhum teste. Ele mora em `lib/editor/acesso.ts`, por onde toda página e
toda ação passam; e `rascunhos.ts` importa `node:fs`, que é parede própria num
pacote de navegador.

### Um desvio menor

O plano punha o índice `/editor` no Bloco 3. Ele foi feito agora, na forma
mínima (lista as aulas, sem o menu "+ Nova aula"), porque **a N1-KPK não aparece
na bancada de `/finais`** — a bancada só lista o que o aluno *não* enxerga, e a
N1-KPK é publicada e aberta. Sem o índice, a medida do bloco não teria porta de
entrada. O menu "+ Nova aula" continua sendo do Bloco 3.

---

## O que ficou pendente do Bloco 1

Nada disto é código faltando; é verificação que não foi feita.

1. **A rodada de navegador.** Faltava o login de professor quando o bloco
   fechou. A **largura do palco a 1366×768** foi medida em 2026-09-10, junto
   com a rodada do "+", e **falhou** — está na seção daquela rodada, com os
   números e a causa. Continuam de fora: `/editor/finais/N1-KPK` = 404 em
   `next build && next start` e = 404 em `next dev` sem `EDITOR_LOCAL`. O
   mecanismo dos 404 está coberto por `lib/editor/local.test.ts` e por leitura
   de `exigirEditor()`, mas ninguém viu na tela.
2. **A medida de uso** — uma pessoa que nunca viu a tela muda uma fala sem
   instrução. Tempo **e** hesitações. É do Doug, não de um agente.
3. **A miniatura usa glifos Unicode**, não as peças do cburnett. Alcançar as
   peças de verdade exigiria fingir a estrutura do chessground em volta de cada
   casa. A troca é local a `components/editor/Miniatura.tsx`.

---

## O Bloco 2, até onde foi

Dois dos sete itens do bloco estão prontos e commitados. Os outros cinco não
foram começados.

### Pronto — o desenho (commit `add94e7`)

- `autoriaDoDesenho` em `lib/chess/annotations.ts`: o inverso de
  `desenhoDaAutoria`. **A regra que morde:** `desenhoSchema` é
  `.min(1).optional()`, então apagar o último traço tem de **omitir o campo**,
  nunca deixar `arrows: []` — senão o gate recusa a aula que o professor acabou
  de limpar. Tem teste de ida e volta.
- O botão direito desenha nas etapas 1 e 2 (`marcacao` → `desenhavel`). Com o
  editor ligado, o desenho da autoria **muda de camada**: sai da automática e
  entra na do usuário, que é a única em que o botão direito mexe. Os destaques
  deduzidos (corte, peça pendurada) ficam onde estavam.
- `lib/editor/edicoes.ts` — a cirurgia no JSON saiu do componente e ganhou
  teste contra a N1-KPK de verdade. É ela que guarda a promessa do editor
  inteiro, e a pergunta do teste é sempre "quantas linhas mudaram?".

### Pronto — a exceção do professor (commit `e856b08`)

`lib/lesson/excecoes.ts` + o campo `excecoes` no schema + a regra dentro do
`fail()` do gate + a cor amarela dos avisos. Verificado contra o gate de
verdade, não só por teste.

Um furo achado só rodando, e que vale lembrar: **o erro de posição não nomeia
aula nenhuma** (`onde` diz `posição pos-…`), mas a exceção mora no arquivo da
aula. A posição é devolvida à dona pela busca de qual aula a referencia. Sem
isso, a exceção existia e não perdoava nada, em silêncio.

As duas mutações foram plantadas (commit `ea9b177`), e escrevê-las destapou um
defeito na própria suíte: `linhasDoCodigo` casava `[CODIGO]` em qualquer linha e
só *removia* o `✖`, sem exigi-lo. Como os avisos novos usam o mesmo formato
(`▲ [CODIGO] onde`), um aviso passou a servir de prova de que a regra pegou o
estrago — e isso valia para a **suíte inteira**, não só para as duas novas.
Corrigido: o `✖` agora é exigido.

**A lição, para quem acrescentar aviso novo ao gate:** uma mutação que continua
vermelha com a regra desligada não guarda nada. A única maneira de saber é
desligar a regra de propósito e conferir que a suíte cai. Aqui: com a
conferência de hash sabotada, 41 de 41 continuavam vermelhas antes da correção;
depois dela, a suíte cai para 40 de 41, como tem de cair.

### Dois pedidos novos do Doug, já no plano (2026-09-10)

Ele pediu **controle total de edição** e tirou dois itens do "o que fica fora".
Os dois estão escritos no plano, no bloco certo, e **nenhum dos dois foi
implementado**:

1. **Editar a FEN de uma posição publicada, no lugar** (Bloco 3). O plano os
   excluía porque "a proveniência viraria mentira", e a objeção era boa: a
   proveniência diz *diagrama 1.3, página 47 do De la Villa*, e trocada a FEN
   essa frase descreve outro diagrama. A resposta não é proibir — é **arrastar
   a proveniência junto**: o status cai para `candidate`, `fenMethod` e
   `qaApplied` são reabertos, e o gate novo `FEN_SEM_PROVENIENCIA` pega a
   posição `approved` cuja FEN não bate mais com o que foi aprovado (a mesma
   mecânica de caducidade das exceções). A tela mostra antes e depois lado a
   lado e diz quantos alunos já treinaram aquela posição.
2. **Editar as respostas do defensor (`replies`)** — virou o **Bloco 2C**. A
   etapa 3 continua sendo saída: abrir o lápis nela seria escrever num arquivo
   que o `--write` regrava, e a edição sumiria em silêncio na conferência
   seguinte. O caminho é declarar as respostas na **fonte** (um campo novo no
   passo do roteiro) e deixar `derivarTreino` produzir `replies`. A medida do
   bloco é a que protege o que já existe: para as 3 aulas de hoje, `--write`
   não pode mudar um byte.

### Pronto — o "+" que acrescenta diagrama

**A descoberta que decidiu a forma:** um diagrama novo é um **passo sem
`lance`**. O `derivarTreino` pula passo sem lance antes de qualquer conta
(`lib/lesson/derivar-treino.ts:167`), o `montarQuadros` idem
(`lib/lesson/roteiro.ts:58`), e a corrente de legalidade do `superRefine`
também. Então **acrescentar diagrama em qualquer ponto do roteiro não muda um
byte da etapa 3** — e há teste que compara as duas árvores derivadas para
provar. O passo novo com lance quebraria a corrente do ponto de inserção em
diante: o professor pediria um diagrama e receberia a aula recusada. O lance
entra depois, pelo arrastar, e é aí que ele passa a ter consequência.

- `comPassoNovo` e `cabeMaisUmPasso` em `lib/editor/edicoes.ts`. Acrescentar um
  diagrama muda **3 linhas** do arquivo, e o teste afirma as duas metades: tudo
  antes do ponto de inserção é byte a byte igual, e tudo depois também, só
  deslocado.
- Os tetos saíram do schema para constantes exportadas (`MAX_PASSOS_INTRO` = 6,
  `MAX_PASSOS_ROTEIRO` = 24) e o `+` os usa. Um `+` com teto próprio produziria
  um rascunho que o próprio editor recusaria a salvar, e a mensagem que o
  professor leria seria a do Zod.
- Na tela: **o "+" mora no vão entre dois selos**, inclusive no de cima e no de
  baixo — o gesto pedido é "acrescentar um diagrama *aqui*", e "aqui" é um
  lugar. Quase invisível até o ponteiro passar, mas no DOM e recebendo foco
  (um "+" que só existe no `:hover` não existe para quem anda de Tab). No teto
  o vão some e uma frase no pé da coluna explica.
- **A conferência anterior é jogada fora ao acrescentar.** Ela marca diagramas
  por índice (`roteiro[3]` = quarto selo), e um passo no meio empurra os de
  baixo: manter as marcas acenderia a borda vermelha no diagrama errado, que é
  pior que não acender nenhuma.

### Pronto — `TEXTO_DE_MOLDE`, trazido do Bloco 3

O `+` obrigou. Fala vazia não é aula válida (`texto` é `min(1)`), então o passo
novo nasce com `MARCA_DE_MOLDE` (`«escreva aqui»`, exportada de
`lib/lesson/schema.ts`) — e sem portão nada impediria o professor de
acrescentar um diagrama, se distrair e publicar uma aula com um passo que
ninguém escreveu.

A regra vive no `checkLesson` e só na aula **publicada**: carregar a marca é o
estado normal de um rascunho em construção. Ela varre `falasDaAula`, que já
colhe todo texto que o aluno lê e já escreve o índice do passo
(`objective.roteiro[3].fala`) — então o `diagramaDoOnde` acende o sinal de erro
**no selo do diagrama** de graça, sem tocar no gate. (Sinal, e não borda: a
rodada de navegador mostrou que a borda vermelha nunca existiu no código. Ver
logo abaixo.)

Mutação plantada, e **conferida como o doc manda**: com a regra desligada de
propósito, a suíte cai de 42 para 41. Ela guarda de verdade.

### Não começado

- A **barrinha do tabuleiro** (flecha, casa, limpar, virar) e o chip
  "desenho deste diagrama / alvo do treino", para quem não usa botão direito.
- O **lance por arrastar** no diagrama.
- **Arrastar para reordenar** e `espera` como controle de pausa. (O "+" saiu, e
  a lixeira com desfazer também — ver a seção dela, mais abaixo.)
- `criarMotor()` extraído de `stockfish.ts` e a **barra de avaliação** com
  worker próprio.
- **Bloco 2C** — as respostas do defensor pela fonte (ver acima).
(O Bloco 2B e a moldura vermelha saíram desta lista: foram entregues. Ver
"O Bloco 2B, entregue", logo abaixo.)

### A rodada de navegador do "+" (2026-09-10) — feita

Ligado o `EDITOR_LOCAL=1`, `next dev`, logado como professor, em
`/editor/finais/N1-KPK`, etapa 2. **O "+" faz o que promete.**

- **O vão aparece e recebe foco.** Com o ponteiro em cima, a opacidade vai de
  `0` a `1` em 150 ms. Com o foco no selo 3, **um Tab** leva ao botão
  "acrescentar diagrama entre o 3 e o 4", com `:focus-visible` e opacidade 1 —
  a promessa do teclado se cumpre na tela, e não só no DOM.
- **O clique acrescenta.** 13 selos viraram 14, o novo é o 4, já selecionado,
  com `«escreva aqui»`, e a barra disse "salvo agora".
- **O diff é o prometido:** 6 linhas somadas, 0 removidas — as 3 do passo novo e
  as 3 do carimbo `professor.adaptouEm`. As outras 547 linhas, byte a byte. E
  `content/lessons/N1-KPK.json` intocado.
- **O portão pega antes da fala.** Conferir com a marca ainda no lugar acusou
  `TEXTO_DE_MOLDE` **num selo só** — o 4. Os treze antigos, limpos. Escrita a
  fala e conferido de novo: "conferência verde — pode publicar", em ~1,0 s.

Não foi publicado, e o rascunho foi devolvido ao estado inicial.

**O que a rodada ainda não cobre:** a medida de uso do bloco ("pessoa leiga
acrescenta um diagrama com uma flecha, sem instrução") continua sendo do Doug —
o que foi medido aqui é o mecanismo, não a hesitação de quem nunca viu a tela.
E o "+" **não tem gesto contrário**: um diagrama acrescentado por engano só sai
editando o JSON por fora, até a lixeira com desfazer existir.

### O que a rodada destapou — 1: a borda vermelha nunca existiu

Este doc e o comentário de `ListaDeDiagramas.tsx` dizem, os dois, que o selo com
problema "ganha borda vermelha". **O `className` nunca põe borda nenhuma.**
Medido no selo acusado, sem estar selecionado: `border-transparent`, igual ao
selo limpo do lado. A borda do selo é usada só para dizer qual está
**selecionado** (verde, `border-foco`), e um selo com problema que está
selecionado fica verde — o contrário do que se quer.

O aviso chega assim mesmo, por dois sinais menores: a **bolinha** no canto
(`bg-erro`) e o **código em texto** (`text-erro-tinta`). Os dois apareceram.

**Decidida em 10/9/2026** (o Doug delegou a escolha): a moldura fica
**vermelha no selo que tem problema e NÃO está selecionado**; ao selecioná-lo
ela volta a ser verde, e o problema segue avisando pela bolinha e pelo código
em texto — que estão à vista justamente porque o professor foi olhar.

O motivo da escolha, contra as outras duas: é a única que dá o aviso **de
longe** sem inventar desenho novo. "Sempre vermelha" obrigaria a uma terceira
forma para o selo que é os dois ao mesmo tempo (anel duplo, sombra), e "só
bolinha" deixa o professor procurar uma marca de 8 px numa coluna que agora
pode ter 40 selos. **Ainda não implementada** — é uma linha em
`ListaDeDiagramas.tsx:77-81`, que hoje nem chega a perguntar se há problema.

### O que a rodada destapou — 2: o palco não cabe em 1366×768

**A dívida aberta do Bloco 2.** Medido no editor, com a coluna de 13 selos:

| Janela | Documento | Sobra para fora | Tabuleiro cobre a coluna? |
|---|---|---|---|
| 1280 | 1373 px | 93 px | sim |
| **1366** | **1417 px** | **51 px** | **sim, 46 px** |
| 1440 | 1498 px | 58 px | sim |
| 1600 | 1585 px | não | não |

Em 1366 o tabuleiro ocupa x 175→855 e a coluna x 12→221: **sobrepõem-se em
46 px**, e o tabuleiro fica por cima (`document.elementFromPoint(200, 300)`
devolve `cg-board`). Isso come cerca de um quinto de cada selo, justamente do
lado onde mora a fala cortada. E o painel de texto termina em 1417, 51 px além
da janela — barra de rolagem horizontal numa tela que é a mais comum em
notebook.

### Paga em 10/9/2026, e com uma segunda goteira junto

**A causa, com arquivo e linha:** `app/globals.css:536` calcula o tabuleiro como
`calc(100vw - 2.5rem - 2.5rem - var(--aula-painel))`. Essa conta reparte a
largura entre respiro, painel e tabuleiro — e **não sabe que o editor pendurou
mais 224 px de coluna à esquerda**. O palco do aluno está certo; o do editor
herda a conta do aluno.

**O conserto foi outro, e de propósito.** Um `.aula-palco-editor` descontando
16,5rem da mesma conta seria uma cópia à mão das classes do `Editor.tsx`: no dia
em que o `w-56` virasse `w-64`, o CSS voltaria a mentir em silêncio — o mesmo
defeito com outra roupagem. Em vez de recalcular, a coluna do tabuleiro passou a
**perguntar quanto sobra**: `grid-template-columns: minmax(0, max(15rem,
var(--aula-teto))) var(--aula-painel)`. Com tamanho fixo a coluna transborda
quando não cabe; com `minmax(0, …)` ela cresce até o teto **mas só até onde o
espaço deixar**, e o tabuleiro segue junto porque o `clamp` de `.aula-tabuleiro`
já tem `100%` — e esse `100%` é a largura da coluna. Não há número para manter.

Medido depois, em 1366×768, no editor com os 13 selos da N1-KPK:

| | Antes | Depois |
|---|---|---|
| `grid-template-columns` | `680px 522px` | **`525px 522px`** |
| Palco / `<main>` | 1242 dentro de ~1117 | **1087 dentro de 1087** |
| Documento | 1417 px (51 fora) | **1351 px** (a janela menos a barra) |
| Rolagem horizontal | sim | **não** |
| Tabuleiro × coluna | sobrepõem 46 px | **vão de 16 px** (coluna até 236, tabuleiro de 252) |

**Isto não toca no palco do aluno**, e a razão é aritmética: a regra nova só se
afasta da antiga quando o pai é mais estreito do que a conta do `100vw` supõe, e
o único lugar onde isso acontece é o editor. Em 1024 px — a faixa em que o
próprio comentário do arquivo diz que "este painel cobra" — as duas dão o mesmo
tabuleiro de 422 px num pai de 984.

#### A segunda goteira: a página rolava 593 px na vertical

A mesma medida destapou um defeito anterior, que o doc não registrava. A coluna
de selos tem `overflow-y-auto` — ela promete rolar por dentro —, mas nenhum pai
com altura fechada: com `min-h-dvh` a coluna **cresce em vez de rolar**. Medidos
os 13 selos: coluna de **1245 px**, documento de **1361** contra 768 de janela.
É o mesmo defeito do palco, na outra direção — e ele trava o mesmo próximo
passo, porque não se arrasta o selo 1 até o 13 numa coluna que não cabe na tela.

Consertado em `components/editor/Editor.tsx`: `min-h-dvh` → **`h-dvh`** (altura
fechada), `min-h-0` na linha de baixo (sem ele um filho flex nunca encolhe
abaixo do próprio conteúdo) e `overflow-y-auto` no `<main>` — para que uma faixa
de aviso empurre **o painel**, e nunca a página, que arrastaria a coluna junto.
Depois: documento de **1366×768**, rolagem zero nas duas direções, coluna de 652
px rolando por dentro (conteúdo de 1231).

**O que ficou, e não é defeito que se sinta:** o palco pede 680 px de altura
(`100dvh - 5.5rem`, a conta do cabeçalho do **aluno**) onde o editor tem 652, e
o `<main>` rola 94 px para acomodar. Medido botão por botão, **nada fica
cortado**: o último termina em y=475 e o `<main>` vai até 756. Os 94 px são vão
vazio no pé do painel. Consertar de verdade exige uma reserva vertical própria
para o editor — e essa **seria** um número copiado à mão, que é o que este
conserto acabou de evitar. Fica declarado, não pago.

Portões depois das duas mudanças: `typecheck`, `lint`, **742 testes**, `build` —
todos verdes.

## O Bloco 2B, entregue em 10/9/2026

Os três pedidos que o Doug fez depois da rodada do "+". **O levantamento mudou a
forma de um deles**, e essa é a parte que quem continuar precisa saber.

### A descoberta: galeria de posições não é a etapa 2

O pedido foi "quantos diagramas forem necessários", com o exemplo de uma aula do
que dá mate e do que não dá — várias posições diferentes, uma depois da outra.

Isso **não cabe na etapa 2**. Lá os quadros são derivados de UMA posição jogando
o roteiro (`montarQuadros`), e passo sem lance repete o quadro anterior: não
existe "outra posição" na aula assistida.

Cabe na **etapa 1**, e o gate já a trata como o lugar certo. O comentário dele
(`scripts/validate-content.ts:1435`) diz: a apresentação é **"a única FEN do
curso sem arquivo de posição"** — ilustração, ninguém joga nela, pode ter mais de
sete peças de propósito, não vira `content/positions/`, não consulta a tablebase
e não deve proveniência. O único juízo mecânico é `fenProblem` mais
`INTRO_FEN_REDUNDANTE`.

**O que nenhuma máquina cobra, e por isso está escrito na tela do editor:** um
diagrama de apresentação tirado de um LIVRO deixa de ser ilustração e vira
posição, com os nove campos de proveniência.

### O que foi feito, em três paradas

**1. Os tetos.** `MAX_PASSOS_ROTEIRO` 24 → **40**, `MAX_PASSOS_INTRO` 6 → **12**,
e o motivo escrito do segundo mudou junto: os 6 valiam para a apresentação que é
preâmbulo, e o argumento ("sete cliques até a primeira peça andar") não alcança a
galeria, onde cada clique mostra uma posição nova. A frase do pé da coluna passou
a ler a constante em vez de trazer o número escrito à mão.

*Medido na tela, 1366×768:* a apresentação foi de 3 a **12** diagramas pelo "+",
o vão sumiu exatamente no teto, a frase leu "12", e os 12 passos chegaram ao
disco — antes do sétimo o `lessonSchema` recusava.

**2. A moldura vermelha do selo** (a decisão em aberto, resolvida acima).
*Medido:* selo limpo → transparente; selo com problema e não selecionado →
`--color-erro`, byte a byte igual ao token; selo com problema **e** selecionado →
`--color-foco`, com o aviso seguindo pela bolinha e pelo código.

**3. A prévia** — botão "Ver como aluno" na barra, `Esc` para voltar.

Ela **não é um modo novo do player**, e essa é a decisão inteira: o player já
entrega a experiência do aluno quando não recebe nada. Sem `edicao` não há
lápis, sem `startAt` a aula abre na etapa 1 e anda sozinha, sem `marcacao` o
botão direito volta a não desenhar, e sem `onStageDone` nada é gravado como
progresso. A prévia é o editor **parando de passar props**, não uma segunda
implementação da aula para divergir da primeira.

*Medido:* coluna de selos ausente, **zero** glifos de lápis na tela (na edição
são 4), rolagem zero nas duas direções — e uma prova incidental do conserto do
palco: **sem a coluna, o tabuleiro volta sozinho aos 680 px do aluno**
(`680px 522px`). O conserto é adaptativo, não um número fixo.

**A armadilha da prévia, e ela está na tela.** A etapa 3 é derivada pelo
`--write`, que só roda em "Conferir": entre uma edição do roteiro e a
conferência seguinte, o treino do arquivo é o anterior. Quem decide o aviso é
`publicavel.pode`, que já significa "última conferência verde **e** rascunho
intocado desde então". *Medido nos três estados:* sem conferência → avisa;
conferência verde em dia → **não** avisa; uma fala editada depois → avisa de
novo, com a hora da conferência.

**4. A FEN por diagrama da apresentação** — `comFenDoDiagrama` em
`lib/editor/edicoes.ts` e `components/editor/PosicaoDoDiagrama.tsx`.

Duas regras que mordem, as duas com teste:

- **`null` OMITE o campo.** "Mostra a posição da aula" se diz pela ausência de
  `fen`, nunca por `fen` vazia nem por `fen` igual à da aula — essa o gate
  recusa por `INTRO_FEN_REDUNDANTE`. É a mesma regra do desenho, que some em vez
  de virar `arrows: []`.
- **A `fen` entra logo depois da `fala`, e não no fim do objeto.** O
  espalhamento põe a chave nova no fim, e aí a chave anterior tem de ganhar uma
  vírgula: o `git diff` mostra uma linha removida e duas acrescentadas para
  dizer uma coisa só. Depois da `fala` é **inserção pura**.

*Medido no disco:* `diff` do rascunho contra a publicada deu **`31a32`** — uma
linha acrescentada, nenhuma tocada, mais as 3 do carimbo. Voltar à posição da
aula devolveu o arquivo byte a byte.

O juízo é o mesmo dos dois lados: `fenProblem` roda na tela antes de gravar e no
gate depois. *Medido:* FEN com dois reis brancos → "há mais de um rei branco";
a própria posição da aula → o aviso da redundância, com o botão desabilitado.

### Um defeito achado rodando, e consertado

Colar no campo algo que não é FEN devolvia a mensagem **em inglês**: a tabela de
tradução de `lib/chess/fen.ts` procurava o algarismo (`must contain 6 space…`) e
a chess.js escreve **`six`** por extenso. É a mensagem mais frequente do editor,
justamente a que passava crua — e ela também vale para o gate, que usa a mesma
função.

Teste de regressão, com as duas saídas:

```
ANTES   ✖ o texto colado que não é FEN reclama em português
        actual:   'Invalid FEN: must contain six space-delimited fields'
        expected: 'a FEN precisa dos 6 campos'
DEPOIS  ✔ 11 de 11
```

### O que o 2B **não** cobre

- **Não há montador de peças** — a posição entra por FEN colada. O montador é do
  Bloco 3 e entra pela mesma porta: quem grava continua sendo `comFenDoDiagrama`.
- **A prévia não conserta a etapa 3 velha**, ela avisa. Conferir continua sendo
  o que a põe em dia.
- **A medida de uso continua sendo do Doug** — ver "Onde o Doug aprova antes de
  seguir", no plano.

---

## A lixeira com desfazer, entregue em 10/9/2026

O gesto contrário do "+", que era o buraco mais visível do editor: um diagrama
posto por engano só saía editando o JSON à mão. Entrou **antes** do reordenar e
da barrinha de propósito — ele decide, no gesto mais simples, a pergunta que o
reordenar faria duas vezes, e sem ele toda rodada de navegador dos gestos
seguintes deixa entulho no rascunho que só o `git checkout` tira.

### A regra que decide tudo: a corrente de lances

Apagar **inverte** a descoberta que deu forma ao "+". Lá, o passo novo nasce sem
`lance` e por isso não muda um byte da etapa 3. Aqui:

- passo **sem** `lance` sai sempre — é ignorado pela corrente, pelo
  `montarQuadros` e pelo `derivarTreino`;
- passo **com** `lance` no meio **quebra a corrente** do ponto de corte em
  diante: o `superRefine` aplica os lances um atrás do outro e recusa o arquivo;
- passo com `lance` que é o **último com lance** sai: o que sobra é um prefixo
  da mesma corrente, e prefixo de corrente legal é corrente legal.

**Por que a tela pergunta antes, em vez de apagar e ver no que dá:** o rascunho
inválido não chega ao disco — `gravarRascunhoDeAula` julga antes de escrever
(`lib/editor/rascunhos.ts:208`). Uma lixeira que apagasse sem perguntar deixaria
o editor num estado de erro que o professor não pediu.

A decisão foi tomada com o Doug: a lixeira **não some** quando não pode. É o
contrário da regra do vão do "+", e não se contradiz — lá a recusa é global e
explicada por uma frase no pé da coluna; aqui ela é **deste** diagrama e muda de
selo para selo, e um selo sem lixeira ao lado de um selo com lixeira faz o
professor concluir a regra errada. Ela usa `aria-disabled` e não `disabled`: o
desabilitado de verdade sai do Tab e não dispara `title`, escondendo a
explicação de quem mais precisa dela.

### O que foi escrito

- `MIN_PASSOS_INTRO` e `MIN_PASSOS_ROTEIRO` (ambos 2) saíram do `.min(2)` do
  schema e viraram constantes exportadas — o espelho exato da lição dos tetos.
- `podeApagarPasso` e `comPassoRemovido` em `lib/editor/edicoes.ts`. O veredicto
  é um tipo com **motivo** (`piso` ou `corrente`), porque as duas recusas têm
  frases diferentes na tela.
- A lixeira e a linha de desfazer em `ListaDeDiagramas.tsx`; `apagarDiagrama`,
  `desfazerApagar` e o estado do desfazer em `Editor.tsx`.

**`aplicar` foi extraída de `editar`** — é o mesmo caminho sem o `comCarimbo`, e
existe só para o desfazer: desfazer quer dizer "isto não aconteceu", e um
carimbo posto pelo gesto desfeito deixaria três linhas de `git diff` dizendo que
o professor adaptou uma aula que ele não adaptou.

**O desfazer morre por identidade de objeto**, e isso não é economia — é
correção. Um "desfazer" clicado depois de o professor ter escrito outra coisa
devolveria o arquivo de antes e levaria a escrita junto, em silêncio. Toda
edição cria um objeto novo, então `cru === desfazer.depois` responde "nada
aconteceu desde então" sem contador, sem relógio e sem limpar estado em cada uma
das dez funções que editam.

**A linha de desfazer não tem cronômetro**, contra o "por alguns segundos" do
plano. Ela não flutua: ocupa o buraco que o diagrama deixou, numa coluna que
rola por dentro e que acabou de ficar 64 px mais curta. Um cronômetro ali não
protegeria a tela de nada — só marcaria o tempo que o professor tem para
perceber o próprio erro, no único gesto do editor sem outro caminho de volta.
**Isto é uma linha de código**, se um dia a decisão for outra.

### Medido na tela, 1366×768

Rodada em `/editor/finais/N1-KPK`, etapa 2, com os 13 selos.

| O quê | Medido |
|---|---|
| Lixeiras habilitadas | **3** — os selos 1 e 2 (sem lance) e o 13 (último com lance) |
| Lixeiras recusando | **10** — os selos 3 a 12, cada um dizendo quantos lances vêm depois |
| Ordem no DOM | 40 botões: vão, selo, lixeira, vão, selo, lixeira… todos `tabIndex 0` |
| Opacidade em repouso | **0** — invisível até o ponteiro chegar, como o "+" |
| Geometria | lixeira de 22×22 no canto de baixo do selo (x 195→217); o `pr-7` mantém a fala fora dela |
| Rolagem | **zero** nas duas direções — a conta do palco não foi tocada |

**O ciclo inteiro, no disco:**

- apagar o diagrama 2 → o `diff` do rascunho deu **14 linhas removidas** (o
  bloco do passo, inteiro) **+ 3 do carimbo**, 547 → 536. `content/lessons/`
  intocado;
- **desfazer → o arquivo voltou byte a byte**, 547 linhas, sem carimbo novo;
- apagar e depois clicar no "+" → **a linha de desfazer some**, como tem de
  somer;
- na apresentação: 3 diagramas, as 3 lixeiras habilitadas; apagado um, as 2
  restantes passam a recusar com *"a apresentação precisa de pelo menos 2
  diagramas"*.

### Um defeito achado rodando, e consertado

O selo 12 dizia *"os **1 lances** seguintes"*. O plural estava escrito à mão na
interpolação, e o penúltimo diagrama com lance é um caso comum, não uma ponta.
Passou a dizer *"o lance seguinte é jogado a partir dele"*.

### O que esta rodada NÃO cobre

- **O Tab não pôde ser exercido.** O painel do navegador embutido não recebe
  tecla nesta sessão (a tecla não moveu o foco nem com o painel à frente). A
  ordem de foco foi medida pelo DOM — 40 botões na ordem certa, todos
  `tabIndex 0` —, e não pressionando Tab, como na rodada do "+".
- **A medida de uso continua sendo do Doug:** uma pessoa leiga apaga um diagrama
  por engano e volta atrás sem instrução.
- A lixeira **não julga se a aula ainda faz sentido** sem aquele diagrama — só
  se o arquivo continua gravável. Quem julga o resto é o professor, olhando, e
  depois o gate.

Portões, todos verdes: `typecheck`, `lint`, **757 testes** (8 novos),
`validate:content`, `validate:mutations` (**42 de 42** vermelhas), `build`,
`repertorio:compilar --check`.

---

## O arrastar para reordenar, entregue em 10/9/2026

O terceiro gesto da coluna, e o último dela: o "+", a lixeira e agora o arrastar. Com
ele a coluna está completa, e o que sobra do Bloco 2 é tudo tabuleiro.

**O Doug escolheu o arrastar contra a alternativa das setinhas ↑/↓**, com a frase que
decidiu: *"como mudar um slide de lugar quando estamos criando"*. A escolha melhorou o
desenho por um motivo que as setinhas não alcançavam — **o arrasto mostra a regra
enquanto ela vale**, em vez de a explicar depois.

### A regra, e por que ela NÃO é `podeApagarPasso` de novo

> **A ordem dos `lance` não pode mudar.** Nada mais.

O passo sem `lance` é invisível para a corrente (`derivarTreino` o pula antes de
qualquer conta, `derivar-treino.ts:167`; a costura do feedback usa a fala do passo do
**defensor**, que sempre tem lance, `:235`). Logo ele passeia pela etapa inteira sem
mexer num byte da etapa 3 — é a mesma descoberta que deu forma ao "+", lida de um
terceiro jeito. O passo **com** lance só atravessa passos que "só apontam", e para no
primeiro que move peça.

**A dica do Doug era reaproveitar `podeApagarPasso`, e ela dá resposta errada num caso
comum.** Apagar **encurta** a corrente: tirar o último passo com lance é seguro, porque
prefixo de corrente legal é corrente legal. Mover **reordena**: o mesmo último passo,
arrastado para o topo, embaralha a partida. Há teste que põe as duas perguntas no
**mesmo** diagrama — o 13 da N1-KPK — e recebe respostas contrárias, e que depois move
de verdade para provar que o arquivo sai inválido. O piso e o teto também somem:
mover não muda o tamanho da lista.

### Escrito

- `podeMoverPasso` → `Movivel` e `comPassoMovido` em `lib/editor/edicoes.ts`. O
  veredicto devolve **a lista de vãos legais**, e não um sim/não — é ela que a tela
  acende durante o arrasto.
- Os dois vãos que ladeiam o próprio diagrama entram na lista **de propósito**: soltar
  ali é desistir, e um alvo que se apaga debaixo do ponteiro faz o professor achar que
  soltou errado. `comPassoMovido` devolve **o mesmo objeto** nesse caso, e é assim que
  o arrasto desistido não carimba a aula nem manda gravação ao disco.
- Na tela (`ListaDeDiagramas.tsx`): arrasto HTML nativo, **sem biblioteca nova** — a
  rolagem automática ao arrastar o selo 13 até o topo vem de graça no nativo e seria
  escrita à mão num arrasto por ponteiro. O **alvo do solte é o selo inteiro** (metade
  de cima = acima, metade de baixo = abaixo), porque o vão tem 12 px e mirar 12 px com
  um selo pendurado no ponteiro faz o gesto parecer quebrado. O vão vira linha e
  **nunca muda de altura**: uma coluna que reflui move o alvo que a pessoa está mirando.
- O **punho** (seis pontos) é o único sinal de que os selos se arrastam. Ele segue a
  regra da lixeira e não a do vão: **nunca some**, e onde não pode diz o motivo.
- `indiceDepoisDoArrasto` em `Editor.tsx`: o palco segue **o diagrama**, não o número.

### Medido na tela, 1366×768

| O quê | Medido |
|---|---|
| Diagramas que se movem | **3 de 13** na N1-KPK, 6 de 13 na N0-LADDER, **7 de 7** na N0-MATING-MATERIAL |
| Arrastar o selo 1 (só aponta) | 14 vãos acesos de 14 |
| Arrastar o selo 3 (move peça) | **4 acesos, 10 apagados** — os vãos 0 a 3 |
| Soltar em vão proibido | recusado; o navegador nem aceita o solte |
| Paradas de Tab na coluna | **40** — as mesmas da rodada da lixeira; o punho não acrescenta nenhuma |
| Punho | 20×20 px, centrado na altura, 3 px de folga da lixeira |
| Rolagem / palco | zero nas duas direções; `525px 522px`, os números da conta refeita |

**O ciclo no disco**, arrastando o selo 3 para o topo: 24 linhas somadas, 21 removidas
— o bloco de 21 linhas do diagrama **mudou de lugar** —, e as 3 de sobra são o carimbo.
Comparadas linha a linha, fora do carimbo **não há uma única linha diferente**.
`content/lessons/` intocado; o rascunho devolvido byte a byte.

### Dois defeitos achados rodando

1. **O punho estava mudo.** Ele nascera com `pointer-events-none` para não roubar o
   arrasto do selo — e um elemento que o ponteiro nunca toca **nunca dispara `title`**.
   É a mesma armadilha que a lixeira já documentava por outro caminho (`disabled` de
   verdade também não dispara). Era desnecessário: o arrasto começa no `draggable` do
   selo, e um filho não precisa ser transparente ao ponteiro para o pai ser arrastado a
   partir dele. **Quem achou foi o Doug testando**, não a rodada de navegador.
2. **As transições de CSS ficam congeladas no navegador do agente** — o painel não
   pinta e a animação trava no meio. A linha do alvo parecia não acender; forçando cada
   transição a terminar (`getAnimations().forEach(a => a.finish())`) ela sai
   `lab(69.3189 -43.1329 25.7322)`, byte a byte igual ao token `--color-foco`. É a
   segunda vez que este ambiente mente sobre a tela (a primeira foi a borda vermelha).

### O que esta rodada NÃO cobre

- **Não há caminho pelo teclado.** O "+" e a lixeira têm; este não. Decidido com o Doug:
  ele preferiu o arrasto, e um segundo par de botões em cada selo pagaria a
  acessibilidade com a clareza da coluna. **Dívida declarada**, ~meia hora de trabalho.
- **O `espera` como controle de pausa não foi feito.** Era a quarta parada do bloco e
  ficou de fora quando a conversa virou para a arquitetura. A armadilha, para quem
  pegar: **zero tem de OMITIR o campo**, nunca gravar `espera: 0` — é a regra do desenho
  (`arrows: []`) e a da FEN (`null` omite), pela terceira vez.
- O arrasto com o mouse de verdade foi provado **pelo Doug**, não por mim: o navegador
  embutido não dá o ponteiro com precisão. O que eu provei foi a ação, o resultado no
  disco e a geometria.

Portões, todos verdes: `typecheck`, `lint`, **767 testes** (10 novos), `build`,
`validate:content`, `validate:mutations` (**42 de 42** vermelhas),
`repertorio:compilar --check`.

---

## A conversa que mudou o rumo (10/9/2026) — leia antes de continuar o Bloco 2

Depois do arrastar, o Doug abriu uma mudança de arquitetura e **o Bloco 2 está
suspenso no meio**. A proposta está em
[`EDITOR-V2-PROPOSTA.md`](EDITOR-V2-PROPOSTA.md), ao lado deste arquivo, e ela **não
foi aprovada** — ele vai revisá-la com outra ferramenta antes de decidir.

**O defeito que abriu a conversa:** cada passo do roteiro é um selo, e `fala` é
obrigatória. Uma partida de 60 lances viraria 60 selos e exigiria 60 comentários
escritos à mão. Ele quer o modelo do Lichess: os lances correm num painel e o
comentário aparece só onde importa.

**O que ele já decidiu**, e que vale como requisito mesmo que a proposta mude de forma:

1. Um slide novo é **ou** uma posição parada **ou** o começo de uma partida.
2. A etapa 2 corre sozinha e **pára só onde há texto**, com *ver de novo*, *pausar* e
   **mudar a velocidade** (a velocidade existiu no `ExampleStage.tsx`, apagado em
   `aeb5ca1`, e é recuperável).
3. **A etapa 3 deixa de ser saída da máquina.** Ela nasce espelhando a aula e passa a
   ser dele no primeiro toque; quando as duas divergirem, a tela **avisa**, e um botão
   "refazer a partir da aula" que só ele aperta desfaz. Isto contraria a decisão 5 do
   plano vigente e a promessa escrita em `schema.ts:788-808`.
4. **Vários treinos por aula, nos dois níveis** — um capítulo pode ter o seu, e a aula
   pode ter treinos gerais no fim. Isto quebra o array fixo de quatro etapas
   (`store.ts:31`).
5. **Variações desde já**, e **só os seis símbolos de qualidade do lance** (`!`, `?`,
   `!!`, `??`, `!?`, `?!`) — não os 24 do Lichess.
6. **A aula tem de saber comparar dois lances.** Foi o pedido mais concreto dele: numa
   posição de rei e peão, mostrar a linha certa até o empate e **depois** a errada até
   a derrota, na mesma aula.

**A descoberta que decidiu a forma da proposta:** o Doug já mantém o mesmo conteúdo num
estudo do Lichess (*"P1 — Fundamentos: rei e peão contra rei"*, 12 capítulos), e o
comentário que abre o capítulo P1.04 é, escrito por ele:

> *"Compare com P1.03: as peças estão nos mesmos lugares, mas agora as pretas jogam
> primeiro."*

**Ele escreveu com palavras o que a ferramenta não sabia fazer.** O Lichess só tem
capítulos soltos; a comparação, que é o conteúdo da aula, teve de virar prosa apontando
para outra tela. É o buraco que a proposta fecha.

### O que foi medido no Lichess, para não ter de medir de novo

- **Lista de lances:** os lances correm **em linha** e compactos; **um comentário quebra
  a lista em bloco** (`<interrupt>`), e as variações aninham recursivamente. É esse
  desenho que faz 60 lances caberem sem virar 60 telas.
- **Botão direito num lance:** *Transformar em linha principal · Comente sobre este
  lance · Anotar com símbolos · Copiar PGN da variante · Excluir a partir daqui*.
- **Capítulo novo:** cinco portas num diálogo — *Vazio · Editor · URL · FEN · PGN*
  (colar até 64 jogos, ou subir arquivo) — mais Nome, Variante, Orientação e Modo.
- **Modo do capítulo:** *Análise normal · Pratique com o computador · Ocultar próximos
  movimentos · **Lição interativa*** (`gamebook` por dentro). No modo lição o autor
  escreve um comentário por lance e uma **dica sob demanda**. Tem *Preview*.
- **Editar capítulo:** Nome, Orientação, Modo, comentário afixado, e as ações *Remover
  anotações · Limpar variantes · Excluir capítulo*. **Não dá para trocar a posição
  inicial** — reclamação recorrente no fórum deles.
- **Comentário** guarda autor e lance. **Símbolos:** 24, em três famílias. **Etiquetas
  PGN** editáveis. Botão **REC** liga/desliga a gravação.

### As reclamações públicas do editor do Lichess — cinco já resolvidas aqui

| Reclamação | Como este projeto já responde |
|---|---|
| **"A lição interativa só aceita UM lance certo"**; sidelines viram *"Retry"* | `expects[].moves[]` (até 4), `authorAlternatives` com feedback próprio, `methodAlternatives`, e `mistakes` — erros **nomeados** |
| Não dá para trocar a posição inicial de um capítulo | Já planejado (Bloco 3), arrastando a proveniência junto |
| Teto de 64 capítulos e teto de lances | Os tetos são nossos, com motivo escrito |
| O aluno burla a restrição abrindo o explorador pelo atalho | O nosso aluno não tem explorador |
| Não dá para saber se o aluno aprendeu | Escada de repetição espaçada (`lib/finais/escada.ts`) |

Fontes: [issue de coaches](https://github.com/lichess-org/lila/issues/6524),
[lances certos alternativos](https://lichess.org/forum/lichess-feedback/interactive-studies-accepting-multiple-correct-moves),
[teto de capítulos](https://lichess.org/forum/lichess-feedback/chapter-limit-in-studies).

---

## Especificação funcional consolidada — 11/9/2026

Doug pediu que o conhecimento funcional não dependesse da memória dos agentes que
planejaram o editor. Foi criado
[`EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md`](EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md),
com o comportamento esperado por tela, ações, confirmações, estados, segurança,
critérios de aceite, ordem de entrega e checklist mestre do produto completo.

O plano final continua sendo a autoridade de arquitetura, dados e segurança; a nova
especificação é a autoridade de comportamento funcional. `AGENTS.md` e `CLAUDE.md`
agora obrigam agentes Codex/Claude a ler plano, especificação e este diário antes de
trabalhar no v2. A criação do documento não marca funcionalidades como entregues e não
altera código de produto.

---

## Teste humano do arrastar e retorno de autoria — 11/9/2026

Doug testou a reordenação depois de entrar com as próprias credenciais. Os oito
comportamentos passaram sem ajuda: descoberta do arrastar, linha de destino, queda no
lugar esperado, sincronização com tabuleiro/nome, Desfazer, Refazer, operação só por
teclado e persistência depois de `✓ salvo` + recarga. Não encontrou problema visual e
deu **10/10** para a naturalidade.

O mesmo teste revelou três defeitos pequenos, corrigidos na rodada seguinte:

- no desenho livre do editor, as quatro cores agora usam a espessura padrão 10 do
  Lichess; a espessura semântica diferente continua apenas nas marcações pedagógicas;
- `!`, `?`, `!!`, `??`, `!?` e `?!` são escolhas exclusivas e o símbolo atual aparece
  junto ao lance na lista e sobre a peça de destino, como no Lichess; NAGs importados
  fora desses seis continuam preservados;
- a prévia de PGN destaca a linha inteira, escreve `incluído`/`fora`, conta os
  selecionados e oferece `Selecionar todos`/`Desmarcar todos`.

Três itens do retorno são escopo ainda não entregue, e não regressão: criar capítulo
com posição montada à mão, ação explícita/contextual para variante e barra Stockfish.
Doug decidiu os outros dois em seguida: `Desfazer tudo` restaura a aula inteira ao
estado da abertura; comentário importado também inicia, sem decisão anterior, uma
narração temporizada no mesmo lance. Comentário e narração ficam independentes depois
da importação, e a caixa de narração aparece abaixo para editar ou apagar. O símbolo
de qualidade aparece no lance da lista e num selo sobre a casa de destino, conforme a
referência visual do Lichess fornecida por Doug em 11/9/2026.

---

## O próximo passo

**A dívida do palco está paga** (seção acima, com os números das duas direções).
O selo está inteiro, e o gesto de arrastar tem onde nascer.

**O Bloco 2B e o arrastar estão entregues** (seções acima). **Mas o Bloco 2 está
suspenso**: em 10/9/2026 o Doug abriu uma mudança de arquitetura que muda o que um
selo é, e continuar os gestos antes de decidi-la é construir em cima de coisa que
pode mudar. Ver "A conversa que mudou o rumo", acima, e
[`EDITOR-V2-PROPOSTA.md`](EDITOR-V2-PROPOSTA.md) — **não aprovada**.

O que sobra do Bloco 2, para quando a decisão sair:

1. A **barrinha do tabuleiro** (flecha, casa, limpar, virar) e o chip
   "desenho deste diagrama / alvo do treino". **Come altura** do palco — a conta
   dele foi refeita e medida; conversar antes de escrever.
2. O **lance por arrastar** no diagrama. Depende do remonte por `key` para ligar
   `montagem`/`desenhavel`, o mesmo mecanismo da barrinha.
3. O **`espera`** como controle de pausa — a única parada do arrastar que não foi
   feita. Regra que morde: **zero OMITE o campo**, nunca `espera: 0`.
4. `criarMotor()` extraído de `stockfish.ts` e a **barra de avaliação** com
   worker próprio. **Come largura** ao lado do tabuleiro; é a última de propósito,
   porque é a única que pode ser cortada sem deixar um gesto pela metade.

Os itens 1 e 2 são os que a proposta do editor v2 mais atinge: se um selo passar a
ser um capítulo com painel de lances, o "lance por arrastar" muda de dono. O item 4
não é atingido por nada, e é o mais seguro de fazer enquanto a decisão não sai.

E as três coisas levantadas que economizam tempo:

- **Ligar `montagem` (e `desenhavel`) exige `key` no `ChessBoard`.** As duas são
  lidas uma vez, com `useState(() => …)` (`ChessBoard.tsx:245` e `:247`), porque
  o chessground decide na criação. Um botão "modo desenho" que só troca a prop
  não vai funcionar.
- **O motor do aluno é um singleton com um pedido em voo**, e
  `bestMove`/`analyse` cancelam o que houver (`lib/engine/stockfish.ts:96-99`).
  A barra de avaliação **precisa** de um worker próprio, senão ela cancela o
  lance do computador na etapa de prática. O corte natural é envolver as linhas
  60-486 numa função `criarMotor(build)`.
- **O navegador embutido escala as coordenadas, e a razão NÃO é constante.** O
  quadro do ponteiro não é o do CSS: na rodada do "+" a razão foi **× 2,91**; na
  do Bloco 2B, **× 8,34** — o painel estava reduzido. Clicar por `ref` erra o
  alvo nas duas. **Calibre a cada sessão**, com dois cliques e um ouvinte de
  `mousedown` lendo `clientX/clientY`, e resolva `CSS = a × quadro + b`.

  Com o painel muito reduzido (1 px de quadro = 8 px de CSS) o clique por
  ponteiro deixa de ser confiável: um botão de 44 px vira 5 px de quadro. O
  caminho que funcionou foi **disparar o clique pelo próprio manipulador da
  página** (`elemento.click()`) e medir a **geometria à parte**
  (`getBoundingClientRect`, `elementFromPoint`, `getComputedStyle`) — a
  geometria não depende do tamanho do painel, então a prova não se perde. Para
  campo de texto, o valor tem de entrar pelo `setter` nativo mais um evento
  `input`, senão o React não vê.

  E a tecla que confirma o lapisinho é `Enter`; `Return` não chega à página.

---

## Onde cada coisa é escrita

| O quê | Onde | Versionado? |
|---|---|---|
| Rascunho de aula | `content/rascunhos/lessons/<ID>.json` | **sim** — é o que o gate julga |
| Estado do editor (autosave, conferências, lock) | `.editor/` | não (`.gitignore`) |
| Aula publicada | `content/lessons/` | sim — **só o gate escreve ali**, por `--aplicar` |

O editor **nunca** escreve em `content/lessons/`. Quem escreve é
`validate-content.ts --rascunhos --aplicar`, por cópia de bytes, e só quando a
rodada inteira fica verde.

---

## Os portões, antes de qualquer commit

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run validate:content
npm run validate:mutations
npm run repertorio:compilar -- --check
```
