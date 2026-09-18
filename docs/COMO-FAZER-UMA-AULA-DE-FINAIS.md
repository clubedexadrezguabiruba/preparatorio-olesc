# Como fazer uma aula de finais

O mestre de autoria desde 17/9/2026. Uma aula de finais é **um estudo em PGN** (feito no Lichess ou
à mão) que o script de publicação transforma em aula v2 com as quatro etapas. O **currículo** (a lista,
a ordem, a frase "sai sabendo") continua em `docs/TRILHA-FINAIS.md` §5 e §5.1. A **voz** continua em
`docs/VOZ-DO-CURSO.md` §3 e §4. Os **símbolos** continuam no `AGENTS.md`. Quando este documento e a
§13/§14.7 da trilha discordarem, **vale este**.

## 1. A aula: um estudo, capítulos com nome

A primeira palavra do nome do capítulo decide a etapa (`destinoPeloNome`, em
`lib/editor-v2/importar-estudo.ts`). O número na frente só ordena e some na tela.

| Capítulo no estudo | Etapa no site | Regras |
|---|---|---|
| `00 - INTRODUÇÃO - …` (sem lances) | Introdução | Um capítulo por quadro, 2 a 6 quadros. **Quadro 1 = a pergunta** ("Ganha, empata ou perde?"); a resposta vem no quadro seguinte. Um quadro com a **pergunta mental** da aula e o que o aluno vai saber fazer no fim |
| `NN - AULA - …` | Aula assistida | Linha principal com o lance que ganha (`!`). Toda decisão crítica tem **a variante que perde** (`?`/`??`), que vai até a consequência aparecer. Um comentário curto por lance, e só se ajudar (é opcional). O último capítulo-aula é `NN - AULA - LEMBRE-SE`, **sem lances**, com 1 a 3 regras |
| `NN - TREINO N - …` | Treino guiado | `[ChapterMode "gamebook"]`, `[White "Aluno - Brancas"]` (ou Black). **Apoio decrescente** (régua do §1.1): treino 1 com o alvo apontado em **todo** nó, treino 2 em diante sem alvo, o último de transferência. Os erros previsíveis entram como variante com `?`/`??` e comentário — viram erro com nome. **Treino de empate leva `[Result "1/2-1/2"]`** (sem ele, o aluno lê "não jogue a vitória fora") |
| `NN - PRÁTICA - …` (sem lances) | Prática livre | `[Black "Engine"]`. Uma ou mais posições contra o computador, sem desenho, que testam a frase "sai sabendo". Prática de empate leva `[Result "1/2-1/2"]` |

**A variante fica no capítulo dela — ver §1.2.** Cada variante de um capítulo-aula que tem símbolo
(`!`, `?`, `!!`, `??`, `!?`, `?!`) ou comentário é mostrada **dentro da mesma etapa**, depois da linha
principal, com a posição rebobinando até o ponto da escolha. Variante sem símbolo e sem comentário fica
só na análise.

**Desenhos:** verde = o que se quer; amarelo = casa crítica; vermelho = **duas coisas, e só estas
duas** (decisão do Doug, 18/9/2026): (a) perigo, na linha do erro, e (b) **o rei que tomou o mate**, na
posição de mate — ali ele não lê "cuidado", lê "aqui está o mate". Fora desses dois casos, vermelho é
defeito. Casa citada
é casa desenhada — **e casa desenhada é casa citada**, que é o teto contra a poluição visual. Treino:
nenhuma seta liga a origem ao destino do lance certo. Prática: nenhum desenho. O desenho de um nó de
treino escreve-se **no comentário daquele lance no PGN** (`{ [%csl Gd6] }`); desde 17/9/2026 ele chega à
pergunta do treino na tela (`lib/editor-v2/treinos.ts`).

## 1.1 A régua do apoio decrescente (17/9/2026)

Substitui "todo nó do treino aponta o alvo" da `TRILHA-FINAIS` §14.3, que foi escrita quando a aula tinha
um treino só.

| Onde | O apoio antes do lance |
|---|---|
| **Treino 1** | todo nó aponta o alvo — seta **ou** casa acesa |
| **Treino 2 em diante** | nenhum alvo apontado |
| **Último treino** | nenhum alvo, e posição nova: é a transferência |
| **Prática real** | nada |

Aula com **um** treino só cai na primeira linha. "Sem ajuda" é **sem a resposta marcada antes de o aluno
mexer**, não aluno sozinho no silêncio: o apoio *depois do lance* — a fala e o erro com nome — fica em
todos os treinos. Com a casa acesa ele **reconhece** a resposta; sem ela, ele **busca** — e é buscar que
fixa.

Teto, no mesmo fôlego: **um alvo por nó**, e se um passo precisa de mais de três desenhos o problema é a
fala, que tem duas ideias.

**Voz:** fala ≤ 200 caracteres, frase ≤ 20 palavras, uma ideia por fala, palavras proibidas da
`VOZ-DO-CURSO §3`. É aviso, não trava — mas a aula boa não tem aviso.

**Símbolos:** o `!`, `?`, `$n` que a fonte deu a um lance fica. Acrescentar é permitido; tirar é decisão
do Doug (`AGENTS.md`).

## 1.2 Duas opções, um capítulo só — e a fita volta (18/9/2026)

**Regra global do Doug, e ela revoga o "Comparação vira capítulo" que este documento mandava fazer até
18/9/2026.** Vale para toda aula de finais, nova ou republicada.

**Quando a aula mostra duas escolhas a partir da mesma posição — "se a dama for para f6, afoga; agora
veja o que devia ter feito" —, as duas ficam na MESMA etapa.** Nunca uma etapa nova, nunca um capítulo
novo, nunca um item novo no menu "Etapas".

**E a passagem de uma para a outra é um rewind.** O tabuleiro **desfaz os lances para trás**, mais
rápido do que os fez, até o ponto onde a linha se abriu; só então joga a opção 2. Automático, no fim da
opção 1 — sem botão e sem clique do aluno.

**Por quê.** O capítulo novo faz a opção 2 parecer assunto novo, e o aluno perde justamente o que a
comparação ensina: que as duas saem da **mesma** posição. O corte seco de volta tem o mesmo defeito —
parece outra posição, e não a mesma voltando. A fita rebobinando é o que diz "é aqui que você escolheu".

**Onde isso mora no código.** `lib/editor-v2/importar-estudo.ts` criava um `CapituloV2` com o título
`Comparação: <lance>` por variante; era ele que enchia o menu de etapas. A comparação passa a ser parte
da etapa da aula, e a animação de volta é do player v2. **O menu "Etapas" de uma aula não tem mais
nenhum item começando com "Comparação:"** — é assim que se confere de fora.

## 2. Fontes — a política de 17/9/2026

**Qualquer fonte serve:** estudos do Lichess (nossos ou de outras pessoas), ChessKid, livros, bases de
partidas, cursos. Três exigências ficam:

1. **a posição é legal** — o conferidor e o editor recusam a ilegal;
2. **o resultado é conferido pelo motor** (Stockfish, sem tablebase — decisão de 15/9) e **declarado
   pelo professor**. Discordância entre os dois vira nota; o Doug decide;
3. **o texto que o aluno lê é nosso, em português.** Posição é fato; o comentário de outra pessoa não se
   copia nem se traduz.

**A IA pode adaptar uma posição** — recuar um peão, trocar a vez, mover uma peça — quando: (a) registra a
mudança na nota de revisão do estudo (no relatório da aula e no `[Annotator]`/comentário de bastidor,
nunca na fala do aluno), (b) o motor reconfere o resultado, e (c) a adaptação aparece no relatório para o
Doug.

**Substitui:** `TRILHA-FINAIS.md` §14.7 regra 7 ("a IA não cria nem espelha posição") e §13 ("os PGN não
entram no repositório" — o PGN **com o nosso texto** entra, em `content/finais/estudos-aula/`; o PGN
de terceiros baixado continua fora); `SOURCE-CORPUS.md` §1 fica só com "todo texto do curso é escrito do
zero"; `HANDOFF-ASTRA-CONTEXTO.md` §7.5 ("curso pago não entra") deixa de valer para posição.

## 3. O caminho, do estudo ao ar

```bash
# 1. baixar (estudo público)
curl -s "https://lichess.org/api/study/<ID>.pgn?comments=true&variations=true&orientation=true" -o estudo.pgn

# 2. conferir com o motor: legalidade, resultado de cada posição, e cada lance ! / ??
node scripts/conferir-estudo-finais.ts estudo.pgn

# 3. reescrever na convenção acima → content/finais/estudos-aula/<ID-DA-TRILHA>.pgn
#    e conferir de novo

# 3.1 os cinco revisores, em série, corrigindo o PGN (arquiteto → scaffolding →
#     símbolos → voz → desenho). Roda sozinha ao publicar; à mão é assim:
#     /revisar-pgn-de-finais <ID-DA-TRILHA>

# 4. montar e conferir sem publicar (grava .editor/v2/<ID>.json, cria a posição da prática no acervo)
node scripts/publicar-aula-de-finais.ts <ID-DA-TRILHA> content/finais/estudos-aula/<ID>.pgn --link <url> --obra "<nome>"

# 5. publicar (só com a conferência verde); --substituir refaz um documento que já existe
node scripts/publicar-aula-de-finais.ts <ID-DA-TRILHA> content/finais/estudos-aula/<ID>.pgn --substituir --publicar
```

**Duas passadas de revisão, e elas não se substituem.** A do passo 3.1 lê o **PGN**, antes de a aula
existir, e **corrige** — cada revisor escreve na sua camada. A `/revisar-aula` lê a **tela** da aula já
publicada, com o navegador. O que a primeira não vê é a montagem; o que a segunda não vê é a decisão
didática antes de o arquivo virar aula.

Treino ou prática de empate: `[Result "1/2-1/2"]` no capítulo (ou `--empate <número do capítulo>`, só para a prática). A publicação cria
`content/aulas-v2/<ID>/`; uma v2 com o mesmo id de uma aula v1 **vence a v1** e o progresso do aluno
continua no mesmo id. Depois: portões (`typecheck`, `lint`, `test`, `validate:content`, `build`),
navegador com a conta de professor nas quatro etapas, commit, merge em `main` e push.

**Uma publicação por vez:** a conferência trava o repositório (`.editor/gate`). Reescrita em paralelo
pode; publicar, não.

## 4. Checklist de revisão (do pacote do ChatGPT, adotado em 17/9)

- [ ] **Pergunta mental** da aula: uma pergunta que o aluno se faz a cada lance.
- [ ] **Escopo:** o que a aula ensina / o que ela não deve virar / a conexão com a aula anterior e a
      seguinte / a evidência de que o aluno aprendeu (a prática testa a frase "sai sabendo").
- [ ] **Apoio decrescente** nos treinos (alvo apontado → sem ajuda → transferência).
- [ ] **Todo erro tem a variante que mostra a consequência** — na aula, como comparação; no treino, como
      erro com nome.
- [ ] **Critério de saturação:** mais um capítulo não ensina nada novo → pare.
- [ ] **Sintaxe de variantes:** parêntese fecha na mesma linha lógica; variante começa com o número do
      lance (`( 8. Qg6?? …)`, `( 13... Kd7 …)`); comentário `{ }` depois do lance; desenhos em
      `{ [%cal Ge2e4] [%csl Rd6] }`; um capítulo por `[Event]`.
- [ ] Conferidor sem erro e sem aviso não decidido; conferência do editor verde.

Ficam para depois de 18/9: a Rubrica 0–100 (precisa ser atualizada) e o teste da ponte.

## 5. Mapa: estudo → aula da trilha (18/9/2026)

| # | Id da trilha | Estudo de origem | Estado |
|---|---|---|---|
| 1 | `N0-MATING-MATERIAL` | `suMc7hgW` (ChatGPT) × v1 do site | comparação rigorosa antes |
| 2 | `N0-LADDER` | `aYNkulCR` (ChatGPT, duas torres) × v2 do site | comparação rigorosa antes |
| 3 | `N0-Q-MATE` | `hf09xMzS` | **publicada 17/9** (piloto) |
| 4 | `N0-R-MATE` | `BiRHLXMc` | |
| 5 | `N0-STALEMATE` | posições `yk2b24vS` (Silman) | aula nova |
| 6 | `N1-KING-ACTIVITY` | `wtityoKq` | |
| 7 | `N1-SQUARE` | `TI5KNg6U` | |
| 8 | `N1-DIRECT-OPPOSITION` | `aCPHORnE`; posição da fonte `yk2b24vS` | exemplo-modelo "ganha × perde" |
| 9 | `N1-KEY-SQUARES` | `T81d9Yqq` | |
| 10 | `N1-KPK` | v1 do site | continua v1 |
| 11 | `N1-KPK-RANKS` | posições `TW73iW6r` (Silman) | aula nova |
| 12 | `N1-ROOK-PAWN` | posições `yk2b24vS`/`TW73iW6r`/`ncRKe8x5` | aula nova |

A extra `EX-CAPITULO-0-3-MATE-DE-DAMA-E` foi desativada em 17/9: a aula 3 a substitui.
