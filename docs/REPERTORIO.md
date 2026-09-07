# Repertório de aberturas do clube

Documento de decisão. Quem for escrever os PGN abre este arquivo e sabe **o que
responder, com que fonte, e quantas linhas cabem**. Escrito em 5/9/2026.

Público: **12 alunos, 12 a 15 anos, força ~700–1700** (rápidas, chess.com).
Critério que vale para tudo: *poucas ideias, mesma estrutura em várias
aberturas, linhas curtas, armadilhas conhecidas.*

**A faixa foi corrigida em 6/9/2026**, e ela era o eixo de duas decisões deste
documento. O recorte de *quais linhas existem* — a tabela da §6 e o corte dos
80 % da §4 — foi medido em **1000–1400**, que é a faixa que estava escrita aqui
antes. Alargar para 700–1700 muda as frequências, e por isso o ⚠13 da §8 existe.
A idade também muda o tom dos comentários: a §5 dizia "português de criança de
10 anos", e o aluno mais novo tem 12.

**E "medir em 700–1700" não é coisa que se possa pedir.** Duas descobertas de
6/9/2026, na hora de fazer:

1. **O explorer não tem balde abaixo de 1000.** Os valores que ele aceita são
   `0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500`, cada um indo até o
   próximo. O piso é um balde só, de **0 a 999**. Não existe "700".
2. **O número do explorer é o do Lichess; o do clube é o do chess.com.** Não são
   a mesma escala: o Lichess começa todo mundo em 1500, então, para a mesma
   força, o número dele é maior — e a diferença é maior justamente embaixo. Um
   aluno de 700 no chess.com não é um jogador de 700 no Lichess; é algo perto de
   1000 a 1200.

Somadas, elas viram o ⚠13 do avesso: traduzir "700–1700" para dentro do
`ratings` daria `0,1000,1200,1400,1600`, que enche a medição de gente **abaixo**
do aluno mais fraco do clube e ainda corta o topo da turma — faixa mais errada
que a que estava lá. Por isso a resposta não foi trocar a faixa por teoria, e
sim **medir três e comparar**: §6.1.

- O que existe hoje: a ferramenta (`lib/repertorio/`, `scripts/`) e **20
  rascunhos** importados dos cursos em `content/repertorio/rascunhos/`.
- O que o **B3** escreveu: as **22 linhas do Base das brancas**, em sete arquivos
  `content/repertorio/brancas-*.pgn`, já compiladas para `public/repertorio/`.
- O que o **B4** escreveu: as **20 linhas do Base das pretas**, em cinco
  arquivos — `pretas-siciliana.pgn` (13, contando as 3 do bispo em c4),
  `pretas-manhattan.pgn` (3), `pretas-londres.pgn` (2), `pretas-colle.pgn` (1) e
  `pretas-outras.pgn` (1).
- O que o **B5** escreveu: **a tela em que o aluno treina** — `/aberturas`, o
  juiz, a tabela de progresso e a gravação. **O Base está fechado: 43 linhas**,
  as 23 das brancas e as 20 das pretas, e agora elas são jogáveis.

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
| · 2.Nf3 Nc6 3.d4 Aberta | ~12 % | **Dragão Acelerado** 4…g6 | Grigoryan + livro/motor | **4** ✔ |
| · 3.Bb5 Rossolimo | ~5 % | 3…g6 4.Bxc6 dxc6 | Grigoryan + livro/motor | **2** ✔ |
| · 2.Nc3 Grand Prix / Fechada | 8,3 % | 3.Nf3 →…g6 (transpõe); 3.Bc4 →…e6 | livro + motor | **2** ✔ |
| · 2.c3 Alapin | 3,9 % | 2…Nf6 3.e5 Nd5 | Grigoryan | **1** ✔ |
| · 2.d4 Morra | 10,4 % (quase tudo transpõe) | 2…cxd4 3.c3 **Nf6** (transpõe p/ Alapin) | livro + motor | **1** ✔ |
| 1.d4 (20,8 % da raiz) | | | | **6** |
| · 2.c4 e6 | 29,4 % de 1.d4 d5 | **Manhattan** …Nbd7/…Bb4 | Kushager + livro/motor | **3** ✔ |
| · 2.Bf4 Londres | 21,8 % | 2…c5, …Nc6, …Qb6 **depois do c3 dele** | livro + motor | **2** ✔ |
| · 2.Nf3/2.e3/2.Nc3 Colle, Jobava | 38,5 % somados | …e6, …c5, …Bd6 | livro + motor | **1** ✔ |
| 1.c4, 1.Nf3, 1.b3, 1.f4, 1.g3 | ~8 % da raiz | 1…e6 e …d5, transpõe p/ Manhattan | livro + motor | **1** ✔ |

**Soma do Base das pretas: 20 linhas, todas escritas no B4.**
Total geral: **42**, contra a meta de ~40. **O Base está fechado.**

Duas correções que o B4 mediu e esta tabela já traz:

- **Londres.** A receita "2…c5, …Nc6, …Qb6" só vale **depois** que as brancas
  jogam c3. Jogada antes, a dama em b6 perde: `3.e3 Nc6 4.Nf3 Qb6? 5.Nc3!` põe
  as brancas **+1,40** no motor. Detalhe na §2.9.
- **1.c4 e as outras primeiras.** A fonte não é o draft `English Opening` do
  Grigoryan: aquele arquivo joga `1…c5` com `…g6` e `…Bg7`, que é outro sistema
  (e entrou como *avançado* na importação). O que vale é a coluna do sistema —
  `…e6` e `…d5`, transpondo para o Manhattan —, e é **livro + motor**.

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

**Escrito no B4.** `5.Nxc6 bxc6!` — e qual peão recaptura é a lição: com o de d7
o motor põe as brancas **meio peão à frente** (+0,52), porque a dama sai e o rei
não roca. Depois de `6.Qd4 Nf6 7.e5 Nd5 8.Nc3`, o Base termina em `8…Qb6`,
oferecendo a troca de damas: iguala sem dar peão, enquanto o `8…Bg7` do motor
iguala **dando** um peão por iniciativa — o que não é linha para um aluno de
1200. As outras três respostas do lance 5 (`5.Nc3` da fonte, `5.Be3`, `5.Bc4`)
**convergem para a mesma posição**: `…Bg7`, `…Nf6`, `…O-O`. Contra `5.Bc4` isso
custa um terço de peão contra o `6…Qa5+` do motor, e a troca foi feita de
propósito — "poucas ideias" é o critério da §4.

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

**Correção do B4: a dama em b6 tem hora.** O documento previa "`2…c5`, `…Nc6`,
`…Qb6`" como uma receita só. Medido no motor:

| linha | avaliação |
|---|---|
| `3.e3 Nc6 4.Nf3 Qb6?` **5.Nc3!** | brancas **+1,40** |
| `3.e3 Nc6 4.Nf3 Nf6 5.c3 Qb6` | igual (e `6.Qb3 c4` põe as pretas +0,25) |
| `3.c3 Qb6` de cara | igual |

A razão é uma só, e cabe numa frase para a criança: **quem defende b2 é o cavalo
indo a c3.** Enquanto essa casa estiver livre, a dama em b6 não incomoda; assim
que o peão dele ocupa c3, ela incomoda de graça. É por isso que contra `3.c3` a
dama sai no lance 3, e contra `3.e3` ela espera até o lance 5.

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

**Os lances são fato com proveniência; o texto é escrito com as nossas palavras,
carregando o argumento da fonte.** É a política que o projeto já segue para
posições de livro. Não é "redigir do zero": essa leitura custou os 103
comentários do B6, e a §9 conta o preço.

- Os PGN originais ficam **fora do repositório**, nas pastas de
  `REPERTORIO_FONTES` (hoje `Downloads\repertorio-fontes` e `Downloads\krikor`).
  Prosa de curso pago não entra no Git nem no site.
- `npm run repertorio:importar` escreve **dois rascunhos por arquivo de fonte**.
  O de `content/repertorio/rascunhos/` é o versionado: sem uma palavra de prosa,
  com os NAGs mantidos e a tag `[Fonte]` preenchida, e nunca sobrescreve. O de
  `content/repertorio/rascunhos-anotados/` é o mesmo PGN **com** a prosa da
  fonte, está no `.gitignore` — o repositório é público — e é reescrito a cada
  importação.
- O rascunho é revisado à mão e vira `content/repertorio/<cor>-<abertura>.pgn`.
  Quem escreve o comentário lê o **argumento** no gêmeo anotado e o reescreve em
  **português de adolescente de 12 anos** — frase curta, sem jargão de adulto e
  sem falar com o aluno como se ele tivesse 8; copiar a frase do autor é que não
  pode. (Era "criança de 10 anos" até 6/9/2026, quando o público foi corrigido
  para 12–15. Os 110 comentários que já estão escritos **não** foram revistos
  sob a régua nova: é tarefa de conteúdo, e está no ⚠14 da §8.)
  `npm run repertorio:compilar` transforma isso em `public/repertorio/*.json`, e
  `npm run repertorio:fidelidade` diz onde a fonte fala e nós estamos calados.

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

## 6. O que a faixa medida joga de verdade

O título desta seção dizia "a faixa 1000–1400", e estava errado duas vezes: os
baldes pedidos cobrem **1000 a 1599**, e o número é o do **Lichess**, não o do
chess.com. A tabela continua aqui como está porque é o registro do que de fato
construiu o repertório. O que a faixa certa diria está na §6.1, medido.

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

## 6.1 As três faixas, lado a lado — a medição do ⚠13

Feita em 6/9/2026. Três recortes, definidos em `RECORTES`
([lib/repertorio/explorer.ts](../lib/repertorio/explorer.ts)), cada um com seu
cache versionado numa subpasta própria:

| nome | baldes | o que é |
|---|---|---|
| `lichess-1000-1599` | 1000/1200/1400 | o que a §6 mediu, e de onde saiu o repertório |
| `lichess-1000-1999` | 1000/1200/1400/1600/1800 | ≈ chess.com 700–1700, o público do clube |
| `lichess-0-1799` | 0/1000/1200/1400/1600 | a leitura literal do ⚠13 |

**A pergunta não é se 60,3 % virou 58,1 %.** É se muda o *conjunto de lances que
entra*: percentual que anda não custa linha nenhuma, e resposta que entra ou sai
custa — e, como o id de uma linha é o hash dos lances, custa junto o progresso de
quem já treinou. Por isso o veredito compara conjuntos, e os percentuais ficam de
apoio.

`=` mesmo conjunto e mesma ordem · `~` mesmo conjunto, outra ordem · `≠` o
conjunto muda. O `⚠` marca cobertura abaixo dos 80 % da §4.

| posição (o adversário escolhe) | ? | `1000-1599` | `1000-1999` | `0-1799` |
|---|---|---|---|---|
| raiz — o que as brancas abrem | = | e4 d4 · 89% | e4 d4 · 89% | e4 d4 · 88.8% |
| 1.e4 — a resposta das pretas | ~ | e5 c5 d5 e6 · 85.8% | e5 c5 e6 d5 · 84.6% | e5 c5 d5 e6 · 85.1% |
| 1.e4 e5 2.Nf3 | = | Nc6 d6 Nf6 · 88% | Nc6 d6 Nf6 · 89.7% | Nc6 d6 Nf6 · 88.4% |
| Escocesa 3.d4 | ≠ | exd4 d6 Nf6 **f6** · 83.3% | exd4 d6 Nf6 · 83.2% | exd4 d6 Nf6 · 80.5% |
| Escocesa 4.Nxd4 | ≠ | Nxd4 Bc5 Nf6 · 81% | Nxd4 Bc5 Nf6 **Qf6** · 84% | Nxd4 Bc5 Nf6 **Qf6** · 84.7% |
| Escocesa 4…Nxd4 5.Qxd4 | ≠ | Nf6 d6 c5 b6 · 81.1% | d6 Nf6 c5 **Qf6** · 79.5% ⚠ | d6 Nf6 c5 b6 · 79.9% ⚠ |
| Caro Trocas 4.Bd3 | = | Nc6 Nf6 · 88.4% | Nc6 Nf6 · 90.7% | Nc6 Nf6 · 89.4% |
| Francesa 3.Bd3 | ≠ | c5 dxe4 Nc6 Nf6 · 87.8% | c5 dxe4 Nf6 · 82.3% | c5 dxe4 Nf6 Nc6 · 88.9% |
| **Escandinava 2.exd5** | ≠ | Qxd5 · 80.8% | Qxd5 **Nf6** · 92.9% | Qxd5 **Nf6** · 92.7% |
| Alapin 2.c3 | ≠ | Nc6 d6 e6 e5 · 78.1% ⚠ | Nc6 d6 e6 **d5** · 76.9% ⚠ | Nc6 d6 e6 **d5** · 77.6% ⚠ |
| 1.e4 c5 | = | Nf3 Bc4 d4 Nc3 · 79.6% ⚠ | Nf3 Bc4 d4 Nc3 · 80.4% | Nf3 Bc4 d4 Nc3 · 80% |
| 1.e4 c5 2.Nf3 Nc6 | ≠ | d4 Bc4 Nc3 Bb5 · 84.6% | d4 Bc4 Bb5 **c3** · 83.9% | d4 Bc4 Bb5 Nc3 · 84.1% |
| Dragão Acelerado 4…g6 | ≠ | Nxc6 Nc3 Be3 Bc4 · 83.1% | Nc3 Nxc6 Be3 **c4** · 82.6% | Nc3 Nxc6 Be3 Bc4 · 83% |
| Bowdler 2.Bc4 Nc6 | ≠ | Nf3 Qf3 d3 Qh5 · 73.2% ⚠ | Nf3 d3 **c3** Qf3 · 68.7% ⚠ | Nf3 Qf3 d3 **c3** · 70.2% ⚠ |
| **Alapin pelas pretas 3.e5 Nd5** | ≠ | d4 Bc4 c4 · 89.3% | d4 Bc4 · 81% | d4 Bc4 · 80.3% |
| Rossolimo 3.Bb5 g6 | ≠ | Bxc6 O-O Nc3 d4 · 84.9% | Bxc6 O-O **c3** Nc3 · 85.9% | Bxc6 O-O Nc3 d4 · 84.8% |
| Grand Prix 2.Nc3 Nc6 | ~ | Nf3 Bc4 Bb5 f4 · 83.4% | Nf3 Bc4 f4 Bb5 · 81.2% | Nf3 Bc4 Bb5 f4 · 82.5% |
| 1.d4 d5 | = | c4 Bf4 Nf3 e3 · 77.8% ⚠ | c4 Bf4 Nf3 e3 · 81% | c4 Bf4 Nf3 e3 · 78.6% ⚠ |
| Manhattan 2.c4 e6 | = | Nc3 Nf3 cxd5 e3 · 85.6% | Nc3 Nf3 cxd5 e3 · 87.7% | Nc3 Nf3 cxd5 e3 · 86.3% |
| Manhattan 3.Nc3 Nf6 | ~ | Bg5 Nf3 e3 cxd5 · 80.2% | Bg5 Nf3 cxd5 e3 · 83.7% | Bg5 Nf3 cxd5 e3 · 82% |
| Londres 2.Bf4 c5 | ≠ | e3 c3 dxc5 Nf3 · 92.7% | e3 c3 Nf3 · 82% | e3 c3 dxc5 · 80.2% |
| Inglesa 1.c4 c5 | ≠ | Nc3 g3 Nf3 e4 · 78.2% ⚠ | Nc3 g3 Nf3 **e3** · 84.6% | Nc3 g3 Nf3 **e3** · 80.7% |
| 1.Nf3 d5 | ≠ | d4 g3 e4 Nc3 · 75.5% ⚠ | d4 g3 **c4** e4 · 78.6% ⚠ | d4 g3 e4 **c4** · 75.5% ⚠ |

**23 posições · 14 mudam de conjunto · 3 trocam de ordem.**

Refazer: `npm run repertorio:explorer -- --comparar` — 0 consultas, porque o
cache dos três está versionado.

### O que os 14 querem dizer

Catorze parece muito, e não é: **dez deles são o teto de 4 cortando entre dois
lances quase empatados na quarta vaga.** No Bowdler entra `c3` com 10,7 % e sai
`Qh5` com 8,6 %; no Rossolimo entra `c3` 8,9 % e sai `d4` 7,6 %; na Inglesa entra
`e3` 7 % e sai `e4` 5,2 %. Nenhum é erro de repertório: é a régua tendo de cortar
em algum lugar, e o lugar andando meio ponto.

**Quatro são estruturais — o número de respostas muda, e as duas faixas novas
concordam entre si.** Que elas concordem é o resultado mais forte daqui: a
conclusão não depende de a conversão entre as escalas estar certa.

| posição | o que muda | custa o quê |
|---|---|---|
| **Escandinava 2.exd5** | `2…Nf6` **entra**, com 15,4–18,7 % — de 1 resposta para 2 | **escrita em 6/9/2026: é a 43ª linha.** O `Qxd5` sozinho fechava 80,8 % e o corte parava nele; nas faixas novas ele não fecha, e o `…Nf6` — quase 1 em 5 escandinavas — estava sem resposta no Base |
| **Alapin pelas pretas 3.e5 Nd5** | `4.c4` **sai** — de 3 respostas para 2 | nada a escrever: **encolhe o ⚠7**, que era "`4.Bc4` e `4.c4`" |
| Escocesa 3.d4 | `3…f6` **sai** (3,8–4,5 %) — de 4 para 3 | nada: o Base cobre algo mais raro do que se pensava |
| Escocesa 4.Nxd4 | `4…Qf6` **entra** (5,3–5,6 %) — de 3 para 4 | **em aberto, e é decisão de orçamento.** Pela régua da §4 ele entra; pelo §1 a Escocesa já é a maior abertura do Base, com 9 linhas, e esta seria a 10ª por 5,5 %. Como tudo nesta seção, seria aditiva |

**A assimetria que decide o risco: resposta que *entra* não órfã ninguém.** Uma
linha nova tem lances novos, logo id novo, e os 42 ids de hoje ficam byte a byte
onde estão. Quem órfã progresso é **mudar ou apagar** linha existente — e nenhuma
das quatro estruturais pede isso.

**Conferido ao escrever a Escandinava, em 6/9/2026:** comparando os 42 ids
publicados com os 43 de agora, **0 sumiram e 1 entrou**. A previsão desta seção
foi medida, e não suposta.

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
livro + motor. Em ordem de quanto o aluno vai encontrar. **Dez fecharam** — os
quatro das brancas no B3; no B4 o Bowdler, o Dragão, a Londres, o Colle e o
Manhattan `4.Bf4`; e no B5 o 12, que virou página de princípios em vez de
linha. Sobram **dois** dos doze, e nenhum deles é linha do Base.

Em 6/9/2026 entraram **dois novos**, e eles não são buraco de fonte: são
consequência da correção do público no alto deste documento. O 13 foi feito
primeiro, e não depois do Avançado, exatamente porque podia mudar *quais* linhas
existem: o id de uma linha é o hash dos lances, e mexer nelas órfã o progresso de
quem já treinou.

**Medido em 6/9/2026, o medo não se confirmou — e a razão é uma assimetria.** As
mudanças que a faixa certa traz são de *acrescentar* resposta, e linha nova tem
id novo: os 42 ids de antes ficaram onde estavam. O que órfã é mudar ou apagar
linha existente, e a medição não pediu isso em lugar nenhum. A conta está na
§6.1, e a escrita da Escandinava a confirmou: 0 ids perdidos, 1 acrescentado.

| # | ⚠ | Frequência | §|
|---|---|---|---|
| ~~1~~ | ~~Bowdler `2.Bc4` e `3.Bc4` — resposta e plano~~ — **fechado no B4**, é `…e6` | ~31 % das sicilianas | 2.6 |
| ~~2~~ | ~~Escocesa `4…Nxd4 5.Qxd4 c5` e `…b6`~~ — **fechado no B3** | 25 % de 52 % | 2.1 |
| ~~3~~ | ~~Dragão `5.Nxc6`~~ — **fechado no B4**, é `…bxc6` e `8…Qb6`, igualdade | 36 % de 4…g6 | 2.5 |
| ~~4~~ | ~~Francesa `3…c5` — escolher **um** dos três `!?`~~ — **fechado no B3**, é o `5.c3` | 38 % de 3.Bd3 | 2.7 |
| ~~5~~ | ~~Caro `4…Nf6`~~ — **fechado no B3**, é o `5.c3` | 31 % de 4.Bd3 | 2.8 |
| ~~6~~ | ~~Londres `2.Bf4` — confirmar `2…c5, …Nc6, …Qb6`~~ — **fechado no B4, com correção**: a dama só depois do c3 dele | 22 % de 1.d4 d5 | 2.9 |
| **7** | **Alapin pelas pretas `4.Bc4` — continua aberto.** O `4.c4` saiu junto na §6.1: nas duas faixas novas ele não entra mais no corte, e o ⚠ encolheu para um lance só | 17,5 % de 3…Nd5 | 2.3, 6.1 |
| ~~8~~ | ~~Colle, Jobava, `2.e3`~~ — **fechado no B4**, é `…e6, …c5, …Bd6`, igualdade | 24 % de 1.d4 d5 | 2.9 |
| ~~9~~ | ~~Francesa `3…Nc6`~~ — **fechado no B3**, é o `4.Nf3` | 14 % de 3.Bd3 | 2.7 |
| ~~10~~ | ~~Manhattan `4.Bf4`~~ — **fora do Base pelo corte** (5ª resposta da posição); vai para o Avançado | 6,9 % de 3.Nc3 Nf6 | — |
| **11** | **Maroczy — recortar só a sub-árvore do `6.e4`** | Avançado | 2.4 |
| ~~12~~ | ~~Pirc, Nimzowitsch, Alekhine, Owen — texto de princípios~~ — **fechado no B5**, em `/aberturas/notas/` | < 4,2 % cada | 2.10 |
| ~~13~~ | ~~**O recorte de frequência foi medido na faixa errada**~~ — **medido e escrito em 6/9/2026**. A §6.1 tem as três faixas: 14 das 23 posições mudam de conjunto, e dez delas são o teto de 4 cortando entre quase-empates. Das quatro estruturais, a **Escandinava `2…Cf6`** virou a 43ª linha e as outras três não pedem escrita. **0 ids perdidos, 1 acrescentado.** Sobra uma decisão de orçamento, não de medição: o `4…Df6` da Escocesa | 1 decisão | 6.1 |
| **14** | **O tom dos 110 comentários** — foram escritos para "criança de 10 anos"; o aluno mais novo tem 12. Reler sob a régua nova da §5. | todo o Base | 5 |

Os itens 1 a 5 eram o caminho crítico: sozinhos, são o que os alunos mais vão
encontrar e o que nenhuma fonte do Doug responde. Todos fecharam.

**Sobre o 7, que é o único ⚠ do Base ainda em aberto.** O orçamento da §1 dá
**uma** linha à Alapin pelas pretas, e ela foi para o `4.d4` (61,8 %). Quem
fechava a porta aqui era o orçamento, não a régua: na faixa antiga a posição
pediria três respostas (`d4` 61,8 + `Bc4` 17,5 + `c4` 10 = 89,3 %). O preço,
medido: `4.Bc4` e `4.c4` juntos são 27 % de uma abertura que é 3,9 % das
Sicilianas, que são 10,1 % de 1.e4, que é 68,2 % da raiz — **menos de um jogo em
mil**. É o menor número de toda esta tabela, e por isso ele espera o Avançado. O
item 11 já era, por decisão, fora do Base.

**A §6.1 encolheu o 7 sem custar nada.** Nas duas faixas novas o `4.c4` sai do
corte — a posição pede **duas** respostas, não três, e `d4` + `Bc4` já fecham 80 %
sozinhos. O ⚠ que era "escolher o que fazer contra dois lances" virou "contra
um", e é o mesmo `4.Bc4` que o Krikor manda as brancas do clube jogarem. Continua
esperando o Avançado, agora pela metade do tamanho.

---

## 9. O que já roda

```
npm run repertorio:importar     # fontes -> rascunhos + relatório da §7
npm run repertorio:explorer     # a tabela da §6 (cache versionado)
npm run repertorio:explorer -- --recorte=lichess-1000-1999   # noutra faixa
npm run repertorio:explorer -- --comparar    # as três faixas, lado a lado (§6.1)
npm run repertorio:compilar     # PGN revisados -> public/repertorio/*.json
npm run repertorio:compilar -- --check   # só confere; sai com erro se algo falha
npm run repertorio:motor -- "1.e4 c5 2.Bc4 Cc6"   # as 5 melhores da posição
npm run repertorio:motor -- --pontas              # avalia a ponta de cada linha
npm run repertorio:fidelidade   # onde a fonte fala numa posição nossa, e o que dizemos ali
npm run repertorio:fidelidade -- --pares         # a folha: fonte e nosso, lado a lado
npm run db:migrar               # aplica as migrations, 0005_repertorio_revisao.sql inclusive
npm run db:rls                  # prova que o aluno não grava progresso nem adia a revisão
npm test                        # 577 testes
```

Código em [lib/repertorio/](../lib/repertorio/): `pgn.ts` (leitor com variações),
`arvore.ts` (árvore → linhas), `linhas.ts` (schema e regras), `explorer.ts`,
`motor.ts` (leitura de lances e apresentação, sem processo), e os quatro do
treinador — `treino.ts` (o juiz, a escada e a ordem), `banco.ts`, `progresso.ts`,
`gravar.ts`, mais `passada.ts` — o redutor puro de uma passada pela linha, que
tirou a máquina de estado de dentro do componente. O texto das quatro aberturas
raras: `notas.ts` (schema) e
`conteudo.ts` (leitura conferida na importação).

**43 linhas** compiladas para `public/repertorio/`, em 12 arquivos: as 23 das
brancas e as 20 das pretas. **O Base está completo dos dois lados.** A 43ª é a
Escandinava `2…Cf6`, escrita em 6/9/2026 pelo que a §6.1 mediu — e ela entrou
sem mover nenhum dos 42 ids anteriores, que é a prova da assimetria descrita
lá.

### A tela

`/aberturas` lista as 12 aberturas em dois grupos, com a conta de linhas
aprendidas; `/aberturas/[cor]/[abertura]` é onde se treina. A rota tem `[cor]`
antes de `[abertura]` porque o slug pode repetir entre as duas.

**A conta das barrinhas mudou de direção em 6/9/2026, e era um bug.** Ela varria
o banco de progresso e adivinhava a abertura pelo **prefixo do id**
(`brancas-escocesa-`). Como o id é o hash dos lances, uma linha reescrita deixa
para trás um registro que nenhuma linha reclama — e o prefixo o adotava. O
resultado, se algum dia uma linha mudasse: `/aberturas` mostrando **"3 de 2"**, a
abertura virando **"em dia"** sem o aluno ter visto a linha nova, e o painel
prometendo **"a revisar hoje"** para sempre, sem onde ser feita — enquanto a
página da abertura, que sempre contou pelas linhas de verdade, discordava das
outras duas. É o modo de falha que `progresso.ts` existe para impedir, entrando
por outra porta. Agora o `index.json` carrega os **ids** de cada abertura, e as
três telas contam do mesmo jeito: percorrendo o conteúdo e perguntando o
progresso, nunca o contrário. O órfão fica no banco — não há chave estrangeira
nem política de `delete`, e a `0004` diz que é de propósito —, mas parou de
aparecer.

**Uma sessão são duas fases, na mesma tela.** Na primeira vez em cada linha
(`tentativas = 0`) o aluno entra na **passada assistida**: o cartão diz o lance
por extenso, a seta do lance certo fica desenhada, e o aluno **executa**. Outro
lance não conta — a peça volta e o cartão repete "siga a seta". Onde há
comentário do professor a passada **trava** até o aluno continuar, inclusive nos
comentários que caem em lance do adversário. No fim, sem prêmio sonoro e sem
"muito bom", o botão "Começar o quiz" emenda a **segunda fase**: a mesma linha,
de memória, sem seta e sem o nome do lance. Nada da fase assistida sobe ao
servidor.

**Como uma linha é aprendida: a escada.** `DEGRAUS_EM_DIAS = [0, 1, 3, 7, 14,
30]`, e o degrau é o índice. A linha entra no degrau 1 na **primeira passada
limpa**; dali em diante só sobe quando é acertada **vencida** — a data de
revisão já passou. O degrau **3 é "aprendida"**, e ele só se alcança em três
dias diferentes e espaçados, que é o que "três acertos seguidos" queria dizer e
não dizia. Acerto adiantado ("Jogar de novo" na mesma tarde) soma tentativa e
acertos seguidos, mas não sobe nem empurra a data. Errar **antes** do degrau 3
volta ao 0; errar **depois** desce dois degraus, com piso no 1 — um só era
pouco, e zerar apagaria um mês por um dedo errado no celular. A data de quando
aprendeu **nunca volta a nulo**: errar depois vira revisão, não recomeço.

**O primeiro erro decide a passada na hora** — grava, e os acertos seguidos
voltam a zero. O que mudou é que a linha **vai até o fim** mesmo assim: a peça
volta, a linha do clube entra no lugar e o aluno vê os lances que faltavam. No
fim, um **boletim lance a lance** — um selo por lance nosso, verde ou vermelho,
com a acurácia ao lado. O boletim é do cliente e não é gravado: o que o servidor
grava continua sendo o veredito do primeiro erro.

**A dica é pedida, e antes do primeiro erro ela custa.** Botão "Dica" no quiz,
um nível só: acende a casa de origem, sem seta e sem escalonar. Pedida **antes**
de qualquer erro, ela decide a passada — os lances até ali sobem ao servidor,
`conferirLinha` reprova a lista curta, e a passada fica gravada como treino sem
acerto. Depois do primeiro erro é de graça, porque a passada já foi decidida.

### As quatro revogações de 6/9/2026

Este documento é de decisão, e mudança de ideia sem registro é o que ele existe
para impedir. Quatro coisas que ele afirmava deixaram de valer:

1. **"Na primeira vez o site mostra antes de cobrar", com o tabuleiro só de
   olhar.** Revogado. Assistir não é treinar: o aluno via a linha andar sozinha
   e chegava ao quiz sem ter movido uma peça. A primeira vez agora é **jogar com
   a seta na tela** — o mesmo conteúdo, com a mão dentro. O botão "Ver a linha"
   virou **"Jogar com a seta"**: a saída de emergência continua existindo, para o
   aluno que esqueceu a linha inteira e para quem a dica de uma casa não basta,
   mas ela também é jogada, e continua sem gravar nada.
2. **"Dois erros acendem a casa, três desenham a seta."** Revogado. A escada
   automática de dicas foi escrita para um aluno de 10 anos que "não deduz isso
   sozinho"; o público é de 12 a 15. E, com a escada de revisão, dica de graça
   virou buraco: fechar a linha apertando Dica a cada lance produziria uma
   passada limpa que o servidor não teria como distinguir, porque ele só vê
   lances. A dica passa a ser pedida, e a primeira custa a passada.
3. **A ordem de `proximaLinha`.** Era: nunca vistas, depois as mais longe dos
   três acertos, depois a revisão mais antiga. Com revisão agendada, isso
   quebra dos dois lados — nunca-vista sempre primeiro e as revisões nunca
   acontecem; vencida sempre primeiro e o aluno nunca chega à linha 30. Agora
   ela **alterna**, sem estado de sessão: se a última linha treinada era uma
   revisão, a próxima é nunca-vista; senão, é a vencida mais vencida. E a linha
   que acabou de ser treinada não volta na chamada seguinte, que é o que impede
   o loop de errar-e-repetir a mesma linha.
4. **"Abertura aprendida" querendo dizer "nada a fazer".** Revogado. Com a
   escada, uma abertura inteira aprendida ainda tem linhas vencendo. O cartão só
   aparece quando não há **nenhuma** vencida.

E uma coisa que **não** mudou, apesar de o Move Trainer fazer diferente: a
gravação continua sendo **uma por linha**, e não uma por lance. Lá são oito
`POST` por sessão; aqui o primeiro erro decide a passada na hora e é isso que
protege a verdade gravada contra a aba fechada no meio. A referência medida está
em [REFERENCIA-MOVE-TRAINER.md](REFERENCIA-MOVE-TRAINER.md).

**Os comentários, depois do B6.** Os 12 PGN foram acentuados — 427 trocas, entre
elas `nós` por `nos` no sujeito e `é` por `e`, que a lista original não previa —
e ganharam **32 textos novos no meio das linhas**. Antes, 28 das 42 linhas
andavam até a última tela sem uma palavra; agora nenhuma anda. Os comentários
intermediários foram de 14 para 61 e a maior corrida de telas mudas caiu de 15
para 9. Vários textos caem em lance de **tronco** e por isso valem por muitos: o
`4.Cxd4` da Escocesa aparece em quatro linhas, o `2…c5` da Londres em duas. O id
é hash dos lances, então acentuar e comentar não órfã progresso nenhum — os 42
ids são byte a byte os de antes.

**O raciocínio das fontes, e o buraco que o B6 abriu.** O que vem do Krikor e
do Grigoryan são os **lances**; até 6/9/2026 a justificativa de cada lance era
escrita aqui, olhando o tabuleiro. Isso derrotava metade do motivo de usar os
cursos deles — eles explicam **por quê**, e esse porquê estava sendo jogado
fora na porta de entrada.

**A causa era o importador, e ela está fechada.** `importar-fontes.ts` cortava
a prosa ao gerar os rascunhos: os 20 arquivos de `content/repertorio/rascunhos/`
tinham **zero** comentários, e quem escreveu os textos nunca teve o argumento da
fonte na mão. Agora cada rascunho sai **duas vezes**. O de `rascunhos/` continua
sem uma palavra de prosa — ele é versionado, e **este repositório é público**,
então a prosa de curso pago não pode entrar nele. O gêmeo, em
`content/repertorio/rascunhos-anotados/`, tem a prosa limpa dos artefatos do
exportador e está no `.gitignore`: **406 comentários** onde antes havia zero. O
cabeçalho dos 20 rascunhos versionados aponta para o gêmeo, e é esse ponteiro —
não a boa vontade de quem escreve — que impede o erro de voltar no Avançado.

A limpeza é `lancesComProsa`, em `pgn.ts`, irmão de `apenasLances`. Sai o que o
exportador escreveu para si mesmo: `[%c_effect …]`, `[%cal …]`, `[%csl …]` e
`[#]`. E o `$146` vira `N` — 146 é o NAG da novidade, e o chess.com converte
para ele o **N** de "Não", que é como `$146ão é uma defesa ruim` foi parar no
PGN do Krikor. A alternância é numa passada só, com o `{}` casando primeiro:
fazer as três limpezas em sequência cortaria a frase no primeiro ponto e vírgula
que o autor escrevesse.

Os originais continuam intactos fora do Git (`REPERTORIO_FONTES`), com **452
explicações**: Krikor 332 — Philidor 119, Alapin-d5 52, Escandinava 50,
Alapin-Cf6 36, Alapin-alternativas 33, Escocesa 25, Petroff 17 — e Grigoryan
120 — Escocesa 31, Sidelines 58, English 30, Rossolimo 11, Petroff 13,
Caro-Kann 8, Dragão 4, Francesa 3. O Kushager é o único que vem sem prosa no
PGN; a dele está no site do curso. **393 delas** sobrevivem como comentário de
lance no gêmeo anotado — o resto é introdução de arquivo ou marca de
visualizador, e some na limpeza.

**Onde a fonte de fato encosta nas nossas linhas: 39 pontos.** É o que
`npm run repertorio:fidelidade` mede, e a conta é pequena por um motivo bom: as
nossas linhas param no lance 8 e os cursos anotam no 12, 15, 20 — a maior parte
das 452 fala de posições que o aluno do Base nunca vê. O casamento é por **FEN**
(as 4 primeiras partes, sem contadores) e nunca por slug: os slugs do
`fontes.json` são por capítulo de origem e não batem com os nossos —
`peao-rei` não é `philidor`, e `alapin-brancas`, `alapin-pretas`,
`dragao-acelerado`, `rossolimo` e `sicilianas-sidelines` caem todos no nosso
`siciliana`. Casar por FEN resolve transposição de graça, que é o que os cursos
mais fazem.

**Dos 39, só 9 valiam redação.** Os outros 30 se dividem em quatro tipos, e
nenhum deles é argumento: **ponteiro de capítulo** ("está analisado no capítulo
da defesa escocesa"), **pergunta de homework** ("Do you remember how do we play
here?"), **rótulo sem conteúdo** ("Transposition", "com boa vantagem branca",
"lance bastante jogado aqui") e — o grupo que surpreendeu — **o nosso texto já
diz mais que a fonte**, o que é a `pretas-siciliana` inteira: as transposições
que o Grigoryan resolve com a palavra "Transposition" nós explicamos em três
parágrafos. Aqui a regra é a mesma que rege o resto: nem todo ponto merece uma
tela, senão o aluno lê parede de texto. A regra de densidade que decidiu os
casos de dúvida foi **reforçar um comentário vizinho em vez de abrir um novo
colado nele**.

**A regra do texto, corrigida.** O B3 dizia "nenhuma prosa de curso entra
aqui", e isso foi lido como "escreva do zero". A leitura certa é: **carregar o
argumento, com as nossas palavras**, em português de criança de 10 anos. Nunca
colar o texto deles no repositório — é curso pago, e a anotação do Krikor é
telegráfica de adulto ("com boa vantagem branca"), que não ensina ninguém.

**De 4 posições para 13.** Em 6/9/2026 quatro comentários foram corrigidos, e
servem de amostra do tamanho do erro. Em `4…Cbd7` do Manhattan o texto dizia que
o cavalo evita trancar o peão de c7; a razão do Kushager é outra e melhor — sem
o cavalo em d7, o `Da4` das brancas vem **com xeque** e nos obriga a `…Cc6`, e é
o xeque que estraga tudo. No `8…Da5` o texto falava em recuperar o peão de c5;
para ele o peão é o de menos, o que decide é que rocamos no lance seguinte e o
rei branco fica no meio do tabuleiro. Em `2…c5` da Londres entrou a razão
estratégica dele (`2.Bf4` desenvolve mas, ao contrário do `2.c4`, não disputa
espaço no centro).

As outras nove entraram depois, com o gêmeo anotado na mão:

| Arquivo | Lance | O argumento que veio da fonte |
|---|---|---|
| escandinava | `1…d5` ✚ | não é defesa ruim — entrega uma posição tranquila com lances naturais |
| escandinava | `5.Cf3` ✚ | ele vem de `…Bg4` aqui, que prega o cavalo e **não** é o melhor |
| escandinava | `5…c6` ✚ | abre c7 como refúgio da dama |
| escandinava | `7.Bd2` ✎ | a dama foi para a5 **para ficar longe** — é isso que Bd2 desfaz |
| escocesa | `5.Bc4` ✚ | mira f7, e a ameaça de verdade é `Dd5`, batendo em f7 e no cavalo |
| escocesa | `4.Cc3` ✚ | manter a tensão; `4.d5` fecha, e fechado é mais fácil **para ele** |
| escocesa | `5.Bb5` ✎ | ataca **indiretamente e5** — quem o segura é o cavalo cravado |
| philidor | `6.Bf4` ✎ | havia `Be2` e roque pequeno; este desenho foi escolhido por ser o agressivo |
| pretas-siciliana | `3…Cd5` ✚ | por que d5 e não `…Ce4`, que "perde o cavalo em um lance" |

✚ texto novo, ✎ reescrita. Duas afirmações táticas foram medidas no motor antes
de virar texto, e não copiadas: depois de `3…Ce4 4.d3` as duas fugas naturais do
cavalo, `…Cf6` e `…Cd6`, são casas que o peão de e5 come, e a melhor tentativa
preta é dar a peça em f2 (brancas +2,55) — a anotação `$4` do Krikor era exata.
E `…Bg4` na Escandinava é o **quinto** dos cinco lances do motor, 25 centésimos
atrás do melhor: "não é a melhor jogada aqui", como o Krikor escreve, tem
número.

Os comentários foram de **103 para 110** telas nas 42 linhas (91 textos
distintos), e as que carregam o argumento da fonte foram de **6 para 16**. Os
ids continuam byte a byte os mesmos: comentário não entra no hash.

**Onde ser fiel não se aplica.** A Londres e o Colle das pretas são escolha
nossa contra a fonte — a §2.9 decidiu `2…c5`, e o capítulo 'The London' do
Kushager joga `2…Cf6` com `…Ch5` e `…Bd6`, outro plano. O Colle não tem capítulo
nenhum no curso (lista conferida em 6/9/2026: 10 capítulos, Manhattan x3,
Catalan x2, Gukesh QGD x3, The London, Pseudo-Trompowsky). E os 12 buracos da §8
não têm fonte por definição. Nesses casos o comentário é nosso, e a tag
`[Fonte]` já diz "Livro + motor".

**Nada disso foi revisado por professor de xadrez.**

**Quem escolhe a linha é o servidor** (`proximaLinha`), e ele **alterna** entre
revisar e avançar: se a última linha treinada era uma revisão, a próxima é uma
nunca-vista, na ordem do PGN — que é a ordem pedagógica, o tronco primeiro;
senão, é a vencida há mais tempo. Sem nenhuma vencida, valem os três grupos
antigos: nunca-vista, depois a mais longe do degrau 3, depois a revisão mais
antiga. A linha que acabou de ser treinada nunca é a próxima, e é isso que
impede o loop de errar e receber a mesma linha de volta. A lista fica na tela
para o aluno trocar.

**Quem julga é o servidor, sempre.** O navegador manda os lances jogados, nunca
um "acertei", e `lib/repertorio/gravar.ts` reconfere contra o JSON com a mesma
função que o tabuleiro usou. `repertorio_progresso` não tem política de `insert`
nem de `update` para ninguém — só a chave de serviço escreve, e a `db:rls` prova
isso contra o banco de verdade.

**O juiz daqui não é o da tática.** Lá qualquer mate conta, porque há uma solução
a encontrar; aqui há uma linha a decorar, e um lance bom fora do repertório é
errado para este fim. No lugar do "mate conta" ficam os dois canais do arquivo:
`alternativas` (o autor marcou como igualmente boas — a peça volta e a linha do
clube entra no lugar, com recado) e `errosNomeados` (a fonte mostra de propósito
como errados, e o aluno ouve *por quê* em vez de só "não").

**`errosNomeados` tem três linhas preenchidas**, e o critério foi estreito de
propósito: só entra armadilha que já está anotada como ruim numa fonte do
repositório **ou** medida no motor com folga. As três, com o número:

| Linha | Nosso lance certo | O erro | Medido |
|---|---|---|---|
| `pretas-londres-53d5b431` | 4…Cf6 | `4…Db6 $2` | brancas +1,37 depois de 5.Cc3 |
| `pretas-siciliana-97331249` | 3…Cd5 | `3…Ce4 $4` | brancas +2,53; o rascunho do Krikor já marca `$4` |
| `pretas-siciliana-2d329919` | 5…bxc6 | `5…dxc6 $6` | brancas +0,58 (troca de damas e o rei não roca) |

Jogada na tela em 6/9 com a conta `alunoteste`: 4…Db6 devolve *"Qb6 é o lance
que a fonte mostra de propósito como errado. Olhe de novo."*, e 5…Db6 — o mesmo
lance, um lance depois — é aceito. É exatamente a lição que o comentário da
linha ensina.

**Por que só três, e não uma por linha.** Varrendo os 20 rascunhos, quase toda
marca de lance ruim está no lance do **adversário**: os cursos de brancas anotam
os erros das pretas e vice-versa. É por isso que o campo nasceu vazio, e não
porque ninguém preencheu. O `6.Dd5?` que este documento cita como exemplo existe
mesmo no rascunho da Escocesa, mas mora depois de `5…d6` — um ramo que a revisão
cortou. Hospedá-lo pediria uma linha nova, que é decisão de repertório, não de
redação.

### O que ficou por fazer

**O ⚠12 fechou.** Os princípios para Pirc, Nimzowitsch, Alekhine e Owen estão em
`content/repertorio/notas.json`, com página em `/aberturas/notas/[abertura]` e
link no fim da lista. Um arquivo só, e não um por abertura como o plano dizia:
é a forma de `content/temas.json`, e a conferência de "não há slug repetido"
precisa vê-los juntos. **Não há tabuleiro nessas páginas** — o `lib/diagrama`
que a apostila usa é paleta de papel por decisão escrita lá, e trazê-la para a
tela traria as cores erradas; os lances em SAN no alto dizem que posição é essa,
que é o que um livro de princípios faz.

### As pontas

As pontas, medidas com `--pontas` em 5/9: a pior das 42 é uma das pretas e está
**0,44 atrás** — o tronco do Dragão, que é a linha da própria fonte. O plano
falava em acusar pior que −0,80; o script apenas **reporta** a pior ponta, não
reprova por ela, e nenhuma linha chega perto desse número. Nove das 20 linhas
das pretas fecham em igualdade, e uma — a Armadilha do Elefante — fecha em
**pretas +3,19**, uma peça.

O motor do repertório é o mesmo Stockfish 18 de `public/engine/` que serve a
etapa 5 da aula: a cola dele roda em `node` direto, e foi assim que as linhas
de livro + motor foram escolhidas e as pontas conferidas. As funções puras dele
saíram do script para `lib/repertorio/motor.ts` — um script não tem teste, e foi
justamente o sinal da avaliação que quase entrou invertido neste documento.
