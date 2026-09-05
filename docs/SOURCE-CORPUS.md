# Source Corpus — as obras que sustentam o conteúdo

> O arquivo que a §12.1 do `CURRICULO.md` sempre apontou e que nunca existiu.
> Nasceu em 2026-08-18, junto com a decisão do Doug que reabriu as fontes
> (§12.2 e §12.7 do currículo, §0.4 do plano da F1).
>
> Este é o registro **para gente**: identidade das obras, legibilidade medida,
> mapa de cobertura e as regras que não dão para mecanizar. O registro **para
> máquina** é o `content/sources.json`, que o gate de conteúdo lê a cada
> `npm run validate:content`. Os dois têm de dizer a mesma coisa; quando
> divergirem, o `sources.json` é o que morde e este arquivo é o que está errado.

---

## 1. A regra em três frases

**Toda obra registrada aqui pode originar posição** — comprada ou em domínio
público. O que muda entre elas não é o direito de tirar a posição: é **quanto**
se pode tirar da mesma obra, porque o que a lei protege é a *coleção* do autor,
não o fato isolado. Obra protegida tem **teto de 2 posições por aula**, cobrado
pelo gate; domínio público e CC0 não têm teto.

O que nenhuma obra autoriza, em qualquer volume: copiar texto, comentário,
tradução, seleção completa de exercícios ou estrutura editorial. Todo texto do
curso é escrito do zero, em PT-BR.

---

## 2. As obras registradas

`Teto` = quantas posições a obra pode dar para uma mesma aula. `Legível` = o
subagente consegue achar página por busca de texto (teste da §4).

| # | Slug | Obra | Edição | Teto | Legível |
|---|---|---|---|---|---|
| 1 | `capablanca-1921` | Capablanca, _Chess Fundamentals_ | Harcourt, Brace, Nova York, 1921 | sem teto | sim (270 pág.) |
| 2 | `kling-horwitz-1889` | Kling & Horwitz, _Chess Studies and End-Games_ | 2ª ed., rev. W. Wayte, G. Bell and Sons, Londres, 1889 | sem teto | sim (393 pág.) |
| 3 | `kling-horwitz-1851-mott` | Kling & Horwitz, _Chess Studies; or, Endings of Games_ | 1ª ed., org. Henry C. Mott | sem teto | sim (260 pág.) |
| 4 | `freeborough-1891` | Freeborough, _Chess Endings: A Companion to Chess Openings Ancient and Modern_ | Kegan Paul, Trench, Trübner & Co., Londres, 1891 | sem teto | sim (251 pág.) |
| 5 | `walker-1832` | Walker, _A New Treatise on Chess: containing the rudiments of the science_ | Messrs. Walker, Londres, 1832 | sem teto | OCR em 2026-08-18 (7.645 caracteres) |
| 6 | `staunton-1848` | Staunton, _The Chess-Player’s Handbook_ | Henry G. Bohn, Londres, 1848 | sem teto | sim (514 pág.) |
| 7 | `cook-1880` | Cook, _The Chess Primer: A Stepping-Stone for Beginners_ | Smart and Allen, Londres, 1880 | sem teto | OCR em 2026-08-18 (5.542 caracteres) |
| 8 | `rogers-1907` | Rogers, _How to Play Chess_ | Thomas Y. Crowell, Nova York, 1907 | sem teto | sim (176 pág.) |
| 9 | `cunnington-1903` | Cunnington (org.), _Selected Chess Endings_ | George Routledge & Sons, Londres / E. P. Dutton, Nova York, 1903 | sem teto | sim (104 pág.) |
| 10 | `lichess-open-database` | Lichess Open Database | exports públicos, sem arquivo local | sem teto (CC0) | n/a |
| 11 | `de-la-villa-100` | De la Villa, _100 Endgames You Must Know_ | a confirmar na folha de rosto | 2 | OCR em 2026-08-18 |
| 12 | `de-la-villa-workbook` | De la Villa, _The 100 Endgames You Must Know Workbook_ | a confirmar | 2 | sim (286 pág.) |
| 13 | `de-la-villa-amostra` | De la Villa, _100 Basic Endgames_ (excerto) | excerto promocional, 31 pág. | 2 | sim |
| 14 | `silman-endgame-course` | Silman, _Complete Endgame Course_ | Siles Press, Los Angeles, 2007 | 2 | OCR em 2026-08-18 |
| 15 | `rabinovich-russian` | Rabinovich, _The Russian Endgame Handbook_ | a confirmar | 2 | sim (525 pág.) |
| 16 | `averbakh-essential` | Averbakh, _Chess Endings: Essential Knowledge_ | a confirmar | 2 | OCR em 2026-08-18 |
| 17 | `nunn-understanding` | Nunn, _Understanding Chess Endgames_ | a confirmar | 2 | sim (234 pág.) |
| 18 | `muller-lamprecht-fce` | Müller & Lamprecht, _Fundamental Chess Endings_ | a confirmar | 2 | OCR em 2026-08-18 |
| 19 | `muller-kids` | Müller, _Chess Endgames for Kids_ | Gambit Publications, Londres, 2015 | 2 | OCR em 2026-08-18 |
| 20 | `pandolfini-endgame-course` | Pandolfini, _Endgame Course_ | Fireside / Simon & Schuster, Nova York, 1988 | 2 | OCR em 2026-08-18 |
| 21 | `seirawan-winning-chess-endings` | Seirawan, _Winning Chess Endings_ | a confirmar na folha de rosto | 2 | sim (240 pág., 6.959 caracteres) |

**"A confirmar na folha de rosto"** não é descuido: os PDFs dessas obras não
trazem metadados de edição, e a proveniência grava edição. O campo `edition` do
`sources.json` está `null` nelas de propósito, e é lido na primeira vez que a
obra for aberta no garimpo — na página da folha de rosto, não na memória de
ninguém.

O garimpo da `N0-Q-MATE`, em 2026-08-24, pagou três dessas dívidas lendo a
página de copyright: **Silman** (Siles Press, Los Angeles, 2007), **Müller
_for Kids_** (Gambit Publications, Londres, 2015) e **Pandolfini** (Fireside /
Simon & Schuster, Nova York, 1988). As demais continuam abertas, e cada uma se
fecha quando a obra for aberta.

### 2.1 Obras da lista de 2026-08-13 que **não** estão na biblioteca

Confirmadas pelo Doug como corpus, sem arquivo em `biblioteca/`:

| Obra | Situação |
|---|---|
| Dvoretsky, _Endgame Manual_ | não está na pasta; não registrada no `sources.json` |
| Chess Steps, cadernos 3–6 | não está na pasta; não registrada |
| Philidor e edições históricas | domínio público; ainda não baixado. Vale mais para N3+ (torre e bispo, finais de peões) que para N0 |

O Freeborough saiu desta lista em 2026-08-18: foi baixado, conferido e
registrado. O currículo o tratava como "reserva, só para lacuna comprovada"
(§12.4) — e a lacuna apareceu no primeiro dia de mapa de cobertura, no
`N0-LADDER`. Ele deixou de ser reserva e passou a ser fonte de primeira linha
para N0.

Obra sem arquivo não entra no `sources.json`: registrar o que não se pode abrir
produz proveniência que ninguém conferiu. A exceção é o Lichess, que não tem
arquivo por natureza.

### 2.2 As duas edições de Kling & Horwitz

Estão as duas registradas, com slugs distintos, e isso é deliberado. A §12.4 do
currículo pede a **2ª edição de 1889, revista por Wayte** — conferida na folha
de rosto em 2026-08-18 (`REVISED BY W. WAYTE`, `G. BELL AND SONS`, `1889`), e é
a canônica. A 1ª edição de Mott fica registrada porque a proveniência grava
edição: uma posição transcrita do arquivo de Mott **não pode** citar a de 1889.
Duas edições, dois slugs, nenhuma confusão possível.

---

## 3. Mapa de cobertura — N0

Medido em 2026-08-18 com `pdftotext` sobre as obras legíveis. **As páginas são
do PDF, não as impressas** — a proveniência grava a impressa, e as duas
diferem por um deslocamento próprio de cada arquivo (páginas de guarda, folha de
rosto, prefácio). Os deslocamentos já medidos: `kling-horwitz-1889` tem **offset
13** (impressa 177 = PDF 190; 393 páginas de PDF para 376 impressas),
`freeborough-1891` tem **offset 5** (PDF 60/120/200 = impressas 55/115/195),
`walker-1832` tem **offset 19** (PDF 57/71/72/73 = impressas 38/52/53/54),
`staunton-1848` tem **offset 8** (PDF 397/405/413/417/419 = impressas
405/413/421/425/427), `rogers-1907` tem **offset 10** (PDF 130/136/138/140 =
impressas 120/126/128/130), `cook-1880` tem **offset 5** (PDF 54/60 = impressas
49/55), `cunnington-1903` tem **offset 8** (o sumário dá os caps. V e VI nas
impressas 44 e 57, e eles começam nas PDF 52 e 65), `silman-endgame-course` tem
**offset 14** (PDF 20/22/40 = impressas 6/8/26), `muller-kids` tem **offset 1**,
`capablanca-1921` tem **offset 18** (PDF 21/22 = impressas 3/4), medido no
garimpo do B5, `cook-1880` e `freeborough-1891` tiveram o offset 5 **reconfirmado** no garimpo da dama (PDF 54 = impressa 49; PDF 80 = impressa 75) e o `silman-endgame-course` o offset 14 (PDF 26 = impressa 12), e `seirawan-winning-chess-endings` tem **offset 8** (o cap. I começa
na PDF 9 = impressa 1, e o cap. II na PDF 29 = impressa 21). Os demais se medem ao abrir a obra.

Coluna `Teto`: quantas posições aquela linha pode render para a aula.

| Competência | Obra | Onde | Teto | O que tem |
|---|---|---|---|---|
| `N0-R-MATE` | `capablanca-1921` | PDF p. 20–22 | sem teto | Cap. I, §1 "Some Simple Mates", Exemplos 1 e 2: rei e torre contra rei, a caixa e a aproximação do rei |
| `N0-R-MATE` | `freeborough-1891` | PDF p. 126–127 (impressas 121–122) | sem teto | Cap. VII "The Rook", Seção I, diagramas **No. 256 a 259**. Abre dizendo que "a novice will often delay it by giving unnecessary checks" — o erro típico que o currículo lista para esta competência, na voz da fonte. O **No. 258** é mate em 3; o **No. 259** é a posição de resistência máxima do final (mate em 16, o máximo teórico), atribuída pelo autor à _Stratégie Raisonnée_ |
| `N0-R-MATE` | `walker-1832` | PDF p. 70 (impressa 51) | sem teto | Cap. "On Various Checkmates at the End of the Game", **No. I**. A posição vem como **lista de peças em texto** ("King at Q. B. sixth sq., Rook at Q. fifth sq."), não só no diagrama |
| `N0-R-MATE` | `staunton-1848` | PDF p. 395 (impressa 403) | sem teto | Livro VI "Endings of Games", cap. I, seção "King and Rook against King" |
| `N0-R-MATE` | `rogers-1907` | PDF p. 131 (impressa 121) | sem teto | "EXAMPLE II — King and Rook against King" |
| `N0-R-MATE` | `cook-1880` | PDF p. 55 (impressa 50) | sem teto | Cap. VII, "II.—King and Rook against King" |
| `N0-R-MATE` | `rabinovich-russian` | PDF p. 13–17 | 2 | "The Simplest Mates", A. Mate with the rook |
| `N0-Q-MATE` | `capablanca-1921` | PDF p. 26 (impressa 8) | sem teto | Exemplo 4: rei e dama contra rei. O diagrama é impresso **sem número**. O autor promete mate "em menos de dez lances" e afirma duas vezes, na prosa, que o rei preto fica com uma casa só — duas travas verificáveis |
| `N0-Q-MATE` | `walker-1832` | PDF p. 70 (impressa 51) | sem teto | O mesmo **No. I**: "as the Queen has the same move as the Rook, with extended powers, it is easy to find how to Checkmate with her alone". A dama é tratada como corolário da torre — e essa é a própria ordem didática |
| `N0-Q-MATE` | `staunton-1848` | PDF p. 395 (impressa 403) | sem teto | Livro VI, cap. I, seção "King and Queen against King" — abre o tratado de finais |
| `N0-Q-MATE` | `rogers-1907` | PDF p. 128 (impressa 118) | sem teto | "EXAMPLE I — King and Queen Against King" |
| `N0-Q-MATE` | `cook-1880` | PDF p. 54 (impressa 49) | sem teto | Cap. VII, "I.—King and Queen against King. This is the most simple of all the check mates" |
| `N0-Q-MATE` | `rabinovich-russian` | PDF p. 18+ | 2 | "The Simplest Mates", B. Mate with the queen |
| `N0-Q-MATE` | `pandolfini-endgame-course` | PDF p. 11 (impressas 20–21) | 2 | "ENDGAME 4": rei e dama contra rei sozinho na borda |
| `N0-Q-MATE` | `silman-endgame-course` | PDF p. 26 (impressa 12) | 2 | Seção "King and Queen vs. Lone King", **Diagrama 16**. O autor chama a técnica de _the Box_ e escreve que ela "isn't always the fastest way to mate, merely the easiest to learn". Imprime **duas** linhas completas a partir do mesmo diagrama — e é a segunda, não a primeira, que encolhe a caixa sem voltar |
| `N0-Q-MATE` | `freeborough-1891` | PDF p. 80 (impressa 75) | sem teto | Cap. V "The Queen", Seção I "Power of the Queen", diagramas **No. 144** (mate em 5) e **No. 145** (mate em 9, que Durand e Preti dão como a posição mais forte para o rei sozinho). São diagramas em sequência: a §5.1 permite só um dos dois por aula |
| `N0-Q-MATE` | `muller-kids` | PDF p. 13 (impressa 12) | 2 | Endgame Lesson 1 "Mate with the Queen", subtítulo _"Throw a rope around the king, but beware of stalemate"_. Diagramas (1) e (2) são a mesma linha em dois momentos — um serve de trava para o outro |
| `N0-LADDER` | `freeborough-1891` | PDF p. 128–129 (impressas 123–124) | sem teto | Cap. VII, Seção II "King and two Rooks against King", diagrama **No. 262**: a barreira feita por xeques alternados, que é exatamente a técnica que o currículo pede |
| `N0-LADDER` | `silman-endgame-course` | PDF p. 22 (impressa 8) | 2 | "King and Two Rooks vs. Lone King", dentro da seção que o autor chama de **The Staircase** — o nome dele para a técnica |
| `N0-LADDER` | `muller-kids` | PDF p. 15–16 (impressa 14) | 2 | "2) Mate with Two Rooks" — a escadinha como tópico próprio, e a observação de que duas torres não precisam do rei |
| `N0-LADDER` | `pandolfini-endgame-course` | PDF p. 11 (impressas 20–21) | 2 | "ENDGAME 3": duas torres subindo em escada, o que o autor chama de _the roll_, com mate em 3 |
| `N0-2B-MATE` (classe R) | `capablanca-1921` | PDF p. 23–24 | sem teto | Exemplo 3: dois bispos |
| `N0-2B-MATE` (classe R) | `walker-1832` | PDF p. 71 (impressa 52) | sem teto | **No. II**, "Checkmate with the two Bishops" |
| `N0-2B-MATE` (classe R) | `staunton-1848` | PDF p. 397 (impressa 405) | sem teto | Livro VI, cap. I, "King and two Bishops against King" |
| `N0-2B-MATE` (classe R) | `rogers-1907` | PDF p. 138 (impressa 128) | sem teto | "EXAMPLE V — King and Two Bishops against King" |

### 3.1 O `N0-LADDER` e a lição de cobertura desta fase

Vale registrar como a escadinha saiu de "sem fonte nenhuma" para "três fontes",
porque o caminho ensina onde procurar nas próximas competências.

**De manhã, em 2026-08-18, o `N0-LADDER` não tinha fonte.** Conferido: o
Capítulo I do Capablanca cobre torre, dois bispos, dama e bispo+cavalo, e
menciona duas torres só de passagem, dentro do Exemplo 4 ("without the aid of
the King, at least two Rooks are…"); as ocorrências de "two rooks" no Rabinovich
(PDF p. 467+) são finais de torres dobradas, não o mate elementar. As duas obras
mais respeitadas do corpus não ensinavam o mate mais simples do currículo.

Duas coisas resolveram, e cada uma tem uma moral:

- **O OCR**, que revelou `muller-kids` e `pandolfini-endgame-course` — os dois
  livros para iniciante que estavam só em foto. **Moral:** o corpus histórico
  cobre bem o clássico e cobre mal o elementar, porque Capablanca escrevia para
  adulto que já jogava. Em N0, livro de criança não é concessão: é a fonte certa.
- **O Freeborough**, que o currículo listava como *reserva, só para lacuna
  comprovada* — e que traz a escadinha em seção própria, com diagrama numerado,
  em domínio público e **sem teto**. **Moral:** "reserva" era uma decisão tomada
  sem mapa de cobertura. Com o mapa, ele é primeira linha.

Sem o Freeborough a competência fecharia apertada: `muller-kids` e Pandolfini
são obras protegidas, teto de 2 cada, e uma aula pede 4 a 6 posições. Com ele, o
`N0-LADDER` tem fonte sem teto para o ensino e duas protegidas para variar a
prática — que é exatamente o desenho que a §5, item 4, recomenda.

**A busca no Silman, prometida nesta seção, foi feita** assim que o OCR dele
terminou: ele cobre a escadinha na seção que chama de _The Staircase_, com "King
and Two Rooks vs. Lone King" (PDF p. 22, impressa 8). Placar final da competência
que começou o dia sem fonte nenhuma: **quatro fontes**, uma delas sem teto.

O currículo marcava o `ladder-mate-practice` e o `ladder-mate-transfer` como
"legado técnico sintético, não promover" (§16). Essa dívida agora tem com o que
ser paga.

### 3.2 Como estas fontes se leem — três armadilhas medidas

Aprendidas abrindo os arquivos em 2026-08-18, e todas elas mudam o que vai para
a proveniência:

1. **Página de PDF não é página impressa, e o deslocamento é por arquivo.**
   `kling-horwitz-1889` tem offset 13; `muller-kids`, offset 1. O
   `pandolfini-endgame-course` é pior: foi digitalizado **em duas páginas
   impressas por página de PDF** (162 páginas de PDF para o livro inteiro), e o
   cabeçalho de corrida mostra as duas — "20 @ PANDOLFINI'S ENDGAME COURSE …
   PIECES IN ACTION @ 21". A proveniência grava a **impressa**, e num spread são
   duas: a que contém o diagrama.
2. **Algumas obras dão a posição como lista de peças em texto**, não só no
   diagrama. O Pandolfini abre cada exercício com `W: Ke1, Qd1, Rf4 B: Ke5` —
   isso é uma FEN em outra roupa, e derivar dela é muito mais seguro que ler um
   diagrama em imagem. Procurar por esse padrão antes de recorrer ao diagrama.
3. **O OCR erra dígito com confiança.** No Pandolfini, `Ke1` sai `Kel`, `Ke6`
   sai `Keb`, `Ke5` sai `Kes`, `Rf8` sai `RIB`; no Capablanca, `18` sai `i8`; na
   edição de 1889, o número cola no lance (`2Q to Kt 2` onde está `2 Q to Kt 2`).
   Letra por número é o erro típico, e é silencioso — uma casa trocada gera FEN
   legal e posição errada. **Nenhuma FEN sai do OCR sem conferência contra o
   diagrama**, e o campo `fenMethod` registra como foi obtida. Todas as obras
   históricas usam notação descritiva (`P-K4`), não algébrica.

### 3.2.1 O que o garimpo do B5 acrescentou ao método — quatro coisas medidas

Aprendidas transcrevendo as quatro posições do `N0-R-MATE` em 2026-08-18. As
duas primeiras são procedimento; as duas últimas são armadilhas que quase
passaram.

1. **A linha impressa falsifica a FEN, e é a trava mais forte que existe.**
   Transcrita a posição do diagrama, jogue nela a solução que o livro imprime:
   todo lance tem de ser legal e o fim tem de ser mate, no número de lances que
   o livro promete. O erro de OCR (na linha) e o erro de leitura de imagem (na
   FEN) são de naturezas independentes — uma casa lida errada quase sempre torna
   algum lance da linha ilegal ou tira o mate do fim. Das quatro posições, três
   passaram por essa trava. **Mas ela não é onipotente:** no Rogers, a linha
   impressa é legal a partir das *duas* candidatas de leitura (b4 e b5), porque
   depois de `1.Kb2 Kc4` elas convergem para a mesma posição. Quando a linha não
   discrimina, quem decide é a leitura de imagem — e é por isso que são duas,
   independentes.
2. **Onde o livro imprime "mate em N", a tablebase decide sozinha.** O Freeborough
   No. 259 anuncia mate em 16, e 16 é o máximo teórico do final rei e torre
   contra rei: coincidir por acaso é praticamente impossível. O No. 258 anuncia
   três, e dá três. Peça sempre esse número ao diagrama antes de recorrer a
   argumento mais caro.
3. **Em notação descritiva, a casa de peça preta se conta do lado das pretas — e
   isso deixou de ser convenção lembrada para virar fato medido.** O Freeborough
   escreve que Berger põe o rei branco em QRsq, a torre em QKtsq e o rei preto em
   Q4, "mating also in 16 moves". Com o rei preto em **d5** (Q4 pelo lado das
   pretas) a tablebase dá 16; em d4 daria 15. Um número do livro provou a
   convenção — e é ela que decidiu a leitura `b5` do Rogers, cuja prosa dá a
   posição por extenso.
4. **Paridade de casa não fixa a orientação; ela só exclui espelho.** Quando o
   diagrama não imprime "BLACK"/"WHITE" nem coordenadas (é o caso dos dois do
   Freeborough), a checagem "canto inferior esquerdo escuro" **não** exclui o
   giro de 180°, que preserva a cor de cada canto e produz uma posição de mesmo
   DTM. Quem exclui o giro é o texto: no No. 259, o segundo lance impresso é
   `K-Kt2`, e o rei branco só alcança g2 partindo de h1 — na leitura girada ele
   estaria em a8. Não confunda "a paridade fechou" com "a orientação está
   provada".

### 3.2.2 Um atalho de extração que vale procurar

Alguns PDFs guardam **cada diagrama como objeto de imagem próprio**, e aí não é
preciso rasterizar a página e caçar o recorte:

```bash
pdfimages -list -f N -l N arquivo.pdf     # dois objetos de ~615x630 = dois diagramas
pdfimages -png  -f N -l N arquivo.pdf saida
```

No `freeborough-1891` isso entregou os bitmaps na resolução nativa, com a
legenda do diagrama impressa dentro do próprio recorte. Nos outros três (
Capablanca, Rogers, Staunton) a página inteira é uma varredura só, e aí o caminho
é `pdftoppm -r 300 -x -y -W -H` até isolar o tabuleiro.

### 3.2.3 Diagramas já consumidos — para a §5.1 não ser furada por esquecimento

A regra "nunca diagramas em sequência da mesma obra" só é conferível se
houver registro do que já saiu. O que o `N0-R-MATE` consumiu:

| Obra | Diagrama | Onde entrou |
|---|---|---|
| `pandolfini-endgame-course` | "ENDGAME 9", *The "Cut-Off" Mate* (impressa 26) | etapa 2, cena 1 — "como termina" |
| `muller-kids` | Lição 3 "Method 1", Diagrama (1) (impressa 16) | etapas 2 e 3 — o exemplo e a guiada, mesma linha |
| `rogers-1907` | DIAGRAM XVI (impressa 121) | etapa 6, revisão |
| `capablanca-1921` | Cap. I, Exemplo 1 (impressa 3) | etapa 4, sem ajuda |
| `staunton-1848` | Livro VI cap. I, Diagrama 2 (impressa 404) | etapa 5, prática |
| `freeborough-1891` | cap. VII seç. I, No. 259 (impressa 122) | etapa 6, revisão |

Seis obras distintas, uma posição de cada: nenhuma sequência, nenhum teto tocado
(as duas protegidas contribuem 1 posição cada, contra o teto de 2). As duas
primeiras linhas entraram em 2026-08-19, com a regra dos livros-base da §3.4; o
Rogers, que era o ensino inteiro, recuou para a revisão. A do Müller sustenta
duas etapas — o aluno assiste e depois joga **a mesma linha**, que foi o pedido
do Doug depois de ler a aula.

**Sobraram localizados e não usados**,
para quem precisar variar: Capablanca Exemplo 2 (impressa 5), Freeborough No. 256,
257 e 258, Staunton Diagrama 3, Cook cap. VII item II, e a lista de `walker-1832`
e `rabinovich-russian` do mapa acima. Atenção ao usar Freeborough No. 258 **e**
259 na mesma aula: são diagramas em sequência, e a §5.1 proíbe.

O que a `N0-Q-MATE` consumiu, em 2026-08-24:

| Obra | Diagrama | Onde entrou |
|---|---|---|
| `pandolfini-endgame-course` | "ENDGAME 4", *Closing In* (impressa 21) | etapa 2, cena 1 — "como termina" |
| `silman-endgame-course` | Diagrama 16, "King and Queen vs. Lone King" (impressa 12) | etapas 2 e 3 — o exemplo e a guiada, mesma linha |
| `capablanca-1921` | Cap. I, Exemplo 4 (impressa 8) | etapa 4, sem ajuda |
| `freeborough-1891` | Cap. V seç. I, No. 145 (impressa 75) | etapa 5, prática |
| `cook-1880` | Cap. VII seç. I, Diagrama 1 (impressa 49) | etapa 6, revisão |
| `muller-kids` | Lição 1, Diagrama (1) (impressa 12) | etapa 6, revisão |

Seis obras distintas, uma posição de cada, nenhum teto tocado — o mesmo desenho
da `N0-R-MATE`. Duas obras aparecem nas duas aulas (Pandolfini e Müller, uma
posição em cada), o que ainda cabe na §5 item 2: nenhuma obra protegida domina o
nível.

#### A §5.1 aplicada **entre aulas** — e o que ela custou aqui (revertido)

Esta foi a primeira vez que a regra "nunca diagramas em sequência" mordeu de uma
aula para a outra, e o motivo é estrutural: **manual elementar ensina dama e
torre em seções vizinhas**. Como a `N0-R-MATE` já tinha consumido a seção da
torre de várias obras, a seção da dama da *mesma* obra ficou bloqueada:

| Obra | Diagrama da dama | Por que ficou de fora |
|---|---|---|
| `staunton-1848` | Diagrama 1 (impressa 403) | é o vizinho imediato do Diagrama 2, que a `N0-R-MATE` usa na etapa 5 |
| `rogers-1907` | DIAGRAM XV (impressa 118) | vizinho imediato do XVI, que a `N0-R-MATE` usa na etapa 6 |
| `freeborough-1891` | No. 144 | vizinho do No. 145, escolhido para a prática desta aula |
| `pandolfini-endgame-course` | ENDGAME 5 | vizinho do ENDGAME 4, usado na cena 1 |
| `muller-kids` | Lição 1, Diagrama (2) | vizinho do (1), usado na revisão |

Duas dessas — Staunton e Rogers — eram candidatas fortes: domínio público, sem
teto, e **as duas dão a posição em texto corrido**, que é o caminho mais seguro
de transcrição (§6, critério 4). Perdê-las não doeu porque o mapa tinha
alternativa; numa competência com menos fontes, doeria. **A moral para as
próximas aulas:** ao escolher o diagrama da aula A, olhe qual é o vizinho dele —
é provável que seja justamente o que a aula B vai querer.

**Revertido em 2026-08-25, por decisão do Doug.** A leitura passou a ser **por
aula** (§5 item 1), e a tabela acima é o registro de por que: numa competência
com menos fontes doeria, e a competência seguinte — a escadinha — é exatamente
essa. As cinco linhas viraram história: **nenhuma delas está mais bloqueada**.
O que volta a valer, e importa para a `N0-LADDER`:

| Volta a valer | Por quê |
|---|---|
| `pandolfini-endgame-course` **ENDGAME 3** | é o diagrama da escadinha, e o Pandolfini é o livro-base que a rotação da §3.4 marca para esta aula |
| Staunton Diagrama 1, Rogers DIAGRAM XV | domínio público, sem teto, posição **em texto corrido** — o caminho de transcrição mais seguro (§6, critério 4) |

A restrição que **continua de pé** é a de dentro da aula: se a `N0-LADDER`
usar o ENDGAME 3, o ENDGAME 4 e o 2 ficam fora *dela*. E o teto de 2 por obra
por aula segue cobrado pelo gate, sem mudança nenhuma.

**Sobraram localizados e não usados para a dama:** Rabinovich "B. Mate with the
queen" (PDF p. 18+, teto 2), Cook cap. VII item II, Pandolfini ENDGAME 6 e 7,
Capablanca Exemplo 2, e as posições dadas em texto por Rabinovich
(`Kd3/Qg1 x Kd1`, `Kd3/Qd2 x Kd1`, `Kd1/Qd2 x Ke3`), que são quadros de mate e
não exercícios.

---

### 3.2.4 O que o garimpo da dama acrescentou ao método — cinco coisas medidas

Aprendidas em 2026-08-24, transcrevendo as seis posições da `N0-Q-MATE`.

1. **Cor de casa se mede pelo anel de borda, nunca pela casa inteira.** Uma peça
   em cima de casa clara derruba a média da casa inteira para dentro da faixa da
   hachura, e a convenção do livro sai invertida. Foi exatamente isso que
   produziu o erro corrigido na §7.1. O anel — a coroa entre 0,40 e 0,46 da casa
   a partir do centro — fica fora da silhueta de qualquer peça. Alarme grátis:
   **`a1` e `h1` medindo o mesmo tom é impossível num tabuleiro.**

2. **Diagrama truncado existe, e o `cook-1880` usa.** O Diagrama 1 dele imprime
   **três fileiras**, ancoradas na 8ª; o Diagrama 2 imprime cinco. O autor corta
   fora as fileiras de baixo que estão vazias. Não é defeito de varredura — foi
   conferido no diagrama vizinho. Consequência: para uma posição desse livro, as
   fileiras não impressas entram na FEN **por convenção editorial**, não por
   leitura, e isso vai no `pendingRisk`. Quem sustenta a inferência é a
   tablebase concordando com o "mate em N" da legenda.

3. **Dois diagramas da mesma lição travam um ao outro.** É a trava mais barata
   que apareceu até agora, e serve quando a linha impressa não é replayável. No
   `muller-kids`, o Diagrama (1) e o Diagrama (2) da Lição 1 foram lidos em
   separado, cada um com sua grade; jogando na FEN do (1) os dois lances de rei
   que a prosa anuncia, chega-se à FEN do (2) **caractere por caractere**. Duas
   leituras independentes que precisam concordar num terceiro fato.

4. **Diagrama com seta é armadilha de contagem.** O Diagrama (2) da Lição 1 do
   `muller-kids` traz duas setas desenhadas por cima do tabuleiro. Um leitor que
   conte tinta por casa "acha" peça em oito casas que estão vazias. O que separa
   os dois é a razão de extensão: peça mede ~0,73 × 0,75 casa; segmento de seta
   mede ~1,00 × 0,06. Peça sempre cabe inteira dentro da própria casa — seta,
   nunca.

5. **Quando o livro imprime duas linhas do mesmo diagrama, meça antes de
   escolher.** O `silman-endgame-course` dá duas soluções completas a partir do
   Diagrama 16. A primeira, que é a que ele desenvolve, tem um lance em que o
   **rei atacante entra na frente da própria dama** — e ali a caixa desenhada
   salta de 20 casas para 40, duas vezes na mesma linha. A segunda, que ele
   oferece de passagem, encolhe a caixa sem voltar uma única vez: 42 → 24 → 20 →
   18 → 15 → 12 → 9 → 8 → 6 → 4. Para uma aula que **desenha** a caixa, a
   segunda é a única utilizável, e isso só se descobre medindo lance a lance.

---

### 3.3 A rodada de domínio público de 2026-08-18 — e o erro de medição que ela quase escondeu

O Doug adiou compras e pediu uma caçada em domínio público, com ênfase no
elementar. Doze obras foram medidas pela triagem da §4.1 — que lê o texto
integral publicado pelo archive.org e conta o sinal **antes** de baixar o PDF.

**A primeira rodada deu um resultado negativo, e o resultado estava errado.**
Sete manuais consagrados apareceram com **zero** ocorrências de mate elementar,
todos com OCR bom, o que produziu a conclusão de que o domínio público não teria
esse material. A conclusão só caiu porque o Cook 1880 abre o capítulo de finais
dizendo que **tira as posições do Handbook do Staunton** — o mesmo Staunton que
eu tinha acabado de descartar com zero. Duas fontes não podem discordar assim; a
que estava errada era a medição.

**A causa:** o OCR de várias digitalizações antigas usa **espaço duplo entre
palavras** ("KING  AND  QUEEN  AGAINST  KING"), e os padrões da primeira rodada
exigiam espaço simples. Refeita com `[[:space:]]+` no lugar de cada espaço, a
tabela virou de ponta-cabeça:

| Obra | torre | dama | escadinha | bispos | "mate with" | Veredito |
|---|---|---|---|---|---|---|
| **Staunton 1848**, _Chess-Player's Handbook_ | 3 | 3 | **8** | **15** | 3 | **baixado** — tem um **Livro VI inteiro** sobre finais |
| **Walker 1832**, _A New Treatise (rudiments)_ | 1 | 3 | 4 | 5 | **12** | **baixado** |
| Staunton 1876, _Theory & Practice_ | 1 | 2 | 5 | 7 | 9 | candidato forte, não baixado |
| **Rogers 1907**, _How to Play Chess_ | 1 | 1 | 3 | 4 | 4 | **baixado** |
| Mason 1894, _Principles of Chess_ | 0 | 0 | 1 | 11 | 13 | candidato |
| Ed. Lasker 1921, _Chess Strategy_ | 0 | 0 | 6 | 13 | 3 | candidato |
| **Cook 1880**, _The Chess Primer_ | 0 | 1 | 0 | 5 | 1 | **baixado** — o cap. VII confirmou o que o sinal fraco não mostrava |
| **Cunnington 1903**, _Selected Chess Endings_ | 0 | 2 | 0 | 0 | 1 | **baixado**, mas serve a N1/N3 |
| Mason 1913, _The Art of Chess_ | 0 | 0 | 0 | 6 | 3 | fraco |
| Em. Lasker 1910, _Common Sense in Chess_ | 0 | 0 | 0 | 6 | 0 | fraco |
| Kling 1849, _The Chess Euclid_ | texto quase nulo (5 "king" no livro inteiro) | | | | | obra de diagrama; fonte só por leitura de imagem |
| _CONTROLE_ — Capablanca 1921 | 1 | — | 11 | — | 1 | já registrado |

**A conclusão correta, então:** o domínio público **tem** material elementar, e
tem bastante — o Staunton 1848 traz um tratado de finais completo (Livro VI, cap.
I: dama, torre, dois bispos, bispo e cavalo, dois cavalos), e o Walker de 1832 e o
Rogers de 1907 trazem os mates com posição escrita em texto. O corpus histórico
não era omisso; a régua é que estava torta.

**O que continua verdadeiro:** o que o domínio público não tem é a *forma
pedagógica moderna* — progressão graduada, passo pequeno, exercício em níveis
declarados. Isso é do pós-1930 (Fine 1941, Znosko-Borovsky 1940, Averbakh,
Pandolfini, Silman, Müller kids) e não tem equivalente livre. Por isso a §6
continua de pé: o domínio público entrega **posição sem teto**, os livros
comprados entregam **ordem de ensino**.

Obras que não são obtíveis, anotadas para não repetir a busca:

- **Tattersall, _A Thousand End-Games_ (1910–11)** — seria o melhor banco de
  exercícios livre que existe. Não está no archive.org, e no Google Books o
  volume 2 (`Kg4uAQAAIAAJ`) está em *snippet*, sem download.
- **Freeborough, _Analysis of the Chess Ending King and Queen Against King and
  Rook_ (1895)**, `analysischessen00freegoog` — obtível, mas dama contra torre é
  N4. Anotado para a fase que a usar.
- **Berger** e **Stamma** — alemão, valor para N3+. Fora do gargalo atual.

### 3.4 Livros-base didáticos — a rotação do objetivo e do exemplo

*Decidido em 2026-08-19, depois de a `N0-R-MATE` reprovar pedagogicamente.*

O mapa de cobertura acima responde "de onde tirar uma posição legítima". Ele não
responde "de onde tirar uma posição que **ensina**", e essa era a pergunta que
faltava: as etapas 1 e 2 saíam de obra escolhida por não gastar teto, e o
resultado foi um exemplo que abre com o rei destrancando a própria torre — lance
contraintuitivo, na primeira coisa que um iniciante absoluto vê.

A regra nova: **objetivo e exemplo saem de uma rotação de cinco obras escritas
para iniciante**, marcadas com `"didactic": true` em `content/sources.json`. As
demais etapas continuam saindo da biblioteca inteira.

| Obra | Protegida | Como ensina o mate elementar | Base de |
|---|---|---|---|
| `muller-kids` — Müller, *Chess Endgames for Kids* | sim | slogan-metáfora ("rectangle prison") e **4 fases numeradas**: aproximar o rei → limitar a um retângulo → encolher até a borda → mate perto do canto. Diz por escrito que o método **não** é o mais curto, e troca rapidez por clareza | `N0-R-MATE` |
| `silman-endgame-course` — Silman, *Complete Endgame Course* | sim | nomeia a técnica ("the Box"), dá 2 mandamentos e ensina **de trás para frente**: mostra o mate primeiro | `N0-Q-MATE` |
| `pandolfini-endgame-course` — Pandolfini, *Endgame Course* | sim | 1 página = 1 posição curta, **dada em texto** (`W: Ke6, Rd5 B: Kf8`), com um padrão nomeado por exercício. Bom para a cena de "como termina" | `N0-LADDER` |
| `seirawan-winning-chess-endings` — Seirawan, *Winning Chess Endings* | sim | cap. 1 "Basic Mates" usa a mesma caixa ("Boxing the King"), com mate em 14 a partir do Diagrama 1 | `N0-2B-MATE` |
| `de-la-villa-100` — De la Villa, *100 Endgames You Must Know* | sim | **não cobre mates elementares** — o autor assume que o leitor já os conhece. Serve de N1 em diante | N1+ |

Duas regras mecânicas, cobradas pelo gate:

- `FONTE_DIDATICA_DIVERGE` — o `objective.source` tem de bater com a obra de
  **ao menos uma** cena do exemplo. "Ao menos uma", e não "a primeira": cena 1
  de um livro e cena 2 de outro é o desenho previsto, e é o que a `N0-R-MATE`
  faz.
- `FONTE_DIDATICA_DOMINA` — uma obra protegida é livro-base de **no máximo uma
  aula por nível**. É a §5 item 2 ("misturar por nível") virando número: o teto
  de 2 posições por aula não impede que a mesma obra seja a professora do nível
  inteiro, e alternar é o que evita copiar a progressão do autor.

O `de-la-villa-100` fica registrado como didático mesmo sem cobrir N0: a marca
diz "obra escrita para ensinar", não "obra que serve para esta aula".

---

## 4. O teste que decide se uma obra serve

Um subagente lê o livro por busca de texto; página que é foto ele não acha. O
teste, em cinco páginas do meio:

```bash
pdftotext -f N -l N+4 arquivo.pdf - | tr -d '[:space:]' | wc -c
```

Zero caractere = a página é imagem e a obra precisa de OCR antes de servir.
Heurística de `grep /Font` no PDF cru **não** funciona: os fluxos de objeto vêm
comprimidos e ela deu falso negativo em quatro de doze arquivos.

O inventário medido, arquivo por arquivo, mora no `biblioteca/README.md`. Este
documento registra o *papel* das obras; aquele registra o *estado dos arquivos*.

---

### 4.1 Triagem antes do download — mede em segundos o que custaria megabytes

Baixar um livro para descobrir que ele não cobre o que se procura é caro: são
minutos de download, e às vezes meia hora de OCR, para chegar a um "não". O
archive.org publica o **texto completo** de todo item livre em
`https://archive.org/download/<id>/<id>_djvu.txt` — dá para medir a cobertura
**antes** de baixar o PDF. Foi assim que a tabela da §3.3 foi produzida: doze
obras medidas, três baixadas.

O procedimento tem três partes, e as duas últimas é que fazem ele valer:

1. **Contar o sinal — com `[[:space:]]+` no lugar de todo espaço.** Não é
   detalhe: é o passo que a primeira rodada errou e que quase custou cinco
   livros. O OCR de digitalização antiga costuma sair com **espaço duplo entre
   palavras** ("KING  AND  QUEEN  AGAINST  KING"), e um padrão com espaço
   simples devolve zero num livro que cobre o assunto num capítulo inteiro. O
   padrão certo é
   `(rook|r\.)[[:space:]]+(and|&)[[:space:]]+(king|k\.)[[:space:]]+(v\.|vs\.?|against)`,
   nunca `rook and king against`. Livro do séc. XIX ainda abrevia (`K. and R.
   v. K.`) e usa notação descritiva, então os padrões aceitam as duas formas.
2. **Rodar um controle positivo — e desconfiar dele.** Uma obra que você
   **sabe** que cobre o assunto, medida com os mesmos padrões. O controle desta
   rodada foi o `capablanca-1921`, e ele **passou** — o que deu confiança falsa,
   porque o OCR do Capablanca usa espaço simples e o dos outros não. **Um
   controle valida o padrão contra os cacoetes daquele arquivo, não contra os do
   próximo.** Um controle que passa não prova que os zeros são reais; um controle
   que falha prova que o padrão está errado. Use dois controles, de
   digitalizações diferentes, quando o resultado for negativo.
3. **Medir a qualidade do OCR à parte.** Contar uma palavra banal — `king`,
   `pawn` — no mesmo texto. Um livro de xadrez de 400 KB com 500 ocorrências de
   "king" tem OCR bom; com 5, o arquivo é diagrama ou lixo. Isso separa "o
   scanner não leu" de "o livro não cobre" — mas **não** separa "o livro não
   cobre" de "meu padrão não casa", que foi o erro real desta rodada: o Staunton
   tinha 391 "king" e zero mates, e a contradição gritante era essa. **Zero num
   livro com OCR bom é motivo para suspeitar do padrão, não para descartar a
   obra.**

Duas ressalvas: o `_djvu.txt` é o OCR do próprio archive.org, e ele pode ser
melhor que o PDF que você vai baixar — o Walker 1832 tem texto no `_djvu.txt` e
**nenhuma camada de texto no PDF**. O texto serve para *decidir*; o PDF ainda
pode precisar de OCR. E itens de empréstimo não expõem o texto: confira antes com
`https://archive.org/metadata/<id>`, onde `access-restricted-item: true` significa
que não há download nem texto.

## 5. Regras editoriais — as que máquina nenhuma confere

O gate cobra duas coisas: que a obra esteja registrada, e que o teto de 2 por
aula seja respeitado. As três abaixo dependem de quem garimpa, e entram no
checklist de QA da §17 do currículo:

1. **Nunca diagramas em sequência — dentro da mesma aula.** Não usar o diagrama
   12 e o 13 do mesmo capítulo na mesma aula, mesmo dentro do teto. Sequência é
   estrutura editorial — é a seleção do autor sendo copiada em miniatura.

   **O alcance era ambíguo e foi decidido pelo Doug em 2026-08-25: a regra vale
   por aula, não entre aulas.** O texto original não dizia, e durante a
   `N0-Q-MATE` eu adotei sozinho a leitura estrita (entre aulas) — está
   registrado na §3.2.3, com o que ela custou. A leitura estrita foi revertida
   porque o preço apareceu inteiro no bloco seguinte: manual elementar ensina
   dama, torre e escadinha em seções vizinhas, então a regra passava a morder
   **sistematicamente**, e não por acaso. Na terceira aula ela deixaria a
   `N0-LADDER` sem livro-base nenhum — sem substituto, medido em 2026-08-24 —
   e mataria a rotação da §3.4 justamente na competência de corpus mais fraco.

   O que a regra existe para impedir — copiar a progressão didática de um autor
   — continua coberto, e por uma régua que de fato mede isso: o item 2 abaixo
   ("misturar por nível"), mais o teto de 2 posições por obra por aula que o
   gate cobra. A tabela de diagramas consumidos da §3.2.3 **continua sendo
   mantida**: ela deixou de ser proibição entre aulas e segue sendo memória —
   é o que permite ver se uma obra está começando a dominar o nível.
2. **Misturar por nível, não só por aula.** O teto é por aula; nada impede que
   uma obra protegida apareça em todas as aulas de um nível. Não deve: nenhuma
   obra protegida deve dominar as posições de um nível inteiro.
3. **Preferir domínio público quando as fontes são equivalentes.** Não é
   escrúpulo jurídico e sim economia de teto: o que sai do Capablanca não gasta
   a cota de ninguém.
4. **Livro-base didático no ensino, biblioteca inteira na variação.**
   *Reescrita em 2026-08-19; a versão anterior dizia "domínio público no ensino,
   protegida na variação".* O critério deixou de ser jurídico e passou a ser
   pedagógico. As etapas **1 (objetivo) e 2 (exemplo)** — as duas que decidem se
   o iniciante entende alguma coisa — saem de uma rotação de cinco obras
   escritas para iniciante (§3.4), e não da obra mais barata em teto. As demais
   etapas continuam saindo da biblioteca inteira, e é ali que o domínio público
   segue sendo preferido pela economia de teto (item 3).

   O que se perdeu com a troca: o ensino agora consome teto de obra protegida,
   porque quatro dos cinco livros-base são protegidos. O que se ganhou: um
   iniciante absoluto tem uma posição escolhida por quem escreve para ele. O
   preço é pequeno — o teto é de 2 por obra por aula, e o objetivo e o exemplo
   juntos gastam 1 ou 2 —, e é cobrado pelo gate (`FONTE_NAO_DIDATICA`,
   `FONTE_DIDATICA_DIVERGE`, `FONTE_DIDATICA_DOMINA`).

---

## 6. Obras que valeria acrescentar — decisão do Doug

Levantado em 2026-08-18, depois de fazer o mapa de cobertura de N0. **Nada
protegido é baixado por mim**; o que está aqui é recomendação de compra, e a
escolha é do Doug.

> **O Doug adiou as compras em 2026-08-18** e pediu a caçada em domínio público
> que virou a §3.3. A caçada rendeu — Freeborough, Walker e Cunnington entraram
> — mas **não substitui esta lista**: o domínio público não tem livro de finais
> escrito para iniciante, porque o gênero é do pós-1930 (§3.3). Esta seção fica
> de pé, e o item 1 ganhou peso: o `100 Basic Endgames` é a âncora que o próprio
> currículo declara (§12.4) e é a única obra da lista de que só existe um
> excerto de 31 páginas na biblioteca.

O critério, nesta ordem:

1. **Cobre o elementar.** É onde o corpus falha — o histórico foi escrito para
   adulto que já jogava, e por isso a escadinha quase ficou sem fonte (§3.1).
2. **Diagrama numerado e denso.** A proveniência grava "diagrama nº"; obra que
   numera cada posição é obra que se cita sem ambiguidade.
3. **Progressão declarada pelo autor.** Serve de controle independente da ordem
   do currículo — se dois autores concordam na ordem e o currículo discorda,
   vale reabrir a ordem.
4. **Posição em texto, não só no diagrama.** Como o Pandolfini faz
   (`W: Ke1, Qd1, Rf4 B: Ke5`): derivar FEN de lista de peças é muito mais
   seguro que ler imagem (§3.2).
5. **Não repetir o que já existe.** O corpus já tem 15 obras.

| Prioridade | Obra | Por que, contra os critérios |
|---|---|---|
| **1** | **Chess Steps (Stappenmethode), cadernos 3–6** | Já estava na lista do Doug de 2026-08-13 e é a única que falta dela para N0–N2. Progressão graduada é o **desenho** do método, não um acessório: é o controle mais forte que existe para "pedagogicamente com progressão". Critérios 1, 3 e 5. |
| **2** | **Todd Bardwick, _Chess Endgame Workbook_** | 200 problemas em dois níveis declarados (novato→intermediário, intermediário→avançado). É livro de **exercício**, e é justamente disso que as etapas 4, 5 e 6 precisam — posição de prova que o aluno não viu no ensino. Critérios 1, 2 e 5. |
| **3** | **Yasser Seirawan, _Winning Chess Endings_** | Ensina por **partida real**, não por posição teórica. Isso dá proveniência de dois andares (livro *e* partida original, os campos `originalGame` e `externalHumanSource` do formato) e alimenta as etapas de transferência. Critérios 1 e 4. |
| **4** | **Dvoretsky, _Endgame Manual_** | Está na lista de 2026-08-13 e falta. Mas é obra para N4–N5: comprar agora não muda nada em N0–N2. Recomendação: **deixar para a F2 ou F3.** |

Não recomendo, e o motivo importa: obras de cobertura enciclopédica (do tipo do
Müller & Lamprecht que já temos) não resolvem o problema de N0. O gargalo aqui
não é *quantidade* de finais catalogados — é **quantidade de posições
elementares com progressão explicada**, que é um gênero editorial diferente.

---

## 7. Ritmo de produção — medido em 2026-08-18

**4 posições aprovadas em 40 min 36 s, cronometradas: 5,9 posições por hora.**
É o número que o plano mestre §4 exige antes de qualquer promessa de prazo.
Volume da F1: 12 a 18 posições aprovadas, 4 a 6 por competência de N0 — o que
dá, neste ritmo, entre 2 e 3 horas para a fase inteira.

**Não use esse número cru para prever.** Ele é a soma de dois custos que se
comportam de maneira diferente, e a razão de o B5 pedir medição em vez de
palpite é justamente esta:

| Fase | Tempo | O que é |
|---|---|---|
| Garimpo — transcrever e falsificar as 4 FENs | ~26 min | **9,2 posições/hora.** Escala com o número de posições. |
| Consequências — reescrever as árvores, adaptar as 11 mutações, consertar 6 testes | ~14 min | Em boa parte **custo de uma vez só**, pago por ser a primeira aula a sair de fixture. |

O que o número **não** inclui: a leitura dos três documentos de planejamento e o
desenho do método de leitura, feitos antes de o cronômetro começar. Numa
competência nova parte disso se paga de novo, mas não tudo.

Três coisas que puxaram o ritmo para cima nesta rodada, e que não valem para
qualquer garimpo:

1. **As quatro obras são domínio público e as quatro imprimem a solução.** É a
   linha impressa que permite falsificar a FEN por conta própria (§3.2). Obra
   protegida que só publica o diagrama, sem linha, perde essa trava e obriga a
   uma terceira leitura de imagem.
2. **Os oito leitores de diagrama rodaram em paralelo**, dois por diagrama.
   Serializados, o garimpo sozinho passaria de meia hora.
3. **Duas das quatro posições não puxaram árvore nenhuma** (prática e revisão só
   precisam de FEN e proveniência). Uma aula em que as quatro entrassem no
   ensino custaria bem mais.

### 7.1 Segunda medida — o garimpo de 2026-08-19 (livros-base)

Duas posições, das duas obras **protegidas** que viraram livro-base da
`N0-R-MATE`. Cronometrado pelo carimbo dos arquivos, do primeiro comando de
extração ao arquivo de posição gravado:

| Posição | Tempo | O que dominou |
|---|---|---|
| Pandolfini, Endgame 9 | ~5 min | posição **dada em texto** (`W: Ke6, Rd5 B: Kf8`); só faltou conferir contra o diagrama |
| Müller, Lição 3, Diagrama (1) | ~9 min | só diagrama; duas leituras de imagem, mais a transcrição da linha impressa |

**~8,6 posições/hora**, contra as 9,2/hora do garimpo do B5 — o mesmo patamar,
apesar de as duas obras serem protegidas e de a do Müller não dar a posição em
texto. O que segurou a diferença foi o mesmo truque das duas vezes: os leitores
de imagem em paralelo.

Duas coisas que esta rodada acrescentou ao método, e que valem para a próxima:

1. **O replay da linha impressa não separa tudo.** Nas duas posições ele fixou a
   orientação (giro e espelho quebram no primeiro lance) e **não** separou a
   coluna da torre no Pandolfini nem `g1` de `f1` no Müller. Quem separou foi,
   respectivamente, a divergência entre os dois leitores somada ao mate, e a
   **paridade da casa** — ver o item 3 abaixo.
2. **O sombreado do diagrama é uma quarta camada, de graça.** Pedir ao leitor de
   imagem a *cor da casa* de cada peça custa nada e cruza com a coordenada.

   > **Correção de 2026-08-24 — este item estava errado, e o erro tem causa
   > nomeada.** A versão anterior afirmava que o `muller-kids` hachura as casas
   > **claras** (a1 e h8 lisas, a8 e h1 hachuradas). É o **contrário**: ele
   > hachura as **escuras**, medido no anel de borda dos quatro cantos de quatro
   > tabuleiros, em duas páginas (13 e 17), com concordância de 64/64 casas
   > contra a paridade real do xadrez. A causa do engano: em `p17` diagrama (1) a
   > casa **h1** mede 207,8 de cinza **quando medida inteira** — dentro da faixa
   > da hachura (204–215) — porque a **torre branca está em cima dela**. Medida
   > pelo **anel de borda** (a coroa entre 0,40 e 0,46 da casa a partir do centro,
   > fora da silhueta de qualquer peça) ela dá 246,7, que é papel liso. Daí a
   > regra nova, que vale para toda leitura de diagrama: **cor de casa se mede
   > pelo anel de borda, nunca pela casa inteira.** Um sinal de alarme grátis:
   > `a1` e `h1` medindo o mesmo tom é geometricamente impossível num tabuleiro.
   >
   > A FEN da posição afetada (`pos-n0-rmate-muller-l3-d1`) **não mudou** — foi
   > retranscrita do zero em 2026-08-24 com a grade ancorada nos 32 rótulos
   > impressos, e confirmou e4/g1/h1 com margem de 60× e 10× contra a casa rival.
   > O que mudou foi a justificativa registrada, que estava invertida e por isso
   > não sustentava a decisão que dizia sustentar. Vale o princípio: **um
   > argumento errado que chega ao resultado certo é uma dívida, não uma prova.**

   O que importa não é a convenção, é a
   consistência interna — e ela foi conferida nos quatro cantos antes de valer
   como prova.
3. **O tempo do garimpo não é o tempo da aula.** As duas posições saíram em 14
   minutos; a cena de 29 meios-lances escrita em cima de uma delas levou mais
   que isso. Prever cronograma por posições/hora subestima aula de ensino.


### 7.2 Terceira medida — o garimpo de 2026-08-24 (`N0-Q-MATE`)

**Seis posições em ~28 min: 12,9 posições/hora**, contra 9,2 e 8,6 das duas
medidas anteriores. É o melhor número até agora, e a razão é uma só:

| Rodada | Leitores de imagem simultâneos | Posições/hora |
|---|---|---|
| B5 (2026-08-18) | 8, dois por diagrama | 9,2 |
| Livros-base (2026-08-19) | 4, dois por diagrama | 8,6 |
| Dama (2026-08-24) | **5, um por diagrama, todos de uma vez** | **12,9** |

A troca foi deliberada e vale registrar como método: **um leitor por diagrama,
todos em paralelo, e a falsificação feita por replay em vez de por segunda
leitura.** Das seis posições, cinco tinham linha impressa replayável, e o replay
é mais barato e mais decisivo que uma segunda leitura — ele pegou um erro de OCR
que nenhuma leitura de imagem pegaria (o `1...Ke4` do Silman, ilegal na FEN
transcrita, que é `1...Kc4`). A sexta, sem linha replayável, pagou o preço: foi
a única que precisou de uma segunda rodada, e ela sozinha custou tanto quanto as
cinco primeiras juntas.

**O que este número não inclui**, como nas duas medidas anteriores: escrever a
aula. As seis posições saíram em 28 min; a aula inteira — objetivo, exemplo de
29 meios-lances, árvore guiada de 15 nós, solo de 9, prática e revisão — levou
bem mais, e esse custo escala com a aula, não com a posição.
