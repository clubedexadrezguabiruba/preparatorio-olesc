# Trilha de finais — a lista, as classes e as regras que a governam

Este é o documento da **FN0**. Ele fixa o que o curso de finais dentro do
preparatório vai ensinar, em que ordem, em que formato e a partir de qual obra —
antes de qualquer linha de código. O que aqui se decide é o **conteúdo**, e é o
que `lib/finais/trilha.ts` vai copiar campo a campo.

A lista abaixo **não é o sumário de nenhum livro**. Isso importa juridicamente:
uma posição de xadrez é fato e não se protege, mas a *seleção e a ordem* de um
livro são obra do autor. A nossa seleção sai do cruzamento de três coisas que já
tinham sido cruzadas no `docs/CURRICULO.md` do Laboratório de Finais — as seções
de conteúdo das Partes 1–5 do Silman, o subconjunto para amador que o próprio de
la Villa publica na p. 11 do dele, e o mapa de competências N0–N5 do currículo —
e a ordem dentro de cada classe é por **frequência em partida** e por
**pré-requisito**, não pela ordem de nenhum sumário.

---

## 1. A espinha: quatro classes

O Doug escolheu a progressão por classe de força, no estilo do Silman. As letras
são as classes da **USCF**, não invenção de autor nenhum; a coluna do chess.com é
conversão aproximada, porque o chess.com roda 150–250 pontos acima do USCF nesta
faixa.

| Classe | USCF | ≈ chess.com | O que a classe ensina |
|---|---|---|---|
| **E** | até 1199 | até ~1350 | mates básicos, afogamento, o que dá mate, o rei como peça |
| **D** | 1200–1399 | ~1350–1550 | rei e peão: quadrado, oposição, casas-chave, peão de torre; peça menor e torre contra peão |
| **C** | 1400–1599 | ~1550–1800 | torres: Lucena, Filidor, torre atrás do peão, lado curto/longo; peões passados; bispo errado; dama contra peão; bispos de cores opostas |
| **B** | 1600–1799 | ~1800–2000 | triangulação, oposição distante, corridas, T+2P vs T, sétima fila, Vancura, dois bispos, B vs C |

Os alunos estão em 1000–1400. **E + D + C** é a entrega que cobre "até 1800 no
chess.com"; a classe **B** é o teto ambicioso, e é condicional (§6).

A classe entra na aula como campo `class: "E" | "D" | "C" | "B"` do JSON, e na
trilha como `classe`. O **id** da aula continua sendo o do currículo do
laboratório (`N0-`…`N5-`), porque `N0-R-MATE` e `N0-Q-MATE` já existem e
renomeá-los invalidaria as posições e o cache da tablebase. Onde uma competência
do currículo rende mais de uma aula, a segunda ganha sufixo próprio (`N1-KPK` e
`N1-KPK-RANKS`) — são duas aulas da mesma competência, não duas competências.

---

## 2. Os três formatos

O motor de aula tem seis etapas: objetivo, exemplo, guiada, sem-ajuda, prática e
revisão. As duas etapas de árvore (guiada e sem-ajuda) são a parte cara de
escrever — cada nó precisa de erro nomeado, resposta do defensor e lances gerados
pela tablebase. Quarenta e nove aulas completas não cabem em cinco semanas. Então:

| Formato | Marca | Etapas | Dominada quando | Custo |
|---|---|---|---|---|
| **Completa** | `C` | as 6 | sem-ajuda concluída **e** prática vencida | 6–8 h |
| **Curta** | `c` | objetivo + exemplo + prática (+ revisão) | prática vencida ou segurada | ~2 h |
| **Leitura** | `L` | objetivo + exemplo | exemplo assistido até o fim | ~1 h |

No motor isso custa quase nada: o `LessonPlayer` já renderiza cada etapa só se ela
existir na aula, e o `masteryReport` passa a receber o que a aula tem em vez de
exigir sempre as duas provas. O aluno vê o formato escrito no cartão da trilha
("aula curta"), para não procurar uma etapa que não existe.

**A explicação mora dentro da aula.** A etapa 1 traz a técnica em uma frase, o
porquê, e de 2 a 5 regras, cada uma com um quadro do tabuleiro; a etapa 2 anima a
linha inteira com texto por lance, parando em cada fase. É isso que substitui o
professor quando a criança estuda sozinha no celular na quarta-feira à noite.

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

Hoje o gate cobra `FONTE_DIDATICA_DOMINA` como **"uma obra protegida é base de no
máximo uma aula por nível"**. Com ~12 aulas por classe e 5 livros didáticos, isso
é aritmeticamente impossível. A regra passa a ser:

> Nenhuma obra protegida é livro-base de mais de `max(2, floor(N/3))` aulas
> **publicadas** de uma mesma classe, onde `N` é o número de aulas publicadas
> daquela classe.

Duas coisas nessa fórmula não são enfeite:

- **`floor`, não `ceil`** — `ceil(16/3) = 6` já seria 37,5% de uma classe de 16, e
  a regra diz "um terço".
- **o piso de 2** — as classes abrem em fatias (a classe C começa com quatro aulas
  na FN2 e só fecha na FN3). Sem o piso, uma classe recém-aberta com duas aulas
  seria reprovada por ter as duas do mesmo autor, e a regra viraria um obstáculo à
  publicação incremental em vez de uma regra editorial.

O que **não** muda: o teto de **2 posições por obra protegida por aula** (§12.7.1
do currículo), a proibição de diagramas consecutivos da mesma obra, e o texto 100%
escrito do zero em PT-BR. E cada aula continua declarando o livro que a fundamenta
no campo `objective.source`.

A distribuição planejada, conferida contra a regra:

| Classe | Aulas | Teto | Silman | de la Villa | Müller Kids | Pandolfini | Seirawan |
|---|---|---|---|---|---|---|---|
| E | 6 | 2 | 2 | — | 2 | 1 | 1 |
| D | 12 | 4 | 4 | 3 | 2 | 1 | 2 |
| C | 16 | 5 | 5 | 5 | 2 | 2 | 2 |
| B | 15 | 5 | 5 | 5 | 1 | 1 | 3 |

Nenhuma célula estoura o teto, e as fatias intermediárias (FN1 com 4 aulas de D;
FN2 com 4 de C; FN3 com 2 de B) cabem no piso de 2.

---

## 5. A lista — 49 aulas

**Legenda de formato:** `C` completa · `c` curta · `L` leitura · ✔ já existe.

**Legenda de obras.** Domínio público: `CAP` Capablanca 1921 · `KH` Kling &
Horwitz 1889 · `FRE` Freeborough 1891 · `WAL` Walker 1832 · `STA` Staunton 1848 ·
`COO` Cook 1880 · `ROG` Rogers 1907 · `CUN` Cunnington 1903 · `LIC` Lichess (CC0).
Protegidas: `SIL` Silman · `DLV` de la Villa · `MK` Müller *for Kids* · `PAN`
Pandolfini · `SEI` Seirawan · `RAB` Rabinovich · `AVE` Averbakh · `NUN` Nunn ·
`MLA` Müller & Lamprecht.

A coluna **Base** é o livro-base didático (etapas 1 e 2). A coluna **Posição (DP)**
lista as fontes de domínio público de onde a posição pode sair — **toda aula tem
pelo menos uma**, e os capítulos foram conferidos no PDF, não lembrados (§8). A
coluna **Sob teto** lista as protegidas que podem contribuir com até 2 posições
cada.

### Classe E — 6 aulas

| # | F | Id | Aula | Peças | Base | Posição (DP) | Sob teto | Fase |
|---|---|---|---|---|---|---|---|---|
| 1 | ✔C | `N0-Q-MATE` | Mate de dama e rei: a caixa | 3 | SIL | CAP §1 · COO VII.I · STA VI.1 · FRE refs | SIL, PAN, MK | pronta |
| 2 | ✔C | `N0-R-MATE` | Mate de torre e rei: a caixa | 3 | MK | CAP §1 · STA VI.1 · FRE VII.I · ROG II | MK, PAN, SIL | pronta |
| 3 | c | `N0-LADDER` | Mate da escada: duas torres, e dama e torre | 4 | PAN | FRE VII.II · WAL "Various Checkmates" No. I | PAN, SIL | B5 |
| 4 | c | `N0-STALEMATE` | Afogamento: como não empatar a partida ganha | 3–4 | MK | FRE V.II–V · CAP §2 · CUN VI | MK, SIL | B5 |
| 5 | L | `N0-MATING-MATERIAL` | O que dá mate e o que não dá (B, C, 2C contra rei) | 3–4 | SEI | STA VI.1 (405–408) · FRE X.VI/VIII · CAP §15 | SEI, SIL, DLV | B5 |
| 6 | c | `N1-KING-ACTIVITY` | O rei é peça: use-o | 3–5 | SIL | FRE I.VII "Playing the King to the front" · CUN I | SIL, NUN | B5 |

### Classe D — 12 aulas

| # | F | Id | Aula | Peças | Base | Posição (DP) | Sob teto | Fase |
|---|---|---|---|---|---|---|---|---|
| 7 | C | `N1-SQUARE` | Regra do quadrado | 3 | DLV | FRE I.I "Calculation of distances" · CAP §12 | DLV, SIL | B5 |
| 8 | c | `N1-DIRECT-OPPOSITION` | Oposição | 3 | SIL | FRE II.I "The Opposition illustrated" · CAP §13 · STA VI.IV | SIL, DLV | B5 |
| 9 | c | `N1-KEY-SQUARES` | Casas-chave | 3 | DLV | FRE II.III · FRE refs "Opposition, how to secure" · CUN I | DLV, NUN | FN2 |
| 10 | C | `N1-KPK` | Rei e peão contra rei: o rei na frente do peão | 3 | SIL | STA VI.1 (409) · ROG IV · FRE II.III · KH | SIL, MLA | B5 |
| 11 | c | `N1-KPK-RANKS` | Peão na 6ª e na 7ª: quem joga decide | 3 | MK | STA VI.IV (473) · FRE II.III · KH | MK, DLV | B5 |
| 12 | c | `N1-ROOK-PAWN` | Peão de torre: o empate do canto | 3 | MK | FRE III.II–III "Rooks' pawns' difficulties" · CUN I | MK, SIL, DLV | FN2 |
| 13 | c | `N2-KING-MANEUVER` | Oposição além do básico: a distante | 3 | SIL | FRE II.I–II · FRE refs "how to maintain" · CAP §13 | SIL, DLV | FN2 |
| 14 | c | `N4-B-VS-PAWNS` | Bispo contra peão | 4 | SEI | FRE X.I "A Bishop with, and against pawns" · KH "Bishops and Pawns" · CUN II | SEI, SIL | FN2 |
| 15 | c | `N4-N-VS-PAWNS` | Cavalo contra peão, inclusive o de torre na 7ª | 4 | DLV | FRE X.II "Knight-play against pawns" · KH · CUN II | DLV, AVE | FN2 |
| 16 | C | `N3-R-VS-PAWN` | Torre contra peão: contar, cortar, aproximar | 4 | SIL | FRE VII.III · STA VI.III (443) · KH "Rook against Pawns" | SIL, DLV | FN2 |
| 17 | c | `N1-KING-VS-PAWNS` | Rei contra dois peões passados | 4 | PAN | FRE I.III · FRE refs "King alone against two Pawns" · WAL | PAN, DLV | FN2 |
| 18 | c | `N1-PAWNS-BLOCKADE` | Um peão segura dois: o bloqueio | 5 | SEI | FRE I.II "Self-supporting pawns" · CUN I (introdução) | SEI, SIL | FN2 |

### Classe C — 16 aulas

| # | F | Id | Aula | Peças | Base | Posição (DP) | Sob teto | Fase |
|---|---|---|---|---|---|---|---|---|
| 19 | C | `N3-LUCENA` | Lucena: a ponte | 5 | SIL | FRE VIII.III "Rook and pawn against Rook" · STA VI.III (441) · KH | SIL, DLV | FN2 |
| 20 | C | `N3-PHILIDOR` | Filidor: a defesa da terceira fila | 5 | DLV | FRE VIII.III · CUN III · STA VI.III | DLV, SIL | FN2 |
| 21 | C | `N3-ROOK-BEHIND` | Torre atrás do peão passado | 5 | SIL | FRE VIII.III · FRE refs "Rooks, their strongest position" · CUN III | SIL, DLV | FN2 |
| 22 | c | `N3-SIDE-CHECKS` | Lado curto, lado longo | 5 | DLV | FRE VIII.III · KH "Rook with and without Pawns" | DLV, SIL | FN2 |
| 23 | c | `N3-CUT-FILE` | Cortar o rei pela coluna | 5 | DLV | FRE VII.III + VIII.III · CUN III | DLV, NUN | FN3 |
| 24 | c | `N3-DEFENSIVE-EXCEPTIONS` | Defesa passiva: quando ela segura | 5 | SIL | FRE VIII.III · STA VI.III | SIL, DLV | FN3 |
| 25 | c | `N3-R-VS-2P` | Torre contra dois peões | 5 | DLV | FRE VII.IV "Rook against two pawns" · STA VI.III (443) · KH | DLV, AVE | FN3 |
| 26 | c | `N2-OUTSIDE-PASSER` | Peão passado distante | 6 | SIL | CAP §11 "Obtaining a Passed Pawn" · FRE IV.II | SIL, DLV | FN3 |
| 27 | c | `N2-PROTECTED-PASSER` | Peão passado protegido | 6 | DLV | CAP §11 · FRE IV.III "Equality of pawns" | DLV, SIL | FN3 |
| 28 | c | `N1-K2P-VS-K` | Rei e dois peões contra rei: ligados e dobrados | 4–5 | MK | FRE I.II · CUN I · STA VI.IV | MK, SIL, DLV | FN3 |
| 29 | c | `N2-PAWN-RACES` | Corrida de peões: quem promove primeiro | 4–6 | PAN | CAP §12 · FRE I.I · STA VI.IV (494) | PAN, NUN | FN3 |
| 30 | c | `N4-Q-VS-PAWN` | Dama contra peão na 7ª: quando ganha, e as exceções | 4 | SIL | FRE V.II–V (77–82) · STA VI.II (430) · KH "Queen against Pawns" · CUN VI | SIL, DLV | FN3 |
| 31 | c | `N4-WRONG-BISHOP` | Bispo errado com peão de torre | 4 | MK | FRE refs "Bishop with Rook's Pawn" (45, 194) · ROG VI · STA VI.1 (409) | MK, SIL | FN3 |
| 32 | c | `N4-OPPOSITE-BISHOPS` | Bispos de cores opostas: a fortaleza com um peão a menos | 5 | SEI | FRE XI.IV · KH "Bishops and Pawns" · CUN II | SEI, SIL, DLV | FN3 |
| 33 | c | `N4-N-AND-ROOK-PAWN` | Cavalo e peão de torre na 6ª/7ª contra rei | 4 | PAN | FRE X.IV "Knight and pawn against King" · STA VI.1 (409) | PAN, SIL | FN3 |
| 34 | c | `N4-Q-VS-ROOK` | Dama contra torre: o básico | 4 | SEI | FRE VI.I "Queen against Rook" · CAP §16 · STA VI.II (415) · KH | SEI, DLV | FN3 |

### Classe B — 15 aulas

| # | F | Id | Aula | Peças | Base | Posição (DP) | Sob teto | Fase |
|---|---|---|---|---|---|---|---|---|
| 35 | c | `N2-TRIANGULATION` | Triangulação | 4–6 | SIL | FRE refs "Le Trébuchet" (34) · FRE II · CUN I | SIL, DLV, RAB | FN3 |
| 36 | c | `N2-OUTFLANKING` | Flanquear o rei | 3 | SIL | FRE II.I–II · CAP §13 | SIL, NUN | FN3 |
| 37 | c | `N2-RESERVE-TEMPI` | Tempos de reserva | 6 | DLV | FRE IV.III "Equality of pawns" · STA VI.IV (483) | DLV, AVE | FN4 |
| 38 | c | `N2-BREAKTHROUGH` | Ruptura de peões ⚠ | 7 | DLV | FRE I.VI "Breaking through an array of pawns" · STA VI.IV | DLV, NUN | FN4 |
| 39 | c | `N2-RETI` | Manobra de Réti: o rei que faz duas coisas ⚠ | 4 | SEI | FRE I.I (a família) — **fonte DP da posição canônica pendente** | SEI, NUN | FN4 |
| 40 | c | `N3-R-2P-VS-R` | Torre e dois peões ligados contra torre | 6 | SIL | FRE VIII.IV "Rook and two pawns against Rook" · KH | SIL, DLV | FN4 |
| 41 | c | `N3-SEVENTH-RANK` | A sétima fila | 6 | SIL | FRE VIII.V "Rook and pawn against Rook and pawn" · CUN III | SIL, MLA | FN4 |
| 42 | c | `N5-VANCURA` | Defesa de Vancura ⚠ | 5 | DLV | FRE VIII.III (a família) — **fonte DP da posição canônica pendente** | DLV, SIL | FN4 |
| 43 | c | `N3-R-VS-RN-PAWNS` | Torre contra peão de torre e de bispo: as exceções | 4 | DLV | FRE VII.III · STA VI.III (443) | DLV, AVE | FN4 |
| 44 | c | `N0-2B-MATE` | Dois bispos contra rei | 4 | SEI | STA VI.1 (405) · WAL No. II · ROG V · FRE X.V | SEI, SIL | FN4 |
| 45 | c | `N4-OPPOSITE-BISHOPS-2P` | Bispos de cores opostas com dois peões: quando ganha | 6 | DLV | FRE XI.IV · KH "Bishops and Pawns" | DLV, SIL | FN4 |
| 46 | c | `N4-SAME-BISHOPS` | Bispo e peão contra bispo da mesma cor | 5 | SIL | FRE XI.IV (226) · KH · CUN II | SIL, DLV | FN4 |
| 47 | c | `N4-BISHOP-VS-KNIGHT` | Bispo contra cavalo com um peão | 5 | SEI | FRE XI.II–III (222–224) · CAP §14 · KH "Two Minor Pieces" | SEI, DLV | FN4 |
| 48 | c | `N2-DOUBLED-ISOLATED` | Peões dobrados e isolados no final de peões | 5–6 | MK | FRE IV.III · CUN I · STA VI.IV | MK, DLV | FN4 |
| 49 | L | `N2-ZUGZWANG` | Zugzwang: a obrigação de mover | 4 | PAN | FRE refs "Le Trébuchet" (34) · CUN I | PAN, SIL, DLV | FN4 |

⚠ = risco de conteúdo declarado na §10.

### Quando cada aula abre

`sabado` na trilha é a **semana do preparatório** a partir da qual a aula aparece
(`lib/curso/calendario.ts`). Aula aberta = está na trilha **e** o JSON existe com
`status: "published"` **e** a semana dela chegou.

| Fase | Fecha em | Aulas | Total no ar | Semana |
|---|---|---|---|---|
| FN1/B5 | qui 17/9 | 1–8, 10, 11 | 10 | 2 (19/9) |
| FN2 | qui 24/9 | 9, 12–22 | 22 | 3 (26/9) |
| FN3 | qui 1/10 | 23–36 | 36 | 4 (3/10) |
| FN4 | sex 9/10 | 37–49 | 49 | 4 |

FN3 e FN4 caem as duas na semana 4 porque o calendário do preparatório tem quatro
sábados e a semana 4 vai de 3/10 até a véspera do torneio. Não é problema: o aluno
estuda no próprio ritmo, e a trilha mostra o que está aberto, não o que é do dia.

---

## 6. O que isto custa, e a alavanca se apertar

| | Quantidade | Horas por aula | Horas |
|---|---|---|---|
| Completas novas | 6 | 6–8 | ~40 |
| Curtas | 39 | ~2 | ~78 |
| Leituras | 2 | ~1 | ~2 |
| **Total** | **47 novas** | | **~120 h em cinco semanas (~24 h/semana)** |

O ritmo vem medido do laboratório: 5,9 → 8,6 posições garimpadas por hora
(`SOURCE-CORPUS.md §7`). O número que vale de verdade é o que a **FN1/B5** vai
medir com oito aulas reais; é ele que decide se a FN4 acontece.

Alavancas, em ordem, se o ritmo não sustentar:

1. rebaixar aulas curtas da classe B para **leitura** (economiza ~1 h cada);
2. reduzir completas de 8 para 6 — as aulas 16 (torre contra peão) e 21 (torre
   atrás do peão) viram curtas (economiza ~12 h);
3. **fechar em 36 aulas** (E+D+C), que é a entrega "até 1800 chess.com". A classe B
   inteira fica para depois do torneio, e o site não sente: a trilha ganha aulas
   por acréscimo, nunca por reforma.

---

## 7. O que ficou de fora, e por quê

| Fora | Motivo |
|---|---|
| Mate de bispo e cavalo | raro em partida de 1000–1400; o Silman e o currículo o excluem do essencial |
| Converter vantagem simplificando | 8+ peças: sem tablebase, sem juiz |
| Finais de dama contra dama | 8+ peças na prática, e fora da faixa |
| T+B vs T | 5 peças, mas técnica de 2000+; sem retorno nesta faixa |
| Casas correspondentes (`N5-CORRESPONDENCE`) | acima da classe B |
| Revisão espaçada com datas | fora do escopo do branch |
| Caderno de finais | cancelado pelo Doug |

Uma fusão em relação ao rascunho do plano:

- **"duas torres" e "dama e torre" viraram uma aula** (a 3, `N0-LADDER`). Motivo
  medido: nenhuma das nove obras de domínio público traz diagrama de dama+torre
  contra rei — o Freeborough tem "King and two Rooks against King" (VII.II) e a
  lista de referências avulsas dele cobre dama, torre, duas torres, dois bispos,
  bispo+cavalo e dois cavalos, e para aí. Sem fonte de domínio público a aula
  quebraria a regra "1+ DP por aula"; e a técnica é literalmente a mesma escada.
- Por isso a lista tem **49 aulas, não 50**.

---

## 8. Mapa de cobertura de domínio público — o que foi conferido

Esta seção existe para que a autoria não recomece a busca. Os capítulos abaixo
foram lidos no índice do próprio PDF em 2026-09-05, não lembrados. **As páginas são
as impressas**; os deslocamentos PDF↔impressa já medidos estão no
`docs/SOURCE-CORPUS.md §3` do laboratório (`kling-horwitz-1889` +13,
`freeborough-1891` +5, `walker-1832` +19, `staunton-1848` +8).

**`freeborough-1891` — a espinha de domínio público do curso.** É o único livro do
acervo público que cobre quase toda a lista, e por isso aparece em 47 das 49 aulas.
Índice conferido:

| Cap. | Seções | Serve às aulas |
|---|---|---|
| I Elementary positions | I distâncias (14) · II peões que se sustentam (15) · III rei contra três peões (16) · IV posições ganhas depois da promoção (17) · V dois peões contra dois (18) · VI ruptura (18) · VII o rei à frente (28) | 6, 7, 17, 18, 28, 29, 38 |
| II The Kings in opposition | I oposição (24) · II rei atrás dos peões (26) · III K+P vs K (38) | 8, 9, 10, 13, 36 |
| III Side pawns | I peão de cavalo (42) · II dificuldades do peão de torre (44) · III peão de torre na defesa (48) | 12, 31 |
| IV Pawns against pawns | I empatar com força inferior (54) · II ganhar com superior (58) · III igualdade de peões (66) | 26, 27, 37, 48 |
| V The Queen | II–V dama contra peão central/bispo/cavalo/torre (77–82) · VI contra dois peões (84) · VII Q+P na 7ª vs Q (86) | 4, 30 |
| VI Queen vs inferior pieces | I dama contra torre (98) | 34 |
| VII The Rook | I R vs K (121) · II 2R vs K (123) · III torre contra peão · IV contra dois peões · V contra três | 2, 3, 16, 25, 43 |
| VIII Rook and pawn(s) | III R+P vs R (162) · IV R+2P vs R (167) · V R+P vs R+P (172) | 19, 20, 21, 22, 23, 24, 40, 41, 42 |
| X Minor pieces | I bispo e peões (194) · II cavalo contra peões (200) · IV C+P vs K (204) · V 2B vs K (206) · VI B+C vs K (208) | 5, 14, 15, 33, 44 |
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

**A exceção — duas aulas sem fonte de domínio público para a posição canônica:**

| Aula | Posição | Situação |
|---|---|---|
| 39 `N2-RETI` | estudo de Réti, 1921 | Está em domínio público no Brasil (Réti morreu em 1929; vida + 70 = 1999), mas **nenhuma edição dele está na `biblioteca/`**, e obra sem arquivo não entra no `sources.json` — registrar o que ninguém pode abrir produz proveniência que ninguém conferiu. |
| 42 `N5-VANCURA` | estudo de Vančura, publicado em 1924 | Mesmo caso (Vančura morreu em 1921). |

As duas são de 1921–24, posteriores ao Freeborough (1891) e ao Cunnington (1903), e
por isso não há como cobri-las com o acervo atual. **Decisão a tomar antes da FN4** —
as duas saem juntas ou entram juntas:

1. baixar e registrar uma edição de domínio público de cada estudo (a via limpa); ou
2. rebaixá-las para **leitura**, em que a posição vem de obra protegida sob o teto
   de 2 e o texto é 100% nosso, sem árvore e sem prática; ou
3. cortá-las. São as duas últimas da classe B; cortá-las não move a entrega de "até
   1800 chess.com".

Como as duas estão na FN4, que já é condicional, isto **não bloqueia nada** até
outubro. Fica registrado agora para não ser descoberto na véspera.

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

**Nenhuma obra precisa ser acrescentada ao `sources.json` para a FN1.** A única
mudança de regra é no validador (§4), não no dado.

---

## 10. Riscos desta lista

| Risco | Aula | O que fazer |
|---|---|---|
| **Ruptura de peões não cabe em 7 peças** na versão clássica (3×3 = 8) | 38 | Procurar 3P vs 2P no Freeborough I.VI e no Staunton VI.IV. Se não houver, a aula sai — e a classe B fica com 14. |
| **Réti e Vancura sem edição de domínio público** | 39, 42 | §9. Decidir antes da FN4. |
| **FEN reconstruído de diagrama de PDF** | todas | O gate pega resultado errado, **não** diagrama lido errado. Toda posição vinda de diagrama passa pela conferência do Doug no tabuleiro. É a única verificação que máquina nenhuma faz aqui. |
| **Freeborough carrega 47 das 49 aulas** no domínio público | todas | Não fere regra nenhuma — domínio público não tem teto. Mas é concentração editorial: onde houver segunda fonte pública (Staunton, Kling & Horwitz, Cunnington, Capablanca), a autoria deve preferir alternar, e a coluna "Posição (DP)" já lista a alternativa. |
| **Ritmo de autoria** | todas | É o risco dominante do plano inteiro. Medido na FN1/B5 com oito aulas reais; decidido na FN2. |
| **Aula completa exige DTM (≤ 5 peças)** | 7, 10, 16, 19, 20, 21 | Todas as seis já estão em 3–5 peças. Conferido. |

---

## 11. Decisões que tomei sozinho — reverta se quiser

1. **"Duas torres" e "dama e torre" viraram uma aula só** (§7), e a lista tem 49 em
   vez de 50. Motivo medido: falta de fonte de domínio público para dama+torre.
2. **A fórmula do teto de rotação é `max(2, floor(N/3))` sobre as aulas
   publicadas** da classe, não sobre as planejadas (§4). Sobre as planejadas seria
   mais elegante, mas o gate lê `content/`, não `lib/`, e não teria como saber.
3. **Os ids continuam com o prefixo de nível do currículo** (`N0-`…`N5-`), com a
   classe num campo à parte. A alternativa (`E-LADDER`, `D-SQUARE`) renomearia as
   duas aulas prontas e invalidaria posições e cache.
4. **A terceira leitura virou curta.** O plano previa 3 leituras; a lista tem 2
   (`N0-MATING-MATERIAL` e `N2-ZUGZWANG`), porque nenhuma outra aula da lista é
   genuinamente "não se joga".
5. **A ordem dentro da classe D coloca o quadrado antes da oposição.** O de la Villa
   põe o quadrado como F1 e a oposição como F2–3, e o quadrado não tem pré-requisito
   nenhum — é a única ferramenta da classe que uma criança usa no mesmo dia em que
   aprende.
6. **Réti e Vancura ficam na lista com o risco escrito**, em vez de saírem agora.
   Estão na FN4, que já é condicional; decidir em setembro o que só importa em
   outubro é decidir cedo demais.
