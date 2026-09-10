# Modo editor — onde paramos

**Data:** 2026-09-10. **Branch:** `modo-editor`. **Bloco 1 entregue; Bloco 2 pela
metade.** A dívida do palco em 1366×768 foi **paga e medida** — ver a seção
daquela rodada, mais abaixo. O que sobra do Bloco 2 está em "Não começado", e
o **Bloco 2B** (prévia, galeria de diagramas, tetos) foi pedido pelo Doug e
**entregue** em 10/9/2026 — seção própria abaixo.

Este arquivo existe para outro agente (ou outra conta) continuar de onde este
parou, sem ter a conversa na mão. O plano inteiro está em
[`MODO-EDITOR-PLANO.md`](MODO-EDITOR-PLANO.md), ao lado deste — ele foi copiado
para cá justamente porque morava fora do repositório e ia se perder na troca.

> **Leia o plano antes de escrever código.** Ele traz as dez decisões, a régua
> de uso ("leigo edita sem instrução"), o que fica fora e por quê, e a divisão
> em seis blocos. Este arquivo só diz o que já foi feito e o que mudou de rota.

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

## O próximo passo

**A dívida do palco está paga** (seção acima, com os números das duas direções).
O selo está inteiro, e o gesto de arrastar tem onde nascer.

**O Bloco 2B está entregue** (seção acima). O que sobra do Bloco 2 são os
gestos, e agora eles têm com que ser julgados:

1. A **barrinha do tabuleiro** (flecha, casa, limpar, virar) e o chip
   "desenho deste diagrama / alvo do treino".
2. O **lance por arrastar** no diagrama.
3. **Arrastar para reordenar** e `espera` como controle de pausa. (O "+" e a
   lixeira já saíram. O reordenar herda a regra da corrente pronta: mover um
   passo é tirá-lo de um lugar **e** pô-lo em outro, então `podeApagarPasso` já
   responde a metade da pergunta.)
4. `criarMotor()` extraído de `stockfish.ts` e a **barra de avaliação** com
   worker próprio.

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
