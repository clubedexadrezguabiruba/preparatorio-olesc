# Repertório de aberturas do clube

Documento de decisão. Quem for escrever os PGN abre este arquivo e sabe **o que
responder, com que fonte, e quantas linhas cabem**. Escrito em 5/9/2026.

Público: **12 alunos, 8 a 15 anos, força ~1000–1400**. Critério que vale para
tudo: *poucas ideias, mesma estrutura em várias aberturas, linhas curtas,
armadilhas conhecidas.*

- O que existe hoje: a ferramenta (`lib/repertorio/`, `scripts/`) e **20
  rascunhos** importados dos cursos em `content/repertorio/rascunhos/`.
- O que o **B3** escreveu: as **22 linhas do Base das brancas**, em sete arquivos
  `content/repertorio/brancas-*.pgn`, já compiladas para `public/repertorio/`.
- O que o **B4** começou: as **3 linhas do bispo em c4** das pretas, em
  `content/repertorio/pretas-siciliana.pgn` — o ⚠ mais frequente da lista.
- O que **não** existe: as outras **17 linhas das pretas**, e a tela em que o
  aluno treina. Nenhum arquivo de `app/` lê o repertório ainda.

---

## 1. A decisão

Uma fonte por abertura sempre que possível; onde a fonte não cobre, **livro +
motor**, marcado ⚠ e com a proveniência dizendo isso. Nada é inventado.

### Brancas — 1.e4

| Contra | % em 1.e4 | Sistema | Fonte | Base |
|---|---|---|---|---|
| 1…e5 | **60,3 %** | **Escocesa** 2.Nf3 Nc6 3.d4 | Grigoryan + Krikor | **9** |
| 1…e5 2…d6 Philidor | 13,7 % de 1…e5 | 3.d4, Bf4 + Qd2 + O-O-O | Krikor (Peão Rei) | **2** |
| 1…e5 2…Nf6 Petroff | 11 % de 1…e5 | 3.Nxe5 d6 4.Nf3 Nxe4 5.Nc3 | Grigoryan | **1** |
| 1…c5 | 10,1 % | **Alapin** 2.c3 | Krikor (3 capítulos) | **3** |
| 1…d5 Escandinava | 8,6 % | 2.exd5 Qxd5 3.Nc3 | Grigoryan + Krikor | **2** |
| 1…e6 Francesa | 6,8 % | **3.Bd3** | Grigoryan + livro/motor | **3** |
| 1…c6 Caro-Kann | 4,7 % | Trocas 3.exd5 cxd5 4.Bd3 | Grigoryan | **2** |
| 1…d6/g6 Pirc | 4,2 % | — | — | **princípios** |
| 1…Nc6, 1…Nf6, 1…b6 | < 2 % cada | — | — | **princípios** |

**Soma do Base das brancas: 22 linhas.** Escritas no B3, em
`content/repertorio/brancas-*.pgn`.

### Pretas

| Contra | % | Sistema | Fonte | Base |
|---|---|---|---|---|
| 1.e4 (68,2 % da raiz) | | **1…c5** | | **13** |
| · 2.Bc4 e 2.Nf3 Nc6 3.Bc4 | ~31 % das sicilianas | …Nc6, …e6, e expulsar o bispo | livro + motor | **3** ✔ |
| · 2.Nf3 Nc6 3.d4 Aberta | ~12 % | **Dragão Acelerado** 4…g6 | Grigoryan | **4** |
| · 3.Bb5 Rossolimo | ~5 % | 3…g6 4.Bxc6 dxc6 | Grigoryan | **2** |
| · 2.Nc3 Grand Prix / Fechada | 8,3 % | …Nc6, …g6, …Bg7 | Grigoryan (sidelines) | **2** |
| · 2.c3 Alapin | 3,9 % | 2…Nf6 3.e5 Nd5 | Grigoryan | **1** |
| · 2.d4 Morra | 10,4 % (quase tudo transpõe) | 2…cxd4 | Grigoryan (sidelines) | **1** |
| 1.d4 (20,8 % da raiz) | | | | **6** |
| · 2.c4 e6 | 29,4 % de 1.d4 d5 | **Manhattan** …Nbd7/…Bb4 | Kushager | **3** |
| · 2.Bf4 Londres | 21,8 % | 2…c5, …Nc6, …Qb6 ⚠ | Kushager (1 capítulo) | **2** |
| · 2.Nf3/2.e3/2.Nc3 Colle, Jobava | 38,5 % somados | ⚠ sem fonte | livro + motor | **1** |
| 1.c4, 1.Nf3, 1.b3, 1.f4, 1.g3 | ~8 % da raiz | mesma estrutura do GDR | Grigoryan (Inglesa) | **1** |

**Soma do Base das pretas: 20 linhas**, das quais **3 escritas** — o bispo em c4.
Total geral: **42**, contra a meta de ~40.

---

## 2. Os dez achados que mudaram o repertório

Medidos em 5/9 com `npm run repertorio:explorer` (tabela na §6) e com
`npm run repertorio:importar`. Cada um muda o que o B3–B5 escreve.

### 2.1 Na Escocesa, o tronco da fonte é a terceira resposta mais comum

Depois de `4.Nxd4` (7,0 M de jogos na faixa): **4…Nxd4 é 52 %**, 4…Bc5 é 16 %,
4…Nf6 é 13 %. O tronco do draft do Grigoryan é o 4…Bc5, e o 4…Nxd4 aparece lá
numa sub-variante marcada `$2` com **um lance e meio**: `5.Qxd4 d6` e `5…Nf6?`.

Depois de `5.Qxd4`: Nf6 30,8 %, d6 25,4 %, **c5 16,4 %**, **b6 8,5 %**. Os dois
últimos não existem no arquivo.

**Decisão:** o Base da Escocesa é construído em torno de **4…Nxd4 5.Qxd4**, com
as quatro respostas do lance 5. `4…Bc5` e `4…Nf6` ficam com uma linha cada.
`5…c5` e `5…b6` ⚠ **livro + motor**.

### 2.2 A Petroff tem duas fontes, e elas discordam

O Krikor joga `3.d4`; o Grigoryan joga `3.Nxe5 d6 4.Nf3 Nxe4 5.Nc3`. Importar as
duas daria ao aluno dois terceiros lances para a mesma posição.

**Decisão (a de 5/9, do Doug): Grigoryan.** O capítulo do Krikor está na lista de
exclusão do `content/repertorio/fontes.json`, com o motivo escrito.

### 2.3 Os dois lados do clube não se encontram na Alapin

O Krikor manda as brancas jogarem `4.Bc4!` depois de `2.c3 Nf6 3.e5 Nd5`. O
arquivo do Grigoryan, que é a fonte das **pretas** na mesma posição, cobre
`4.d4` e `4.Nf3` — e **não cobre 4.Bc4**, que é 17,5 % na faixa. O `4.c4`, 10 %,
também falta.

**Decisão:** a resposta a `4.Bc4` e `4.c4` entra ⚠ **livro + motor**. Até ela
existir, o "bônus pedagógico de treinar os dois lados da mesma posição" que o
plano prometia é falso, e não deve ser dito na aula.

### 2.4 A linha principal do Maroczy não é alcançável pelo nosso repertório

`Maroczy Bind.pgn` entra por `1.c4 c5 2.Nf3 Nf6 3.d4`, com o peão em **e2**.
Nosso repertório chega por `1.e4 c5 … 5.c4`, com o peão já em **e4**. A linha
principal do arquivo (`6.g3`, `9.Nb3 Qh5`) parte de uma posição que não existe no
nosso caminho; só a sub-variante `6.e4 Bg7 7.Be3 d6 8.Be2 O-O 9.O-O` transpõe.

E `5.c4` é **3 %** das respostas a `4…g6` — ou seja, ~0,3 % das Sicilianas.

**Decisão:** o Maroczy sai do Base. Vai para o Avançado, e só a sub-árvore do
`6.e4`. O `00-ESTADO.md` de 5/9 registrava "vs 6.g3 → 8…Qa5/9…Qh5" como cobertura
fechada; **isso estava errado** e fica corrigido aqui.

### 2.5 No Dragão Acelerado falta o lance mais comum

Depois de `4…g6` (325 k jogos): **5.Nxc6 é 36 %** — mais que 5.Nc3 (33,1 %). O
arquivo do Grigoryan não tem 5.Nxc6 (só o `7.Nxc6`, dois lances depois).

**Decisão:** ⚠ **livro + motor**, e é a primeira linha das pretas a escrever.

### 2.6 O bispo em c4 é o que a criança mais faz contra a Siciliana

`2.Bc4` (Bowdler) é **19,2 %** das Sicilianas, e `2.Nf3 Nc6 3.Bc4` é mais
**29,2 %** de 41,7 % ≈ 12 %. Somados, **~31 %** — mais que a Siciliana Aberta.

No `coutering sicilian's sidelines.pgn`, o ramo do Bowdler é o mais vazio do
arquivo: `4. e5 {Where the Knight goes?} (4. d3 {How to fight for the center?})
(4. Nc3 {What is our important move?})`. Três perguntas, nenhum lance.

E a posição é espalhada: depois de `2.Bc4 Nc6`, as quatro respostas mais comuns
cobrem só **73,2 %** — o menor número da tabela inteira.

**Decisão:** **3 linhas**, a maior fatia das pretas, ⚠ **livro + motor**.

**Escrito no B4, e como.** O `2…Nc6` fica: é o lance do arquivo do Grigoryan e é
a posição que a §6 mediu — trocá-lo por `2…e6` invalidaria aquela linha da tabela
e obrigaria a uma consulta nova ao explorer. O `3…e6` também está no arquivo, sem
continuação, e o motor o confirma: é o **primeiro** lance dele contra `3.Nf3` e
contra `3.d3`, e o segundo contra `3.Qf3`, a 4 centésimos do primeiro. Uma
resposta só para os três.

Pelo corte da §4 aplicado à linha da §6, cabem os três mais frequentes: `3.Nf3`
36,4 %, `3.Qf3` 14,7 % e `3.d3` 11,1 %. O `3.Qh5`, 11,0 %, cai por um décimo de
ponto percentual — e a resposta a ele é a do `3.Qf3`, dita no comentário da
linha.

O que muda de linha para linha não é o lance, é **quem expulsa o bispo**: contra
`3.Nf3` é o peão `…d5`; contra `3.d3`, que segura d5, são `…a6`, `…b5` e o cavalo
a a5. Medido nas pontas: pretas **+0,67** contra `3.Qf3`, **+0,24** contra `3.d3`,
e igualdade contra `3.Nf3`.

### 2.7 A Francesa 3.Bd3 são três estruturas, não uma

A decisão B do Doug (Grigoryan para Caro e Francesa) **fica**. Mas ela custou o
argumento que a justificava no plano — "Caro e Francesa com o mesmo Bd3 de
Trocas, uma estrutura só". Depois de `3.Bd3` (104 k):

- **3…c5 38,2 %** — a fonte responde com três lances nossos marcados `!?`
  (`5.c3 $5`, `5.dxc5 $5`, `5.Nf3 $5`), e só um tem continuação;
- 3…dxe4 22,2 % — o tronco da fonte;
- **3…Nc6 14 %** — não existe no arquivo;
- 3…Nf6 13,4 % — a fonte vai para `4.e5`, que é estrutura de **Avanço**.

**Decisão:** 3 linhas (3…c5, 3…dxe4 e 3…Nc6). `3…c5` precisa de **uma** escolha
entre os três `!?` — ⚠ decisão nossa, não da fonte; o B3 escolheu `5.c3`, e o
motor põe os três a menos de um décimo de peão um do outro. `3…Nc6` saiu por
livro + motor: `4.Nf3 dxe4 5.Bxe4 Nf6 6.Bg5`, cravando o cavalo na dama.

Esta linha era 2 até 5/9. Subiu para 3 por decisão do Doug: `3…Nc6` é 14 %, mais
frequente que respostas que já tinham linha, e a fonte não a cobre.

### 2.8 Na Caro falta a segunda resposta mais comum

Depois de `4.Bd3`: Nc6 57,5 %, **Nf6 30,9 %**. O arquivo só tem 4…Nc6. O plano-mãe
já marcava esse ⚠; o `00-ESTADO.md` o apagou ao consolidar.

**Decisão:** 2 linhas; `4…Nf6` ⚠ livro + motor.

### 2.9 Setenta e um por cento de 1.d4 d5 não é 2.c4

`1.d4 d5` (72,8 M): c4 29,4 %, **Bf4 21,8 %**, Nf3 14,4 %, e3 12,2 %, Nc3 11,9 %.
O Short & Sweet do Kushager tem **uma** linha de Londres, **zero** de Colle e de
Jobava, e **duas** de Catalã — que é 10,5 % de 16,5 % de 29,4 %, ou seja ~0,5 %.

**Decisão:** Londres ganha 2 linhas; Colle/Jobava/2.e3 ganham 1 (⚠ livro +
motor); a Catalã vai para o Avançado. Contra a Londres, `2…c5` é a resposta
prevista, e o explorer mostra que ela leva a `3.e3` 40,9 % / `3.c3` 23,5 % —
duas linhas cobrem 64 %.

### 2.10 Três defesas não entram em nível nenhum

Pirc (1…d6 2,6 % + 1…g6 1,6 % = 4,2 %), Nimzowitsch (1…Nc6 1,6 %), Alekhine
(1…Nf6 1,3 %), Owen (1…b6 < 1 %). Pelo corte da §4 nenhuma chega ao Base, e o
Nimzowitsch não chega nem ao Avançado — apesar de existirem dois draft do
Grigoryan (16 linhas) prontos para eles.

Detalhe do Pirc: o arquivo começa em `1…d6`. O `1…g6` sem `…Nf6` **não transpõe**
para ele, então nem essa cobertura é inteira.

**Decisão:** **princípios em `content/repertorio/notas/`**, uma página de texto,
sem exercício no treinador. Libera ~16 linhas do orçamento — que é exatamente o
que a Escocesa e o Bowdler precisam.

---

## 3. O que fica de fora, e por quê

| Fora | Por quê |
|---|---|
| Os 5 `Anti-Sicilian with Nc3` (Grigoryan) | Decisão do Doug em 5/9. São 5 partes de ataque de GM; o critério é "poucas ideias, linhas curtas", e a Alapin é uma ideia só (c3 + d4, centro grande). |
| Módulos de Avanço do Krikor (5, 6, 10, 11) | Francesa e Caro vão pelo Grigoryan (decisão B do Doug). |
| `Engine's match, French Be7.pgn` (207 KB, 72 partidas) | É base de partidas de motor, não repertório. |
| `--Defesa Petroff--` do Krikor | Conflito de repertório — §2.2. |
| `partidas-modelo/` (8 partidas de GM) | São partidas inteiras. Servem para a aula do Sábado 2 e para a apostila, não para o treinador de linhas. |
| Pirc, Nimzowitsch, Alekhine, Owen | Frequência — §2.10. Viram princípios. |
| Maroczy no Base | Frequência e transposição — §2.4. Vai para o Avançado. |
| Catalã (Kushager) | ~0,5 % de 1.d4. Avançado. |

**Alekhine e Owen nunca são atribuídos ao Krikor.** A decisão do Doug em 5/9 foi
seguir sem mais exportação do chess.com; se um dia virarem linha, a fonte é
`[Fonte "Livro + motor — sem fonte de curso"]`.

---

## 4. Os dois níveis, e a definição do corte

- **Base** — todos os 12 alunos. Até o **lance 8 nosso**. Meta ~40 linhas.
- **Avançado** — tabuleiros 1 e 2 de cada equipe. Até o **lance 12 nosso**.
  Meta +40 linhas.

Profundidade contada em **lance nosso**, não em meios-lances
(`PROFUNDIDADE` em [lib/repertorio/linhas.ts](../lib/repertorio/linhas.ts)). O
plano original trazia três números para a mesma coisa, e o de "16 meios-lances"
é incompatível com a regra "toda linha termina num lance nosso": numa árvore das
brancas o 16º meio-lance é **das pretas**. Contado em lance nosso o número é um
só — 8 e 12 — e os meios-lances saem por cor: 15/23 nas brancas, 16/24 nas
pretas.

### O corte por frequência, definido

O plano dizia "≥ 10 %" sem dizer **de quê**. Medido contra o nó pai, esse corte
joga a Caro-Kann inteira (4,7 % das respostas a 1.e4) para fora do Base; medido
em absoluto, sobram só 1…e5 e 1…c5. Nenhum dos dois é o que se quer.

A definição que vale (`aCobrir` em
[lib/repertorio/explorer.ts](../lib/repertorio/explorer.ts)):

> Numa posição em que **o adversário escolhe**, com ≥ 200 jogos no explorer, as
> respostas entram **em ordem de frequência até cobrir 80 % daquela posição, no
> máximo 4**. No Avançado, até 90 % ou no máximo 6.
>
> Uma **abertura inteira** entra no Base se a resposta dela no lance 1 tem
> **≥ 4 %**. Abaixo disso vira princípios em `notas/`.

O teto de 4 ganha do percentual quando os dois brigam. É deliberado: "poucas
ideias" é critério pedagógico, e cinco respostas numa posição só já é decoreba.
Quando o teto morde, a coluna "coberto" da §6 mostra o preço — no Bowdler são
73,2 %, e o aluno vai ver coisa fora do que treinou em um de cada quatro jogos.

### Prazo

O **Base** serve os 12 alunos e a aula do Sábado 2 (19/9): vence com a F2, em
**18/9**. O **Avançado** serve 4 alunos e **pode passar de 19/9** — está escrito
aqui para o cronograma não tratar os dois como o mesmo poste.

---

## 5. Proveniência e formato

**Os lances são fato com proveniência; o texto é redigido do zero.** É a política
que o projeto já segue para posições de livro.

- Os PGN originais ficam **fora do repositório**, nas pastas de
  `REPERTORIO_FONTES` (hoje `Downloads\repertorio-fontes` e `Downloads\krikor`).
  Prosa de curso pago não entra no Git nem no site.
- `npm run repertorio:importar` escreve **um rascunho por arquivo de fonte** em
  `content/repertorio/rascunhos/`, sem uma palavra de prosa, com os NAGs
  mantidos e a tag `[Fonte]` preenchida. Nunca sobrescreve.
- O rascunho é revisado à mão e vira `content/repertorio/<cor>-<abertura>.pgn`.
  `npm run repertorio:compilar` transforma isso em `public/repertorio/*.json`.

Cabeçalho de cada PGN revisado: `[Abertura]` (o slug, igual ao nome do arquivo),
`[Nome]`, `[Cor]` (a cor que **o aluno** joga), `[Nivel]`, `[Fonte]`
(obrigatória), `[Result "*"]`.

**Como a árvore vira linhas** — um arquivo é uma árvore, uma linha é um caminho
da raiz até uma ponta:

- ramo num lance **do adversário** → cada alternativa é uma linha própria;
- ramo num lance **nosso** → não é linha. O lance principal é o treinado. Irmão
  com marca boa explícita (`!`, `!!`, `!?`, `$1`, `$3`, `$5`) vira **alternativa
  aceita**; com marca ruim (`?`, `??`, `?!`, `$2`, `$4`, `$6`) vira **erro
  nomeado**, que o treinador nunca aceita; **sem marca não vira nada** — sai no
  relatório da importação e quem decide é quem revisa;
- toda linha começa do lance 1, e **toda linha termina num lance nosso**, com
  comentário. O compilador reprova quem não cumprir.

O padrão do irmão sem marca é o **contrário** do que o plano dizia, e isso foi
medido: são 33 no corpus, e vários são lances que o autor chama de piores em
prosa — `PGN for Pirc Defense.pgn` traz `4. Bc4 $1 ({Why 4.Nf3 is worse?} 4.
Nf3)`. Pela regra antiga, `4.Nf3` viraria resposta aceita.

---

## 6. O que a faixa 1000–1400 joga de verdade

<!-- Gerado por `npm run repertorio:explorer` em 2026-09-05.
     Explorer do Lichess, rapid + classical, faixas 1000/1200/1400 — que são os
     baldes de 200 em 200 pelo piso, ou seja jogadores de 1000 a 1599.
     "entram" = corte do Base: as mais frequentes até cobrir 80 % da posição,
     no máximo 4. O cache está em content/repertorio/cache/explorer/, então
     rodar de novo dá exatamente estes números sem tocar na rede. -->

| posição (o adversário escolhe) | jogos | entram no Base | coberto | sobram |
|---|---|---|---|---|
| raiz — o que as brancas abrem | 620,6 M | e4 68.2%, d4 20.8% | 89% | Nf3 2.3%, e3 2.2%, c4 2.1%, g3 0.9% |
| 1.e4 — a resposta das pretas | 422,0 M | e5 60.3%, c5 10.1%, d5 8.6%, e6 6.8% | 85.8% | c6 4.7%, d6 2.6%, Nc6 1.6%, g6 1.6% |
| 1.e4 e5 2.Nf3 — o 2º lance das pretas | 161,1 M | Nc6 63.3%, d6 13.7%, Nf6 11% | 88% | Bc5 2.9%, Qf6 2.7%, f6 2%, d5 1.6% |
| Escocesa 3.d4 — o 3º lance das pretas | 15,7 M | exd4 58.3%, d6 13.8%, Nf6 5.7%, f6 5.5% | 83.3% | d5 4.3%, Nxd4 3.2%, Bd6 3.1%, Bb4+ 2.6% |
| Escocesa 4.Nxd4 — o 4º lance das pretas | 7,0 M | **Nxd4 52%**, Bc5 16%, Nf6 13% | 81% | Qf6 4.6%, Ne5 2.9%, d6 2.3%, Bb4+ 2% |
| Escocesa 4…Nxd4 5.Qxd4 — o 5º das pretas | 4,0 M | Nf6 30.8%, d6 25.4%, c5 16.4%, b6 8.5% | 81.1% | Qf6 6.2%, Qe7 3.5%, Ne7 1.5%, c6 1.5% |
| Caro Trocas 4.Bd3 — o 4º lance das pretas | 114 k | Nc6 57.5%, **Nf6 30.9%** | 88.4% | e6 4.7%, a6 2%, g6 1.6%, Bf5 0.5% |
| Francesa 3.Bd3 — o 3º lance das pretas | 104 k | **c5 38.2%**, dxe4 22.2%, Nc6 14%, Nf6 13.4% | 87.8% | c6 2.1%, Bb4+ 1.8%, a6 1.6%, Ne7 0.8% |
| Escandinava 2.exd5 — o 2º lance das pretas | 19,1 M | Qxd5 80.8% | 80.8% | Nf6 12.3%, c6 2.9%, e6 1.9%, e5 0.7% |
| Alapin 2.c3 — o 2º lance das pretas | 1,7 M | Nc6 37.6%, d6 21.3%, e6 12.2%, e5 7% | 78.1% | d5 6.6%, Nf6 6.1%, g6 4.3%, a6 2.9% |
| 1.e4 c5 — o 2º lance das brancas | 42,4 M | Nf3 41.7%, **Bc4 19.2%**, d4 10.4%, Nc3 8.3% | 79.6% | c3 3.9%, d3 2.8%, c4 2.8%, f4 2.2% |
| 1.e4 c5 2.Nf3 Nc6 — o 3º lance das brancas | 7,6 M | d4 29.6%, **Bc4 29.2%**, Nc3 13.2%, Bb5 12.6% | 84.6% | c3 7.9%, d3 1.6%, c4 1.2%, e5 1.1% |
| Dragão Acelerado 4…g6 — o 5º das brancas | 325 k | **Nxc6 36%**, Nc3 33.1%, Be3 8.4%, Bc4 5.6% | 83.1% | Bb5 4%, **c4 3%** (Maroczy), c3 2.7%, b3 1.7% |
| Bowdler 2.Bc4 Nc6 — o 3º lance das brancas | 2,6 M | Nf3 36.4%, Qf3 14.7%, d3 11.1%, Qh5 11% | **73.2%** | c3 9.9%, Nc3 8.3%, a3 2.7%, Bxf7+ 2.2% |
| Alapin pelas pretas 3.e5 Nd5 — o 4º das brancas | 34 k | d4 61.8%, **Bc4 17.5%**, c4 10% | 89.3% | Nf3 8.2%, Qf3 1.1%, g3 0.3%, Qb3 0.3% |
| Rossolimo 3.Bb5 g6 — o 4º lance das brancas | 130 k | Bxc6 44.1%, O-O 22.9%, Nc3 10.2%, d4 7.7% | 84.9% | c3 6.6%, d3 4.6%, b3 1.1%, c4 0.6% |
| Grand Prix 2.Nc3 Nc6 — o 3º lance das brancas | 1,4 M | Nf3 46.9%, Bc4 18.1%, Bb5 10.9%, f4 7.5% | 83.4% | d3 5.7%, g3 2.9%, a3 1.9%, Nd5 0.9% |
| 1.d4 d5 — o 2º lance das brancas | 72,8 M | c4 29.4%, **Bf4 21.8%**, Nf3 14.4%, e3 12.2% | 77.8% | Nc3 11.9%, e4 2.8%, c3 1.8%, Bg5 1% |
| Manhattan 2.c4 e6 — o 3º lance das brancas | 5,0 M | Nc3 44.3%, Nf3 16.5%, cxd5 12.9%, e3 11.9% | 85.6% | c5 4.6%, a3 4.3%, Bf4 2.7%, g3 0.9% |
| Manhattan 3.Nc3 Nf6 — o 4º lance das brancas | 1,8 M | Bg5 30.7%, Nf3 26.4%, e3 12.3%, cxd5 10.8% | 80.2% | Bf4 6.9%, a3 5.6%, c5 1.9%, f3 1.2% |
| Londres 2.Bf4 c5 — o 3º lance das brancas | 535 k | e3 40.9%, c3 23.5%, dxc5 14.8%, Nf3 13.5% | 92.7% | Nc3 4.1%, c4 1.2%, Bxb8 0.8%, e4 0.4% |
| Inglesa 1.c4 c5 — o 2º lance das brancas | 1,2 M | Nc3 50.6%, g3 12.8%, Nf3 7.5%, e4 7.3% | 78.2% | e3 7%, d4 5.6%, d3 3.9%, b3 1.6% |
| 1.Nf3 d5 — o 2º lance das brancas | 5,7 M | d4 42%, g3 16.8%, e4 9.4%, Nc3 7.3% | 75.5% | c4 6.7%, e3 6.6%, d3 3.7%, b3 2.1% |

Para refazer: `npm run repertorio:explorer`. Para acrescentar posição, edite
`content/repertorio/posicoes-chave.json` — o script recusa posição em que quem
joga é o aluno, e joga os lances no tabuleiro antes de consultar.

---

## 7. Estado das fontes

Medido com `npm run repertorio:importar` em 5/9. "linhas" é o número de pontas
da árvore, não de parênteses — o `00-ESTADO.md` contava parênteses, e os dois
números são bem diferentes (o Rossolimo tem 19 parênteses e 12 linhas).

| Fonte | linhas | no adv. | pergunta | armadilha | s/ marca |
|---|---|---|---|---|---|
| Scotch Game + Homework | 25 | 11 | 13 | 2 | 2 |
| coutering sicilian's sidelines | 77 | 44 | 37 | 0 | 7 |
| countering the English | 19 | 8 | 9 | 0 | 3 |
| PGN file and Homework (Petroff) | 12 | 4 | 8 | 2 | 0 |
| Countering Nimzowitsch Defense | 11 | 6 | 6 | 0 | 0 |
| alapin (pretas) | 21 | 7 | 4 | 1 | 1 |
| Scandinavian Defense | 17 | 3 | 0 | 0 | 3 |
| Sicilian Defense, Accelerated Dragon | 19 | 1 | 0 | 0 | 1 |
| Maroczy Bind | 15 | 1 | 0 | 0 | 4 |
| Caro Kann | 12 | 0 | 0 | 0 | 0 |
| Nightmare of Rossolimo | 12 | 0 | 0 | 0 | 5 |
| French with Bd3 | 11 | 0 | 0 | 0 | 0 |
| PGN for Pirc Defense | 5 | 0 | 1 | 0 | 1 |
| **Grigoryan (13 arquivos)** | **256** | **85** | **78** | **5** | **27** |
| Defesa do Peão Rei (Krikor) | 44 | 1 | 0 | 0 | 2 |
| Alapin 2.c3 Nf6 (Krikor) | 29 | 5 | 0 | 0 | 1 |
| Alapin 2.c3 d5 (Krikor) | 21 | 1 | 0 | 0 | 1 |
| Escandinava (Krikor) | 17 | 0 | 0 | 0 | 1 |
| Alapin alternativas (Krikor) | 14 | 1 | 0 | 0 | 1 |
| Escocesa sem 3…exd4 (Krikor) | 8 | 1 | 0 | 1 | 0 |
| kushager-short-sweet (10 capítulos) | 10 | 0 | 0 | 0 | 0 |
| **TOTAL (20 arquivos)** | **399** | **94** | **78** | **6** | **33** |

- **no adv.** — a linha termina num lance do adversário: falta a nossa resposta.
- **pergunta** — a fonte pergunta ("Do you remember…", "Check out the advanced
  section") em vez de dar o lance. É o risco que o plano-mãe mandava contar.
- **armadilha** — erro **dele** marcado `$2`/`?` com a punição não escrita. É
  material de "armadilha conhecida" pela metade, e vale fechar.
- **s/ marca** — irmãos de lance nosso sem marca: não viram alternativa aceita.

**Zero SAN ilegal nos 20 arquivos**, inclusive nas 10 linhas do Kushager, que
foram transcritas de captura de tela em português. A legalidade está provada.

### O tamanho do trabalho que sobra

399 linhas importadas, 41 de meta no Base. **94 linhas precisam de um lance
nosso escrito**, e 78 delas param numa pergunta. A maior parte disso morre no
corte por frequência — as 77 linhas das sidelines viram 6, as 44 do Peão Rei
viram 2. O que **não** morre no corte e precisa ser escrito por livro + motor
está na lista de ⚠ abaixo.

---

## 8. Os ⚠ abertos

Doze pontos em que a fonte não responde e alguém tem de escrever a linha por
livro + motor. Em ordem de quanto o aluno vai encontrar. **Cinco fecharam** — os
quatro das brancas no B3 e o Bowdler no B4 —, e estão riscados; os sete abertos
são das pretas e do texto de princípios.

| # | ⚠ | Frequência | §|
|---|---|---|---|
| ~~1~~ | ~~Bowdler `2.Bc4` e `3.Bc4` — resposta e plano~~ — **fechado no B4**, é `…e6` | ~31 % das sicilianas | 2.6 |
| ~~2~~ | ~~Escocesa `4…Nxd4 5.Qxd4 c5` e `…b6`~~ — **fechado no B3** | 25 % de 52 % | 2.1 |
| 3 | Dragão `5.Nxc6` | 36 % de 4…g6 | 2.5 |
| ~~4~~ | ~~Francesa `3…c5` — escolher **um** dos três `!?`~~ — **fechado no B3**, é o `5.c3` | 38 % de 3.Bd3 | 2.7 |
| ~~5~~ | ~~Caro `4…Nf6`~~ — **fechado no B3**, é o `5.c3` | 31 % de 4.Bd3 | 2.8 |
| 6 | Londres `2.Bf4` — confirmar `2…c5, …Nc6, …Qb6` | 22 % de 1.d4 d5 | 2.9 |
| 7 | Alapin pelas pretas `4.Bc4` e `4.c4` | 27 % de 3…Nd5 | 2.3 |
| 8 | Colle, Jobava, `2.e3` | 24 % de 1.d4 d5 | 2.9 |
| ~~9~~ | ~~Francesa `3…Nc6`~~ — **fechado no B3**, é o `4.Nf3` | 14 % de 3.Bd3 | 2.7 |
| 10 | Manhattan `4.Bf4` | 6,9 % de 3.Nc3 Nf6 | — |
| 11 | Maroczy — recortar só a sub-árvore do `6.e4` | Avançado | 2.4 |
| 12 | Pirc, Nimzowitsch, Alekhine, Owen — texto de princípios | < 4,2 % cada | 2.10 |

Os itens 1 a 5 eram o caminho crítico: sozinhos, são o que os alunos mais vão
encontrar e o que nenhuma fonte do Doug responde.

---

## 9. O que já roda

```
npm run repertorio:importar     # fontes -> rascunhos + relatório da §7
npm run repertorio:explorer     # a tabela da §6 (cache versionado)
npm run repertorio:compilar     # PGN revisados -> public/repertorio/*.json
npm run repertorio:compilar -- --check   # só confere; sai com erro se algo falha
npm test                        # 208 testes, 61 deles do repertório
```

Código em [lib/repertorio/](../lib/repertorio/): `pgn.ts` (leitor com variações),
`arvore.ts` (árvore → linhas), `linhas.ts` (schema e regras), `explorer.ts`.

**25 linhas** compiladas para `public/repertorio/`: as 22 das brancas, que são o
Base inteiro daquele lado, e as 3 primeiras das pretas.

O motor do repertório é o mesmo Stockfish 18 de `public/engine/` que serve a
etapa 5 da aula: a cola dele roda em `node` direto, e foi assim que as linhas
de livro + motor foram escolhidas e as pontas conferidas.
