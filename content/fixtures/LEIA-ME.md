# `content/fixtures/` — o conteúdo que existe só para o gate se testar

Estas aulas e posições **não são do curso**. Elas existem para o
`npm run validate:mutations` provar que as regras da FN1/B2 ficam vermelhas
quando o conteúdo mente — regras que nenhuma aula publicada exercita ainda,
porque as aulas de empate e de promoção só chegam na FN2.

**Nada aqui é varrido por ninguém.** A pasta é irmã de `lessons/` e de
`positions/`, e não filha: o gate lê `content/lessons` e `content/positions`, o
site lê as mesmas duas por `lib/finais/conteudo.ts`, e nenhum dos dois desce
aqui. Quem instala estes arquivos numa cópia de trabalho é o
`scripts/mutation-check.ts`, e só ele.

| arquivo | para que serve |
|---|---|
| `lessons/N1-FIXTURE-KRK.json` | a árvore de 20 nós do mate de torre, onde o defensor **tem** escolhas que custam muitos lances de diferença — é ela que dá sujeito ao `DEFENSOR_FROUXO`. **Ela não tem `stages.objective` de propósito** (ver abaixo) |
| `lessons/N1-FIXTURE-EMPATE.json` | árvore de `goal: "draw"` que acaba em `ends: "draw-secured"` — o aluno segura a oposição em rei e peão |
| `lessons/N1-FIXTURE-PROMOCAO.json` | árvore de `goal: "win"` de **7 peças** que acaba em `ends: "promotion"` (`e7e8q`) — e sem DTM na tablebase, que é o que a régua dos 40 lances precisa recusar |
| `positions/*.json` | as duas posições, `status: "fixture"` (sintéticas: §12.5 do currículo proíbe promovê-las a conteúdo) |
| `tablebase-cache/` | as respostas da tablebase que estas duas aulas consomem, para o teste de mutações rodar sem rede como o gate |

As posições foram conferidas contra a tablebase Syzygy em 2026-09-05, e as
FENs estão registradas em cada arquivo de cache.

## A `N1-FIXTURE-KRK` não tem aula, e é de propósito

Desde 2026-09-09 a etapa 3 é **derivada** da etapa 2: apague `stages.guided`,
rode `--write`, e ele volta byte por byte (ver `guidedStageSchema`). Uma fixture
com aula teria de ter um roteiro de 39 meios-lances para justificar os 20 nós
que ela existe para ter — e o roteiro dela sempre foi um toco de quatro passos,
escrito quando a coerência entre as duas etapas ainda era só um teste.

Tirar o `objective` é dizer a verdade sobre o arquivo: ele não é uma aula, é uma
árvore. Sem roteiro não há de onde derivar, e o gate a deixa em paz — é a
exceção declarada de que fala o cabeçalho de `derivarEtapa3` em
`scripts/validate-content.ts`.

A `N1-FIXTURE-EMPATE` foi pelo caminho contrário: o roteiro dela **já** era a
linha da árvore, e ela ganhou os blocos `treino` como qualquer aula do curso.
