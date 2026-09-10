# Modo editor — onde paramos

**Data:** 2026-09-10. **Branch:** `modo-editor`. **Bloco 1 de 6 entregue.**

Este arquivo existe para outro agente (ou outra conta) continuar de onde este
parou, sem ter a conversa na mão. O plano inteiro está em
[`MODO-EDITOR-PLANO.md`](MODO-EDITOR-PLANO.md), ao lado deste — ele foi copiado
para cá justamente porque morava fora do repositório e ia se perder na troca.

> **Leia o plano antes de escrever código.** Ele traz as dez decisões, a régua
> de uso ("leigo edita sem instrução"), o que fica fora e por quê, e a divisão
> em seis blocos. Este arquivo só diz o que já foi feito e o que mudou de rota.

---

## Como ligar o editor

```bash
echo EDITOR_LOCAL=1 >> .env.local
npm run dev            # e entrar como professor (usuário `doug`)
```

`/editor` lista as aulas. O link "Editar" aparece em `/finais` e em
`/professor`. Sem a variável — ou em build de produção, ou na Vercel — a rota
responde **404**, inclusive para o professor logado.

Trocar o PIN de qualquer conta: `node scripts/trocar-pin.ts <usuario> [pin]`.

---

## O que o Bloco 1 entregou

**Todos os portões verdes** em 2026-09-10: `typecheck`, `lint`, `npm test`
(712 testes, 40 novos), `validate:content`, `validate:mutations` (39/39
vermelhas), `build`, `repertorio:compilar --check`.

### Arquivos novos

| Arquivo | O que é |
|---|---|
| `lib/editor/local.ts` | A tranca de ambiente (`editorLigado`). Três condições. |
| `lib/editor/acesso.ts` | `exigirEditor()` — `server-only`, 404 + `professorAtual()`. |
| `lib/editor/rascunhos.ts` | A camada de disco: `baseHash`, `.tmp`+`rename`, autosave. |
| `lib/editor/fila.ts` | Fila single-flight de gravação (roda no navegador). |
| `lib/editor/gate.ts` | As duas passadas (A+B), o lock, `podePublicar`, `publicar`. |
| `lib/editor/saida-do-gate.ts` | O leitor do JSONL do gate. |
| `app/editor/acoes.ts` | As Server Actions. Nenhuma `route.ts`. |
| `app/editor/page.tsx` | O índice das aulas. |
| `app/editor/finais/[aula]/page.tsx` | O palco do editor. |
| `components/editor/Editor.tsx` | A casca: status, Conferir, Publicar. |
| `components/editor/Lapis.tsx` | O lapisinho (texto inline). |
| `components/editor/ListaDeDiagramas.tsx` | A coluna de miniaturas. |
| `components/editor/Miniatura.tsx` | Tabuleiro de selo, em glifos Unicode. |
| `scripts/trocar-pin.ts` | Dá PIN novo a conta que já existe. |

### Arquivos tocados

- `scripts/validate-content.ts` — ganhou `--jsonl` (aditivo, ver abaixo).
- `lib/lesson/schema.ts` — ganhou `professor?: { adaptouEm, nota? }`.
- `lib/finais/conteudo.ts` — `pacoteDaAula(lesson)` extraída de `lerPacote`.
- `components/lesson/LessonPlayer.tsx` — `startAt.passo`, `startAt.pausado`,
  `aoAndar`, e o objeto `edicao` (render-props do lápis).
- `components/lesson/IntroStage.tsx`, `ObjectiveStage.tsx` — `passoInicial`,
  `pausadoInicial`, `edicaoDaFala`, `edicaoDaTecnica`.
- `app/finais/page.tsx`, `app/professor/page.tsx` — links "Editar".
- `.gitignore` (`.editor/`), `.env.example`, `README.md`.

### A medida do bloco, cumprida

Fala da N1-KPK trocada pelo editor → conferir (A+B) → publicar. O
`git diff content/` mostrou **1 linha de fala + as 3 linhas do carimbo**, e nada
mais nas outras 543. Passada A verde, passada B verde, 38 posições de tablebase,
**0 pela rede**. Conferência A+B em **0,6 s**; publicação em 0,3 s. (O gate
inteiro roda hoje em 0,28 s — são 3 aulas; isso cresce quando as 49 chegarem.)

Cobertos por teste: duas gravações concorrentes → a mais nova vence; JSON
alterado por fora → recusa com "mudou fora do editor"; processo morto entre o
`.tmp` e o `rename` → o arquivo anterior está inteiro.

---

## Três decisões que **não** estão no plano

Quem continuar precisa saber destas, porque contrariam o que o plano supunha.

### 1. O Zod é juiz, nunca escritor

`lessonSchema.parse()` devolve as chaves **na ordem do schema**, não na ordem do
arquivo. Se o editor salvasse o objeto que o Zod devolve, mudar uma fala
reescreveria as 547 linhas da N1-KPK e o `git diff` deixaria de dizer o que o
professor mudou — que é a medida do bloco.

Por isso a verdade na tela é `cru`: o JSON **cru**, com a ordem de chaves do
arquivo, editado por espalhamento (`{...obj, campo: novo}`, que preserva a
posição de chave existente). O Zod entra só para julgar e para montar o objeto
que o player usa. **Todo bloco seguinte tem de manter isso.**

### 2. `--jsonl` é aditivo, e tem de continuar sendo

`scripts/mutation-check.ts` (linhas 1021-1036) junta stdout e stderr do gate e
procura o formato humano de duas linhas (`✖ [CODIGO] onde` + a mensagem). Se o
`--jsonl` suprimisse a saída humana, as 39 mutações quebrariam. Então os eventos
JSON saem **junto** com o texto, e `lib/editor/saida-do-gate.ts` ignora toda
linha que não seja um objeto JSON com `tipo`.

O `fail()` do gate não tem campo `aula`: a identificação vive dentro da string
`onde`, em cinco formatos. `aulaDoOnde` e `diagramaDoOnde` extraem por padrão,
com teste — em vez de tocar em ~60 pontos de chamada dentro do gate.

### 3. `server-only` ficou fora da camada de disco

O pacote `server-only` só é vazio sob a condição `react-server`, e
`npm test` (`node --test`) roda sem ela. Pôr o marcador em
`lib/editor/rascunhos.ts` trocaria os testes de concorrência e de interrupção
por nenhum teste. Ele mora em `lib/editor/acesso.ts`, por onde toda página e
toda ação passam; e `rascunhos.ts` importa `node:fs`, que é parede própria num
pacote de navegador.

### Um desvio menor

O plano punha o índice `/editor` no Bloco 3. Ele foi feito agora, na forma
mínima (lista as aulas, sem o menu "+ Nova aula"), porque **a N1-KPK não aparece
na bancada de `/finais`** — a bancada só lista o que o aluno *não* enxerga, e a
N1-KPK é publicada e aberta. Sem o índice, a medida do bloco não teria porta de
entrada. O menu "+ Nova aula" continua sendo do Bloco 3.

---

## O que ficou pendente do Bloco 1

Nada disto é código faltando; é verificação que não foi feita.

1. **A rodada de navegador.** Faltava o login de professor quando o bloco
   fechou. Falta confirmar na tela: `/editor/finais/N1-KPK` = 404 em
   `next build && next start`; = 404 em `next dev` sem `EDITOR_LOCAL`; e a
   **largura do palco com a lista de diagramas a 1366×768**. O mecanismo dos
   404 está coberto por `lib/editor/local.test.ts` e por leitura de
   `exigirEditor()`, mas ninguém viu na tela.
2. **A medida de uso** — uma pessoa que nunca viu a tela muda uma fala sem
   instrução. Tempo **e** hesitações. É do Doug, não de um agente.
3. **A miniatura usa glifos Unicode**, não as peças do cburnett. Alcançar as
   peças de verdade exigiria fingir a estrutura do chessground em volta de cada
   casa. A troca é local a `components/editor/Miniatura.tsx`.

---

## O próximo passo

**Bloco 2 — flechas, casas, lances, diagramas e a barra de avaliação.** O plano
o descreve na seção "Blocos entregáveis". Três coisas levantadas nesta rodada
que economizam tempo lá:

- **`autoriaDoDesenho` não existe.** `lib/chess/annotations.ts:57` tem só o
  caminho de ida (`desenhoDaAutoria`). O alvo da volta é `desenhoSchema`
  (`lib/lesson/schema.ts:490`), que é `.min(1).optional()`: **lista vazia é
  inválida** — a ausência se escreve omitindo o campo, nunca com `[]`.
- **Ligar `desenhavel` ou `montagem` exige `key` no `ChessBoard`.** As duas são
  lidas uma vez, com `useState(() => …)` (`ChessBoard.tsx:245` e `:247`), porque
  o chessground decide na criação. Um botão "modo desenho" que só troca a prop
  não vai funcionar.
- **O motor do aluno é um singleton com um pedido em voo**, e
  `bestMove`/`analyse` cancelam o que houver (`lib/engine/stockfish.ts:96-99`).
  A barra de avaliação **precisa** de um worker próprio, senão ela cancela o
  lance do computador na etapa de prática. O corte natural é envolver as linhas
  60-486 numa função `criarMotor(build)`.

---

## Onde cada coisa é escrita

| O quê | Onde | Versionado? |
|---|---|---|
| Rascunho de aula | `content/rascunhos/lessons/<ID>.json` | **sim** — é o que o gate julga |
| Estado do editor (autosave, conferências, lock) | `.editor/` | não (`.gitignore`) |
| Aula publicada | `content/lessons/` | sim — **só o gate escreve ali**, por `--aplicar` |

O editor **nunca** escreve em `content/lessons/`. Quem escreve é
`validate-content.ts --rascunhos --aplicar`, por cópia de bytes, e só quando a
rodada inteira fica verde.

---

## Os portões, antes de qualquer commit

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run validate:content
npm run validate:mutations
npm run repertorio:compilar -- --check
```
