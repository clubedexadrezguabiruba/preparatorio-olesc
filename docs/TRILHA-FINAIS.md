# Trilha de finais — a lista, os níveis e as regras que a governam

Ele fixa o que o curso de finais dentro do preparatório vai ensinar, em que ordem,
em que formato e a partir de qual obra. O que aqui se decide é o **conteúdo**, e é
o que `lib/finais/trilha.ts` copia campo a campo — **quando os dois discordarem, o
documento é que está certo** e o arquivo é que está desatualizado
(`lib/finais/trilha.ts:14-20`).

A lista abaixo **não é o sumário de nenhum livro**. Isso importa juridicamente:
uma posição de xadrez é fato e não se protege, mas a *seleção e a ordem* de um
livro são obra do autor. A nossa seleção sai do cruzamento de três coisas que já
tinham sido cruzadas no `docs/CURRICULO.md` do Laboratório de Finais — as seções
de conteúdo das Partes 1–5 do Silman, o subconjunto para amador que o próprio de
la Villa publica na p. 11 do dele, e o mapa de competências N0–N5 do currículo —
e a ordem é por **frequência em partida** e por **pré-requisito**, não pela ordem
de nenhum sumário. É essa `ordem` que corta os níveis (§1).

---

## 1. A espinha: cinco níveis

> **2026-09-09 — a classe saiu, o nível entrou.** O eixo do site inteiro passou a
> ser o **nível**, pelo plano dos níveis já aprovado. A progressão por classe da
> USCF, no estilo do Silman, governou este documento até aqui e não governa mais:
> quatro classes não cabem em cinco níveis, e `lib/curso/trilha.test.ts:33-39`
> exigia "as 4 classes em 4 níveis distintos", que é a própria prova de que a
> derivação não escalava. O corte agora é pela **`ordem`**, que já era ordem de
> pré-requisito, e é ela que decide o nível de cada aula.

| Nível | FIDE | Finais (`ordem`) | Aulas | O que o nível ensina |
|---|---|---|---|---|
| **1** | até 800 | 1–6 | 6 | mates básicos, afogamento, o que dá mate, o rei como peça |
| **2** | 800–1000 | 7–12 | 6 | rei e peão: quadrado, oposição, casas-chave, KPK, peão de torre |
| **3** | 1000–1200 | 13–18 | 6 | oposição distante; bispo, cavalo e torre contra peão; o bloqueio |
| **4** | 1200–1400 | 19–34 | 16 | torres (Lucena, Filidor, cortar o rei); passados; bispo errado; dama contra peão |
| **5** | 1400+ | 35–49 | 15 | triangulação, Réti, Vancura, sétima fila, bispos de cores opostas |

**A faixa é FIDE, não chess.com, e isso é decisão do plano dos níveis**: FIDE ≈
chess.com rápidas − 300/400, e rotular por FIDE impede que o aluno de 1700 rapid
conclua que pode pular os níveis baixos. A turma (700–1700 rapid) ocupa de ~400 a
~1350 FIDE ([[forca-real-dos-alunos]]).

**Os níveis 1 a 3 são a meta da OLESC** — 18 aulas. Os níveis 4 e 5 são
declaradamente pós-torneio, e a tela diz isso.

O nível entra na trilha como campo `nivel` de `AulaDaTrilha`, derivado da
`ordem`, com um teste que confere o corte (`lib/finais/trilha.test.ts`). O
`classe` continua no arquivo até a Etapa 2 do plano dos níveis rodar no outro
branch — enquanto isso a trilha carrega dois eixos, e é a `app/finais/page.tsx`
que ainda agrupa por classe.

O **id** da aula continua sendo o do currículo do laboratório (`N0-`…`N5-`),
porque `N0-R-MATE` e `N0-Q-MATE` já existem e renomeá-los invalidaria as posições
e o cache da tablebase. **O prefixo do id não é o nível** — `N4-B-VS-PAWNS` é
aula do nível 3 —, e essa colisão de vocabulário é herança do currículo, não
descuido. Onde uma competência do currículo rende mais de uma aula, a segunda
ganha sufixo próprio (`N1-KPK` e `N1-KPK-RANKS`) — são duas aulas da mesma
competência, não duas competências.

---

## 2. Os três formatos

> **2026-09-08 — a aula deixou de ter seis etapas.** O formato antigo era objetivo,
> exemplo, guiada, sem-ajuda, prática e revisão, **em posições diferentes**. Hoje
> são **três etapas numa posição só**, e as telas se chamam **"Aula · Treino ·
> Valendo"** (`docs/VOZ-DO-CURSO.md`). Esta seção foi reescrita para não continuar
> descrevendo um motor que não existe.

A etapa cara de escrever é a árvore: cada nó precisa de erro nomeado, resposta do
defensor e lances gerados pela tablebase. Quarenta e nove aulas completas não
cabem no prazo. Então:

| Formato | Marca | Etapas | Aprendida quando | Custo |
|---|---|---|---|---|
| **Completa** | `C` | objetivo, com ajuda e sem ajuda | três vitórias sem ajuda, em três dias diferentes e espaçados | 6–8 h |
| **Curta** | `c` | objetivo e sem ajuda | três vitórias (ou empates seguros) sem ajuda, em três dias diferentes | ~2 h |
| **Leitura** | `L` | só o objetivo | quando o aluno marcar que leu — não tem partida | ~1 h |

Os textos desta tabela são os de `FORMATO` em `lib/finais/trilha.ts:106-124`, e é
de lá que o aluno os lê no cartão. **"Aprendida" é o degrau 3 da escada de revisão**
(`lib/finais/escada.ts`), não uma vitória permanente: o aluno de 11 anos que deu o
mate de torre na terça não sabe dá-lo no sábado.

No motor isso custa quase nada: o `LessonPlayer` renderiza cada etapa só se ela
existir na aula. O aluno vê o formato escrito no cartão da trilha ("aula curta"),
para não procurar uma etapa que não existe.

**A explicação mora dentro da aula**, e é isso que substitui o professor quando a
criança estuda sozinha no celular na quarta à noite. **Como ela é escrita é régua,
não gosto:** `docs/VOZ-DO-CURSO.md` fixa o professor Douglas falando com **um**
aluno, fala ≤ 200 caracteres, frase ≤ 20 palavras, aula assistida de 40 a 70 s, as
vinte palavras proibidas, e — desde 2026-09-09 — os **cinco movimentos de quem
ensina** (§2.1), **como uma palavra técnica entra** (§4.1, mostra → nomeia → usa) e
o **português de manual de adulto** que sai (§4.2). Os números daquele documento são
lidos por `lib/lesson/voz.test.ts` e pela skill `/revisar-aula`; nenhum dos dois tem
cópia própria, e por isso a régua não se repete aqui.

---

## 3. O envelope: toda posição tem no máximo 7 peças

A verdade xadrezística do curso vem da tablebase Syzygy, e ela para em **7 peças**
(os dois reis incluídos). Posição com 8 não tem juiz; sem juiz, o gate de conteúdo
não pode reprovar um lance errado, e a aula viraria opinião.

Consequências, ditas com todas as letras:

- ruptura de peões na versão clássica (3 peões contra 3 = 8 peças) **não cabe**; a
  aula 38 só entra se houver versão de 3 contra 2 no acervo;
- finais de torre com muitos peões ficam fora — a "sétima fila" entra só na versão
  T+P vs T+P (6 peças);
- **aula completa fica em ≤ 5 peças**, mais apertado que o resto: as árvores
  precisam de DTM para medir o teto de lances, e a API só dá DTM até 5 peças. Aula
  curta e leitura podem ir até 7.

A coluna `Peças` da lista abaixo é o total no tabuleiro na família canônica da
aula, contando os dois reis.

---

## 4. A regra de rotação de livros

Cinco obras protegidas são **livro-base didático** (`"didactic": true` em
`content/sources.json`): Silman, de la Villa, Müller *for Kids*, Pandolfini e
Seirawan. De uma delas saem, obrigatoriamente, as etapas 1 e 2 de cada aula — o
objetivo e o exemplo. Alternar entre elas é o que impede que a progressão de um
autor seja copiada em série.

**A unidade desta regra é a `classe`, e não o nível** — é assim que
`scripts/validate-content.ts:1259` agrupa, lendo o campo `classe` de
`AulaDaTrilha`, que sobrevive até a Etapa 2 do plano dos níveis. Trocar a unidade
é mudar o gate, e não foi feito nesta rodada: a §1 tirou a classe do **conteúdo**
do documento, não do código.

O gate cobrava `FONTE_DIDATICA_DOMINA` como **"uma obra protegida é base de no
máximo uma aula por nível"**. Com ~12 aulas por classe e 5 livros didáticos, isso
é aritmeticamente impossível. A regra passa a ser:

> Nenhuma obra protegida é livro-base de mais de `max(2, floor(N/3))` aulas
> **publicadas** de uma mesma classe, onde `N` é o número de aulas publicadas
> daquela classe.

Duas coisas nessa fórmula não são enfeite:

- **`floor`, não `ceil`** — `ceil(16/3) = 6` já seria 37,5% de uma classe de 16, e
  a regra diz "um terço".
- **o piso de 2** — as aulas de uma classe são publicadas aos poucos, não de uma
  vez. Sem o piso, uma classe recém-aberta com duas aulas
  seria reprovada por ter as duas do mesmo autor, e a regra viraria um obstáculo à
  publicação incremental em vez de uma regra editorial.

O que **não** muda: o texto 100% escrito do zero em PT-BR, e cada aula declarando
o livro que a fundamenta no campo `objective.source`.

O que **mudou depois**, em 2026-09-08, e não é detalhe: o teto de **2 posições por
obra protegida por aula** (§12.7.1 do currículo) e a proibição de diagramas
consecutivos **não seguram mais este módulo**. O teto é por aula, e no formato de
três etapas uma aula é uma posição só — ele ficou sem sujeito (§1.2 do
`SOURCE-CORPUS`). E o livro-base do módulo, o de la Villa, está em **regime
integral** desde 2026-09-08 por decisão do Doug — *"sem teto nenhum, quero usar o
livro inteiro"* —, o que desliga para ele tanto o teto de citação quanto a
rotação desta §4. O que segura o módulo é a declaração do regime, com prazo
cobrado e inventário em `content/divida-de-licenca.md`.

> **2026-09-09 — a rotação não morde em nenhuma aula deste módulo, e a tabela de
> distribuição saiu daqui.**
>
> As duas obras que fundamentam o módulo estão em **regime integral** (§1.1 do
> `SOURCE-CORPUS`) e por isso fora da régua da rotação: o **de la Villa**, desde
> 8/9, e o **Silman**, que volta a ser livro-base ao lado dele — declarado com
> inventário zerado desde 8/9 exatamente para este caso. Com os dois fora da
> régua, não sobra aula do módulo para a rotação julgar.
>
> A tabela de distribuição por classe que ficava aqui foi apagada. Ela já estava
> marcada como *"desejo, não régua"* desde 8/9, e depois disto passou a ser
> desejo sobre um eixo que o site não usa mais — a classe. Mantê-la seria manter
> um plano que ninguém segue, escrito na unidade errada. A regra da fórmula
> acima **fica**: ela vale para as obras que não estão em regime integral, e para
> os outros módulos.
>
> O que segura o módulo, então, não é a rotação: é a declaração do regime, com
> prazo cobrado e inventário em `content/divida-de-licenca.md`, crescido pelo
> `npm run validate:content -- --write` e lido no diff antes de cada commit.

---

## 5. A lista — 49 aulas

**Legenda de formato:** `C` completa · `c` curta · `L` leitura.

**Legenda de obras.** Domínio público: `CAP` Capablanca 1921 · `KH` Kling &
Horwitz 1889 · `FRE` Freeborough 1891 · `WAL` Walker 1832 · `STA` Staunton 1848 ·
`COO` Cook 1880 · `ROG` Rogers 1907 · `CUN` Cunnington 1903 · `LIC` Lichess (CC0).
Protegidas: `SIL` Silman · `DLV` de la Villa · `MK` Müller *for Kids* · `PAN`
Pandolfini · `SEI` Seirawan · `RAB` Rabinovich · `AVE` Averbakh · `NUN` Nunn ·
`MLA` Müller & Lamprecht.

A coluna **Base** é o livro-base didático (etapas 1 e 2).

**A coluna "Capítulo do estudo" substituiu duas colunas antigas**, e vale explicar
o que ela é. "Posição (DP)" listava as fontes de domínio público da posição, e foi
zerada em 8/9 para as aulas a refazer; "Sob teto" listava as obras protegidas que
podiam contribuir com até duas posições cada, e ficou sem sujeito quando o teto de
citação ficou sem sujeito (`SOURCE-CORPUS §1.2`). No lugar das duas entra **onde a
posição está hoje**: o estudo, o número do capítulo, e a FEN já extraída em
`content/finais/capitulos.json` pelo `npm run finais:extrair`.

**Legenda dos estudos** — os quatro que retranscrevem o Silman, todos públicos, do
mesmo autor (`carbone144`):

| Marca | Estudo | Faixa do livro |
|---|---|---|
| `yk` | [`yk2b24vS`](https://lichess.org/study/yk2b24vS) | Unrated–1399 (Beginner + E + D) |
| `TW` | [`TW73iW6r`](https://lichess.org/study/TW73iW6r) | 1400–1599 (Classe C) |
| `p9` | [`p9HrYIHr`](https://lichess.org/study/p9HrYIHr) | 1600–1799 (Classe B) |
| `uu` | [`uuks13Wq`](https://lichess.org/study/uuks13Wq) | 1800–1999 (Classe A) |

**A coluna lista só os capítulos usáveis** — os que têm FEN legal **e** cabem no
envelope de 7 peças da §3. Capítulo do tema certo que não passa nesses dois testes
não entra na coluna; ele está contado na **§12**, com o motivo. `⚠` marca capítulo
de uma faixa acima do nível em que pomos a aula, e **furo** quer dizer que nenhum
dos quatro estudos tem capítulo do tema.

A coluna **Estado** diz o que existe em disco hoje, e ela tem **quatro** valores
porque "tem posição" não quer dizer "pode virar aula":

| Valor | O que significa |
|---|---|
| `aula` | o JSON existe em `content/lessons/` |
| `posição` | há posição aprovada **e ela sai de um livro didático** — pode ser a posição da aula |
| `posição DP` | há posição aprovada, de **domínio público**, e o gate a **recusa** como posição de aula |
| `—` | nem uma coisa nem outra |

> **A distinção não é preciosismo: é o gate.** `scripts/validate-content.ts:1163-1175`
> exige que a posição de uma aula saia **do mesmo livro** declarado como
> livro-base, e que esse livro seja um dos cinco `didactic: true`
> (`FONTE_DIDATICA_DIVERGE` + `FONTE_NAO_DIDATICA`). Como os **três** formatos têm
> a etapa do objetivo, isso vale para toda aula, sem exceção.
>
> Medido em 2026-09-09: das 16 posições aprovadas, **14 são de domínio público** —
> Freeborough, Capablanca, Staunton, Cook, Rogers — e nenhuma delas pode ser a
> posição de uma aula. Só as duas do de la Villa servem, e é por isso que apenas
> as ordens **7** e **10** dizem `posição`.
>
> As 14 não foram perdidas: continuam aprovadas, com proveniência completa, e
> continuam sendo a resposta para qualquer uso que não seja a posição da aula. O
> que elas deixaram de ser é atalho para escrever a aula.

> **2026-09-08 — o corpus antigo saiu do disco, e o livro-base mudou.**
>
> Duas coisas aconteceram no mesmo dia, e a segunda é a que manda. Primeiro, as
> cinco aulas escritas contra os livros anteriores foram apagadas de
> `content/lessons/`. Depois o Doug **trocou o livro-base do módulo do Silman
> para o de la Villa** e **redesenhou o formato**: a aula deixou de ser seis
> etapas em posições diferentes e passou a ser **três etapas numa posição só**
> — objetivo estático, com ajuda, sem ajuda —, com "aprendida" contada pela
> escada de três passadas em dias distintos.
>
> Hoje o módulo tem **1 aula no disco**: a `N1-KPK`, piloto do formato novo e
> do livro novo. A trilha é o plano, e o plano não mudou; o que mudou é contra
> que livro e em que formato as outras 48 serão escritas.
>
> As duas aulas do Silman (`N0-R-MATE` e `N0-MATING-MATERIAL`) saíram junto,
> com as 17 posições de obra protegida. O **regime integral do Silman continua
> declarado** em `content/divida-de-licenca.md`, com inventário zerado: o mate
> elementar continua em aberto, e se ele voltar a sair daquele livro o regime já
> está de pé — **e é o que acontece agora**, com o Silman de volta a livro-base
> ao lado do de la Villa.
>
> **As 16 posições de `content/positions/` não foram apagadas**: a demolição levou
> aulas, não posições. São as ordens **2, 3, 4, 5, 6, 7, 10 e 44** — a numeração
> mudou em 9/9 com a reordenação do nível 1.
>
> **Mas o garimpo delas não é atalho para a aula**, e isso só foi medido em 9/9:
> seis das oito são de domínio público, e o gate as recusa como posição de aula
> (ver a legenda de **Estado**, acima). Para as ordens 7 e 10 o atalho vale; para
> as outras seis, o que a posição aprovada dá é conferência e proveniência, não a
> posição da aula.
>
> A `lib/finais/trilha.ts` **não mudou** e nem devia: ela lista as 49 aulas
> planejadas, e o teste que cruza a lista com o disco já pulava aula não escrita
> (`if (!existsSync(arquivo)) continue`).

### Nível 1 — 6 aulas · FIDE até 800

| # | F | Id | Aula | Peças | Base | Capítulo do estudo | Estado |
|---|---|---|---|---|---|---|---|
| 1 | C | `N0-MATING-MATERIAL` | O que dá mate e o que não dá | 4 | SIL | **furo** — o estudo pula a seção, e a posição veio do Doug (§14.1) | — |
| 2 | c | `N0-LADDER` | Mate da escada: duas torres, e dama e torre | 4 | SIL | `yk` 3–4 *The Staircase* · 7 (duas torres) | posição DP |
| 3 | C | `N0-Q-MATE` | Mate de dama e rei: **a técnica do L** | 3 | SIL | `yk` 8 *Queen vs lone King* · 5–7 (mates de excesso) | posição DP |
| 4 | C | `N0-R-MATE` | Mate de torre e rei: a caixa | 3 | SIL | `yk` 9–11 *King and Rook vs. Lone King* | posição DP |
| 5 | c | `N0-STALEMATE` | Afogamento: como não empatar a partida ganha | 3–4 | SIL | `yk` 13 *Carful Stalemate!* | posição DP |
| 6 | c | `N1-KING-ACTIVITY` | O rei é peça: use-o | 3–5 | SIL | `yk` 16 *Understanding the King* | posição DP |

> **2026-09-09 — a ordem deste nível mudou, por decisão do Doug.** Era
> dama · torre · escada · afogamento · o que dá mate · o rei é peça. A ordem
> nova é a de quem ensina: **antes de aprender a dar mate, saber com que material
> dá**. Depois a dificuldade sobe — escada (duas torres, mecânico) → dama (tranca
> sozinha) → torre (precisa do rei) —, e o **afogamento vem logo depois dos dois
> mates**, que é onde ele acontece de verdade.
>
> Duas mudanças vieram junto. A **ordem 3 passa a ensinar a técnica do L**, e não
> a caixa; a caixa fica com a **ordem 4**, porque a dama tranca o rei sozinha e a
> torre precisa da ajuda do próprio rei — mesmo nome para duas coisas confunde
> mais do que ajuda. E a **ordem 1 deixou de ser leitura**: ela virou aula
> completa, jogada, e o porquê está na §14.1.

### Nível 2 — 6 aulas · FIDE 800–1000

| # | F | Id | Aula | Peças | Base | Capítulo do estudo | Estado |
|---|---|---|---|---|---|---|---|
| 7 | C | `N1-SQUARE` | Regra do quadrado | 3 | DLV | ⚠ `TW` 20 *The square of the pawn* — **não está no estudo dos iniciantes** | posição |
| 8 | c | `N1-DIRECT-OPPOSITION` | Oposição | 3 | SIL | `yk` 17, 19 *Opposition (basics)* — o 18 é diagrama (§12) | — |
| 9 | c | `N1-KEY-SQUARES` | Casas-chave | 3 | DLV | `yk` 33 *Two Squares in Front Always Does it* · `TW` 3–5 | — |
| 10 | C | `N1-KPK` | Rei e peão contra rei: o rei na frente do peão | 3 | DLV | `yk` 30–32 *King and Pawn Endgames* · `TW` 2, 6–8 | **aula** |
| 11 | c | `N1-KPK-RANKS` | Peão na 6ª e na 7ª: quem joga decide | 3 | MK | `TW` 6 (peão na 6ª), 7–8 (mesma FEN, os dois lados a jogar) · `yk` 31–32 | — |
| 12 | c | `N1-ROOK-PAWN` | Peão de torre: o empate do canto | 3 | MK | `yk` 20–21 *Rook-Pawns* · `TW` 16–18 *Stalemating the Stronger Side* | — |

### Nível 3 — 6 aulas · FIDE 1000–1200

| # | F | Id | Aula | Peças | Base | Capítulo do estudo | Estado |
|---|---|---|---|---|---|---|---|
| 13 | c | `N2-KING-MANEUVER` | Oposição além do básico: a distante | 3 | SIL | `yk` 27 *Distant Opposition* — os 28 e 29 são diagrama (§12) | — |
| 14 | c | `N4-B-VS-PAWNS` | Bispo contra peão | 4 | SEI | `yk` 38–39 *Bishop vs. Lone (rook) Pawn* | — |
| 15 | c | `N4-N-VS-PAWNS` | Cavalo contra peão, inclusive o de torre na 7ª | 4 | DLV | `yk` 40–46 *Knight vs. Lone (Rook-)Pawn* — sete capítulos, um tópico | — |
| 16 | C | `N3-R-VS-PAWN` | Torre contra peão: contar, cortar, aproximar | 4 | SIL | `yk` 47–49 *Rook vs. Lone Pawn* | — |
| 17 | c | `N1-KING-VS-PAWNS` | Rei contra dois peões passados | 4 | PAN | `yk` 34 *Fox in the Chicken Coop* — 7 peças, no limite do envelope | — |
| 18 | c | `N1-PAWNS-BLOCKADE` | Um peão segura dois: o bloqueio | 5 | SEI | `yk` 36 *The Deep Freeze* — o 35 é diagrama (§12) | — |

### Nível 4 — 16 aulas · FIDE 1200–1400

| # | F | Id | Aula | Peças | Base | Capítulo do estudo | Estado |
|---|---|---|---|---|---|---|---|
| 19 | C | `N3-LUCENA` | Lucena: a ponte | 5 | SIL | `TW` 33 *The Lucena Position* | — |
| 20 | C | `N3-PHILIDOR` | Filidor: a defesa da terceira fila | 5 | DLV | `TW` 34 *The Philidor Position (Defense)* | — |
| 21 | C | `N3-ROOK-BEHIND` | Torre atrás do peão passado | 5 | SIL | **furo** — `uu` 15–18 são a torre **na frente** do peão (§12) | — |
| 22 | c | `N3-SIDE-CHECKS` | Lado curto, lado longo | 5 | DLV | ⚠ `uu` 22–27 *Rook and Pawn (on 5th/4th) vs. Rook* — o tema, sem o nome | — |
| 23 | c | `N3-CUT-FILE` | Cortar o rei pela coluna | 5 | DLV | `TW` 38 *Trap The Enemy King Away From the Action* — o 39 tem 9 peças | — |
| 24 | c | `N3-DEFENSIVE-EXCEPTIONS` | Defesa passiva: quando ela segura | 5 | SIL | `TW` 35–37 *The Philidor Position (Passive Rook)* | — |
| 25 | c | `N3-R-VS-2P` | Torre contra dois peões | 5 | DLV | **furo** — acima da Classe A (§12) | — |
| 26 | c | `N2-OUTSIDE-PASSER` | Peão passado distante | 6 | SIL | `TW` 21 *The Outside Passed Pawns* — o 22 tem 8 peças | — |
| 27 | c | `N2-PROTECTED-PASSER` | Peão passado protegido | 6 | DLV | **furo** — os estudos só trazem o passado **distante** (§12) | — |
| 28 | c | `N1-K2P-VS-K` | Rei e dois peões contra rei: ligados e dobrados | 4–5 | MK | `TW` 14–15 (dobrados) · `p9` 1–8 *Two Healthy Pawns* (ligados e separados) | — |
| 29 | c | `N2-PAWN-RACES` | Corrida de peões: quem promove primeiro | 4–6 | PAN | ⚠ `uu` 2–7 *King and pawns: Strange Races* | — |
| 30 | c | `N4-Q-VS-PAWN` | Dama contra peão na 7ª: quando ganha, e as exceções | 4 | SIL | `TW` 40–44 *Queen vs. King and Pawn on 6th/7th* | — |
| 31 | c | `N4-WRONG-BISHOP` | Bispo errado com peão de torre | 4 | MK | `TW` 23–26 *Bishop and Wrong Colored Rook-Pawn* | — |
| 32 | c | `N4-OPPOSITE-BISHOPS` | Bispos de cores opostas: a fortaleza com um peão a menos | 5 | SEI | `TW` 29 *Bishops of Opposite Colors* — os 30 e 31 têm 9 peças | — |
| 33 | c | `N4-N-AND-ROOK-PAWN` | Cavalo e peão de torre na 6ª/7ª contra rei | 4 | PAN | `TW` 27–28 *Lone King vs. Knight and Rook-Pawn on the 6th* | — |
| 34 | c | `N4-Q-VS-ROOK` | Dama contra torre: o básico | 4 | SEI | **furo** — o Silman diz por escrito que não cobre (§12) | — |

### Nível 5 — 15 aulas · FIDE 1400+

| # | F | Id | Aula | Peças | Base | Capítulo do estudo | Estado |
|---|---|---|---|---|---|---|---|
| 35 | c | `N2-TRIANGULATION` | Triangulação | 4–6 | SIL | **sem capítulo usável** — `p9` 11–12 têm 10 peças (§12) | — |
| 36 | c | `N2-OUTFLANKING` | Flanquear o rei | 3 | SIL | **sem capítulo usável** — `p9` 13 é diagrama (§12) | — |
| 37 | c | `N2-RESERVE-TEMPI` | Tempos de reserva | 6 | DLV | ⚠ `uu` 8–12 *King and Pawn vs. King and Pawn* | — |
| 38 | c | `N2-BREAKTHROUGH` | Ruptura de peões | 7 | DLV | `p9` 9 *Tactical Bombs (2p vs. 2p)*, 6 peças — o 10 (4p vs. 3p) tem 9 | — |
| 39 | c | `N2-RETI` | Manobra de Réti: o rei que faz duas coisas | 4 | SEI | ⚠ `uu` 6 — FEN `7K/8/k1P5/7p/8/8/8/8`, o autor nomeia Réti 1921 · 7 é o Adamson 1922 | — |
| 40 | c | `N3-R-2P-VS-R` | Torre e dois peões ligados contra torre | 6 | SIL | `p9` 14 *Rook and Two Connected Pawns vs. Rook* | — |
| 41 | c | `N3-SEVENTH-RANK` | A sétima fila | 6 | SIL | **sem capítulo usável** — `p9` 15–16 têm 15 e 10 peças (§12) | — |
| 42 | c | `N5-VANCURA` | Defesa de Vancura | 5 | DLV | ⚠ `uu` 19–21 *The Vancura Position* — o 21 ensina quando ela **não** serve | — |
| 43 | c | `N3-R-VS-RN-PAWNS` | Torre contra peão de torre e de bispo: as exceções | 4 | DLV | ⚠ `uu` 13–14 *"Lucena" with a Rook-Pawn* · 21, 27 (peão de cavalo) | — |
| 44 | c | `N0-2B-MATE` | Dois bispos contra rei | 4 | SEI | `p9` 18 *Two Bishops vs. Lone King* | posição DP |
| 45 | c | `N4-OPPOSITE-BISHOPS-2P` | Bispos de cores opostas com dois peões: quando ganha | 6 | DLV | `p9` 19, 21–23 *Two Pawns* · `uu` 28–31 | — |
| 46 | c | `N4-SAME-BISHOPS` | Bispo e peão contra bispo da mesma cor | 5 | SIL | ⚠ `uu` 32–37 *Fortresses in Bishop-up Endgames* | — |
| 47 | c | `N4-BISHOP-VS-KNIGHT` | Bispo contra cavalo com um peão | 5 | SEI | **furo** — acima da Classe A (§12) | — |
| 48 | c | `N2-DOUBLED-ISOLATED` | Peões dobrados e isolados no final de peões | 5–6 | MK | `TW` 14–15 *Two Doubled Pawns vs. Lone King* — **só a metade dobrada** (§12) | — |
| 49 | L | `N2-ZUGZWANG` | Zugzwang: a obrigação de mover | 4 | PAN | `TW` 9–10 *Trébuchet* | — |

**A conta, medida e não estimada:** das 49, **40 têm pelo menos um capítulo
usável**; 6 são furo e 3 têm capítulo do tema sem nenhuma FEN aproveitável. **Nos
níveis 1 a 3, 17 das 18 têm capítulo** — o único furo é a ordem 1, e ela já está
resolvida por fora do estudo (§14.1).

---

## 6. O que isto custa, e a alavanca se apertar

| | Quantidade | Horas por aula | Horas |
|---|---|---|---|
| Completas novas | 8 | 6–8 | ~56 |
| Curtas | 39 | ~2 | ~78 |
| Leituras | 1 | ~1 | ~1 |
| **Total** | **48 novas** | | **~135 h** |

São 48 e não 47 porque a `N0-MATING-MATERIAL` também foi apagada em 8/9; a única
aula em disco é a `N1-KPK`.

**A conta mudou em 9/9:** a `N0-MATING-MATERIAL` saiu de leitura para completa
(§14.1), e a lista passou de 8/39/2 para **9 completas, 39 curtas, 1 leitura** —
das quais 8 completas ainda por escrever. A completa dela, porém, é a mais barata
da lista: a árvore da etapa 2 começa numa posição com **dois lances legais**.

O ritmo vem medido do laboratório: 5,9 → 8,6 posições garimpadas por hora
(`SOURCE-CORPUS.md §7`), e **esse número não vale mais para o garimpo** — com a
FEN vindo pronta do cabeçalho do estudo, a parte cara passou a ser escrever o
texto, não achar a posição. **O número que vale é o dos níveis 1 e 2**: doze aulas
escritas no formato novo, medidas; até elas existirem, as ~2 h por aula curta são
estimativa herdada de outro processo.

Alavancas, em ordem, se o ritmo não sustentar:

1. rebaixar aulas curtas do nível 5 para **leitura** (economiza ~1 h cada);
2. reduzir completas de 8 para 6 — as aulas 16 (torre contra peão) e 21 (torre
   atrás do peão) viram curtas (economiza ~12 h);
3. **fechar em 34 aulas** (níveis 1 a 4). O nível 5 inteiro fica para depois do
   torneio, e o site não sente: a trilha ganha aulas por acréscimo, nunca por
   reforma. É esta a alavanca que a §12 manda considerar primeiro — das nove aulas
   sem posição usável, **oito estão nos níveis 4 e 5**.

---

## 7. O que ficou de fora, e por quê

| Fora | Motivo |
|---|---|
| Mate de bispo e cavalo | raro em partida de 1000–1400; o Silman e o currículo o excluem do essencial |
| Converter vantagem simplificando | 8+ peças: sem tablebase, sem juiz |
| Finais de dama contra dama | 8+ peças na prática, e fora da faixa |
| T+B vs T | 5 peças, mas técnica de 2000+; sem retorno nesta faixa |
| Casas correspondentes (`N5-CORRESPONDENCE`) | acima do nível 5 |
| Revisão espaçada com datas | fora do escopo do branch |
| Caderno de finais | cancelado pelo Doug |

Uma fusão em relação ao rascunho do plano:

- **"duas torres" e "dama e torre" viraram uma aula** (a 2, `N0-LADDER`). Motivo
  medido: nenhuma das nove obras de domínio público traz diagrama de dama+torre
  contra rei — o Freeborough tem "King and two Rooks against King" (VII.II) e a
  lista de referências avulsas dele cobre dama, torre, duas torres, dois bispos,
  bispo+cavalo e dois cavalos, e para aí. Sem fonte de domínio público a aula
  quebraria a regra "1+ DP por aula"; e a técnica é literalmente a mesma escada.
- Por isso a lista tem **49 aulas, não 50**.

---

## 8. Mapa de cobertura de domínio público — o que foi conferido

> **2026-09-09 — esta seção deixou de ser o caminho principal.** Ela continua
> verdadeira, e continua sendo o mapa de quem precisar de domínio público. Mas a
> posição das aulas novas passou a vir do **estudo do Lichess** (a coluna
> "Capítulo do estudo" da §5), e não daqui. Onde esta seção vale hoje:
>
> - **nas 16 posições já transcritas** e aprovadas em `content/positions/`, que
>   têm proveniência de domínio público completa e não serão refeitas;
> - **nas nove aulas da §12**, quando chegar a hora de decidir o que fazer com
>   elas: escrever pelo de la Villa, garimpar aqui, rebaixar a leitura, ou cortar.
>
> **Uma linha desta seção foi retirada em 9/9, e vale dizer qual.** Ela mandava a
> `N0-MATING-MATERIAL` sair por **Freeborough X.VI**, e isso estava errado duas
> vezes: a Seção X.VI é **bispo e cavalo**, não dois cavalos; e o Freeborough
> **não é livro didático**, então o gate o recusaria como posição de uma aula (ver
> a legenda de **Estado** na §5). A única obra de domínio público do acervo que
> cobre dois cavalos é o Staunton, Livro VI cap. I — e ela esbarra no mesmo gate.
> A ordem 1 saiu por outro caminho: §14.1.
>
> O que esta seção **não** cobre é a perda de proveniência que o atalho custou:
> trabalhando pelo estudo, a **página impressa do livro não é conferida**. Está
> declarado na §13.

Esta seção existe para que a autoria não recomece a busca. Os capítulos abaixo
foram lidos no índice do próprio PDF em 2026-09-05, não lembrados. **As páginas são
as impressas**; os deslocamentos PDF↔impressa já medidos estão no
`docs/SOURCE-CORPUS.md §3` do laboratório (`kling-horwitz-1889` +13,
`freeborough-1891` +5, `walker-1832` +19, `staunton-1848` +8).

**`freeborough-1891` — a espinha de domínio público do curso.** É o único livro do
acervo público que cobre quase toda a lista, e por isso aparece em 46 das 49 aulas.
Índice conferido:

| Cap. | Seções | Serve às aulas |
|---|---|---|
| I Elementary positions | I distâncias (14) · II peões que se sustentam (15) · III rei contra três peões (16) · IV posições ganhas depois da promoção (17) · V dois peões contra dois (18) · VI ruptura (18) · VII o rei à frente (28) | 6, 7, 17, 18, 28, 29, 38 |
| II The Kings in opposition | I oposição (24) · II rei atrás dos peões (26) · III K+P vs K (38) | 8, 9, 10, 13, 36 |
| III Side pawns | I peão de cavalo (42) · II dificuldades do peão de torre (44) · III peão de torre na defesa (48) | 12, 31 |
| IV Pawns against pawns | I empatar com força inferior (54) · II ganhar com superior (58) · III igualdade de peões (66) | 26, 27, 37, 48 |
| V The Queen | II–V dama contra peão central/bispo/cavalo/torre (77–82) · VI contra dois peões (84) · VII Q+P na 7ª vs Q (86) | 5, 30 |
| VI Queen vs inferior pieces | I dama contra torre (98) | 34 |
| VII The Rook | I R vs K (121) · II 2R vs K (123) · III torre contra peão · IV contra dois peões · V contra três | 2, 4, 16, 25, 43 |
| VIII Rook and pawn(s) | III R+P vs R (162) · IV R+2P vs R (167) · V R+P vs R+P (172) | 19, 20, 21, 22, 23, 24, 40, 41, 42 |
| X Minor pieces | I bispo e peões (194) · II cavalo contra peões (200) · IV C+P vs K (204) · V 2B vs K (206) · VI B+C vs K (208) | 14, 15, 33, 44 |
| XI Minor pieces opposed | II B+P vs C (222) · III C+P vs B (224) · IV B+P vs B (226) | 32, 45, 46, 47 |
| refs avulsas | Le Trébuchet (34) · bispo com peão de torre (45, 194) · torre, melhor posição (120, 134) · oposição, como obter (31) e manter (33) | 31, 35, 49 |

**`capablanca-1921`** — §1 mates simples (3) · §2 promoção (9) · §3 finais de peões
(13) · §11 obter passado (40) · §12 quem promove primeiro (41) · §13 a oposição
(43) · §14 cavalo e bispo comparados (50) · §16 dama contra torre (62).

**`staunton-1848`, Livro VI** — cap. I: dama, torre, dois bispos, B+C, dois cavalos
(403–408), K+P, K+B+P e K+C+P contra rei (409). Cap. II: dama contra torre (415),
contra peão (430). Cap. III: R+P vs R (441), torre contra um ou mais peões (443).
Cap. IV: finais só de reis e peões (470), K+P vs K+P (473), K+2P vs K+P (474),
K+2P vs K+2P (483), rei contra três passados (487), três passados contra três (494).

**`kling-horwitz-1889`** — rei e peões contra peões · bispos e peões · cavalos,
bispos e peões · duas peças menores contra uma · torre contra peões · torre com e
sem peões contra forças iguais · dama contra peões · damas e peões · dama contra
torre.

**`cunnington-1903`** — cap. I reis e peões · II bispos, cavalos e peões · III
torres e peões · VI damas e peões · VII dama contra forças variadas. A introdução
dele já nomeia, em prosa, "quando dois peões isolados estão a salvo do rei inimigo"
e a natureza do peão de torre — as aulas 18 e 12.

**`rogers-1907`, cap. XI** — Ex. I dama · II torre · III B+C vs K+P · IV **K+P vs
K** · V dois bispos · VI **K+B+P vs K empatado** (o bispo errado, a aula 31).

**`walker-1832`** — "On Various Checkmates": No. I torre (e a dama pela mesma
técnica), No. II dois bispos. Dá a posição como lista de peças em texto, não só no
diagrama — é a fonte mais fácil de transcrever sem erro de leitura.

**`cook-1880`** — cap. VII: I rei e dama, II rei e torre. Declara tirar as posições
do Handbook do Staunton, e a proveniência tem de registrar isso.

---

## 9. `sources.json` conferido — o que está e o que falta

As 21 entradas de `content/sources.json` foram lidas contra esta lista. **Todas as
obras citadas acima estão registradas**, com uma exceção e três dívidas.

**A exceção — Réti e Vancura — está fechada desde 2026-09-09.**

Esta seção declarava duas aulas sem fonte para a posição canônica: a 39
(`N2-RETI`, estudo de Réti de 1921) e a 42 (`N5-VANCURA`, estudo de Vančura
publicado em 1924). As duas são posteriores ao Freeborough (1891) e ao Cunnington
(1903), e o acervo de domínio público não as cobria. A decisão pedida era entre
três saídas, e mandava tratar as duas juntas.

**As duas entram, pela via 1 — a que a própria seção chamava de "via limpa" — e
sem registrar obra nova na `biblioteca/`**, que era o custo que a tornava difícil:

| Aula | Onde está | O que o capítulo traz |
|---|---|---|
| 39 `N2-RETI` | `uuks13Wq` cap. 6 | FEN `7K/8/k1P5/7p/8/8/8/8`, com o texto do Silman nomeando *"a study by the great Réti in 1921"*. O **cap. 7 é o Adamson de 1922** — mesmo tema, posição diferente: exercício de fixação pronto |
| 42 `N5-VANCURA` | `uuks13Wq` caps. 19–21 | A posição, a técnica, e o cap. 21, que ensina **quando a Vancura não serve** (peão de cavalo) |

A proveniência das duas segue a regra da §13 como qualquer outra posição vinda de
estudo: obra é o Silman, em regime integral, e a **página impressa não é
conferida**. O que ganhamos é a posição canônica com o autor nomeando o
compositor; o que não ganhamos é o número da página.

**As três dívidas herdadas do laboratório** (nenhuma bloqueia):

- Sete obras têm `"edition": null` — `de-la-villa-100`, `de-la-villa-workbook`,
  `rabinovich-russian`, `averbakh-essential`, `nunn-understanding`,
  `muller-lamprecht-fce` e `seirawan-winning-chess-endings`. Não é descuido: o PDF
  não traz metadados, e a proveniência grava edição. Cada uma se fecha na página de
  rosto, na primeira vez que a obra for aberta no garimpo.
- `kling-horwitz-1851-mott` está registrada e **não é usada** por nenhuma aula desta
  lista. Fica registrada de propósito: a proveniência grava edição, e uma posição
  transcrita do arquivo do Mott não pode citar a de 1889.
- Dvoretsky, Chess Steps e as edições históricas de Philidor estão no corpus
  declarado pelo Doug mas **sem arquivo na biblioteca**, e por isso fora do
  `sources.json`. Nenhuma aula desta lista depende deles.

**Nenhuma obra precisa ser acrescentada ao `sources.json`** — nem para as 18 dos
níveis 1 a 3, nem para as 31 restantes. As posições vindas de estudo declaram o
Silman, que já está registrado e em regime integral (§13). A única mudança de regra
é no validador (§4), não no dado.

---

## 10. Riscos desta lista

| Risco | Aula | O que fazer |
|---|---|---|
| **Ritmo de autoria** | todas | É o risco dominante do plano inteiro, e continua sendo: 48 aulas a escrever, 1 escrita. Medido de verdade quando os níveis 1 e 2 fecharem, com doze aulas no formato novo; os níveis 4 e 5 não começam sem esse número na mesa. |
| **Nove aulas sem posição usável** | §12 | Seis furos e três com capítulo fora do envelope. Oito das nove estão nos níveis 4 e 5, que já são pós-OLESC. A decisão é a alavanca 3 da §6. |
| **A página impressa não é conferida** em nenhuma aula vinda de estudo | todas as novas | §13. É perda de proveniência, não de verdade xadrezística — a tablebase continua julgando o resultado sozinha. |
| **FEN de terceiro, não do PDF** | todas as novas | O gate pega **resultado errado**, não posição certa do tema errado nem tema trocado. Toda posição vinda de estudo vai ao tabuleiro com o Doug antes de publicar. É a única verificação que máquina nenhuma faz aqui, e ela não mudou de natureza — mudou de origem. |
| **Sete capítulos são diagrama didático**, não posição de partida | 8, 13, 18, 36 | O autor desenha com peão na 1ª fila ou dois reis brancos. A `finais:extrair` os marca `tipo: "diagrama"` e eles ficam fora da coluna da §5. Onde o tema depende deles, a posição é montada do zero — ver §12. |
| **Ruptura de peões não cabe em 7 peças** na versão clássica (3×3 = 8) | 38 | **Resolvido, e não como estava previsto:** o `p9` 9 (*Tactical Bombs*, 2p vs. 2p) tem 6 peças e cabe. Conferir no tabuleiro se o tema dele é mesmo ruptura antes de fechar. |
| **Freeborough carrega 46 das 49 aulas** no domínio público | as 16 posições já feitas | Continua valendo só para elas, que é onde o domínio público continua sendo a fonte. Para as novas, a concentração editorial mudou de nome: **quatro estudos do mesmo transcritor, sobre um livro só**. |
| **Aula completa exige DTM (≤ 5 peças)** | 7, 10, 16, 19, 20, 21 | Todas as seis já estão em 3–5 peças. Conferido, e os capítulos do estudo confirmam: nenhum passa de 5. |

---

## 11. Decisões que tomei sozinho — reverta se quiser

1. **"Duas torres" e "dama e torre" viraram uma aula só** (§7), e a lista tem 49 em
   vez de 50. Motivo medido: falta de fonte de domínio público para dama+torre.
2. **A fórmula do teto de rotação é `max(2, floor(N/3))` sobre as aulas
   publicadas** da classe, não sobre as planejadas (§4). Sobre as planejadas seria
   mais elegante, mas o gate lê `content/`, não `lib/`, e não teria como saber.
3. **Os ids continuam com o prefixo de nível do currículo** (`N0-`…`N5-`), com o
   nível num campo à parte. A alternativa (`E-LADDER`, `D-SQUARE`) renomearia as
   aulas prontas e invalidaria posições e cache. O preço é a colisão de
   vocabulário: `N4-B-VS-PAWNS` é aula do **nível 3**, e o `N4` do id é a
   competência do currículo, não o nível da escada.
4. **A terceira leitura virou curta.** O plano previa 3 leituras; a lista tinha 2,
   porque nenhuma outra aula era genuinamente "não se joga". **Em 9/9 sobrou uma
   só** (`N2-ZUGZWANG`): a `N0-MATING-MATERIAL` passou a ser jogada (§14.1).
5. **A ordem dentro do nível 2 coloca o quadrado antes da oposição.** O de la Villa
   põe o quadrado como F1 e a oposição como F2–3, e o quadrado não tem pré-requisito
   nenhum — é a única ferramenta do nível que uma criança usa no mesmo dia em que
   aprende.

**As de 2026-09-09, na rodada dos estudos:**

6. **A coluna "Fase" virou "Estado", e a tabela "Quando cada aula abre" saiu.** As
   duas eram do calendário de sábados (`FN1/B5`, `FN2`…), que o plano dos níveis
   aposenta. Manter uma coluna cujos valores são um calendário morto seria manter o
   documento mentindo. "Estado" diz o que existe em disco, que é o que a autoria
   precisa saber para escolher o que fazer agora.
7. **As colunas "Posição (DP)" e "Sob teto" saíram**, substituídas por "Capítulo do
   estudo". A primeira estava zerada desde 8/9 para as aulas a refazer; a segunda
   ficou sem sujeito quando o teto de citação ficou sem sujeito. Três colunas para
   dizer de onde vem a posição, das quais duas vazias, é pior que uma cheia. O que
   a "Posição (DP)" dizia de verdade continua na **§8**, que ficou.
8. **A tabela de distribuição de livros por classe foi apagada da §4**, e não só
   marcada como vencida. Ela era desejo sobre um eixo que o site não usa mais.
9. **Réti e Vancura entram** (§9), fechando a decisão que aquela seção mandava tomar
   e que estava aberta desde 5/9. Entram pelo estudo, o que significa aceitar a
   proveniência da §13 — posição canônica com o compositor nomeado pelo autor, sem
   o número da página.
10. **As nove aulas sem posição usável ficam na lista**, com o custo escrito na §12,
    em vez de saírem agora. Oito das nove são de nível 4 e 5, que já são
    pós-OLESC; cortá-las hoje é decidir em setembro o que só importa depois do
    torneio. A alavanca 3 da §6 existe para ser puxada quando o ritmo for medido.

**As de 2026-09-09, na reordenação do nível 1** (as três primeiras são do Doug, as
outras são minhas):

11. **A ordem do nível 1 mudou** (§5), e o mate de dama passou a ensinar **a
    técnica do L**, com a caixa ficando na torre.
12. **A `N0-MATING-MATERIAL` virou aula completa e jogada**, e a posição dela veio
    do Doug, não de livro (§14.1).
13. **O `sabado` das seis virou 1.** Sem isso o teste de monotonia de
    `lib/finais/trilha.test.ts` reprova, porque a nova ordem 1 tinha `sabado: 2`.
    É também o que ficou verdadeiro: as seis são a meta da OLESC, o calendário de
    sábados já foi aposentado, e nenhuma das duas que abriam na semana 1 existe em
    disco. **Consequência para o `00-PLANO-MESTRE.md`:** a entrada por sábado
    deixou de ser 2, 8, 12 e 27 e passou a ser **6, 4, 12 e 27**.
14. **A coluna Estado ganhou um quarto valor, `posição DP`** (§5), porque
    "tem posição aprovada" e "pode virar aula" deixaram de ser a mesma coisa. A
    alternativa — deixar as duas no mesmo rótulo — faria a lista prometer atalho
    em seis linhas onde ele não existe.
15. **A menção ao Freeborough X.VI foi retirada da §8 e da §12**, em vez de
    corrigida para outra seção. Não havia seção certa: nenhuma obra de domínio
    público do acervo serve como posição de aula, pelo gate.

---

## 12. O que o livro-base discorda de nós

Esta seção é o achado da rodada de 2026-09-09, e ele não cabe em nota de rodapé:
**a lista de 49 é mais ambiciosa que o livro-base**, e agora isso está medido em
vez de suposto.

A conferência foi tema a tema, contra os quatro estudos, com dois testes por
capítulo: a FEN tem de ser posição legal (a `chess.js` julga) e tem de caber no
**envelope de 7 peças** da §3 (sem isso não há tablebase, e sem tablebase a aula
vira opinião). O resultado:

| | Aulas |
|---|---|
| Com capítulo usável | **40** |
| Furo — nenhum dos quatro estudos tem o tema | **6** |
| Tem capítulo do tema, mas nenhuma FEN aproveitável | **3** |

**Nos níveis 1 a 3 — as 18 da meta da OLESC — o furo é um só.** É nos níveis 4 e 5
que a lista descola do livro.

### Os seis furos

| Ordem | Nível | Aula | O que se sabe |
|---|---|---|---|
| 1 | 1 | `N0-MATING-MATERIAL` | É a abertura da Parte Dois no livro, e o estudo **pula a seção**. É a única das 18 dos níveis 1 a 3 que não vem de estudo — e a única do módulo cuja **posição não veio de livro nenhum**: veio do Doug. O livro entra como fundamento da afirmação, não como fonte do diagrama. **§14.1.** |
| 21 | 4 | `N3-ROOK-BEHIND` | Os caps. 15–18 do `uu` tratam da torre **na frente** do peão — o caso oposto. Medido: o cap. 16, *"inversed rook"*, tem a torre branca em a8 **na frente** do próprio peão a7. Não é ausência de transcrição; é o livro tratando o outro caso. |
| 25 | 4 | `N3-R-VS-2P` | Acima da Classe A. Não está em nenhum dos sete estudos da série. |
| 27 | 4 | `N2-PROTECTED-PASSER` | Os estudos só trazem o passado **distante** (`TW` 21–22). O protegido não vira capítulo em nenhum. **Este furo não estava previsto**: o levantamento anterior dava a aula como coberta. |
| 34 | 4 | `N4-Q-VS-ROOK` | **O próprio Silman diz por escrito que não cobre**, dentro do `uu` cap. 13: *"a glance in our Contents shows that I don't even cover that endgame… too rare and too hard for this book"*. É o furo mais bem documentado dos seis. |
| 47 | 5 | `N4-BISHOP-VS-KNIGHT` | Acima da Classe A. Não está em nenhum dos sete estudos. |

### As três com capítulo e sem posição

Aqui o transcritor fez o trabalho; quem não cabe somos nós.

| Ordem | Nível | Aula | Por quê |
|---|---|---|---|
| 35 | 5 | `N2-TRIANGULATION` | `p9` 11 e 12 são a mesma posição com os dois lados a jogar, e ela tem **10 peças**. Fora do envelope, sem juiz. |
| 36 | 5 | `N2-OUTFLANKING` | `p9` 13 é **diagrama didático**: FEN `k7/8/8/8/8/8/8/K6P`, com um peão em h1 marcando a coluna. Não é posição de partida. |
| 41 | 5 | `N3-SEVENTH-RANK` | `p9` 15 tem **15 peças** e o 16 tem 10. O envelope já previa isto — a §3 diz que a sétima fila só entra "na versão T+P vs T+P (6 peças)" —, e o livro não traz essa versão. |

### As sete que estão uma ou duas faixas acima

Têm capítulo usável, mas só no estudo da **Classe A (1800–1999)**, muito acima do
nível em que as pomos. Na tabela da §5 elas levam `⚠`.

| Ordem | Nível | Aula | Onde está |
|---|---|---|---|
| 22 | 4 | `N3-SIDE-CHECKS` | `uu` 22–27 — o tema por conteúdo, sem o nome "lado curto/lado longo" |
| 29 | 4 | `N2-PAWN-RACES` | `uu` 2–7 *Strange Races* |
| 37 | 5 | `N2-RESERVE-TEMPI` | `uu` 8–12 |
| 39 | 5 | `N2-RETI` | `uu` 6–7 |
| 42 | 5 | `N5-VANCURA` | `uu` 19–21 |
| 43 | 5 | `N3-R-VS-RN-PAWNS` | `uu` 13–14, 21, 27 |
| 46 | 5 | `N4-SAME-BISHOPS` | `uu` 32–37 *Fortresses in Bishop-up Endgames* |

Some-se a isto o que a §1 já diz: os níveis 4 e 5 são FIDE 1200+, e o topo real da
turma é ~1350 FIDE ([[forca-real-dos-alunos]]). **São aulas escritas para um aluno
que o curso quase não tem, a partir de um capítulo escrito para um aluno duas
classes acima disso.**

### Uma exceção nos níveis baixos, e uma meia-aula

Duas coisas menores, para não serem descobertas depois:

- **A ordem 7 (regra do quadrado) não está no estudo dos iniciantes.** Ela é o
  `TW` 20, do estudo da Classe C. O corte por nível continua de pé — a aula já tem
  posição aprovada, do de la Villa (`pos-n1-square-dlv-1-1`) —, mas a frase "os
  níveis 1 a 3 são tópico a tópico o que o livro cobre nessas classes" tem esta
  exceção.
- **A ordem 48 está coberta pela metade.** `TW` 14–15 é *King and Two Doubled
  Pawns vs. Lone King*: ensina os **dobrados**, e contra rei solitário. Os
  **isolados** não viram capítulo em estudo nenhum, e a aula se chama "peões
  dobrados **e** isolados".

### O que fazer com elas — e quando

**Nada agora.** Oito das nove sem posição usável estão nos níveis 4 e 5, que a §1
já declara pós-OLESC. Quando chegarem, as saídas estarão na mesa e são as mesmas
para todas: escrevê-las pelo **de la Villa**, que também está em regime integral;
garimpá-las no **domínio público** da §8; **rebaixá-las a leitura**; ou **cortá-las**,
que é a alavanca 3 da §6 e já estava prevista.

A única que precisa de decisão para a meta da OLESC é a **ordem 1**, e ela já está
decidida — mas não pelo caminho que esta seção previa. Ver a **§14.1**.

---

## 13. O que o atalho do estudo custa, e como pagá-lo

Trabalhar pelo estudo do Lichess em vez de pelo PDF tem um preço, e ele precisa
estar escrito aqui, não descoberto na primeira revisão de proveniência.

**O `provenanceSchema` (`lib/lesson/schema.ts:84`) pede `bibliographicSource` =
"Obra, edição, página e número do diagrama". Trabalhando pelo estudo, não temos a
página.** O gate não pega isso: ele só confere que `provenance.editionFile` case
com uma chave de `content/sources.json` (`scripts/validate-content.ts:399-409`);
ele nunca abre o PDF.

Então a regra de preenchimento, para toda posição vinda de estudo, é:

| Campo | O que escrever |
|---|---|
| `editionFile` | `silman-complete-endgame-course.pdf` — obra registrada, em regime integral desde 8/9 |
| `bibliographicSource` | obra + edição + **a parte e o nome da seção como aparecem no estudo**, com a frase *"página impressa não conferida"* |
| `fenMethod` | a URL do estudo, o número e o nome do capítulo, e que a FEN veio do cabeçalho `[FEN]` do PGN |
| `pendingRisk` | *"transcrição de terceiro; página do livro não conferida. O resultado é julgado pela tablebase, a atribuição ao livro não."* |
| `qaApplied` | a rodada de `validate:content` que julgou a posição |

É o mesmo método que a `N1-KPK` já declara — ela cita `lichess.org/study/SPBNV2KC`
no `fenMethod` e cruza três fontes. **O que muda é que uma das três pernas do
cruzamento sai** — a linha impressa lida no PDF —, e sobram duas: a FEN do estudo e
a tablebase. Isso é perda real de verificação de **proveniência**; não é perda de
**verdade xadrezística**, que a tablebase continua julgando sozinha, e que reprova
em `RESULTADO_ERRADO` um capítulo transcrito errado antes de ele chegar ao aluno.

### Os PGN não entram no repositório, e isto não é preferência

Eles carregam o prefácio e os comentários do Silman transcritos por OCR — a
expressão do autor, que nenhum regime integral autoriza copiar (`SOURCE-CORPUS §1`:
*"o que nenhuma obra autoriza, em qualquer volume: copiar texto, comentário,
tradução…"*). E **este repositório é público**, que é exatamente a razão escrita no
`.gitignore` para `content/repertorio/rascunhos-anotados/` ficar de fora.

Então, pelo molde que o repertório já usava:

- os PGN baixados vão para **`content/finais/estudos/`**, acrescentada ao
  `.gitignore`, e voltam inteiros com um `npm run finais:extrair`;
- o que é versionado é **`content/finais/capitulos.json`** — número, nome do
  capítulo, FEN e a linha principal em UCI —, que é fato com proveniência.

O argumento inteiro está escrito no cabeçalho de `scripts/importar-fontes.ts`
(`:9-18`) e vale palavra por palavra; `scripts/extrair-estudo.ts` aponta para lá em
vez de repeti-lo.

### O que a extração já sabe, e que o olho não veria

Três coisas ficaram medidas no script e valem para quem for transcrever:

1. **O nome do capítulo vem truncado da fonte.** O Lichess corta em 80 caracteres,
   e nos estudos com prefixo longo isso come o nome — os capítulos 2 a 7 do `TW`
   se chamam todos *"King and Pawn vs. Lo"*. **Quem identifica um capítulo é o par
   (estudo, número)**, e a `url` de cada um está no `capitulos.json`.
2. **Sete capítulos são diagrama, não posição** (§12), e a extração os marca.
3. **Zero SAN foi recusado** nos 207 capítulos, o que é a medida de que a
   transcrição de lances do autor é limpa — a prosa dele é que tem erro de OCR
   (*"Carful"*, *"Chicken Coup"*, *"notyet"*), e a prosa nós não usamos.

### O que continua sendo trabalho humano

A **§10** já dizia, e continua valendo com a origem trocada: o gate pega resultado
errado, **não** posição certa do tema errado. Toda posição vinda de estudo vai ao
tabuleiro com o Doug antes de publicar.

---

## 14. O contrato de autoria — o que a tela e o motor obrigam

As réguas desta seção existem há tempo, espalhadas por quatro arquivos:
`docs/VOZ-DO-CURSO.md`, `lib/lesson/schema.ts`, `lib/lesson/roteiro.ts` e a skill
`/revisar-aula`. **O que faltava era alguém dizer, num lugar só, o que elas
obrigam na hora de escrever.** É o que esta seção faz. Nenhum número mora aqui —
todos são lidos de onde vivem, e o ponteiro está ao lado de cada um.

### 14.1 A aula é assistida: o objetivo é mostrado, não lido

Decisão do Doug em 9/9, e é a que governa as 48: *"não pode mais ter texto para
rolar, e o objetivo é mostrado, com o aluno assistindo a aula."*

A etapa 1 **anda sozinha** (`components/lesson/ObjectiveStage.tsx:88`): ninguém
clica para começar, e o relógio é o **texto**, não um cronômetro. Um passo é um
quadro; passo **sem** `lance` repete a posição e apaga o realce do lance anterior
(`lib/lesson/roteiro.ts:57-68`), que é como se aponta antes de mover. Os controles
são dois — `Pausar`/`Continuar` e `Ver de novo` —, e isso é deliberado: *"são
controles de vídeo, e isto não é um vídeo"*.

**Rolar não é uma opção, e não é conselho: é máquina.** O comentário **pagina**
em vez de rolar (`components/lesson/Comentario.tsx:291-357`), medindo o espaço ao
vivo; e a `/revisar-aula` **reprova a aula que paginou**, porque numa aula que
anda sozinha o tabuleiro fica parado esperando um toque que o aluno não sabe que
deve dar. O teto de caracteres por fala da `VOZ-DO-CURSO §3` não é editorial — é
o que cabe na caixa. Quem escreve mira o **celular**, que é onde a caixa é menor.

### 14.2 O orçamento do roteiro é de caracteres, e ele tem piso

A conta está em `lib/lesson/roteiro.ts:124-146` e é curta: cada caractere custa a
digitação mais a pausa de leitura, com um piso por passo. Somados, a faixa de
duração que a `/revisar-aula` cobra vira **um orçamento de caracteres para o
roteiro inteiro** — a `N1-KPK` gasta 787 deles em 13 passos.

**A armadilha é contra-intuitiva: fala curta demais reprova.** Não pelo teto, pelo
**piso**: treze falas telegráficas não somam a duração mínima, porque o piso de
tempo por passo não compensa. Escrever telegráfico não é escrever curto — é
escrever legenda, e o piso existe para recusar legenda.

### 14.3 Casa citada é casa desenhada — e vice-versa

`medir.mjs` varre as falas e reprova **casa órfã**: casa nomeada numa fala sem
desenho naquele passo. É a §5.3 da voz virada máquina, e ela casa com o segundo
dos cinco movimentos (§2.1 de lá): *diga a casa, não a ideia*.

Mais três regras de desenho que a revisão cobra: os desenhos **trocam** a cada
passo e não se acumulam; a etapa 2 tem seta em **todos** os nós, e **nenhuma seta
pode ligar a origem ao destino do lance certo** — seria meio lance entregue; e a
etapa 3 tem **zero** desenho, porque ali o juiz é o resultado.

### 14.4 O aviso não vem antes do erro — e isso decide o formato

§5.4 da voz: o bloco "onde se erra", lido antes do primeiro lance, é o aviso que
a criança decora e não usa; o mesmo texto, dito **na hora em que ela erra**, vira
comportamento. Por isso os perigos vivem em `errors`, disparados pelo nó da
árvore.

**A consequência é de formato, e vale para metade da lista.** Aula cujo conteúdo
*é* um perigo — "não vá para o canto", "não empurre o peão de torre", "não troque
para o bispo errado" — precisa da **etapa 2**, que é onde o erro é nomeado no
instante em que acontece. Uma aula curta só tem o roteiro para dizer isso, e aí
ela diz antes, que é o que a régua recusa. **Aula de perigo tende a ser completa**,
e a `N0-MATING-MATERIAL` é o primeiro caso.

### 14.5 A `N0-MATING-MATERIAL`, e por que ela é a exceção do módulo

A posição é `6k1/4N3/6K1/6N1/8/8/8/8 b - - 0 1` — rei preto em g8; rei branco em
g6, cavalos brancos em e7 e g5, pretas a jogar. **Ela veio do Doug, não de livro
nenhum**, e é a única do módulo assim.

Conferida por três vias que não se falam: a `chess.js`, o Stockfish a
profundidade 65, e a Syzygy quando virar arquivo. O preto está **em xeque** e tem
**dois lances legais, e só dois**: `Kf8` empata, `Kh8` leva `Nf7#`. É uma escolha
binária em que o canto perde na hora, e é por isso que a árvore da etapa 2 é a
mais barata da lista — o primeiro nó tem dois lances.

**A inversão que esta aula faz, registrada para ninguém "consertá-la":** nas
outras aulas o roteiro mostra o método e a árvore o cobra. Aqui **o roteiro joga
a armadilha** — `Kh8`, `Nf7#` — e a árvore cobra evitá-la. As duas linhas divergem
de propósito: é o que "mostra antes de nomear" significa quando o que se ensina é
um erro.

**A honestidade que a aula exige:** dois cavalos **não forçam** mate — a tablebase
diz empate em toda posição, inclusive nesta. O mate existe só quando o defensor
colabora. As duas coisas têm de ser ditas, porque metade só é a metade que perde
partida. E a linha que empata não foge para o meio: o rei preto anda na última
fila entre f8, e8 e d8, longe dos dois cantos.

**A fonte, com o papel trocado.** O livro-base é o Silman, que tem a seção que o
estudo pula (*"What Can (or Cannot) Mate vs. Lone King"*). Mas como a posição não
veio dele, o livro entra **fundamentando a afirmação**, não originando o diagrama
— e o `fenMethod` diz isso com todas as letras.

**Uma dívida que esta aula descobriu, e que é só de nome.** O vocabulário de erro
do `lessonErrorSchema` tem duas palavras — `off-method` ("o lance ainda ganha") e
`loses-win` ("o lance joga a vitória fora") —, e `Kh8` não joga fora vitória
nenhuma: joga fora um **empate**.

**A máquina, porém, está certa, e isto foi medido contra o gate, não suposto.**
`scripts/validate-content.ts:666` calcula `winning = goalMovesOf(entry, tree.goal)`
— os lances que preservam **o objetivo da árvore**, que numa árvore de `draw` é o
empate. Escrever `off-method` para o `Kh8` foi reprovado em `VEREDITO_ERRADO`, com
a mensagem certa pelo motivo certo; `loses-win` passou. Ou seja: o campo funciona,
e o que mente é o rótulo dele.

Fica declarado como dívida de nomenclatura, não de lógica — **metade do curso é
empate** (Filidor, peão de torre, bispos de cores opostas), e em todas essas aulas
o autor vai escrever `loses-win` querendo dizer "joga o empate fora". Renomear o
campo é reescrever o corpus; o comentário do schema é que precisa dizer isto.

### 14.6 Toda aula fecha na `/revisar-aula`, sem exceção

`/revisar-aula <ID>` roda os quatro gates, sobe o site, entra como `alunoteste` e
mede nas duas resoluções. **É ela que mede o que o `npm test` não mede** — e isso
não é redundância, é o único caminho: `lib/lesson/roteiro.test.ts` está preso à
`N1-KPK`, então a duração das 48 aulas novas **não roda** no `node --test`.

Três coisas dela que valem antes de escrever: a **dívida conhecida** dos 76 px de
rolagem no celular, que é do cabeçalho e vai reprovar três linhas em toda aula —
citar e seguir; **nenhuma imagem entra na conversa**, e se for preciso ver, é uma
folha de contato lida por um subagente; e a instrução que fecha a skill —
***"se a aula passar limpa, desconfie e diga isso"***, porque quem escreve e quem
revisa são o mesmo agente.
