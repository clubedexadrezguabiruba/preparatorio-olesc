# Editor v2 — a partida como painel de lances, e o treino que passa a ser seu

> ## ⚠️ PROPOSTA — NÃO APROVADA
>
> **Data:** 2026-09-10. **Nada disto foi implementado, e nada foi decidido em
> definitivo.** Este documento é uma proposta de arquitetura escrita a partir de uma
> conversa com o Doug, de três varreduras do código, e de uma sessão medindo o editor
> de estudos do Lichess por dentro. O Doug vai revisá-la com outra ferramenta antes de
> aprovar.
>
> **O que já está decidido por ele** (e portanto é requisito, não sugestão): as quatro
> respostas listadas na seção "Contexto", mais os seis símbolos de qualidade do lance,
> mais os treinos nos dois níveis (capítulo e aula).
>
> **O que é proposta minha, e portanto está aberto:** a forma do arquivo, o `retomaDe`,
> a lista `guided.treinos[]`, a ordem dos blocos, e tudo o que estiver escrito como
> recomendação.
>
> **O estado do código quando isto foi escrito** está em
> [`MODO-EDITOR-ONDE-PARAMOS.md`](MODO-EDITOR-ONDE-PARAMOS.md). O plano vigente, que
> este documento propõe alterar, é [`MODO-EDITOR-PLANO.md`](MODO-EDITOR-PLANO.md) —
> em caso de conflito entre os dois, **o vigente é o que manda até esta proposta ser
> aprovada**.

## Contexto: por que mexer numa coisa que funciona

O editor de aulas funciona e o Doug gosta dele. Mas ele erra numa coisa estrutural,
e o erro só aparece quando a aula cresce.

Hoje a aula assistida é uma **lista plana de passos**, e cada passo é obrigado a ter
uma fala (`fala: z.string().min(1)`, `lib/lesson/schema.ts:658`). Cada passo vira um
selo na coluna do editor. Consequência: uma partida de 60 lances viraria 60 selos —
e, pior, **exigiria 60 comentários escritos à mão**, senão a aula é recusada. O teto
do formato (`MAX_PASSOS_ROTEIRO = 40`) nem chega lá.

No Lichess é o contrário: os lances correm compactos num painel, e o comentário
aparece só onde o autor escreveu. O Doug mantém o mesmo conteúdo lá — o estudo
*"P1 — Fundamentos: rei e peão contra rei"*, 12 capítulos — e **esse estudo é, na
prática, a especificação do que ele quer aqui**.

Ele decidiu quatro coisas (10/9/2026):

1. Um slide novo é **ou** uma posição parada **ou** o começo de uma partida.
2. Na etapa 2 a partida **corre sozinha e pára só onde há texto**, com botões de
   *ver de novo*, *pausar* e *mudar a velocidade*.
3. O treino (etapa 3) **nasce espelhando a aula e passa a ser dele no primeiro
   toque**. A máquina nunca mais o reescreve; quando as duas divergirem, a tela
   avisa, e existe um botão "refazer a partir da aula" que só ele aperta.
4. Uma aula pode ter **vários treinos**, cada um com sua posição inicial. E o painel
   de lances tem **variações desde já**.

O resultado pretendido: um editor tão bom quanto o do Lichess no que ele faz bem, e
melhor onde ele falha — e as reclamações públicas sobre o editor do Lichess mostram
que **as maiores já estão resolvidas neste repositório**.

---

## A ideia que resolve tudo: o passo com `fen` abre um capítulo

Uma mudança pequena no formato responde às quatro decisões de uma vez.

**Hoje:** o roteiro é uma corrente única de lances, jogada a partir de UMA posição.
**Passa a ser:** um passo que tem `fen` **recomeça a corrente ali**. Os passos
seguintes encadeiam a partir dessa FEN até o próximo passo com `fen`.

Isso é exatamente o capítulo do Lichess, e o que o Doug pediu com outras palavras:

- **posição parada** = um passo com `fen` e sem `lance`;
- **começar a partida dali** = um passo com `fen` seguido de passos com `lance`;
- **a coluna do editor mostra um selo por capítulo** — não por lance. Os lances de
  dentro do capítulo vivem no painel, como no Lichess.

Os 12 capítulos do estudo dele viram 12 selos. Uma partida de 60 lances vira **um**
selo com 60 lances no painel.

### O delta no arquivo é pequeno, e as 3 aulas de hoje não mudam um byte

Em `lib/lesson/schema.ts`, `roteiroPassoSchema` ganha três coisas:

| Campo | O que muda | Por quê |
|---|---|---|
| `fala` | de obrigatória para **opcional** | é a causa literal dos "60 comentários" |
| `fen?` | **novo** | abre capítulo; ausente = continua o capítulo anterior |
| `variacoes?: RoteiroPasso[][]` | **novo**, recursivo | os ramos, na forma já testada de `LancePgn` (`lib/repertorio/pgn.ts:51`) |

E `MAX_PASSOS_ROTEIRO` deixa de ser um teto global: passa a ser **teto por capítulo**,
com um teto de capítulos ao lado. (O Lichess trava em 64 capítulos e é reclamação
frequente no fórum; aqui o número é nosso.)

**As 3 aulas existentes não mudam um byte** porque todos os passos delas têm `fala`,
nenhum tem `fen`, e nenhum tem `variacoes` — os três campos novos são omissões.
Isso é o teste que fecha o primeiro bloco.

### O que a `intro` vira

A apresentação já é uma galeria de posições soltas com FEN própria — ou seja, **ela
já é o modelo novo**, sem corrente. Com `fen` no roteiro, `intro` e `objective`
passam a ter a mesma forma de passo, e `lib/editor/edicoes.ts` deixa de precisar do
`"intro" | "objective"` em toda função. Não é obrigatório fundir as duas agora, e o
plano **não** funde: é ganho de arrumação, não de produto.

---

## A etapa 2: correr sozinha e parar onde há texto

`pausaDoPasso` (`lib/lesson/roteiro.ts:124`) já calcula o tempo a partir do tamanho da
fala. Passo **sem** fala passa a valer só o tempo da animação da peça (~180 ms, o
`duration` do chessground) mais um respiro — a partida corre, e a aula pára onde o
professor escreveu.

Os controles: *Pausar* e *Ver de novo* **já existem** (`ObjectiveStage.tsx:258-270`).
Falta a **velocidade**, e ela não precisa ser inventada — existiu no `ExampleStage.tsx`,
apagado no commit `aeb5ca1`, com três velocidades e botões `aria-pressed`. Recuperar
com `git show aeb5ca1^:components/lesson/ExampleStage.tsx` e reencaixar como
multiplicador de `pausaDoPasso`.

---

## A aula que compara dois lances — e o buraco do Lichess que ela fecha

O Doug descreveu a aula que ele quer escrever: numa posição de rei e peão, um lance
segura o empate e outro perde. Ele quer que o aluno **assista à linha certa até o
fim, e depois veja a mesma posição com o lance errado, até a derrota**.

Isso não é "variação que o aluno navega" — é a aula **passando duas vezes pelo mesmo
lugar**. E a resposta já está no formato deste plano, sem máquina nova: **é um
capítulo que retoma de um ponto de outro capítulo.**

```
Capítulo 1  "Segurar a oposição"        fen X → lances certos → empate
Capítulo 2  "E se empurrar o peão?"     retoma do lance 5 do capítulo 1 → lances errados → derrota
```

Na etapa 2 o aluno vê os dois em sequência: a linha certa corre até o fim, o tabuleiro
**volta ao lance 5**, e a alternativa corre até a derrota. A tela pode dizer a volta
em uma frase ("Voltamos ao lance 5 — e se em vez de Rg7 jogássemos Rg5?").

**A prova de que é isto que ele quer está no estudo dele.** Os capítulos vêm em pares
que são a mesma posição vista de dois jeitos: *"P1.03 — Peão na sexta: brancas jogam e
vencem"* (1-0) e *"P1.04 — Peão na sexta: pretas jogam e empatam"* (½-½). E o
comentário que abre o P1.04, escrito por ele, é:

> *"Compare com P1.03: as peças estão nos mesmos lugares, mas agora as pretas jogam
> primeiro."*

**Ele escreveu com palavras o que a ferramenta não sabia fazer.** O Lichess só tem
capítulos soltos, então a comparação — que é o conteúdo da aula — teve de virar prosa
apontando para outra tela. Aqui ela vira estrutura: o capítulo 2 declara de onde
retoma, e o aluno vê a comparação acontecer em vez de ler que ela existe.

### O campo, e por que ele é melhor que colar a FEN outra vez

O capítulo declara onde começa, de uma de duas formas:

- **`fen`** — posição nova, do zero (é o capítulo comum);
- **`retomaDe: { capitulo, lance }`** — o mesmo tabuleiro do capítulo anterior, num
  ponto dele.

O segundo importa por dois motivos. Primeiro, a bifurcação quase nunca é no começo:
é no meio de uma linha, e colar a FEN daquele ponto obrigaria o Doug a jogar os lances
à mão para descobri-la. Segundo, e mais importante: **as duas ficam ligadas** — se ele
mudar o lance 3 da linha certa, a comparação segue junto em vez de mentir em silêncio.

### E isto faz "colar PGN" cair de pé

Um PGN com variações é exatamente esta estrutura vista do outro lado: uma variação no
lance 5 **é** um capítulo que retoma do lance 5. Então colar um PGN comentado do
Lichess produz sozinho a aula que ele quer — linha principal como capítulo, cada
variação como um capítulo que retoma. Não é coincidência: é a mesma árvore, com dois
nomes.

### O que fica de fora, de propósito

**Os ramos do painel de lances continuam não aparecendo para quem assiste.** Um ramo
que o Doug promoveu a comparação vira capítulo e é visto; um ramo que ele deixou no
painel é material de autoria e de treino. A diferença é a decisão dele, e ela se toma
com um gesto: *"mostrar esta variante na aula"*.

---

## A etapa 3: o treino deixa de ser saída, sem perder o que o tornava confiável

Esta é a parte cara, e a que reabre uma decisão que o projeto tinha por escrito
(`schema.ts:788-808`: *"esta etapa é SAÍDA, não entrada"*).

Hoje `derivarTreino` produz `stages.guided` inteiro, o gate compara com o arquivo
(`TREINO_DESATUALIZADO`) e o `--write` **sobrescreve**. Se a etapa virasse entrada
sem mais nada, cada edição do Doug sumiria em silêncio na conferência seguinte — e
uma das 43 mutações (`mutation-check.ts:1046`) existe justamente para garantir que
isso acontece.

**A saída é não misturar os dois donos dentro do mesmo objeto**, que é a regra que o
projeto já escreveu e que este plano mantém:

`stages.guided` passa a ser uma **lista de treinos**, e cada treino declara quem manda:

```
guided: {
  treinos: [
    { origem: "aula",    …a árvore… },                    // derivado, como hoje
    { origem: "proprio", nascidoDe: "<hash>", fen: "…", …a árvore… }
  ]
}
```

- **`origem: "aula"`** — a máquina deriva, compara e reescreve, exatamente como hoje.
  `TREINO_DESATUALIZADO` continua valendo, e a mutação continua vermelha.
- **`origem: "proprio"`** — o `--write` **não toca**. O gate só julga (as ~50 regras
  continuam valendo sobre a árvore). Ele nasce por cópia do derivado, no primeiro
  toque do Doug, e guarda em `nascidoDe` o hash da aula naquele momento.

**O aviso de desencontro reusa um mecanismo que já existe.** Quando o hash da aula
não bate mais com `nascidoDe`, o gate emite um **aviso amarelo** (não um erro) — é a
mesma mecânica de caducidade de `lib/lesson/excecoes.ts` + `EXCECAO_CADUCA`, já
construída e já com mutação. O botão "refazer a partir da aula" recopia o derivado
por cima, e a tela diz antes o que se perde.

**Vários treinos, e em dois lugares.** O Doug escolheu os dois: um capítulo pode ter
treino próprio ("assiste ao capítulo 3, treina o capítulo 3"), **e** a aula pode ter
treinos gerais no fim. A lista é uma só — `guided.treinos[]` —, e o que muda é um
campo: o treino que pertence a um capítulo declara `capitulo`, e o que é da aula
inteira não declara nada. A tela do aluno insere o treino do capítulo logo depois de
assistir a ele, e os da aula no fim.

Isso custa uma coisa que precisa ser dita: **a ordem das etapas deixa de ser fixa**.
Hoje é `intro → objective → guided → practice`, um array de quatro
(`lib/lesson/store.ts:31`) que a trilha numera por posição. Com treino por capítulo, a
sequência passa a ser montada a partir do conteúdo. É a parte mais cara da decisão
"os dois", e é o motivo de ela vir no bloco F e não antes.

A store já tem o afordance de pluralidade pronto — mas para `practice`, não para
`guided`: `practices: Record<string, …>` com o comentário *"no dia em que uma aula
quiser mais de uma partida, entra chave nova sem mexer no estado"*
(`lib/lesson/store.ts:163-172`). O trabalho é copiar esse padrão para `trees`, hoje
travado no literal `TreeKey = "guided"`.

**Uma armadilha que morde.** `chaveDoDefensor(treeKey, nodeId)` (`lib/lesson/defensor.ts:62`)
usa o **id do nó como semente** da escolha de defesa. Com ids escolhidos à mão,
renomear um nó troca a variante que o aluno enfrenta. Os ids do treino próprio
continuam sendo gerados (`n1..nk`), nunca digitados.

---

## O painel de lances

Não existe nenhuma tela com árvore de lances neste projeto — a mais próxima é
`FitaDeLances.tsx`, linear e sem clique. Mas a **estrutura de dados** existe e é
testada contra 20 arquivos reais: `LancePgn = {san, nags[], comentario, variacoes[][]}`
(`lib/repertorio/pgn.ts:51`), com a mecânica de caminhamento de `arvore.ts:273` (pilha
+ `undo`, variação resolvida na posição de antes do lance que ela substitui).

O desenho da tela copia o do Lichess, porque ele resolve o problema certo: **os lances
correm em linha, compactos, até que um deles tenha comentário — e aí a lista abre em
bloco.** É isso que faz 60 lances caberem sem virar 60 telas.

Do menu de botão direito do Lichess, copiar o vocabulário inteiro, que está completo:
*Transformar em linha principal · Comente sobre este lance · Anotar com símbolos ·
Copiar PGN da variante · Excluir a partir daqui*.

Peças que já servem sem mudança: `Lapis.tsx` (texto no lugar, com régua),
`autoriaDoDesenho`/`desenhoDaAutoria` (`lib/chess/annotations.ts`), `applyUci` e
`samePosition` (`lib/chess/fen.ts`), `legalDests`, e `Miniatura.tsx` para o selo do
capítulo.

**O buraco central: não existe escritor de PGN.** Há leitor, não há escritor
(`MODO-EDITOR-PLANO.md:25`). Ele é do Bloco 5A do plano antigo e vira pré-requisito
de "colar PGN" e "copiar PGN da variante".

---

## A coluna do editor: o que sobrevive

Tudo. O "+", a lixeira com desfazer e o arrastar continuam **exatamente como estão** —
o que muda é o que mora dentro de um selo. E duas coisas ficam mais simples:

- `podeApagarPasso` e `podeMoverPasso` passam a valer **dentro de um capítulo**, porque
  a corrente de lances agora começa e termina nele. Hoje 10 dos 13 selos da N1-KPK
  recusam o arrasto; com capítulos, quase tudo se move.
- O `diagramaDoOnde` (`lib/editor/saida-do-gate.ts:83`) é o **único** ponto que traduz
  `roteiro[3]` em "terceiro selo". Um formato novo de `onde` no gate se resolve ali e
  em nenhum outro lugar.

---

## Onde ganhamos do Lichess, e onde copiamos

As reclamações públicas sobre o editor do Lichess — fórum e o issue de coaches
(lichess-org/lila#6524) — apontam sete buracos. **Cinco já estão fechados aqui:**

| Reclamação recorrente no Lichess | Como este projeto já responde |
|---|---|
| **"A lição interativa só aceita UM lance certo"** — a maior de todas; sidelines viram *"Retry"* | `expects[].moves[]` (até 4), `authorAlternatives` **com feedback próprio**, `methodAlternatives` gerados, e `mistakes` — erros **nomeados**, cada um com sua explicação |
| Não dá para trocar a posição inicial de um capítulo depois de criado | Já está planejado editar a FEN no lugar, **arrastando a proveniência junto** (Bloco 3) |
| Teto de 64 capítulos, teto de lances por capítulo | Os tetos são nossos, e são constantes exportadas com motivo escrito |
| O aluno burla a restrição do professor abrindo o explorador pelo atalho | O nosso aluno não tem explorador; a etapa 3 é fechada |
| Não dá para saber se o aluno realmente aprendeu | Escada de repetição espaçada (`lib/finais/escada.ts`), progresso por aula |

E temos três coisas que o Lichess não tem e não vai ter: **um gate com ~50 regras que
julga a aula inteira**, a **tablebase offline** como juiz de verdade (`winningMoves`),
e a **régua de voz editorial**. Mais o `git diff` — cada edição é revisável depois.

E há um sexto buraco, que o estudo do Doug expõe melhor que qualquer fórum: **o
Lichess não sabe comparar dois lances na mesma aula.** Ele teve de partir a comparação
em dois capítulos e costurá-los na prosa (*"Compare com P1.03…"*). O `retomaDe` fecha
isso — ver a seção da aula que compara dois lances, acima.

**O que copiar sem vergonha:** o painel de lances que abre em bloco no comentário; o
menu de botão direito; o diálogo de capítulo novo com cinco portas (*Vazio · Editor ·
URL · FEN · PGN*, com PGN colado ou arquivo); a **dica sob demanda** por nó (o
`gamebook` já tem, e o nosso `treino.dica` já é isso); e o botão **Preview** (a nossa
prévia já existe).

**Os símbolos: só os seis de qualidade do lance** (`!`, `?`, `!!`, `??`, `!?`, `?!`),
por decisão do Doug — não os 24. Os seis não são enfeite: o compilador do repertório
**já os lê** para separar alternativa aceita de erro nomeado
(`NAGS_BONS`/`NAGS_RUINS`, `lib/repertorio/arvore.ts:76-77`), então eles já têm
significado mecânico nesta casa. As avaliações de posição e as descritivas
(*Zugzwang*, *Iniciativa*, *Com a ideia*) ficam de fora: o curso diz isso em português,
e a régua de voz existe justamente para isso.

**O que NÃO copiar:** o botão **REC**, que liga e desliga a gravação. O nosso modelo —
autosave sempre + rascunho versionado + `git diff` — é melhor e não pede decisão do
professor a cada sessão.

---

## Ordem de execução, cada bloco com um número no fim

**Bloco A — o formato, sem tela.** `fala` opcional, `fen?`, `retomaDe?` e `variacoes?`
no `roteiroPassoSchema`; a corrente do `superRefine` passando a reiniciar no `fen` e a
retomar no `retomaDe`; `montarQuadros` e `derivarTreino` respeitando capítulos; tetos
por capítulo.
*Número:* as 3 aulas de hoje lidas e regravadas **byte a byte**, `derivarTreino`
produzindo árvores idênticas, e as 43 mutações vermelhas.

**Bloco A2 — a aula que compara.** O `retomaDe` de ponta a ponta: a etapa 2 voltando
ao ponto de bifurcação e correndo a alternativa, com a frase da volta.
*Número:* a aula de rei e peão do Doug — linha certa até o empate, volta ao lance da
escolha, linha errada até a derrota — assistida do começo ao fim, com o tempo total
medido. É a aula que ele descreveu, e ela vira o teste.

**Bloco B — a coluna por capítulo.** Um selo por `fen`; `podeApagarPasso`/`podeMoverPasso`
valendo dentro do capítulo; `diagramaDoOnde` no formato novo.
*Número:* na N1-KPK convertida, quantos selos, e quantos aceitam o arrasto (hoje 3 de 13).

**Bloco C — o painel de lances, só leitura.** Os lances em linha, o comentário
quebrando em bloco, as variações aninhadas, clique navegando.
*Número:* uma partida de 60 lances com 6 comentários cabe na tela sem rolagem
horizontal, em 1366×768.

**Bloco D — o painel editável.** Jogar lance no tabuleiro acrescenta; o menu de botão
direito completo; comentário e símbolos por lance; o escritor de PGN.
*Número:* refazer um capítulo do estudo do Lichess dentro do editor, cronometrado, e
o `git diff` mostrando só o capítulo.

**Bloco E — a etapa 2 nova.** Parar só onde há texto; a velocidade recuperada do
`ExampleStage`.
*Número:* a mesma aula assistida do começo ao fim nas três velocidades, com o tempo
total medido nas três.

**Bloco F — o treino que é dele.** `guided.treinos[]`, `origem`, `nascidoDe`, o campo
`capitulo` (treino de capítulo × treino da aula), o aviso de caducidade com mutação
própria, o botão "refazer a partir da aula", a store plural, e a sequência de etapas
montada a partir do conteúdo em vez do array fixo de quatro.
*Número:* editar um treino, mudar a aula, ver o aviso; apertar "refazer" e ver o
treino voltar ao derivado — com o `git diff` das duas operações. E uma aula com treino
no capítulo 3 **e** treino no fim percorrida inteira, na ordem certa.

**Bloco G — as cinco portas.** Colar PGN, FEN, URL de estudo, montador.
*Número:* uma partida de 60 lances colada vira um capítulo com um selo, e o gate fica
verde.

O **Bloco A é o que dá para entregar cedo** e é o que destrava todos os outros. Ele
não tem tela: é formato e testes, e o número que ele produz (as 3 aulas byte a byte)
é a garantia de que nada do que existe quebrou.

---

## O que eu recomendo NÃO fazer

- **Não fundir `intro` e `objective` agora.** Com `fen` no roteiro elas ficam quase
  iguais e a fusão fica tentadora. É arrumação, não produto, e arrasta a galeria da
  apresentação (que hoje é a única FEN sem proveniência) para dentro das regras do
  roteiro.
- **Não deixar o Doug digitar id de nó.** Renomear um nó troca a defesa que o aluno
  enfrenta (`defensor.ts:62`). Os ids continuam gerados, sempre.
- **Não fazer os ramos do painel aparecerem sozinhos na etapa 2.** A comparação que o
  aluno vê é a que o Doug promoveu a capítulo, com um gesto. Ramo que ficou no painel
  é material de autoria e de treino — senão toda análise solta vira aula.
- **Não copiar o REC do Lichess** (acima).
- **Não pôr os 24 símbolos.** Seis, os de qualidade do lance — e mesmo esses porque já
  têm significado mecânico no compilador do repertório.

---

## Verificação

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
   `npm run validate:content`, `npm run validate:mutations`,
   `npm run repertorio:compilar -- --check` — os sete portões do projeto.
2. **O teste que fecha o Bloco A:** ler e regravar `content/lessons/*.json` e comparar
   byte a byte; `derivarTreino` antes e depois com árvores idênticas.
3. **Mutação nova para cada regra nova** do gate, e conferida como o projeto manda:
   desligar a regra de propósito e ver a suíte **cair**. Uma mutação que continua
   vermelha com a regra desligada não guarda nada.
4. **Rodada de navegador** em 1366×768, com a cópia de `content/rascunhos/` feita antes
   e restaurada depois. Medir pelo DOM, não pela tecla (o navegador embutido não
   recebe tecla), e disparar clique pelo manipulador da página (`elemento.click()`),
   porque a escala do ponteiro não é constante.
5. **O Doug testa o arrasto e o painel com a mão dele** — é a parte que nenhuma medida
   minha substitui.

---

## O que ficou em aberto

- **A ordem das etapas.** Com treino por capítulo, a sequência do aluno deixa de ser o
  array fixo de quatro. Onde exatamente o treino do capítulo entra — logo depois de
  assistir a ele, ou depois de assistir à aula toda — é decisão de aprendizagem, e
  vale medir com o Doug antes do bloco F.
- **O agente Fable não rodou** (a conta não tem créditos para o Fable 5.1). Este
  documento foi escrito no Opus 5. Se o Doug liberar créditos, vale mandar o Fable
  **criticar este plano** em vez de refazê-lo do zero — é mais barato e é onde ele
  rende mais.
