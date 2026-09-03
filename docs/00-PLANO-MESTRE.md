# Plano — Preparatório OLESC 2026 (xadrez)

## Contexto

Doug leva pela segunda vez seus alunos ao xadrez da OLESC (Olimpíada Estudantil de
Santa Catarina). No ano passado foi o primeiro torneio deles e foram bem. Este ano
quer um **preparatório de torneio completo**: ensinar e treinar tudo o que pesa no
desempenho em torneio — xadrez (aberturas, meio-jogo, finais, tática) e também o
"ofício" de jogar torneio (relógio, anotação, regras, rotina, cabeça, jogar pelo
time).

### Decisões tomadas com o Doug (2026-09-03)

- **Alunos:** intermediários, ~1000–1400 de força. **Duas equipes** (masculina e
  feminina), até 12 alunos. Idades OLESC: nascidos 2011–2018 (8 a 15 anos).
- **Entregável:** plano de treino + apostila (PDF) + site próprio **com login**
  (aluno vê o próprio progresso; professor vê relatório de todos).
- **Nome:** pasta `C:\Users\Lenovo\Desktop\preparatorio-olesc`, site com esse nome
  de trabalho. (`laboratorio-torneio` já está tomado pelo estudo pessoal do de la
  Villa que roda em outra guia — não colidir.)
- **Login:** conta criada pelo professor, **nome de usuário + PIN**. Sem e-mail, sem
  cadastro. Supabase por baixo, como na Academia 64.
- **Tática:** **banco público de puzzles do Lichess** (CC0). CSV completo já
  baixado em `Desktop\Ccdxdatalichess_db_puzzle.csv.bz2` (140 MB compactado, ~5
  milhões de puzzles). Curso completo no formato do "Praticar" do Lichess.
- **Finais:** **fora do escopo de conteúdo deste projeto.** O Doug está derivando o
  Laboratório de Finais num curso dos 100 finais do de la Villa
  (`laboratorio-torneio`) e **vai publicá-lo para os alunos**. O preparatório
  aponta para ele nas tarefas e reserva um bloco de sábado para finais práticos de
  torneio. Dependência: esse site precisa estar no ar até o Sábado 2 (19/9).
- **Aberturas:** cada aluno joga algo hoje; o Doug vai **recomendar e ensinar um
  repertório do clube**, a definir junto comigo (proposta na §Aberturas).
- **Materiais:** livros gratuitos **e pagos** (Doug compra digital, me entrega em
  PDF; posições saem desses livros — política "posição é fato"); cursos **só
  gratuitos**; materiais gratuitos da internet.
- **Torneio:** 25ª OLESC, Lages, 6–18 out; xadrez **11 a 16 de outubro**. Ritmos
  divulgados: pensado (equipe) **60 min + 30 s**, rápidas **15 min + 10 s**, blitz
  **3 min + 2 s**.

## Regras do torneio (OLESC xadrez)

Fonte: Regulamento Técnico Fesporte 2026, Cap. XXXVII – Xadrez (PDF oficial,
p. 120–124: `https://drive.google.com/file/d/1K8KgvONDCiDyxFv-l9MzhhSMLU86LeMB`).

O que decide o treino:

- **Competição por EQUIPE + dois individuais** (blitz e rápido). Equipe de **4
  titulares + até 2 reservas** por naipe; ordem dos tabuleiros fixada no congresso
  técnico e igual nas três provas. Tabuleiros 1 e 3 jogam com a cor da equipe, 2 e 4
  com a contrária → cada aluno sabe quantas partidas terá de brancas e de pretas.
- **Prova por equipe vale triplicado** na pontuação do município → ensinar **quando
  aceitar empate pelo time** e quando arriscar.
- **7 rodadas** por prova (suíço). Dia 1: blitz de manhã, rápido à tarde; dias 2–6:
  uma ou duas rodadas de equipe por dia → resistência é conteúdo.
- **Anotação obrigatória.** Desempates: confronto direto, Buchholz medianos e
  totais, Sonneborn-Berger — explicar em 15 min.
- Ritmo do rápido: o PDF diz 10+5 (ou 15 nocaute); o Doug informa 15+10 já
  divulgado. **Conferir no boletim**; treinar 15+10 cobre os dois.
- **Nível dos adversários (chess-results 2024–25):** topo ~1700–1900; **metade dos
  inscritos sem rating**. Para 1000–1400: **não entregar peça de graça** ganha
  metade das partidas; contra 1700+, **defender, complicar, segurar empate pelo
  time**.
- Medalha individual por tabuleiro exige ≥5 partidas em 7. Campeões 2025: Jaraguá
  do Sul (M), Blumenau (F); 337 atletas, 66 municípios.

## Calendário

Hoje é quinta, 3/9. Sábados: 5/9, 12/9, 19/9, 26/9, 3/10, 10/10.

| Bloco | Data | Tema do dia |
|---|---|---|
| Sábado 1 | 12/9 | Diagnóstico, regras da OLESC, processo de pensamento, tática (mates) |
| Sábado 2 | 19/9 | Repertório do clube, tática (motivos), blitz e relógio |
| Sábado 3 | 26/9 | Meio-jogo, finais práticos, gestão de tempo, análise pós-partida |
| Sábado 4 | 3/10 | **Simulado de torneio** nas 3 modalidades + rotina do dia + escalação |
| Véspera | 10/10 | Opcional, 1–2 h leves: aquecimento, checklist, sem conteúdo novo |
| Torneio | 11–16/10 | Manutenção diária (§Casa S4) |

5/9 fica livre para o Doug (material ainda não existe). Se quiser usar, vira
"Sábado 0" só de diagnóstico: torneio interno 15+10 anotado.

## Currículo — os 4 sábados (4 h cada) + casa

Princípios: cada sábado = **regra do torneio → conteúdo → prática com relógio →
tarefa**. Nada de aula expositiva longa: blocos de 45 min, sempre com tabuleiro.
Dois grupos (M e F) no mesmo conteúdo; separam-se só nas partidas de prática.

### Sábado 1 (12/9) — "Como funciona o torneio e como eu penso"

| Hora | Bloco |
|---|---|
| 0:00–0:25 | **A OLESC explicada:** equipe, 7 rodadas, 3 provas, pontuação triplicada, tabuleiros e cores, desempates. Regras que pegam: anotação, peça tocada, lance ilegal (blitz/rápido), relógio e incremento, como reclamar empate, comportamento. |
| 0:25–1:25 | **Diagnóstico:** 2 rodadas de 15+10 com **anotação obrigatória**. Professor recolhe as planilhas (viram material do bloco 4 e do relatório). |
| 1:25–1:40 | Pausa |
| 1:40–2:25 | **Site + curso de tática:** login, painel, blocos 1–2 (mates curtos, peça de graça, padrões de mate I). 20 min resolvendo em conjunto no projetor, 20 min cada um no celular. |
| 2:25–3:10 | **Processo de pensamento:** as 3 perguntas antes de mover (o que o adversário ameaça? minhas peças estão seguras? posso capturar de graça?) — o "contar" de Heisman. Exercício: achar o erro nas próprias partidas do diagnóstico. |
| 3:10–3:50 | **Prática:** 1 rodada 15+10 aplicando as 3 perguntas, anotada. |
| 3:50–4:00 | Tarefas da semana; entregar caderno 1 da apostila. |

**Casa S1:** tática blocos 1–2 no site (meta: 60 puzzles, ≥70% acerto); 2 partidas
15+10 no **clube do chess.com**, anotadas à mão na planilha (data, adversário, a cor
que jogou, resultado); vídeo "Como anotar uma partida" (Rafael Leitão) + 10 min de
Coordenadas no Lichess; Bartholomew "Undefended Pieces" (legenda automática); ler
caderno 1 (regras + as 3 perguntas).

### Sábado 2 (19/9) — "Abertura sem susto e tática que ganha peça"

| Hora | Bloco |
|---|---|
| 0:00–0:15 | Revisão do relatório da semana (professor mostra números da turma, sem expor ninguém). |
| 0:15–1:15 | **Repertório do clube** (§Aberturas): ideias, não decoreba. Brancas: a linha principal e os 3 desvios mais comuns. Pretas: contra 1.e4 e contra 1.d4. Jogar as linhas no tabuleiro em duplas. |
| 1:15–1:30 | Pausa |
| 1:30–2:15 | **Tática blocos 4–5:** garfo, cravada, espeto, ataque descoberto, xeque duplo; remover a defesa. Série no projetor + individual. |
| 2:15–2:45 | **Armadilhas da abertura** que aparecem em 1000–1400 (mate pastor e defesa, ataque em f7, Fried Liver, Légal) — reconhecer e não cair. |
| 2:45–3:50 | **Mini-torneio blitz 3+2** (5 rodadas suíço): aprender relógio, incremento, o que é "cair de tempo", quando o lance ilegal perde. Professor observa gestão do relógio. |
| 3:50–4:00 | Tarefas; caderno 2. |

**Casa S2:** treinador de repertório no site (repetir cada linha até acertar 3×);
tática blocos 3–5 (meta 80 puzzles); **finais no laboratório do de la Villa**
(capítulos elementares indicados pelo Doug); **torneio 15+10 do clube no chess.com**
(quinta à noite) + 1 partida livre anotada; vídeos: Rafael Leitão "Aberturas" (os 2
do repertório) e Evandro Barbosa "Aberturas em 15 min" (1); Smithy's Opening
Fundamentals para quem lê inglês.

### Sábado 3 (26/9) — "O que fazer quando não tem tática"

| Hora | Bloco |
|---|---|
| 0:00–0:45 | **Planos simples de meio-jogo** (Seirawan): peças ativas, rei seguro, peão fraco do adversário, trocar quando está na frente, melhorar a pior peça. 4 posições dos livros no projetor. |
| 0:45–1:30 | **Finais que decidem partida de 15+10:** rei e peão (oposição, regra do quadrado), torre e peão (torre atrás do peão, Filidor/Lucena em 1 diagrama cada), converter vantagem simplificando. Com o site do de la Villa projetado. |
| 1:30–1:45 | Pausa |
| 1:45–2:15 | **Gestão de relógio:** orçamento por fase em 60+30 e 15+10; "não gastar 10 min em lance de abertura"; quando pensar longo (posição crítica) e quando jogar rápido (recaptura óbvia). |
| 2:15–3:30 | **Partida 25+10 anotada** (ritmo intermediário para caber) com professor anunciando o relógio a cada 5 min. |
| 3:30–3:50 | **Análise pós-partida em duplas** com o motor do site: achar o lance perdedor, não decorar variações. Como usar motor sem virar muleta. |
| 3:50–4:00 | Tarefas; caderno 3. |

**Casa S3:** tática blocos 6–7 (meta 80); **1 partida 60+30 online anotada** no fim
de semana (a única longa antes do torneio); **torneio 3+2 do clube no chess.com**; finais
capítulos indicados; Rafael Leitão "Treinando Finais" (2) e "Treinando o Cálculo"
(1); ler 1 partida do Chernev no caderno 3.

### Sábado 4 (3/10) — Simulado de torneio

| Hora | Bloco |
|---|---|
| 0:00–0:10 | Briefing como no torneio: escalação provisória, tabuleiros, cores. |
| 0:10–0:50 | **Blitz 3+2**, 5 rodadas suíço, com planilha de resultados. |
| 0:50–1:05 | Pausa (ensinar o que fazer entre rodadas: água, comer leve, **não** analisar a derrota agora). |
| 1:05–2:50 | **Rápido 15+10**, 3 rodadas, anotação obrigatória, árbitro = professor (aplicar regra de ilegal e de reclamar empate de verdade). |
| 2:50–3:05 | Pausa |
| 3:05–3:35 | **Rodada por equipe simulada** (M × F ou equipes mistas), 10+5 para caber, com **decisão de empate pelo time** em jogo. |
| 3:35–3:55 | **Rotina do dia de torneio:** sono, café, aquecimento com 10 puzzles, checklist da mochila (caneta, planilha, água, lanche), tabela e desempates, falar com o técnico antes de aceitar empate. Debrief do simulado. |
| 3:55–4:00 | **Escalação definitiva** proposta com base no desempenho medido nos 4 sábados (site gera o ranking); caderno 4 (caderno do torneio). |

**Casa S4 (4–10/10, manutenção):** 20 puzzles/dia no **modo torneio** com relógio;
repertório 10 min/dia; 1 partida 15+10/dia; **nada novo**. Véspera 10/10: 1 h leve.
Durante o torneio (11–16/10): 10 puzzles fáceis de aquecimento antes de cada rodada,
pelo site.

## Aberturas — proposta de repertório do clube (a validar com o Doug)

Critério: poucas ideias, estruturas parecidas de brancas e pretas, sólido contra
gente mais forte, com armadilhas conhecidas para quem é mais fraco. Aprendível em
duas semanas.

| Cor | Contra | Proposta | Por quê |
|---|---|---|---|
| Brancas | 1…e5 | **Italiana lenta** (Giuoco Pianissimo: Bc4, d3, c3, O-O) | Plano claro, sem teoria forçada, castelo cedo. |
| Brancas | 1…c5, 1…e6, 1…c6, outras | **Esquema 2.Nf3, 3.Bc4/Bb5 ou d4 simples** — princípios, não variantes | Não dá para aprender 5 defesas em um mês. |
| Pretas | 1.e4 | **1…e5 com …Nc6, …Bc5 (Italiana pelas pretas / Duas Cavalos sólida)** | Mesmas estruturas das brancas = metade do estudo. Cobrir: mate pastor, Fried Liver (jogar 4…Bc5 e não 4…Nxe4). |
| Pretas | 1.d4 | **1…d5 2.c4 e6 (Gambito da Dama Recusado clássico)** ou **2…c6 (Eslava)** | Sólido, castelo cedo, plano de …c5/…dxc4. Escolher um. |

Alternativa se o Doug preferir: **Londres** de brancas (1.d4, Bf4) — ainda mais
fácil, mas menos rica para crescer. Decisão na Fase 2, junto com as 2–3 linhas por
ramo que entram no treinador de repertório. Preparação por tabuleiro: 1 e 3 sabem que
jogam a cor da equipe (sorteada no congresso) — na semana final treinam as duas cores;
2 e 4 idem invertido.

## Curso completo de tática (formato "Praticar" do Lichess)

Referência `lichess.org/practice`: seções por tema, cada uma com explicação,
exemplo e sequência de exercícios, progresso por tema. Aqui igual, com puzzles do
banco Lichess filtrados por **tema** (coluna `Themes`) e **faixa de rating**. Tags
conferidas em `lichess.org/training/themes` (2026-09-03).

| Bloco | Temas (tag do Lichess) | Faixa |
|---|---|---|
| 1. Mates curtos | `mateIn1`, `mateIn2`, `hangingPiece` (peça de graça — erro nº 1 em 1000–1400) | 600–1300 |
| 2. Padrões de mate I | `backRankMate`, `smotheredMate`, `arabianMate`, `anastasiaMate`, `hookMate` | 800–1400 |
| 3. Padrões de mate II | `bodenMate`, `operaMate`, `morphysMate`, `doubleBishopMate`, `dovetailMate`, `mateIn3` | 1000–1600 |
| 4. Motivos fundamentais | `fork`, `pin`, `skewer`, `discoveredAttack`, `discoveredCheck`, `doubleCheck` | 800–1400 |
| 5. Remover a defesa | `capturingDefender`, `deflection`, `attraction`, `trappedPiece`, `xRayAttack` | 1000–1500 |
| 6. Ataque ao rei | `exposedKing`, `attackingF2F7`, `kingsideAttack`, `sacrifice` | 1000–1600 |
| 7. Lances finos | `intermezzo`, `quietMove`, `clearance`, `interference`, `zugzwang` | 1100–1700 |
| 8. Defesa e conversão | `defensiveMove`, `equality`, `advancedPawn`, `promotion`, `underPromotion`, `enPassant` | 1000–1600 |

**Cada tema tem:** (1) explicação curta redigida + 1 diagrama-exemplo do próprio
banco; (2) **aquecimento** 5 puzzles fáceis (`short`/`oneMove`); (3) **série** 20–30
em rating crescente; (4) **prova** 10 puzzles do tema **misturados** com temas já
vistos (reconhecer sem saber o nome, como na partida); (5) progresso (acertos,
tentativas, tempo) salvo no servidor.

**Modo Torneio:** puzzles mistos com relógio — 10 em 5 min (rápido), 20 em 3 min
(blitz). **Táticas da minha abertura:** séries por `OpeningTags` (`Italian_Game`,
`Queens_Gambit_Declined`, etc.) conforme o repertório do clube.

**Volume:** ~100 mil puzzles filtrados (rating 600–1800, `Popularity ≥ 50`,
`NbPlays ≥ 100`, `RatingDeviation ≤ 100`), em JSON estático por tema/faixa (≤ ~2.000
por arquivo, para carregar rápido no celular). Site sorteia dentro do arquivo: cada
aluno vê sequência diferente; o banco dura o ano.

**Script `scripts/filtrar-puzzles.ts`:** lê o CSV descompactado em streaming
(reaproveita `parseCsvLine`/`parsePuzzleLine` de
`Desktop\recruta64-vtracer\scripts\import-puzzles.ts`), valida FEN e primeiro lance
com chess.js, aplica filtros e grava `content/puzzles/<tema>/<faixa>.json` +
`content/puzzles/index.json` (contagens). Descompactar com `bzip2 -dk` (existe no Git
Bash da máquina). Só o id, FEN, lances, rating e temas entram no site — o CSV inteiro
não.

## Módulo "Ofício de torneio" (site + caderno 4)

- **Quiz de regras** (20 perguntas com feedback): peça tocada, ilegal em blitz e
  rápido, relógio, reclamar empate (repetição, 50 lances, posição morta), promoção,
  anotação incompleta, comportamento, celular.
- **Exercício de anotação:** assistir lances no tabuleiro do site e anotar na
  planilha; conferir.
- **Checklists:** mochila, antes da rodada, entre rodadas, depois da derrota.
- **Desempates explicados** com a tabela de 2025 como exemplo.
- **Jogar pelo time:** 6 cenários (placar 2–1 e eu estou pior: aceito empate?).
- **Jogar contra a máquina com relógio** (Stockfish limitado a ~1200–1500, 15+10 e
  3+2) para treinar apertar relógio e não travar.

## O que já existe para reaproveitar

### Do Laboratório de Finais (`Desktop\laboratorio-finais`) — por cópia

| Peça | Arquivo(s) | Uso |
|---|---|---|
| Tabuleiro (chessground em React, toque + mouse) | `components/board/ChessBoard.tsx`, `PromotionPicker.tsx`, CSS do tabuleiro em `app/globals.css` | Tabuleiro de tudo |
| FEN/lances/status | `lib/chess/fen.ts`, `dests.ts`, `status.ts` | Validação de lance do puzzle |
| Stockfish WASM lite-single | `public/engine/*`, `lib/engine/*` (`useEngine.ts`, `uci.ts`) | Jogar contra a máquina; análise pós-partida |
| Tema e tokens | `lib/tema/*`, tokens em `globals.css` | Identidade visual pronta |
| Pilha e gates | `package.json` (Next 16, Tailwind 4, chess.js, chessground, zod), `.github/workflows/ci.yml` | Nasce igual |

**Não** trazer: motor de aula em 6 etapas, modo autor, estúdio, tablebase, sons,
`validate:mutations`. Clonar o repositório e **apagar** o que não serve é mais rápido
que montar do zero (o Doug já faz o mesmo para o `laboratorio-torneio`).

### Da Academia 64 (`Desktop\recruta64-vtracer`) — por cópia

| Peça | Arquivo(s) | Uso |
|---|---|---|
| Resolução de puzzle Lichess | `src/components/chess/PuzzleBoard.tsx` (520 linhas), `src/lib/chess/puzzleLogic.ts` (cor do jogador, UCI, dests) | Base do jogador de puzzle |
| Importador do CSV | `scripts/import-puzzles.ts` (parser) | Base do filtro |
| Auth Supabase com `@supabase/ssr` | `src/lib/supabase/client.ts`, `server.ts`, `proxy.ts` + `src/proxy.ts` (Next 16 usa `proxy.ts`, não `middleware.ts`) | Login, rotas protegidas |
| Padrões de banco | `supabase/migrations/20260216180000_tables.sql` (tabela `puzzles`), `…180200_rls.sql`, `…180300_rpcs.sql`, `…180500_auth_trigger.sql` | Modelo de RLS, RPC e trigger de perfil |
| Script de migration sem CLI | `scripts/apply-migration.ts` | Supabase CLI não está instalada nesta máquina |

**Projeto Supabase novo e separado** (gratuito) — não tocar no banco de produção da
Academia 64.

### Já na estante

Yusupov *Build Up Your Chess 1* (`Desktop\Yusupov- Buid your chess _BOOKS`); 11
livros de finais em `Desktop\biblioteca_livros_de_finais`.

## Arquitetura do site `preparatorio-olesc`

- **Pilha:** Next.js 16 (App Router) + TypeScript + Tailwind 4 + chessground +
  chess.js + Stockfish WASM; **Supabase** (Auth + Postgres + RLS); Vercel gratuito.
- **Login nome + PIN:** Supabase Auth exige e-mail e senha; o professor cria a conta
  por uma *server action* com a chave de serviço, usando e-mail sintético
  (`<usuario>@alunos.olesc.local`) e o PIN de 6 dígitos como senha. Tela de entrada
  pede só usuário e PIN. Perfil marca `papel` (`aluno`/`professor`), `equipe` (M/F),
  `tabuleiro`.
- **Tabelas (mínimas):** `perfis`; `tentativas_puzzle` (aluno, puzzle_id, tema,
  acertou, tempo_ms, modo); `progresso_tema` (view agregada); `tarefas` (semana,
  descrição, tipo, meta) e `tarefa_conclusao`; `partidas` (PGN enviado, ritmo,
  resultado); `repertorio_progresso` (linha, acertos seguidos); `quiz_respostas`.
  RLS: aluno lê/escreve só o seu; professor lê tudo.
- **Autoridade no servidor** (regra herdada da Academia 64): a conferência do puzzle
  roda no cliente para dar resposta instantânea, mas a **gravação** passa por RPC que
  reconfere o lance contra o JSON do puzzle antes de contar — impede "acerto" forjado.
- **Rotas:** `/entrar` · `/painel` (aluno: semana atual, tarefas, progresso por
  tema) · `/tatica`, `/tatica/[tema]`, `/tatica/torneio` · `/aberturas` (treinador
  de repertório: repetir linha até acertar) · `/torneio` (quiz, anotação,
  checklists, desempates, cenários de equipe) · `/jogar` (contra Stockfish com
  relógio) · `/partidas` (enviar PGN, ver análise) · `/professor` (alunos e PINs,
  lançar tarefas, relatório por aluno e por tema, ranking para escalação, exportar
  CSV).
- **Conteúdo é dado:** puzzles em JSON; textos dos temas, repertório (PGN + notas),
  quiz e checklists em arquivos `content/*.json|md` validados por zod
  (`npm run validate:content`, versão simplificada da do Lab).
- **Celular e desktop iguais** (os alunos farão a tarefa no celular).

## Apostila (PDF)

Um **caderno por sábado** (≈12–16 páginas) + **caderno do torneio** (rotina,
checklists, regras, desempates, planilha de anotação em branco). Gerada do mesmo
conteúdo do site: Markdown/JSON → HTML com CSS de impressão → PDF via Playwright
(já instalado para o Lab). Diagramas: FEN → SVG no servidor (peças **cburnett**, CC
BY-SA 3.0, mesmas do Lichess). Puzzles impressos vêm do banco Lichess (CC0); posições
de aberturas e meio-jogo, dos livros comprados, com proveniência (livro, página,
diagrama) registrada em `content/sources.json` como no Lab — simplificada, sem
tablebase.

## Materiais

### Livros (comprar em digital)

Pesquisa de 2026-09-03 (a Amazon bloqueou acesso automático: **preço em R$ e Kindle
na amazon.com.br não confirmados** — conferir na compra). Tática vem do Lichess e
finais estão cobertos, então livros servem para **aberturas, meio-jogo e ofício de
torneio**, e são a fonte das posições da apostila nessas partes.

| # | Livro | Para quê | Exercícios com resposta? |
|---|---|---|---|
| 1 | **Chess Openings for Kids** — Watson & Burgess (Gambit) | 50 aberturas em 2 páginas: aluno **reconhece** o que o adversário jogou. Base do módulo de aberturas. | Não (companheiro *Chess Opening Workbook for Kids*, Burgess: sim) |
| 2 | **Winning Chess Strategies** — Seirawan | Estratégia no nível certo (1000–1500). Fonte das posições de meio-jogo. | Poucos, por capítulo |
| 3 | **Logical Chess: Move by Move** — Chernev | Uma partida comentada por caderno: "cada lance tem um porquê". | Não |
| 4 | **A Guide to Chess Improvement** — Heisman | Fonte do **professor**: relógio, processo de pensamento, "contar". Colunas *Novice Nook* originais são gratuitas no site do autor — compra opcional. | Não |
| 5 | **Everyone's Second Chess Book** — Heisman | Etiqueta de torneio, o que fazer quando está ganhando, erros de quem começa a competir. Base do módulo "ofício". | Não |

**Opcional em PT-BR:** *Táticas de Xadrez: 1000 problemas* (Lazzarotto, Kindle,
~R$ 12); *Cadernos Práticos de Xadrez* vols. 7, 9, 10 (Gude/Solis, impresso; Kindle e
gabarito não confirmados). **Fora, com motivo:** Polgar, *1001 Exercises*, Nunn
(tática — Lichess cobre sem custo); Woodpecker, Grooten, Kotov, Rowson (1400+);
*Xadrez Vitorioso* PT-BR (esgotado); Steps (só papel, sem PT).

### Vídeos e cursos gratuitos

Pesquisa de 2026-09-03. Durações dos vídeos em PT-BR não confirmadas (estimativa
10–25 min). Canais em inglês: sem legenda PT oficial — ensinar no S1 a ligar
"Legendas → Traduzir automaticamente → Português".

| Recurso | Link | Entra em |
|---|---|---|
| **GM Rafael Leitão — Treinando o Cálculo** (11 vídeos) | `youtube.com/playlist?list=PL1tK3JIsOWlrhsik_tdBjsU-ASd8KHd5x` | Casa S1 e S3 (1 vídeo por semana) |
| **Rafael Leitão — Aberturas** (9) | `…list=PL1tK3JIsOWloxgt5F9Ohuk7vD9BOe2PO_` | Casa S2 (os 2 que casam com o repertório) |
| **Rafael Leitão — Treinando Finais** (8) | `…list=PL1tK3JIsOWlo843yrq_mVQ0B8kcB98O0x` | Casa S3 (complemento ao de la Villa) |
| **Rafael Leitão — "Como anotar uma partida"** (artigo) + vídeo "Como anotar uma partida de xadrez – notação algébrica" | `rafaelleitao.com/como-anotar-xadrez/` · `youtube.com/watch?v=ISJtGZvxG9o` | Casa S1 |
| **Rafael Leitão — "Como ficar mentalmente mais forte"** (artigo) | `rafaelleitao.com/ficar-mentalmente-mais-forte/` | Caderno do torneio / Casa S4 |
| **GM Evandro Barbosa — Aberturas em 15 minutos** (3) e **Padrões que todo jogador deve conhecer** (4) | `youtube.com/@GMEvandroBarbosa` | Casa S2 (1 abertura) |
| **John Bartholomew — Chess Fundamentals** (12, EN) — ep. 1 "Undefended Pieces" | `youtube.com/playlist?list=PLIoUX4ry8XlvbHprhXtCjW4Ins4oIIaiK` | Casa S1 (casa com "as 3 perguntas") |
| **Chessbrah — Building Habits** editado (16, EN) | `…list=PLUjxDD7HNNThwCNW3f36RZcMxPwQIjYae` | Casa S2–S3, opcional: hábitos por faixa de rating |
| **GothamChess — Gotham Chess Guide** partes 1–3 (1000+/1200+/1400+, EN, ~1 h) | `…list=PLBRObSmbZluRBQOO_6FzyxQUaFyzusSl0` | Opcional, alunos que gostam de vídeo longo |
| **Chessable (grátis, EN): Smithy's Opening Fundamentals** (51 min) e **Typical Tactical Tricks: 500 Ways to Win** (~1000 Elo) | `chessable.com/…/course/21302/` · `…/course/77784/` | Casa S2 (Smithy) — gratuidade em set/2026 **não confirmada** |
| **Lichess Practice** (PT-BR): Mates, Táticas fundamentais, Finais de peões e torre | `lichess.org/practice` | Reforço opcional do nosso curso; **Coordenadas** (`lichess.org/training/coordinate`) na Casa S1 para anotar rápido |
| **Estudos Lichess em PT-BR:** "Tática para Iniciantes V – Garfos" (`lichess.org/study/4MW1gECQ`), "Guia Definitivo" (`…/study/6jRcEHCh`) | — | Reforço para quem está abaixo da turma |
| Xadrez Brasil — "As Partidas Imortais"; Supi — "Partidas Explicativas" | `youtube.com/@xadrezbrasil` · canal do Supi | "Vídeo de prazer": 1 por semana, não conta como tarefa |

Deixados de fora: **Chess.com como fonte de estudo** (3 puzzles por dia no grátis,
Classroom só com 1 aluno) — o clube dele entra, mas para jogar, não para treinar;
ChessKid grátis (muito limitado), Aimchess, Krikor (lives longas), Gérson Peres
(funil de curso pago). Nenhum curso gratuito em português no Chessable.

### Ferramentas do professor

- **Clube no chess.com** (grátis): **é onde as partidas de casa acontecem**, e é onde
  rodam os torneios fechados entre os alunos. O Doug cria um clube só da OLESC, os
  alunos entram, e ele vê todos num lugar só.

  **Decidido em 3/9/2026, e é uma correção do plano original.** Ele previa a
  *Lichess Class*, que cria contas sem e-mail e mostra partidas e puzzles do aluno.
  A vantagem some diante de um fato mais forte: **os alunos do Doug já jogam no
  chess.com**, e já têm conta lá. Levá-los para o Lichess seria um cadastro a mais,
  uma senha a mais e uma plataforma a menos conhecida, para ganhar um painel que o
  clube do chess.com também dá. O Lichess continua no projeto pelo que ele faz de
  melhor e de graça: os puzzles (CC0) que alimentam o nosso curso, o treino de
  Coordenadas e a análise com Stockfish.

  Consequência prática: **a anotação da partida passa a ser do aluno**, no papel —
  data, adversário, a cor que jogou e o resultado. O envio de PGN pelo site continua
  previsto para a F2; a leitura automática de partidas pela API (que no Lichess era
  possível por nome de usuário) **não** tem equivalente aberto no chess.com, então o
  relatório do professor conta com o que o aluno declara e com o que o Doug vê no
  painel do clube.

  **A confirmar com o Doug** (ele tem a conta; eu não): que formatos de torneio o
  clube grátis oferece. O plano usava suíço no Lichess de propósito, porque suíço é
  o formato da OLESC — 7 rodadas, emparceiramento por pontuação. Se o clube só
  oferecer arena (entrada e saída contínua, sem número fixo de rodadas), o torneio
  do clube treina relógio mas **não** treina o formato da prova, e o simulado do
  Sábado 4 passa a ser o único ensaio de suíço de verdade.
- **Simulado presencial (S4):** emparceiramento com **Lucas Chess** (grátis, em
  PT-BR, suporta suíço) ou à mão para 12 jogadores; planilha de resultados no site
  (`/professor`).
- **Análise:** `lichess.org/analysis` (Stockfish ilimitado) e `lichess.org/paste`
  para importar PGN; no nosso site, o Stockfish WASM do Lab.
- **Regras:** Leis do Xadrez FIDE 2023 em português (PDF oficial da Comissão de
  Árbitros:
  `arbiters.fide.com/wp-content/uploads/Publications/VariousContributions/20230101-FIDE_Laws_2023-POR.pdf`);
  **"Questões de Arbitragem" da CBX** (casos reais, ex. `cbx.org.br/texto/1261/…`
  lance impossível) — fonte do quiz de regras. Pontos a ensinar: 1º lance ilegal
  repõe posição e dá +2 min ao adversário; **2º ilegal perde** (rápido e pensado);
  peça tocada deliberadamente move; empate por repetição/50 lances exige
  **reclamar**; relógio com a mesma mão do lance; celular desligado; caneta própria
  e anotar até o fim (Art. 14–15 do regulamento da OLESC).
- **Planilha de anotação para imprimir:** Chess.com PT-BR
  (`chess.com/pt-BR/terms/chess-score-sheet`) — vai no caderno do torneio.
- **FCX** (Federação Catarinense, arbitra a OLESC): `fcx.digital.esp.br` e Facebook
  `xadrezcatarinense` — contatar para confirmar ritmo do rápido e regras de anotação.
- **Livros livres para a apostila** (domínio público no Brasil): Capablanca *Chess
  Fundamentals* (Gutenberg 33870), Lasker *Manual of Chess* (Internet Archive) —
  posições e partidas usáveis sem restrição.

## Estrutura do projeto

```
Desktop\preparatorio-olesc\
  docs\
    00-PLANO-MESTRE.md        ← este plano, adaptado
    CRONOGRAMA.md             ← os 4 sábados, minuto a minuto (o professor imprime)
    REPERTORIO.md             ← decisão de aberturas + linhas
    MATERIAIS.md              ← livros, vídeos, ferramentas, com links
  content\
    puzzles\<tema>\<faixa>.json + index.json     (gerado, versionado)
    temas\<tema>.md           ← explicação de cada tema de tática
    repertorio\*.pgn + notas
    torneio\quiz.json, checklists.md, cenarios-equipe.json
    tarefas\semana-1..4.json
    sources.json
  apostila\
    caderno-1..4.md, caderno-torneio.md, build.ts → pdf\
  app\ components\ lib\ public\engine\ supabase\migrations\ scripts\
```

## Ordem de execução (fases com ponto de parada medido)

Cada fase termina com um número que o Doug confere. **Se atrasar, a prioridade é
sempre: o sábado seguinte funciona.**

| Fase | Até | Entrega | Medida no fim |
|---|---|---|---|
| **F0 Fundação** | sáb 6/9 | Clone do Lab podado; Supabase novo; login nome+PIN; `/professor` cadastra aluno; deploy Vercel; `filtrar-puzzles` rodado; memória do projeto salva | Site no ar; 1 aluno-teste entra; `index.json` com contagem por tema (~100 mil) |
| **F1 Sábado 1** | qui 11/9 | Tática blocos 1–2 jogável; painel do aluno; relatório mínimo do professor; tarefas da semana 1; caderno 1 em PDF; `CRONOGRAMA.md` do S1 | Aluno-teste resolve 10 puzzles e aparece no relatório; caderno 1 impresso |
| **F2 Sábado 2** | qui 18/9 | Blocos 3–5; repertório decidido + treinador de linhas; envio de PGN; caderno 2 | Treinador aceita as linhas; relatório mostra repertório e partidas |
| **F3 Sábado 3** | qui 25/9 | Blocos 6–8; `/jogar` com relógio; análise pós-partida com motor; módulo torneio (quiz, checklists, cenários); caderno 3 | Quiz de 20 perguntas grava; motor joga 15+10 no celular |
| **F4 Sábado 4** | qui 2/10 | Modo torneio de puzzles; séries por abertura; ranking para escalação; caderno 4 + caderno do torneio; exportar CSV | Ranking bate com contagem manual de 1 aluno |
| **F5 Torneio** | 10/10 | Só correções; tarefa de manutenção diária; aquecimento pré-rodada | — |

F0 e F1 em 8 dias é o trecho apertado. Se F1 atrasar, o Sábado 1 roda com login +
tática blocos 1–2 e caderno 1 feito à mão; painel e relatório ficam para a semana 2.

## Verificação

- **Gates herdados do Lab** a cada fase: `npm run typecheck`, `lint`, `test`,
  `build`, mais `validate:content` (puzzles: FEN válida e primeiro lance legal via
  chess.js; temas/repertório/quiz batem no schema zod).
- **Login e RLS:** teste e2e (Playwright) — aluno A entra com PIN, resolve puzzle,
  não consegue ler dados do aluno B (consulta direta à API retorna vazio); professor
  vê os dois.
- **Puzzle no servidor:** tentativa com lance errado enviada à RPC como "acerto" é
  recusada (teste unitário da RPC).
- **Relatório:** contagem do relatório = `select count(*)` no banco para 1 aluno.
- **Celular:** subagente com Playwright mede tabuleiro em 375 px e devolve números
  (regra do `~/.claude/CLAUDE.md`: imagem não entra no thread principal).
- **Apostila:** PDF abre, diagramas legíveis em impressão P&B (subagente confere).
- **Ensaio geral:** antes do S1, o Doug entra como aluno no celular e faz a tarefa
  inteira da semana 1 em ≤ 30 min.

## Riscos e pendências

- **Prazo:** F0+F1 em 8 dias. Mitigação acima (o sábado seguinte sempre funciona).
- **Dependência externa:** o laboratório do de la Villa precisa estar publicado até
  19/9; senão, o bloco de finais do S3 usa os livros já comprados no projetor e a
  tarefa de finais vira puzzles `endgame`/`rookEndgame` do Lichess.
- **Ritmo do rápido** (15+10 × 10+5): conferir no boletim; treino em 15+10 cobre.
- **Repertório do clube** ainda não decidido: proposta na §Aberturas, decisão na F2.
- **Dias do xadrez dentro de 6–18/10:** o Doug informou 11–16; boletim confirma em
  2/10 (congresso técnico).
- **Licenças:** chessground e Stockfish são GPL (site GPL, como o Lab); puzzles
  Lichess CC0; peças cburnett CC BY-SA (creditar). Posições de livros só como fato
  com proveniência; nenhuma prosa copiada.
- **Amazon:** preços/Kindle .com.br não confirmados. **Chessable:** gratuidade dos
  cursos citados não confirmada em set/2026. Durações dos vídeos PT-BR não
  confirmadas.
- **Formato do torneio do clube no chess.com não confirmado** (suíço ou só arena).
  Ver §Ferramentas do professor. Se for só arena, o ensaio de suíço fica todo no
  simulado do Sábado 4.
- **Sem leitura automática das partidas de casa.** A partida acontece no chess.com e
  chega ao professor pelo que o aluno anota no papel (S1) e, da F2 em diante, pelo
  PGN que ele envia no site. Não há API aberta equivalente à do Lichess para puxar
  as partidas por nome de usuário — o que o plano original assumia.
- **O aluno já tem conta no chess.com**, então o segundo login deixou de ser um
  problema novo: o que ele recebe em papel no S1 é só o usuário e o PIN do nosso
  site. (Antes eram dois cadastros, um deles criado do zero.)
