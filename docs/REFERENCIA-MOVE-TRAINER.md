# O Move Trainer do chess.com, medido

Referência de 6/9/2026. Curso *Short & Sweet: Plichta's Accelerated Dragon*,
modo Aprender, linha #1, do início ao fim, com erro proposital em cada fase,
lendo o DOM e o tráfego de rede.

Este arquivo é o **anexo do plano** que refez o treinador de repertório no
molde daqui. O que o nosso projeto decidiu copiar, adaptar e recusar está em
`REPERTORIO.md` §9; aqui está só o que foi medido, para que a decisão de
amanhã não precise abrir o site de novo.

> **As capturas não entram no repositório.** Elas mostram a prosa do Plichta, e
> a §5 do `REPERTORIO.md` já decidiu que texto de curso pago não entra em
> repositório público. Aqui está a *estrutura*, com números — nenhuma frase do
> autor foi copiada. As 9 imagens ficaram no scratchpad da sessão.

## A1 — O ciclo são duas fases, na mesma sessão

**Fase 1, assistida.** O painel escreve o lance por extenso (`Jogue c5`) e o
tabuleiro desenha uma seta azul animada da origem ao destino. O aluno
**executa**. Acertou: selo verde na casa de destino e `Correto!`. Se o lance tem
comentário, o painel troca para `Leia os comentários do autor / Continuar quando
estiver pronto` e **trava** — o comentário entra embutido na transcrição, logo
abaixo do lance, e só o clique (ou Espaço) libera. A resposta do adversário entra
sozinha, com o comentário dela também.

**A emenda**, sem trocar de rota: `Muito bom! / Agora tente jogar os lances de
memória.` + botão `Começar Quiz`.

**Fase 2, de memória.** O painel vira `Jogue o lance correto` e **a transcrição
inteira desaparece**. Some a seta, some o nome do lance, some o texto. Restam o
tabuleiro e um botão `Dica`. No quiz, acerto **não** pausa para comentário — só
erro pausa.

## A2 — Três vereditos, e os três vêm dos dados

Cada lance do aluno carrega no JSON uma lista `alternativeMoves` com SAN e FEN.
Medido na linha #1: `2...Nc6 → d6, e6, g6`; `5...Nf6 → Bg7`;
`6...Bg7 → Qc7, d5, d6`.

| lance jogado | painel | selo | o que acontece |
|---|---|---|---|
| o do livro | `Correto!` | verde, `best` | segue |
| ∈ `alternativeMoves` | `Alternativa` — "X é um lance alternativo" | bege, `deviation` | peça volta, sem punição |
| qualquer outro | `Incorreto` | vermelho, `incorrect` | peça volta |

O selo é um disco de ~18 px no **centro da casa de destino** e dura menos de um
segundo (por isso não aparece nas capturas; foi lido no DOM, `div.effect` com
`<g id="best|deviation|incorrect">`). O cartão de comando **não muda de cor**
entre os três estados.

É quase o nosso par `alternativas`/`errosNomeados`. A diferença é de tom: o que
chamamos de erro nomeado, ele chama de *alternativa*, e não pune.

## A3 — O erro ensina, e depois volta

No quiz, errar **revela**: a transcrição reabre mostrando o lance certo **com o
comentário do autor**, e um botão `Próximo` (Espaço). Depois, a linha é repetida
inteira, rotulada `Erro Anterior`. No payload:
`reviewFailedBehavior: COURSE_REVIEW_FAILED_BEHAVIOR_MOVE_TO_NEXT_CYCLE`.

## A4 — A dica é pedida, não concedida

Botão `Dica` na fase 2. Acende **só a casa de origem**, sem seta, e **não
escalona**: pedir de novo não dá mais nada.

## A5 — O fim da linha, e o boletim lance a lance

Sobre o tabuleiro escurecido a ~77%: ilustração animada (asset Rive), título
`Ótimo Trabalho!`, subtítulo `Você está no caminho da maestria!`.

Entre a ilustração e o título: **uma fita com um selo por lance seu** — 8
quadradinhos de 20 px com canto arredondado, passo de 32 px. Verde `#81b64c`
com ✓; cinza `#b0b0ab` com ✗. Mostra *onde* a linha quebrou, não só quantas
vezes. A sessão fecha gravando `accuracy` (medido: `0.615`, 8 de 13).

## A6 — A maestria são oito sessões espaçadas

Painel `Maestria`: `Nível 1: Primeiro a Mover` (os níveis têm nome), barra
segmentada de **8** com o primeiro em teal `#26c2a3`, `Próxima Prática: 1 dia`
num chip, `Aprendido pela primeira vez`, `Última Prática`, e a linha principal em
PGN. A ajuda, sob o título **Repetições Espaçadas**: *complete 8 sessões de
prática para dominar uma linha*. No payload:
`scheduleType: COURSE_SCHEDULE_TYPE_SPACED_REPETITION`.

## A7 — O que a API entrega

`GetCourseTrainingForLearning`:

    lesson.variation   id, name, moveCount, learnerColor, startingPosition.fen,
                       previewPosition.fen, chapterId, type
    lesson.plies[]     id, moveNumber, san, color, position.fen,
                       isLearnable, postComment, alternativeMoves[]
    lesson.settings    assistedQuiz: true
                       assistedQuizPauseToRead: true
                       scheduleType: SPACED_REPETITION
                       repetitionAmount: 1
                       reviewType: LEARNED_ORDER
                       reviewFailedBehavior: MOVE_TO_NEXT_CYCLE
                       quizTimeLimit: true / timer: 60
                       autoNext: false
                       learnType: ALL

`type: INFORMATIONAL` é uma "linha" de 0 lances, só texto. Ele grava **um
`StoreCourseTrainingProgress` por lance** e um `FinalizeCourseTraining` no fim.

## A8 — Geometria e paleta

Grade em 1440 px, sem sobra: `170 + 12 + 768 + 32 + 442 + 16`. Tabuleiro de
**768 px**, casa de **96 px**, dimensionado pela altura. Painel de **442 px**,
coluna útil de 410. Alturas de **48 px** para cabeçalho, linha de capítulo e
botões; **16 px** para as barras de progresso.

Três superfícies em profundidade crescente — página `#302e2b`, painel `#262522`,
cabeçalho e rodapé `#21201d`. Tema escuro, paleta marrom-acinzentada.

**O cartão de comando é o único branco da tela.** 410×64 px, raio 8, `#ffffff`
puro, tinta `#312e2b`, ilustração colorida de 32 px à esquerda, duas linhas de
texto — a primeira negrito (o comando), a segunda regular (o estado).

Cores com papel único: `#81b64c` verde para estado positivo e ação primária;
`#26c2a3` teal para maestria; `#46c2fd` a 62% para a seta de dica;
`#f5f682`/`#b9ca43` para o último lance. A seta tem haste de **23% da casa** e
ponta com base de ~2,2× a haste.

**Nada é monoespaçado**, nem os lances: o SAN se distingue por **negrito**, e o
lance corrente por uma pílula `#454441` de raio 3 px. A transcrição do modo
Aprender **não é tabela**: é prosa corrida, onde o par de lances (`6. Bd3 Bg7`)
é um parágrafo curto entre os parágrafos do autor, largura cheia, sem
indentação, entrelinha de 24 px.

## A9 — O índice é uma trilha

Gaveta de 331 px por cima do painel. Cabeçalho com nome do curso, contador
`2/34` e anel de progresso. Cada linha, passo de 65 px: barra verde de 4 px
marca a atual; tile de 40 px com ícone; título; contador `8 lances`; e um fio
vertical de 2 px por toda a lista, com um nó por linha — disco com ✓ quando
feita, anel oco quando pendente. *(Não copiado: ver "O que NÃO entra".)*

## A10 — O que já tínhamos, e o que faltava

| | nosso (antes deste plano) | chess.com |
|---|---|---|
| primeira vez | modo "ver", só olhar | passada **assistida**: joga, com o lance dito e a seta |
| depois | cobra direto | quiz **emendado na mesma sessão** |
| dica | automática por acúmulo | **sob demanda**, um nível |
| erro | volta a peça, o primeiro decide | **revela** lance + comentário, repete a linha |
| desvio previsto | `errosNomeados` | `alternativeMoves`, tratado como "Alternativa" |
| comentário | ao lado | **trava o fluxo**, embutido |
| fim | bolinhas de acertos seguidos | **boletim lance a lance** + acurácia |
| maestria | 3 passadas limpas, sem intervalo | **8 sessões espaçadas**, com data |
| gravação | uma por linha | uma por lance |
