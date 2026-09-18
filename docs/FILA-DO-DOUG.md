# Fila do Doug — o que ele quer fazer e ainda não foi feito

**Este arquivo existe para o Doug não precisar repetir a ideia, e para o agente não precisar
redescobrir.** Cada item traz o que é, por que ele quis, onde mexe, e o que já está pronto para
quem for fazer. Item que for feito sai daqui e vira seção no `MODO-EDITOR-ONDE-PARAMOS.md`.

Ordem: o de cima é o que o Doug quer primeiro, não o mais urgente.

---

## 1. Republicar as 11 aulas de finais com o rewind — **o código está feito (18/9/2026)**

A montagem e a fita foram feitas e commitadas em 18/9/2026 (`088bbd1`): a variante toca dentro do
capítulo e a fita volta até a escolha. A história e os números estão no `MODO-EDITOR-ONDE-PARAMOS.md`, em
"O rewind das comparações". Desde a mesma data, a regra vale também para as aulas de abertura (`AGENTS.md`,
"Aula de abertura é direta"), que já foram republicadas.

**O que falta:** republicar as 11 aulas de finais (`node scripts/publicar-aula-de-finais.ts <ID> <estudo.pgn>
--publicar`), medir no navegador e o Doug olhar a velocidade da fita (`RECUO` em `lib/lesson/roteiro.ts`).
**Critério de aceite:** o menu "Etapas" de nenhuma aula de finais tem item começando com `Comparação:`.

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
