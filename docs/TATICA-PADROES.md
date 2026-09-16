# Padrões de tática — o que o Lichess não etiqueta, e o que ele etiqueta frouxo

> 16/9/2026. Plano: `C:\Users\Lenovo\.claude\plans\tudo-que-der-para-glittery-willow.md`.
> Código: `lib/tatica/padroes/` (detectores e testes), `scripts/etiquetar-puzzles.ts`,
> `scripts/auditar-etiquetas.ts`.

## Por que este documento existe

O Praticar do Lichess ensina 29 padrões de mate; o banco de puzzles dele etiqueta 18. O
currículo passou de 36 para 63 temas (blocos 9 a 11, e temas novos nos blocos 4, 6 e 7), e
21 deles não podem confiar só na coluna `Themes` do CSV:

- **12 tags são nossas** — o Lichess não as tem: dez mates (Damiano, Lolli, Anderssen, mate
  de peão, asfixia, Greco, Max Lange, Blackburne, Réti, Légal) e duas táticas (sacrifício
  grego, contra-xeque). O desperado foi medido e ficou de fora (ver o fim). O mate de Cozio não virou tema: acrescenta `dovetailMate`,
  que é a mesma figura.
- **9 tags do Lichess são frouxas demais** e só ficam se o nosso validador confirmar a figura:
  `operaMate`, `pillsburysMate`, `epauletteMate`, `morphysMate`, `cornerMate`,
  `blindSwineMate`, `killBoxMate`, `balestraMate` e `dovetailMate` (esta, somada ao Cozio).

**Régua para um tema entrar:** ≥ 39 puzzles no total, ≥ 5 na primeira faixa, e **precisão
medida ≥ 90%**. Tema que não passa vira pendência declarada ao Doug — não entra calado.

## Como a tag é dada

1. `npm run puzzles:etiquetar` lê o CSV (600–2100, os mesmos filtros de qualidade do site),
   reproduz a linha de cada puzzle com chess.js e passa pelos detectores. Grava
   `dados/etiquetas-nossas.tsv` com o cabeçalho `# governa:` — as tags que o arquivo decide.
   ~30 min com 7 núcleos.
2. `npm run puzzles:filtrar` e `puzzles:base-rating` leem o arquivo: para as tags governadas,
   o que o Lichess disse deixa de valer, e vale o arquivo.
3. Quando uma regra fica **mais estrita**, `npm run puzzles:etiquetar -- --reconferir tag,tag`
   refaz só os puzzles que já tinham a tag (segundos). Regra que afrouxa pede a rodada inteira.

Toda pergunta "quem cobre esta casa?" é feita **com o rei que levou mate retirado**. E várias
regras usam o **teste de tirar peças**: sem as peças do atacante que não pertencem à figura,
continua mate? Se não continua, a figura estava lá por acaso.

## Como a precisão foi medida

`npm run puzzles:auditar` sorteia (por hash do id, reprodutível) 40 puzzles de 1000 a 2100 por
tag e grava cada um **em texto** — linha em SAN, posição antes do primeiro lance e posição
final, em ASCII e FEN. Subagentes, no papel de treinador, julgaram SIM ou NÃO puzzle a puzzle
contra a definição, conferindo casas com chess.js (sem imagem, sem motor). Cada NÃO veio com o
motivo, e o padrão dos NÃO virou regra no detector.

A rodada 2 mediu as regras da rodada 1 numa amostra nova. Quando uma regra da rodada 2 foi
calibrada na própria amostra dela, a rodada 3 (`--semente rodada3`) mediu de novo, em outra.

## Resultado

| Tag | Tema | De quem | Rodada 1 | Rodada 2 | Rodada 3 | Puzzles no site |
|---|---|---|---|---|---|---|
| `damianoMate` | Mate de Damiano | nosso | 40/40 | — | — | 4.488 |
| `lolliMate` | Mate de Lolli | nosso | 40/40 | — | — | 4.134 |
| `anderssenMate` | Mate de Anderssen | nosso | 37/37 | — | — | 1.198 |
| `pawnMate` | Mate de peão | nosso | 40/40 | — | — | 5.490 |
| `suffocationMate` | Mate da asfixia | nosso | 32/40 | **40/40** | — | 2.647 |
| `grecoMate` | Mate de Greco | nosso | 36/40 | **40/40** | — | 3.867 |
| `maxLangeMate` | Mate de Max Lange | nosso | 2/22 | 36/40 → regra | — | 96 |
| `blackburneMate` | Mate de Blackburne | nosso | 31/33 | 33/40 → regra | **40/40** | 754 |
| `retiMate` | Mate de Réti | nosso | 22/35 | 37/40 → regra | — | 231 |
| `legalMate` | Mate de Légal | nosso | 16/16 | **40/40** | — | 478 |
| `dovetailMate` (Cozio) | Cauda de andorinha | nosso + Lichess | 40/40 | — | — | 4.599 |
| `greekGift` | Sacrifício grego | nosso | 21/40 | 37/40 → regra | — | 1.417 |
| `counterCheck` | Contra-xeque | nosso | 10/40 | **36/40** | — | 4.723 |
| `desperado` | Desperado — **fora do currículo** | nosso | 5/40 | 15/40 → regra | 32/40 (80%) | — |
| `operaMate` | Mate da ópera | Lichess + validador | 19/40 | **38/40** | — | 5.437 |
| `pillsburysMate` | Mate de Pillsbury | Lichess + validador | 8/40 | 39/40 → regra | **39/40** | 1.641 |
| `epauletteMate` | Mate das dragonas | Lichess + validador | 22/40 | 33/40 → regra | — | 3.557 |
| `swallowstailMate` | Mate de Guéridon | Lichess | 40/40 | — | — | 3.611 |
| `morphysMate` | Mate de Morphy | Lichess + validador | 19/40 | 40/40 → regra | — | 1.635 |
| `cornerMate` | Mate do canto | Lichess + validador | 13/40 | **40/40** | — | 1.578 |
| `triangleMate` | Mate do triângulo | Lichess | 40/40 | — | — | 4.090 |
| `blindSwineMate` | Mate dos porcos cegos | Lichess + validador | 4/40 | **40/40** | — | 507 |
| `killBoxMate` | Mate da caixa | Lichess + validador | 40/40 | — | — | 2.141 |
| `vukovicMate` | Mate de Vuković | Lichess | 37/40 | — | — | 2.039 |
| `balestraMate` | Mate da balestra | Lichess + validador | 31/40 | **40/40** | — | 784 |

"→ regra": os NÃO da rodada tinham um padrão comum, e a regra que os exclui entrou no detector
(e não exclui nenhum SIM daquela amostra). A contagem de "Puzzles no site" é a do banco antes
das regras da rodada 2; o banco final (271.885 puzzles) tem um pouco menos nas tags apertadas.

## As regras, e de onde veio cada trava

As definições completas estão nos comentários de `lib/tatica/padroes/detectores.ts`, junto de
cada detector. As travas que a auditoria acrescentou:

- **Damiano, Lolli, Anderssen** — só na primeira ou última fileira ("primeira fileira" é a
  palavra do Praticar); na coluna a/h, a figura com bispo é o Max Lange.
- **Max Lange** — o bispo tira uma fuga que a dama não alcança **porque uma peça do rei está no
  meio** (o g7 da figura rei h7, peões g7 e h6, dama g8, bispo f7). Sem isso, 20 em 22 eram o
  mate comum de dama apoiada por bispo.
- **Asfixia, Blackburne, Réti, balestra** — teste de tirar peças: o mate é das peças da figura.
  Blackburne: os dois bispos e um cavalo são necessários. Réti: toda fuga fechada pelo bispo ou
  pela torre que o apoia **em linha reta**, e nenhuma outra peça do atacante colada ao rei.
- **Greco e Pillsbury** — o xeque é **pela coluna** do rei, de longe. Pela última fileira, a
  mesma geometria se lê como mate do corredor (decisão tomada sem o Doug; ver pendências).
- **Pillsbury e Morphy** — a peça do mate a duas casas ou mais do rei, como no Praticar.
- **Ópera, Morphy, dragonas** — contam as fugas fechadas por peças fora da figura: no máximo uma
  (ópera, Morphy) ou duas (dragonas, como nas posições 2 e 3 do Praticar).
- **Canto** — o rei **no canto**, e o cavalo dá o mate.
- **Porcos cegos** — a peça do mate e outra torre ou dama, as duas na fileira logo à frente do rei.
- **Sacrifício grego** — Bxh7+ contra o rei rocado; a resposta é tomar ou ir a h8; cavalo a g5 ou
  dama a h5 sem captura, no 2º ou 3º lance; capturas depois só nas colunas f–h.
- **Contra-xeque** — quem resolve começa em xeque, e o primeiro lance (não de rei) dá xeque; fica
  de fora a troca em que esse lance é retomado na mesma casa sem terminar em mate.
- **Desperado** — ver o comentário do detector; foi a tag mais difícil (5/40 → 15/40).

## Posições do Praticar nos testes

`lib/tatica/padroes/detectores.test.ts`: **39 posições** jogadas até o mate e conferidas por
chess.js — 30 positivas (cada uma aceita pelo detector do padrão dela e **por nenhum outro**) e
9 de padrões do Lichess sem detector nosso (recusadas por todos). Mais os testes das três
táticas. Os estudos não trazem a solução; ela saiu de um resolvedor de mate em N.

**Ficaram sem posição de teste** (o resolvedor não achou o mate a tempo): Damiano #3, Lolli #3,
Anderssen #3, Greco #3 e cauda de andorinha #3.

## O que não entrou

- **Desperado — pendência do Doug.** Três rodadas: 5/40, 15/40 e 32/40 (80%, e 67,5% se os
  limítrofes contam contra). Abaixo da régua de 90%, saiu do nível 5 (que ficou com 34 temas; o
  currículo, com 63). O detector e o texto ficam guardados (`dados/desperado-texto.json`). A
  terceira auditoria propôs duas travas que, na amostra dela, deixam 32/32: a peça colhida tem de
  estar pendurada de verdade antes do 1º lance (sem defensor, ou atacada por peça menor), e quem
  resolve não pode começar em xeque. Aplicar, medir numa quarta amostra nova e decidir.

- **Mayet e Greco de torre** — 50% e 87% já são ópera e Pillsbury.
- **Peça sobrecarregada** — sem teste geométrico confiável; entra como explicação nos textos de
  Desvio e Capturar o defensor.
- **`collinearMove`** (jargão, o Praticar não ensina) e **`castling`** (632 puzzles).
