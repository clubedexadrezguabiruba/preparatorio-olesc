# Fila do Doug — o que ele quer fazer e ainda não foi feito

**Este arquivo existe para o Doug não precisar repetir a ideia, e para o agente não precisar
redescobrir.** Cada item traz o que é, por que ele quis, onde mexe, e o que já está pronto para
quem for fazer. Item que for feito sai daqui e vira seção no `MODO-EDITOR-ONDE-PARAMOS.md`.

Ordem: o de cima é o que o Doug quer primeiro, não o mais urgente.

---

## 1. O rewind das comparações — **adiado pelo Doug em 18/9/2026**

**O Doug decidiu fazer, e decidiu não fazer agora:** "quero fazer esse plano, mas não sei se vai dar
tempo até amanhã; tenho outra prioridade." Nada de código foi escrito. A **regra** já vale.

**O que é.** Quando a aula mostra duas escolhas da mesma posição — "se a dama for para f6, afoga;
agora veja o que devia ter feito" —, as duas ficam na **mesma etapa**, e a passagem de uma para a
outra é um **rewind**: o tabuleiro desfaz os lances para trás, mais rápido do que os fez, até o ponto
onde a linha se abriu, e só então joga a opção 2. **Automático**, no fim da opção 1 — sem botão e sem
clique do aluno. Nas palavras dele: *"como se estivesse recapitulando, rewind the tape."*

**Por quê.** O capítulo novo faz a opção 2 parecer assunto novo, e o aluno perde justamente o que a
comparação ensina: que as duas saem da **mesma** posição. O corte seco de volta tem o mesmo defeito —
parece outra posição, não a mesma voltando.

**Onde a regra já está escrita** (não reescreva, leia): `AGENTS.md`, seção "Duas opções ficam no mesmo
capítulo, e a fita volta"; `docs/COMO-FAZER-UMA-AULA-DE-FINAIS.md` §1.2, que **revoga** o "a variante
vira capítulo de comparação sozinha" do §1; `docs/MODO-EDITOR-ONDE-PARAMOS.md`, seção "O Doug olhou as
11 aulas na tela — 18/9/2026".

**Duas pontas, e são independentes:**

| Ponta | Onde | O que há hoje |
|---|---|---|
| **a montagem** | `lib/editor-v2/importar-estudo.ts`, ~linha 296-302 | cria um `CapituloV2` com título `Comparação: <lance>` por variante com símbolo ou comentário. É ele que enche o menu "Etapas" |
| **a animação** | o player v2 da etapa de aula | não existe controle de lance a lance: os botões são "Pausar", "Ver de novo", "Ver a técnica →", "Ver o professor de perto". O rewind é código novo |

**Testes que hoje EXIGEM o comportamento antigo** e mudam junto — não se contornam:
`lib/editor-v2/importar-estudo.test.ts:96` e `:179`, `lib/editor-v2/mudar-modo.test.ts:106`.

**O tamanho: 45 etapas "Comparação" nas 11 aulas de finais** — N1-DIRECT-OPPOSITION 8, N1-ROOK-PAWN 6,
N0-LADDER 5, N0-STALEMATE 5, N0-R-MATE 4, N1-KING-ACTIVITY 4, N1-KPK-RANKS 4, N1-KEY-SQUARES 3,
N1-SQUARE 3, N0-Q-MATE 2, N0-MATING-MATERIAL 1.

**Nenhum PGN precisa ser reescrito.** As variantes **já** estão dentro do capítulo, em `( … )`.
Consertando a montagem, as 11 aulas se arrumam sozinhas ao republicar.

**Critério de aceite, conferível de fora:** o menu "Etapas" de qualquer aula de finais não pode ter
nenhum item começando com `Comparação:`. Em 18/9 a `N1-SQUARE` tinha três (`Comparação: 1. Rg2?`,
`Comparação: 1... Rf5?`, `Comparação: 1. a3?`).

**Ferramentas que já existem, não refaça:** `node .claude/skills/aluno-de-ensaio/aluno.mjs <ID>` joga a
aula errando de propósito; `.editor/sondar.mjs` amostra o tabuleiro **ao longo** da animação e imprime
casa, cor e fala (medir só no fim não serve — no fim a etapa já apagou tudo e sobra o `last-move`).
O menu "Etapas" é `nav[aria-label] li button`, sem `role="menuitem"`. O chessground desenha `[%csl]`
como `<circle>` no SVG e `[%cal]` como `<line>`; `<circle>` dentro de `<defs>` é ponta de seta.

**Recomendação de motor, feita ao Doug em 18/9:** é abertura de tarefa grande — mexe na montagem e na
animação, e errar custa republicar as 11. Vale abrir em Fable, e em plan mode.

---

## 2. Oito mates sem o vermelho no rei — decisão pendente

O Doug decidiu em 18/9 que **o rei que tomou o mate fica em vermelho** (é "aqui está o mate", não
"perigo"), e mandou devolver o `Rg8` que um revisor apagara na `N0-R-MATE`. Feito. Mas **oito mates
das três aulas continuam sem marca nenhuma**, e pôr vermelho neles é autoria, não restauração:

| Aula | Capítulo | Mate | Marca hoje |
|---|---|---|---|
| N0-Q-MATE | `02 - AULA - Do começo ao mate` | `Dg7#` | só a seta verde `Gf6g7` |
| N0-R-MATE | `07 - TREINO 3 - Do outro lado, até o mate` | `Tg8#` | só a seta verde `Gg8a8` |
| N0-LADDER | treinos 2, 3 e 4 | `Th7#`, `Th8#`, `Th8#` | nenhuma |
| N0-Q-MATE | treino 3 e dois finais do treino 4 | `Dg7#`, `Dh3#`, `Dh4#` | nenhuma |

**A pergunta para o Doug:** ponho o vermelho nos oito, ou o vermelho do mate só vale nos capítulos de
AULA e não nos treinos?

---

## 3. Os avisos da régua de desenho — 75 nas 11 aulas

Quase todos são de **fala**, não de desenho: o tabuleiro acende uma casa e o texto não diz o nome
dela (`CASA_ACESA_SEM_CITACAO`). O conserto é reescrever fala, **e o Doug ainda não pediu isso**.

Um deles nasceu em 18/9 e tem conserto de uma frase: na `N0-R-MATE`, `03 - AULA - O mate na borda`, a
fala do mate é *"Mate! A torre ataca a 8ª fileira, e o seu rei cobre f7, g7 e h7"* e **não nomeia
`g8`**, que é a casa do rei preto que acabou de ficar vermelha. Bastaria "o rei preto em g8 não tem
casa" — mas é mudança de fala, e fala é do professor.
