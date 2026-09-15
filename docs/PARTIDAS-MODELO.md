# Plano — Partidas Modelo como requisito de nível

## Diário

### 15/09/2026 — pasta preparada
- **Pasta criada:** `Desktop\preparatorio-olesc-partidas`, na branch `partidas-modelo`, a partir de `origin/main` = `ac2cfd1`.
  O Editor v2 já está mesclado nesse commit.
- **Push:** a branch **não tem upstream**, ou seja, não está ligada a nenhuma branch do servidor. O primeiro push precisa ser
  `git push -u origin partidas-modelo`, nunca para a `main`.
- **Preparação:** `.env.local` copiado (ignorado pelo git) e `npm install` feito.
- **Linha de base:** `npm test` com 1319 testes, 1319 passando e 0 falhando.
- **Próximo passo:** bloco 0 (registrar a curadoria e a tabela de momentos neste arquivo), depois o bloco 1.

### 15/09/2026 — bloco 0: tabela de momentos registrada
- **Resultado:** 15 partidas e 80 momentos (13 + 14 + 17 + 18 + 18 por nível), gerados do PGN canônico v4 e
  conferidos com a chess.js: 80 de 80 lances batem com o lance jogado no ply, 0 erros.
- **De onde veio a tabela:** o relatório da curadoria Fable (conversa de 15/9, 11 obrigatórias). As 4 que ali eram
  opcionais e o Doug promoveu a obrigatórias não tinham lista fechada; a escolha abaixo é minha, e o Doug pode trocar:
  - **Polgar–Mamedyarov (5):** a ficha tem 6; saiu **13.Qf3+**, xeque óbvio. O Desafio fica o da ficha, **23.Be7+**,
    porque a troca para 12.Nxf7 sugerida no relatório não está entre as 4 trocas aprovadas.
  - **Tarrasch–Mieses (6):** saíram **3.Nc3** e **4.d4** (abertura com vários lances iguais); entrou **19.Kd3+**
    (xeque descoberto do rei). O Desafio fica **41.Rxd7+**, pelo mesmo motivo.
  - **Marshall–Tarrasch (6):** saiu **6...Qa5**; fica **8...Bb4**, que é a cravada do tema.
  - **Pillsbury–Mason (6):** saiu **2.c4**, como o relatório indicava.
- **Chernev–Hahlbohm 20.Nc5:** o relatório o põe em "mantém (ficha)", mas a ficha não tem esse momento. Entra como
  momento novo, com texto nosso.
- **Fonte errada numa ficha:** Polgar–Mamedyarov cita Weeramantry & Eusebi, mas a edição e as páginas (Gambit 2006,
  Game 3, pp. 14–16) são do Giddins, e o PGN canônico diz Giddins. Vai para `correcoes`.
- **Nunn:** o plano pedia cadastrar, mas nenhuma das 15 partidas usa Nunn. Ficam 4 obras: Chernev (*Logical Chess* e
  *The Most Instructive Games*), Weeramantry & Eusebi e Giddins.
- **SAN não canônico no v4:** Capablanca–Villegas `24...Rac8` é `Rc8`. O PGN do repositório leva `Rc8`.
- **Motor [motor]:** os 7 momentos de alternativas (Morphy 10, Colle 17, Spielmann 14, Blackburne 16, Marshall 16,
  Paulsen 17, Villegas 33) rodam no Stockfish no bloco 2.

Versão 3, de 15/09/2026. Incorpora a revisão Fable do plano, a pesquisa de nível e a curadoria Fable das partidas.

## Contexto
O Doug quer implementar as **partidas modelo** no preparatório. O objetivo é que o aluno treine
com elas de forma **obrigatória**, como **requisito para passar de nível**. A implementação só
começa quando o Doug decidir que dá tempo.

**Por que vale.** As partidas vêm de livros escritos para o nível da turma:
- Chernev: "primeiro livro de partidas comentadas" (Heisman).
- Giddins: 1300–1700 USCF.
- Weeramantry & Eusebi: clube, ~1300.

A turma tem 700–1700 no chess.com (~400–1350 FIDE, `lib/curso/nivel.ts:72`). O rótulo "200–700"
é do texto simplificado das fichas, não das partidas.

**Decisões do Doug já tomadas:**
- É requisito de nível.
- Uma partida está **concluída** quando o aluno resolve todos os momentos e acerta o Desafio final
  de primeira, sem pedir revelação.
- Texto e exercícios são para a turma 700–1700.
- O aluno joga do lado de quem venceu.
- O texto é adaptado citando a fonte.
- Mesma régua de voz das aulas: fala de até 200 caracteres, frase de até 20 palavras, sem as palavras proibidas.

**Material de origem:** `C:\Users\Lenovo\Downloads\PARTIDAS MODELO - XADREZ`
- PGN v4 com as 20 partidas, todas legais.
- 3 .docx com as fichas e 133 momentos.
- Planilha de 172 candidatas.

## Curadoria (Fable, conferida com chess.js)
**Aprovado pelo Doug:** 15 obrigatórias e 5 que saem. Todas as 15 contam como requisito do seu nível.
São **80 momentos**, contra os 133 das fichas, e cerca de **3 h de aluno** somando os 5 níveis.

**Distribuição aprovada pelo Doug:** 3 partidas por nível.

| Nível (`nivel.ts`) | Obrigatórias | Momentos | Aluno |
|---|---|---|---|
| 1 — mate em 1/2, peça de graça | Morphy–Isouard, Colle–Delvaux, Polgar–Mamedyarov | 4+4+5 | ~32 min |
| 2 — garfo, cravada, descoberto | Spielmann–Wahle, Alekhine–Poindle, Tarrasch–Mieses (garfos de cavalo, xeque descoberto) | 4+4+6 | ~30 min |
| 3 — padrões de mate | Blackburne–Blanchard, Porges–Lasker (pretas, a partir do lance 27), Marshall–Tarrasch (pretas; cravada) | 5+6+6 | ~35 min |
| 4 — remover quem defende | Lasker–Bauer, Chernev–Hahlbohm, Pillsbury–Mason (torre ativa) | 6+6+6 | ~36 min |
| 5 — ataque, lances finos, conversão | Averbakh–Sarvarov, Paulsen–Morphy (pretas), Capablanca–Villegas | 5+6+7 | ~37 min |

As partidas longas não pesam: o aluno resolve só os momentos, e a partida inteira é opcional.

**Saem:**
- **von Scheve–Teichmann:** o final não é forçado.
- **Ruger–Gebhard:** tem 2 erros na ficha, e a lição do roque prematuro não é o erro real da partida.
- **Tarrasch–Kurschner:** o adversário é fraco demais, e a ficha tem o erro do "rei a d8".
- **Capablanca–Mattison:** acaba sem mostrar por quê.
- **van Vliet–Znosko:** são 72 meios-lances para um único garfo.

Nenhuma troca por reserva por enquanto, porque nenhuma reserva tem PGN verificado. Se o Doug quiser
repor, as candidatas são Kupferstich–Andreasen (nível 2) e Nimzowitsch–Alapin (nível 4).

**Momentos:** cortar os de abertura com vários lances iguais e acrescentar os lances decisivos. A tabela
completa, com ply, FEN e lance, está no relatório da curadoria, que vai para `docs/PARTIDAS-MODELO.md`
no bloco 0. Exemplos:
- Morphy: +10.Cxb5
- Spielmann: +13.Df3
- Lasker–Bauer: +22.Dd7
- Paulsen: +12...Dd3, +19...Bh3, +26...Te2
- Capablanca–Villegas: +28.De4; corta o momento 21 (errado)

**Desafio final:** 4 trocas, aprovadas pelo Doug.
- Porges: 34...h3# vira 27...Cxg2!
- Lasker–Bauer: 38.Dxd3 vira 22.Dd7!
- Chernev: 21.Dh7+ vira 22.Ccxe6+
- Averbakh: 23.Txd6 vira 22.Tg6!

Todos os outros mantêm o Desafio da ficha.

**Verificado por mim com chess.js:**
- Paulsen–Morphy, lance 22: 22...Tg2! dava mate contra 23.Dd3 (Tg1#). O plano é contar isso na narração, sem criar momento.
- Averbakh: 22.Tg6 ameaça Th6#.

## Abertura (o Doug decidiu começar já, em paralelo ao Editor v2)
- **Contexto:** `/clear` antes, e começar lendo este arquivo.
- **Git:** a frente começa agora num **worktree**, uma cópia separada da pasta com uma branch própria
  (`partidas-modelo`), criada a partir da `main`. O `modo-editor` e os mais de 80 arquivos do Editor v2
  ficam intocados. O piloto `/partidas` (3e77384) e a migração `0010` já estão na `main`. Ver
  `docs/COMO-TRABALHAR-COM-BRANCHES.md`.
- **Conflitos na hora de juntar:**
  - **Migração:** o Editor v2 pode criar outra `0011`. Conferir o número antes do merge.
  - **Arquivos em comum:** o `modo-editor` também mexe em `app/painel/Nivel.tsx` e `lib/curso/nivel.test.ts`.
    Mesclar o `modo-editor` na `main` primeiro e trazer a `main` para `partidas-modelo` antes de mexer no nível (bloco 4).
- **Motor:** Opus 5 na escrita dos momentos e narrações (bloco 2). Sonnet 5 no código mecânico (blocos 1, 3 e 4).
- **Risco:** requisito novo num nível que o aluno já fechou. Quem já fechou não perde o nível (ver bloco 4).

## Tabela de momentos (bloco 0)

`Ply` = meios-lances jogados antes da posição (o lance 1 das brancas é o ply 0). **DF** = Desafio final.

**Nível 1 — `morphy-isouard`** (Paul Morphy × Duke Karl / Count Isouard, 1858; aluno de brancas; 33 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 10.Nxb5 | 18 | `rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq - 0 10` |
| 2 | 12.O-O-O | 22 | `r3kb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/R3K2R w KQkq - 1 12` |
| 3 | 13.Rxd7 | 24 | `3rkb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR3R w k - 3 13` |
| 4 **DF** | 16.Qb8+ | 30 | `4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16` |

**Nível 1 — `colle-delvaux`** (Edgard Colle × Delvaux, 1929; aluno de brancas; 43 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 15.Nxe6 | 28 | `r2q1rk1/pb3p2/2n1pbpp/1p4N1/2pPQ3/2P5/PPB2PPP/R1B2RK1 w - - 0 15` |
| 2 | 16.Qxg6+ | 30 | `r2q1rk1/pb6/2n1pbpp/1p6/2pPQ3/2P5/PPB2PPP/R1B2RK1 w - - 0 16` |
| 3 | 17.Qh7+ | 32 | `r2q1rk1/pb4b1/2n1p1Qp/1p6/2pP4/2P5/PPB2PPP/R1B2RK1 w - - 1 17` |
| 4 **DF** | 22.Qf7# | 42 | `r2q2r1/pb2n2Q/4pk1b/1p5B/2pP3P/2P5/PP3PP1/R4RK1 w - - 0 22` |

**Nível 1 — `polgar-mamedyarov`** (Judit Polgar × Shakhriyar Mamedyarov, 2002; aluno de brancas; 46 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 11.Ng5 | 20 | `r2qkb1r/2p2ppp/p1n1b3/1pn1P3/3p4/1BP2N2/PP1N1PPP/R1BQ1RK1 w kq - 0 11` |
| 2 | 12.Nxf7 | 22 | `r2qkb1r/2p2ppp/p1n5/1pnbP1N1/3p4/1BP5/PP1N1PPP/R1BQ1RK1 w kq - 2 12` |
| 3 | 16.e6 | 30 | `r2q1b1r/2p1k1pp/p1n5/1pnbPQ2/3p4/1BP5/PP1N1PPP/R1B2RK1 w - - 6 16` |
| 4 | 19.Ne4 | 36 | `r4b1r/2p1k1pp/p1nqn3/1p3Q2/3p4/2P5/PP1N1PPP/R1B1R1K1 w - - 0 19` |
| 5 **DF** | 23.Be7+ | 44 | `r6r/2p2Qpp/p1nkn3/1pb1q1B1/3p4/2P5/PP3PPP/R3R1K1 w - - 2 23` |

**Nível 2 — `spielmann-wahle`** (Rudolf Spielmann × V. Wahle, 1926; aluno de brancas; 33 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 12.Rxe7 | 22 | `r1bq1rk1/pp2bp1p/2p2np1/3p2B1/3P4/2NQ2N1/PPP2PPP/4RRK1 w - - 2 12` |
| 2 | 13.Qf3 | 24 | `r1b2rk1/pp2qp1p/2p2np1/3p2B1/3P4/2NQ2N1/PPP2PPP/5RK1 w - - 0 13` |
| 3 | 14.Nce4 | 26 | `r1b2r2/pp2qpkp/2p2np1/3p2B1/3P4/2N2QN1/PPP2PPP/5RK1 w - - 2 14` |
| 4 **DF** | 17.Qf4 | 32 | `r1b2rk1/pp3p1p/2p1qBp1/8/3PN3/5Q2/PPP2PPP/5RK1 w - - 1 17` |

**Nível 2 — `alekhine-poindle`** (Alexander Alekhine × Poindle, 1936; aluno de brancas; 59 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 10.Qh5 | 18 | `r1bqk2r/ppppbppp/2n5/6N1/P7/8/1PP2PPP/RNBQ1RK1 w kq - 2 10` |
| 2 | 13.Ne4 | 24 | `r1bqkb1r/ppppnp1p/6pQ/6N1/P7/8/1PP2PPP/RNB1R1K1 w kq - 4 13` |
| 3 | 17.Qc4+ | 32 | `r1bq3r/ppppnkb1/5Npp/5pB1/P6Q/8/1PP2PPP/RN2R1K1 w - - 0 17` |
| 4 **DF** | 18.Rxe7 | 34 | `r1bq1k1r/ppppn1b1/5Npp/5pB1/P1Q5/8/1PP2PPP/RN2R1K1 w - - 2 18` |

**Nível 2 — `tarrasch-mieses`** (Siegbert Tarrasch × Jacques Mieses, 1920; aluno de brancas; 81 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 13.Rhe1 | 24 | `r3k1nr/ppp2ppp/n7/1N6/3N4/8/PPP1KPPP/R6R w kq - 1 13` |
| 2 | 15.Nac6+ | 28 | `1k1r2nr/Npp2ppp/n7/8/3N4/8/PPP1KPPP/R3R3 w - - 1 15` |
| 3 | 18.Rad1+ | 34 | `3k2nr/2p2ppp/n7/8/8/8/PPP1KPPP/R3R3 w - - 0 18` |
| 4 | 19.Kd3+ | 36 | `4k1nr/2p2ppp/n7/8/8/8/PPP1KPPP/3RR3 w - - 2 19` |
| 5 | 25.a4 | 48 | `7r/2p1nkp1/2n2p2/7p/1PK2P2/4R3/P1P3PP/4R3 w - - 1 25` |
| 6 **DF** | 41.Rxd7+ | 80 | `8/n1knR3/P1p2pp1/2K4p/1PP2P2/6P1/7P/8 w - - 11 41` |

**Nível 3 — `blackburne-blanchard`** (Joseph Henry Blackburne × Blanchard, 1891; aluno de brancas; 35 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 13.Bxh6 | 24 | `r2q1rk1/p1p1npp1/1pn1b2p/3pP3/3P1B2/2PB1N2/P1PQ2PP/1R3RK1 w - - 2 13` |
| 2 | 15.Ng5 | 28 | `r2q1rk1/p1p2p2/1pn1b1nQ/3pP3/3P4/2PB1N2/P1P3PP/1R3RK1 w - - 1 15` |
| 3 **DF** | 16.Rxf7 | 30 | `r2qr1k1/p1p2p2/1pn1b1nQ/3pP1N1/3P4/2PB4/P1P3PP/1R3RK1 w - - 3 16` |
| 4 | 17.Qh7+ | 32 | `r2qr1k1/p1p2b2/1pn3nQ/3pP1N1/3P4/2PB4/P1P3PP/1R4K1 w - - 0 17` |
| 5 | 18.Qxf7# | 34 | `r2qrk2/p1p2b1Q/1pn3n1/3pP1N1/3P4/2PB4/P1P3PP/1R4K1 w - - 2 18` |

**Nível 3 — `porges-lasker`** (Moritz Porges × Emanuel Lasker, 1896; aluno de pretas; 68 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 **DF** | 27...Nxg2 | 53 | `r4rk1/p2b2p1/2p3q1/3p3p/4pn2/1PP1RPN1/P3N1PP/R2Q2K1 b - - 1 27` |
| 2 | 28...exf3+ | 55 | `r4rk1/p2b2p1/2p3q1/3p3p/4p3/1PP1RPN1/P3N1KP/R2Q4 b - - 0 28` |
| 3 | 29...Bh3+ | 57 | `r4rk1/p2b2p1/2p3q1/3p3p/8/1PP2RN1/P3N1KP/R2Q4 b - - 0 29` |
| 4 | 30...Qg4+ | 59 | `r4rk1/p5p1/2p3q1/3p3p/8/1PP2RNK/P3N2P/R2Q4 b - - 0 30` |
| 5 | 32...h4 | 63 | `r4rk1/p5p1/2p5/3p3p/8/1PP2qN1/P3N2P/R2Q2K1 b - - 1 32` |
| 6 | 34...h3# | 67 | `r4rk1/p5p1/2p5/3p4/7p/1PP1q3/P3N1KP/R2Q3N b - - 3 34` |

**Nível 3 — `marshall-tarrasch`** (Frank James Marshall × Siegbert Tarrasch, 1905; aluno de pretas; 88 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 8...Bb4 | 15 | `r1b1kb1r/pp1n1ppp/2p1p3/q2n2B1/3P4/2N1PN2/PPQ2PPP/R3KB1R b KQkq - 1 8` |
| 2 | 9...c5 | 17 | `r1b1k2r/pp1n1ppp/2p1p3/q2n2B1/1b1P4/2N1PN2/PPQK1PPP/R4B1R b kq - 3 9` |
| 3 | 16...Rxc3 | 31 | `2r2rk1/pp1b1ppp/1n2p3/q2n2B1/3P4/PQPB1N2/4KPPP/R1R5 b - - 8 16` |
| 4 | 27...Bb5 | 53 | `2r3k1/ppq2pp1/4p3/8/b2P4/P1nB1N2/3B1PPP/Q4K2 b - - 0 27` |
| 5 | 35...Nxe3+ | 69 | `6k1/pp3pp1/4p3/3r1n2/P2Pq3/4BNP1/1Q3PKP/8 b - - 4 35` |
| 6 **DF** | 42...Rxd4 | 83 | `8/pp4pk/8/3rp1P1/P2Pqp1P/2Q2N2/6K1/8 b - - 0 42` |

**Nível 4 — `lasker-bauer`** (Emanuel Lasker × Johann Hermann Bauer, 1889; aluno de brancas; 75 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 14.Nh5 | 26 | `r4rk1/1b2bppp/ppq1pn2/2ppB3/5P2/1P1BP1N1/P1PPQ1PP/R4RK1 w - - 0 14` |
| 2 | 15.Bxh7+ | 28 | `r4rk1/1b2bppp/ppq1p3/2ppB2n/5P2/1P1BP3/P1PPQ1PP/R4RK1 w - - 0 15` |
| 3 | 17.Bxg7 | 32 | `r4rk1/1b2bpp1/ppq1p3/2ppB2Q/5P2/1P2P3/P1PP2PP/R4RK1 w - - 1 17` |
| 4 | 19.Rf3 | 36 | `r4r2/1b2bp1k/ppq1p3/2pp4/5PQ1/1P2P3/P1PP2PP/R4RK1 w - - 2 19` |
| 5 | 20.Rh3+ | 38 | `r4r2/1b2bp1k/ppq5/2ppp3/5PQ1/1P2PR2/P1PP2PP/R5K1 w - - 0 20` |
| 6 **DF** | 22.Qd7 | 42 | `r4r2/1b2bp2/pp5k/2ppp3/5PQ1/1P2P3/P1PP2PP/R5K1 w - - 0 22` |

**Nível 4 — `chernev-hahlbohm`** (Irving Chernev × Herman H. Hahlbohm, 1942; aluno de brancas; 47 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 13.Bxh7+ | 24 | `r1b1r1k1/pp3ppp/1qn5/2bnp3/8/1NPB1N2/PP2QPPP/R1B2RK1 w - - 2 13` |
| 2 | 14.Qe4+ | 26 | `r1b1r3/pp3ppk/1qn5/2bnp3/8/1NP2N2/PP2QPPP/R1B2RK1 w - - 0 14` |
| 3 | 16.Ng5 | 30 | `r1b1rbk1/pp3pp1/1qn5/3Qp3/8/1NP2N2/PP3PPP/R1B2RK1 w - - 1 16` |
| 4 | 20.Nc5 | 38 | `r3r1k1/pp3pb1/q1n1b1p1/4p1N1/7Q/1NP1B3/PP3PPP/R4RK1 w - - 4 20` |
| 5 | 21.Qh7+ | 40 | `r3r1k1/pp3pb1/2n1b1p1/2N1p1N1/2q4Q/2P1B3/PP3PPP/R4RK1 w - - 6 21` |
| 6 **DF** | 22.Ncxe6+ | 42 | `r3rk2/pp3pbQ/2n1b1p1/2N1p1N1/2q5/2P1B3/PP3PPP/R4RK1 w - - 8 22` |

**Nível 4 — `pillsbury-mason`** (Harry Nelson Pillsbury × James Mason, 1895; aluno de brancas; 71 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 14.Rc2 | 26 | `r4rk1/pbpn1ppp/1p1q4/1B1p4/3P4/4PN2/PP2QPPP/2R2RK1 w - - 2 14` |
| 2 | 17.Ba6 | 32 | `2r2rk1/pb3ppp/1ppq1n2/3p4/3P4/3BPN2/PPR1QPPP/2R3K1 w - - 4 17` |
| 3 | 22.Rc6 | 42 | `5rk1/p2n1ppp/Qp1q4/2RpN3/3P4/4P3/PP3PPP/6K1 w - - 1 22` |
| 4 | 24.Nc6 | 46 | `5rk1/p4ppp/np1R4/3pN3/3P4/4P3/PP3PPP/6K1 w - - 0 24` |
| 5 | 30.Rd7 | 58 | `1r6/2n1Npkp/1p1R2p1/3p4/3P2P1/P3P3/1P3P1P/6K1 w - - 3 30` |
| 6 **DF** | 34.a4 | 66 | `8/3R1pkp/1N4p1/6n1/1P1P2P1/P3P3/2r2P1P/6K1 w - - 1 34` |

**Nível 5 — `averbakh-sarvarov`** (Yuri Averbakh × M. Sarvarov, 1959; aluno de brancas; 55 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 11.O-O-O | 20 | `r1bqrnk1/pp2bppp/2p2n2/3p4/3P1B2/2NBPN1P/PPQ2PP1/R3K2R w KQ - 1 11` |
| 2 | 16.Bxh7+ | 30 | `r2qrnk1/1b2bppp/2p5/1p1pN1Pn/p2P1B2/2NBP2P/PPQ2P2/2K3RR w - - 1 16` |
| 3 | 17.g6 | 32 | `r2qr1k1/1b2bppn/2p5/1p1pN1Pn/p2P1B2/2N1P2P/PPQ2P2/2K3RR w - - 0 17` |
| 4 | 20.Rxg7 | 38 | `r2qr2k/1b2bQp1/2p2n2/1p1pN2n/p2P1B2/2N1P2P/PP3P2/2K3RR w - - 3 20` |
| 5 **DF** | 22.Rg6 | 42 | `r2qr2k/1b2bQn1/2p5/1p1pN2n/p2P1B2/2N1P2P/PP3P2/2K3R1 w - - 2 22` |

**Nível 5 — `paulsen-morphy`** (Louis Paulsen × Paul Morphy, 1857; aluno de pretas; 56 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 11...Re6 | 21 | `r1bq2k1/p1p2ppp/2p5/1pb5/4r3/5B2/PPPP1PPP/R1BQ1RK1 b - - 1 11` |
| 2 | 12...Qd3 | 23 | `r1bq2k1/p1p2ppp/2p1r3/1pb5/8/2P2B2/PP1P1PPP/R1BQ1RK1 b - - 0 12` |
| 3 | 16...Rae8 | 31 | `r5k1/p1pb1ppp/1bp1r3/8/QP6/2Pq1B2/R2P1PPP/2B2RK1 b - - 2 16` |
| 4 **DF** | 17...Qxf3 | 33 | `4r1k1/p1pb1ppp/Qbp1r3/8/1P6/2Pq1B2/R2P1PPP/2B2RK1 b - - 4 17` |
| 5 | 19...Bh3 | 37 | `4r1k1/p1pb1ppp/Qbp3r1/8/1P6/2P2P2/R2P1P1P/2B2R1K b - - 2 19` |
| 6 | 26...Re2 | 51 | `4r1k1/p1p2ppp/2p3r1/8/1P6/2P5/R2P1b1P/2B2R1K b - - 0 26` |

**Nível 5 — `capablanca-villegas`** (Jose Raul Capablanca × Benito Higinio Villegas, 1914; aluno de brancas; 67 meios-lances)

| # | Lance | Ply | FEN |
|---|---|---|---|
| 1 | 22.b4 | 42 | `r2r2k1/ppq2ppp/4p3/8/2PR4/1P2Q3/P4PPP/3R2K1 w - - 3 22` |
| 2 | 24.g3 | 46 | `r5k1/p1q2ppp/1p2p3/8/1PPQ4/8/P4PPP/3R2K1 w - - 0 24` |
| 3 | 25.Rc1 | 48 | `2r3k1/p1q2ppp/1p2p3/8/1PPQ4/6P1/P4P1P/3R2K1 w - - 1 25` |
| 4 | 27.c5 | 52 | `3r1k2/p1q2ppp/1p2p3/8/1PP5/4Q1P1/P4P1P/2R3K1 w - - 5 27` |
| 5 | 28.Qe4 | 54 | `3r1k2/p1q2ppp/4p3/2p5/1P6/4Q1P1/P4P1P/2R3K1 w - - 0 28` |
| 6 | 31.a4 | 60 | `8/p1q2pkp/2P1p1p1/3r4/4Q3/6P1/P4P1P/2R3K1 w - - 1 31` |
| 7 **DF** | 33.Qxd6 | 64 | `8/p1q3kp/2Prppp1/4Q3/P7/6P1/5P1P/2R3K1 w - - 0 33` |

## Arquitetura
**Promover o `/partidas` existente.** O Editor v2 é das aulas de finais e ainda está com prazo aberto.

**O que se reaproveita:**
- `lib/partidas/carregar.ts`: PGN → `Linha` da `Passada`.
- `lib/partidas/momentos.ts`: schema Zod dos momentos.
- `app/partidas/[jogo]/Sessao.tsx`: partida assistida.
- `app/partidas/[jogo]/momentos/Desafio.tsx`: ajuda crescente; só conta acerto de primeira.
- `lerPgn` (`lib/repertorio/pgn.ts:430`).
- `sanEmPortugues` (`lib/repertorio/treino.ts:556`) e `lancesEmPortugues` (`lib/repertorio/notas.ts:121`).
- `conferirMarcasDasFontes` (`lib/repertorio/marcas-das-fontes.ts:113`), como modelo.
- Stockfish 18 em `public/engine/`, com `lib/engine/useMotorDoProfessor.ts`.

## Blocos e pontos de parada

### Bloco 0 — Registro das decisões (30 min)
- Criar `docs/PARTIDAS-MODELO.md`, o diário desta frente, com a curadoria aprovada, a tabela de
  momentos e as decisões.

**Parada:** curadoria aprovada, com N partidas e N momentos registrados.

### Bloco 1 — Dados e travas (mecânico, 5–7 h)
**PGN e schemas**
- `content/partidas/<slug>.pgn` com as tags `[Ordem]`, `[Nivel]`, `[Cor]`, `[Tema]`, `[FonteSlug]` e
  `[Status "rascunho|revisado-doug"]`. A autoria vai em `[%autoria …]` dentro do comentário, copiada do rótulo da ficha.
- **Símbolos de lance** (regra de 14/9): o PGN leva os `!`/`?` que a ficha dá aos lances, **inclusive nos
  lances que deixam de ser momento**. Cortar um momento não corta o lance da partida.
  - **Qual menção manda:** o "Lance esperado" e o lance em negrito da narração. As perguntas não contam
    (falso positivo como `22.Qf7#?`).
  - **Onde ficam no código:** `!`/`!!` vão em `linha.marcas`; os demais vão em `nags` do tipo `Partida`,
    nunca na `Linha`, cujo schema é `.strict()`.
- `lib/partidas/momentos.ts`:
  - sai `nivel`;
  - entram `desafioFinal: boolean`, `alternativasBoas: uci[]` (hoje `alternativas` é só texto) e `autoria`;
  - **decisão do Doug:** um lance de `alternativasBoas` mostra "Bom lance, mas na partida foi outro — tente
    achar". Não conta como erro, não quebra o "de primeira" e só avança com o lance da partida;
  - o arquivo continua sem `fs`, porque também roda no navegador.
- `lib/partidas/ficha.ts` com Zod para intro, objetivos, momentoFinal, resumo, perguntas, fonte,
  `marcasDaFonte` e `correcoes`.
- `content/sources.json`: cadastrar Chernev (2 obras), Giddins, Nunn e Weeramantry & Eusebi, com `file: null`.

**Testes em `lib/partidas/conteudo.test.ts`** (rodam no `npm test`; também chamados de `scripts/validate-content.ts`)
- PGN legal e SAN canônico.
- FEN do momento = posição da partida no `ply`.
- Lance esperado = lance jogado na partida.
- Cada lance de `alternativasBoas` é legal e diferente do esperado.
- Exatamente 1 `desafioFinal` por partida.
- Nenhum símbolo de `marcasDaFonte` falta no PGN.
- A fonte existe.
- Nenhum rótulo de nível antigo e nenhuma das frases erradas conhecidas.
- Contagem fixa de partidas e momentos por nível.

**Voz:** caso novo em `lib/lesson/voz.test.ts` medindo `falasDasPartidas()` (`lib/partidas/voz.ts`).

**Parada:** número de testes novos verdes, e o piloto antigo reprovando antes da reescrita (prova de que a trava funciona).

### Bloco 2 — Conteúdo, nível por nível (Claude escreve, Doug aprova)
- **Por nível:** extrair o texto da ficha, reescrever intro, narração e momentos na régua de voz, com a
  correção dos erros registrada em `correcoes`.
- **Alternativas aceitas:** nos 7 momentos marcados "[motor]" (Morphy 10, Colle 17, Spielmann 14,
  Blackburne 16, Marshall 16, Paulsen 17, Capablanca–Villegas 33), rodar o Stockfish do projeto antes de
  publicar. Lance que o motor avalia igual ao jogado entra em `alternativasBoas`; a lista vai para o Doug
  aprovar. Já estão confirmadas as transposições Alekhine 18.Ch7+ e Tarrasch–Mieses 15.Cdc6+.
- **Aprovação sem editar arquivo:**
  1. A partida em `rascunho` aparece com o selo "em revisão" para o professor e no ambiente local.
  2. O Doug aprova na conversa.
  3. O Claude troca a tag para `revisado-doug` e registra no diário.
  4. Aluno só vê partida revisada.
- **Ordem:** nível 1 → 2 → 3 (meta OLESC) → 4 → 5.

**Parada por nível:** partidas revisadas / N; momentos / N; 0 reprovações de voz; 0 símbolos perdidos.

### Bloco 3 — Telas (mecânico, 4–6 h)
- `app/partidas/page.tsx`: lista por nível, sem o selo TESTE, com o selo "em revisão" e "concluída".
- `app/partidas/[jogo]/page.tsx`: intro → objetivos → momentos (caminho principal) → partida inteira
  opcional (`Sessao.tsx`) → momento final → resumo.
- `Desafio.tsx` e `Momentos.tsx`:
  - reconhecer `alternativasBoas` com o aviso "bom lance, mas na partida foi outro";
  - marcar o Desafio final;
  - mostrar o símbolo depois do acerto;
  - o placar deixa de sumir quando a aba fecha.
- Antes de mexer em rota e props, ler `node_modules/next/dist/docs/`.

**Parada:** as páginas do nível 1 percorridas no Playwright nos projetos `aluno-375` e desktop,
conferindo `innerWidth` antes de medir, e o Doug arrastando as peças com a mão.

### Bloco 4 — Gravar e cobrar como requisito (5–8 h)
**Banco**
- Migração aditiva `supabase/migrations/0011_partidas.sql`: tabela `tentativa_partida_momento`
  (aluno, partida, momento, versao, resposta_uci, acertou decidido no servidor, tentativa, apoio 0–3,
  tempo_ms, criada_em).
- RLS só de leitura, no molde de `0006_meiojogo.sql`.

**Gravação**
- `lib/partidas/gravar.ts` (server-only, no molde de `lib/tatica/gravar.ts`).
- `app/partidas/acoes.ts`, no molde de `app/aberturas/acoes.ts`. Antes, ler a seção Security de
  `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`.
- O navegador manda o lance jogado; o servidor decide se acertou e se a partida está concluída.

**Requisito**
- `lib/curso/nivel.ts`: novo campo declarado `partidasParaFechar` (todas as do nível: 3 em cada), cobrado como
  `min(declarado, publicadas)`, igual às aulas de finais.
- O requisito entra em `fechamentoDoNivel` e `ProgressoParaONivel`.
- Nível **já fechado** não é reaberto.

**Onde aparece**
- No painel ("Hoje") e na `/trilha`: próxima partida pendente do nível.
- No relatório do professor (`app/professor/[aluno]/page.tsx`): concluídas e acertos de primeira.

**Parada:** numa conta de teste, concluir as 3 partidas do nível 1 e ver o requisito mudar; `npm run db:rls` verde.

## Recorte e custo (estimativa, não medida)
| Recorte | Entrega | Claude | Doug |
|---|---|---|---|
| **Antes da OLESC: níveis 1–3** | 9 partidas, 44 momentos, gravação e requisito | ~32–42 h | ~6 h (≈2 h por nível, no site) |
| Níveis 4–5 | +6 partidas, +36 momentos | ~12–15 h | ~4 h |

**Ordem com o Editor v2:**
- Até 18/09: nas sessões livres, fazer os blocos 0–3 (dados, travas, conteúdo e telas do nível 1), que não tocam o nível nem o painel.
- Depois do merge do Editor v2: bloco 4 (gravação e requisito) e os níveis 2–3.

Os blocos 1, 3 e 4 se pagam uma vez só. O bloco 2 é repetido por nível.

## Verificação (em todo commit de código)
- `npm run typecheck`, `npm test`, `npm run validate:content`, `npm run lint`, `npm run build`.
- Na máquina: `npm run validate:mutations`.
- Com a migração: `npm run db:migrar` e `npm run db:rls`.
- Ponta a ponta, numa conta de teste:
  1. Abrir a partida.
  2. Errar um momento (não avança, a ajuda cresce).
  3. Acertar os momentos e o Desafio de primeira.
  4. Conferir "concluída", o requisito do nível e o relatório do professor.
  5. Conferir que um lance de `alternativasBoas` mostra o aviso, não conta como erro e não quebra o "de primeira".

## Riscos
1. **Prazo:** o Editor v2 vai até 18/09 e a OLESC é em 11–16/10. Níveis 1–3 cabem de 19/09 a ~03/10 só se nada mais entrar.
2. **Lance tão bom quanto o da partida:** só não é tratado como erro se o Stockfish tiver rodado antes de
   publicar. Momento sem essa checagem pode punir quem joga bem.
3. **Requisito muda o custo do nível para todos:** ~30–37 min por nível. Nível já fechado não reabre.
7. **Duas frentes ao mesmo tempo:** as sessões são divididas entre as partidas e o Editor v2 até 18/09,
   que é prazo do Editor v2. Se apertar, as partidas param e o Editor v2 vem primeiro.
4. **Direitos:** as 15 obrigatórias se apoiam em vários livros, com Chernev na maioria. O texto é adaptado com a fonte citada, e o site é fechado por login.
5. **Símbolos:** as 5 partidas que saem levam suas marcas junto. Não saem da árvore de nada publicado, mas ficam registradas no diário.
6. **Partidas de pretas** (Porges, Paulsen): o comentário deve dizer que os lances das brancas foram fracos, para o aluno não copiá-los.
