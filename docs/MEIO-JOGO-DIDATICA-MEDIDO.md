# Meio-jogo — o que foi medido antes do plano de reestruturação didática

> Escrito em 2026-09-07, no fim da sessão que trocou as 30 posições compostas por
> 30 posições de livro (commit `dca2584`, branch `meio-jogo-livros`).
> **Este documento não é o plano.** É o que já foi medido, para que a próxima
> sessão comece pela decisão e não pela varredura.

---

## 1. A pergunta do Doug, em quatro partes

1. A forma como o módulo **apresenta** a dica ao aluno é a mais pedagógica possível?
2. A forma como ele **avalia** o aluno é a mais pedagógica possível?
3. Não deveria haver **exercícios com diagrama** sobre o mesmo conceito, para o
   aluno se testar, além do quiz único?
4. É difícil obter esses diagramas de **fonte confiável**?
5. O texto embaixo do tabuleiro — que obriga a rolar a tela — é a melhor opção?

A pergunta 4 já tem resposta medida, e é **não**. Ver §4.

---

## 2. O estado de hoje, em uma tela

Trinta dicas, `m1`–`m30`, em quatro níveis (8/8/8/6). Cada dica tem: título,
resumo de uma frase, **uma** posição com legenda e proveniência, 1–3 parágrafos
de explicação, um "o que procurar", um "cuidado" opcional (25 das 30 têm),
**um** quiz de três opções, e um vídeo.

A ordem na tela é: título → resumo → **diagrama** → legenda → **proveniência em
letra miúda** → explicação → "o que procurar" → cuidado → quiz → vídeo → caixa "li".

O que fica gravado no banco é **só a caixa "li"** (tabela `dica_lida`: aluno,
dica, lida_em). A resposta do quiz **não é gravada**, por decisão declarada em
`app/meio-jogo/Quiz.tsx`: o gabarito é opinião da autoria, e um percentual de
acerto sobre opinião entraria no relatório do professor com a mesma cara dos
números que a tablebase certificou.

---

## 3. As três medições que motivam a revisão

### 3.1 22 dos 30 quizzes são respondíveis sem olhar o tabuleiro

Medido extraindo os lances/casas da **opção correta** e procurando-os na prosa
(`resumo` + `explicacao`) da mesma dica. Quando todos aparecem, o aluno acerta
por casamento de palavra.

| resultado | dicas |
|---|---|
| **vaza** (a resposta está escrita no texto acima) | 22 |
| não vaza | 8 — m1, m4, m6, m11, m13, m18, m20, m25 |

Exemplos: em **m16** a explicação diz "Aqui é Nd4" e a opção certa é
"Nd4, ocupando a casa diante do peão". Em **m19**, "o peão preto que a alcança é
o de c7: ...c5 encosta nela", e a certa é "...c5, atacando o peão de d4".

Isto **não é erro de redação** — a explicação tem de explicar. É consequência de
haver **uma posição só** por dica, servindo ao mesmo tempo de exemplo ensinado e
de exercício. O exemplo e o teste precisam ser posições diferentes.

### 3.2 Entre o diagrama e a explicação há ~17 linhas de letra miúda

A proveniência é impressa aberta, embaixo da legenda
(`app/meio-jogo/[dica]/page.tsx`), e ficou longa depois do trabalho com os livros:

- média **765 caracteres**; mínimo 449 (m3); máximo **1409** (m16)
- a ~45 caracteres por linha num celular: **~17 linhas** de texto de 12 px entre
  o tabuleiro e o primeiro parágrafo da explicação.

O comentário no código justifica ela estar aberta ("o aluno de doze anos não vai
lê-la; o professor que abrir a dica no sábado, sim"). Essa justificativa continua
válida; o que mudou é o **tamanho**, que agora empurra a explicação para fora da
tela. É a pergunta 5 do Doug, e ela tem base medida.

### 3.3 Metade dos conceitos não tem fato medível na posição

Das 30 dicas, **15 têm ao menos uma afirmação temática** (peão isolado, coluna
aberta, posto, bloqueio…) e **15 são só julgamento** — a legenda diz apenas "há
um bispo em f1, é a vez das brancas".

São julgamento puro: **m1, m3, m4, m7, m8, m15, m17, m21, m22, m23, m24, m25,
m26, m27, m30**.

Isso limita o que uma máquina pode perguntar ao aluno sobre a posição. Mas o
limite é menor do que parece: o vocabulário já tem `lances-da-peca`, e ele
resolve pelo menos um dos casos. Exemplo medido em **m17** ("abra uma rota para a
pior peça"), contando lances legais por peça branca:

```
Bd2: 2 lances   ← a "pior peça" da dica, medida
Ra1: 2 lances
Nb3: 4 · Rd1: 4 · Nc3: 6 · Qf3: 13
```

O bispo de d2 empata com a torre de a1 em 2 lances — ou seja, o fato "esta é a
peça com menos lances" **é** verificável, mas a resposta não é única. Um
exercício de "clique na peça que menos joga" precisaria ou de outra posição, ou
de aceitar duas respostas.

---

## 4. Fonte confiável para exercícios: já está no repositório

O recorte CC0 do banco público do Lichess já vive em
`public/puzzles/<tema>/<faixa>.json` — **111 arquivos, 166.623 posições**. Ele
foi baixado para a tática, mas as posições servem para qualquer coisa.

Varri uma **amostra uniforme de 25.215 posições únicas** com
`conferirAfirmacao` — o **mesmo juiz** que valida as legendas do meio-jogo — para
contar em quantas cada conceito aparece. As colunas:

- **aparece**: o conceito existe na posição;
- **resposta única**: existe **exatamente uma** casa/coluna que satisfaz — é o
  que permite um exercício de resposta certa sem ambiguidade;
- **utilizável**: resposta única **e** material igual **e** rating 600–1600.

| conceito | aparece | resposta única | utilizável |
|---|---:|---:|---:|
| coluna aberta | 20.957 | 7.144 | **1.253** |
| peão isolado | 18.471 | 6.633 | **1.015** |
| peão retardatário | 10.640 | 4.987 | **929** |
| peão dobrado | 6.421 | 5.690 | **854** |
| escudo do rei incompleto | 24.722 | 4.145 | **785** |
| peão passado | 12.323 | 6.340 | **760** |
| bispo com ≥4 peões na sua cor | 8.467 | 5.677 | **742** |
| bloqueio de passado | 16.621 | 4.530 | **735** |
| posto avançado | 22.570 | 3.201 | **694** |
| torre na sétima | 3.972 | 3.445 | **442** |
| coluna semiaberta | 23.425 | 3.784 | **322** |
| par de bispos (um lado só) | 3.832 | 3.832 | **0** ← o filtro de material igual mata; refazer sem ele |

E isso é **uma amostra de 15%**. O recorte inteiro tem ~6,6× mais.

**A resposta à pergunta 4 é não: não é difícil.** Para cada conceito medível há
centenas a milhares de posições reais, com licença CC0 sem dúvida, já no
repositório, e conferíveis pelo juiz que o projeto já usa. O que falta não é
fonte — é decidir o formato do exercício e escrever o código que o serve.

**A ressalva honesta:** essas posições provam o **fato** (existe um peão isolado
em d5), não o **plano**. Servem para exercício de reconhecimento — "ache o peão
isolado", "clique na coluna aberta", "onde está o posto?" —, que é exatamente a
etapa que falta entre ler a dica e responder um quiz de plano. Não servem para
"qual é o melhor lance", porque isso continua sem juiz.

---

## 5. O que já existe no projeto e pode ser reaproveitado

Antes de propor estrutura nova, vale saber o que a casa já tem:

- **`lib/tatica/revisao.ts`** — revisão espaçada em 2-7-14 dias, **derivada das
  linhas de tentativa**, sem tabela `fila_revisao`. O comentário explica por quê:
  uma tabela seria "uma segunda verdade que o servidor teria de manter
  sincronizada". Se o meio-jogo ganhar exercícios com acerto/erro, este é o molde.
- **`lib/tatica/gravar.ts`** — o servidor **deriva** o acerto dos lances, não
  recebe um booleano do navegador. "Com um campo booleano vindo do navegador,
  'resolvi 300 puzzles' seria uma chamada de rede a escrever."
- **`components/board/Diagrama.tsx`** — SVG montado no servidor, **zero
  JavaScript**. Para exercício clicável seria preciso um componente novo, ou o
  `ChessBoard` interativo que a tática já usa.
- **`lib/meiojogo/afirmacoes.ts`** — 30 tipos de afirmação: `vez`, `peca`,
  `rei-em`, `peoes`, `peoes-nas-colunas`, `peoes-alem-do-meio`, `casas-negadas`,
  `material-igual`, `material-a-mais`, `par-de-bispos`, `pecas`, `coluna-aberta`,
  `coluna-semiaberta`, `peao-isolado`, `peao-dobrado`, `peao-passado`,
  `peao-retardatario`, `posto`, `bloqueio`, `corrente-de-peoes`,
  `peoes-na-cor-do-bispo`, `peoes-na-cor`, `atacantes`, `cravada`,
  `torres-ligadas`, `torre-na-setima`, `escudo-do-rei`, `janela-do-rei`,
  `lances-da-peca`, `roque-disponivel`.
- **`dica_lida`** (migration `0005_revisao.sql`) — só `aluno`, `dica`, `lida_em`.
  Qualquer registro de exercício exige **migration nova**.
- **`lib/tarefas/estado.ts`** tem `somarMeioJogo(lidas, nivel)` — o painel e a
  trilha contam leituras. Mudar a unidade de progresso mexe aí também.

---

## 6. As decisões que o plano precisa tomar

Nenhuma delas está tomada. Estão aqui para a próxima sessão não redescobri-las.

1. **Uma posição por dica, ou exemplo + exercícios?** O esquema já aceita **1 a 3
   posições** (`lib/meiojogo/dicas.ts`), e o teto de citação é por dica — então
   posições extras vindas do Lichess (CC0, sem teto) cabem sem tocar no esquema.
2. **O exercício grava?** Se gravar, quebra a regra atual de que o meio-jogo não
   produz número — mas um exercício de *fato* (ache o peão isolado) **tem juiz de
   máquina**, ao contrário do quiz de plano. Talvez a regra deva separar os dois:
   fato conta, plano não.
3. **Quiz único ou bateria?** Hoje é um quiz de plano por dica, com 22 deles
   respondíveis pelo texto. Uma bateria de reconhecimento antes do quiz de plano
   resolveria os dois problemas de uma vez.
4. **A proveniência sai de baixo do diagrama?** Opções: recolher num
   `<details>`, mover para o fim da página, ou encurtar o `fenMethod` (que ficou
   longo justamente porque registra a conferência contra o PDF).
5. **Ordem da página.** Hoje o diagrama vem antes da explicação. Se houver
   exercício, onde ele entra — antes da explicação (testar antes de ensinar) ou
   depois (ensinar e então testar)?
6. **Interatividade.** Clicar numa casa exige componente cliente; o `Diagrama`
   atual é SVG estático de custo zero. Há um `ChessBoard` na tática para reusar.

---

## 7. Estado do repositório

- Branch **`meio-jogo-livros`**, commit **`dca2584`**, saída de `origin/main`
  em `94dc6b0`. **Não foi feito push.**
- Verde: `validate:content` (30 dicas, 30 posições, 90 afirmações), `npm test`
  (574 testes), `typecheck`, `lint`, `build`.
- Não commitados: `docs/HANDOFF-ASTRA-CONTEXTO.md` e
  `docs/HANDOFF-ASTRA-MEIO-JOGO.md` (são do Doug, ficaram como estavam).
- **Não houve revisão visual no navegador** e não houve piloto com alunos.
- Duas fragilidades declaradas na entrega: o vídeo do **m11** é de finais e o do
  **m22** é de ataque de minoria, cujo tema saiu da lista. São 30 vídeos para 30
  dicas e não sobrava escolha.
