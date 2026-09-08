# Meio-jogo — onde paramos

Estado em **2026-09-08**, madrugada. Branch `meio-jogo-livros`. Plano executado:
`~/.claude/plans/reformula-o-completa-do-m-dulo-ticklish-shell.md`.

## O número, em uma linha

**O motor está pronto e verde; o conteúdo tem 1 capítulo de 6 transcrito e 0
aulas publicadas.** 566 testes verdes, gate verde, lint limpo, `npm run build`
passa. 17.036 linhas do módulo antigo apagadas.

## O que está feito

### P0 — as obras e o mapa

- As **seis obras da série do Yusupov** em `content/sources.json`, com
  `serie: "yusupov"` e `volume`. Os PDFs estão em `biblioteca/`, com o nome
  igual ao slug.
- O `_leia` do registro e a **§2.3 do `docs/SOURCE-CORPUS.md`** dizem, com todas
  as letras, o que a decisão de 7/9 troca: no meio-jogo **não há teto de
  citação**, e por isso **o módulo não pode ser comercializado** com estas obras
  dentro. Está escrito em três lugares porque é a coisa que se esquece.
- **`docs/MEIO-JOGO-YUSUPOV-MAPA.md`**: as três faixas de página (teoria,
  exercícios, soluções) dos seis capítulos do volume 1, e a régua de aprovação
  de cada um. Medido contando palavras e diagramas por página, não a olho.
  **72 exercícios localizados.**

### P1 — o motor

Tudo verde e no lugar:

| peça | onde |
|---|---|
| `expectedResult: "open"` (posição que não afirma resultado) | `lib/lesson/schema.ts` |
| id de aula `M<vol><cap>`, com `moduloDaAula`/`volumeDaAula`/`capituloDaAula` | idem |
| etapa `exercises`, reusando `treeNodeSchema` de um nível só | idem |
| exemplo de 4 → 12 cenas (a teoria de um capítulo entra inteira) | idem |
| `authorAlternatives[].pontos` — o crédito parcial do livro | idem |
| `ExerciseState`, `cleared.exercises`, sete ações | `lib/lesson/store.ts` |
| `ExerciseStage.tsx` — uma pergunta por posição, régua na tela | `components/lesson/` |
| ramo no player + link de volta pelo prefixo do id | `LessonPlayer.tsx` |
| gravação (`judgeMove` no servidor, nunca o `acertou` do cliente) | `lib/meiojogo/gravar.ts` |
| nota pela régua do livro, só a primeira resposta de cada item | `lib/meiojogo/progresso.ts` |
| rotas `/meio-jogo` e `/meio-jogo/[aula]` (estática) | `app/meio-jogo/` |
| recortador de diagramas | `scripts/recortar-diagramas.py` |
| conferidor de transcrição | `scripts/conferir-transcricao.ts` |

**O risco do `CHECK` está eliminado, medido contra produção:**
`tentativa_meiojogo.dica` e `.item` são `text` sem restrição de formato. **A
migration 0007 não é necessária.** As três restrições de valor (`habilidade`,
`nivel_evidencia`, `apoio`) aceitam o que o módulo novo grava.

### P2 — a troca

38 arquivos do módulo antigo apagados, o novo ligado no lugar: mapa, trilha,
painel, tarefas, professor, gate e `package.json`.

### F — a transcrição

**1 capítulo de 6.** `content/transcricao/M103.json` (capítulo 3, "Basic opening
principles"): 21 posições, **0 replicação ilegal**, a conta do livro fecha em
31, e o Stockfish não levantou um aviso sobre os doze lances principais.

O piloto valeu por si: ele achou que **o recortador numerava os diagramas por
linha e o Yusupov numera por coluna** — `p38-d2` era o Ex. 3-4. O estrago seria
mudo (as posições trocadas são todas legais e replicam todas). Corrigido e
confirmado por medição própria em três capítulos.

## O que falta, em ordem

### 1. As cinco transcrições que morreram

**Os capítulos 6, 8, 13, 14 e 20 do volume 1 não foram transcritos.** Os cinco
subagentes morreram juntos no **limite de sessão da conta**, que reseta às 4h
(horário de Brasília). Nada se perdeu: o capítulo 3 está commitado, e a receita
corrigida está em `docs/MEIO-JOGO-TRANSCRICAO.md`.

Para retomar, um subagente por capítulo, com este prompt (trocando os números):

> Transcreva o capítulo N do volume 1. Leia antes, na íntegra:
> `docs/MEIO-JOGO-TRANSCRICAO.md` (os pontos marcados **[piloto]** são os que
> produzem erro silencioso), `docs/MEIO-JOGO-YUSUPOV-MAPA.md`, e
> `content/transcricao/M103.json` como modelo. PDF:
> `biblioteca/yusupov-build-up-1.pdf`. Escreva `content/transcricao/M1NN.json` e
> deixe verde `node scripts/conferir-transcricao.ts M1NN --motor`.

As páginas e réguas de cada um estão no mapa. Dois deles precisam ler o
**máximo** da imagem: o cap. 13 (p. 138) e o cap. 14 (p. 148) — a linha não
sobreviveu ao extrator de texto.

### 2. A prosa (P2/P3 do plano) — o gargalo serial

Nenhuma aula `content/lessons/M*.json` existe ainda. Por capítulo é preciso
escrever à mão, em português: o objetivo (2 a 5 regras), o texto de cada passo
do exemplo, e o feedback e a dica de cada exercício. As posições, os lances e os
pontos são do livro; a prosa é nossa.

**Só os seis primeiros exercícios de cada capítulo chegam ao aluno** — decisão
do Doug em 8/9, porque doze é lista de casa de adulto e o aluno tem de 11 a 15
anos. São os seis da primeira página impressa, na ordem do autor. A nota de
corte é derivada: soma dos pontos ganháveis dos seis, vezes a proporção que o
autor usa no capítulo (`minimo / maximo`, sempre perto de 48% no volume 1).

### 3. As três dívidas com endereço

- **A tarefa da semana do piloto.** As quatro tarefas de meio-jogo de
  `content/tarefas.json` estão em `marcar`. O teste
  `lib/tarefas/tarefas.test.ts` **volta a cobrar a tarefa medida no minuto em
  que a primeira aula for publicada** — a dívida tem gatilho, não é um item de
  documento. Converter para `tipo: "meiojogo"` com `aulas: [...]` e
  `meta.concluir`.
- **Os dois scripts de prova.** `verificar-meiojogo.ts` (gravação contra
  produção) e `conferir-treino.ts` (Playwright a 360 px) foram **apagados**, e
  não adaptados: eles provam o módulo que acabou, e refazê-los contra conteúdo
  inexistente seria escrever 700 linhas que não dá para rodar. Voltam no P4,
  junto com as entradas `db:meiojogo` e `meiojogo:tela` do `package.json`.
- **As 220 linhas antigas.** `tentativa_meiojogo` tem 220 linhas do módulo
  anterior, com ids `m1`…`m30`. Não colidem com os novos e a nota não se
  contamina — `progresso.ts` simplesmente não acha aula com aquele id. Mas os
  **minutos** do painel somam as duas eras. Apagá-las é decisão do Doug; nada
  foi tocado em produção.

### 4. Os volumes 2 a 6 (P5–P8)

29 capítulos de conceito e ataque, nos volumes 2 a 6. O Tesseract foi instalado
para os volumes 2 e 4, que não têm camada de texto. O pipeline é o mesmo.

## Duas coisas para o Doug decidir

1. **Disco em 96%** (5,4 GB livres). As cópias dos seis PDFs para a `biblioteca/`
   usaram 236 MB. Os originais na pasta do Desktop são duplicatas exatas e podem
   ser apagados.
2. **Seis exercícios por aula** foi confirmado, contra os 5 que o Doug propôs: a
   diferença de carga é um exercício, e levar a primeira página impressa inteira
   mantém a curadoria com o autor — que é justamente o que a versão anterior do
   módulo errou. Se preferir 5 mesmo, é uma linha de mudança, e tem de ser dita
   **antes** da prosa.
