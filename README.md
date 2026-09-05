# Preparatório OLESC 2026

Preparatório de torneio de xadrez para as equipes masculina e feminina, rumo à
25ª OLESC (Lages, xadrez de 11 a 16 de outubro de 2026). Site com login por
**nome de usuário e PIN** — sem e-mail e sem cadastro, porque os alunos têm de 8
a 15 anos e a conta é criada pelo professor.

O plano do curso, o cronograma dos quatro sábados e as decisões de conteúdo
estão em [`docs/`](docs/).

## Rodar

```bash
npm install
cp .env.example .env.local   # e preencher com as chaves do projeto Supabase
npm run db:migrar            # aplica as migrations pendentes
node scripts/criar-professor.ts doug "Douglas Vieira"
npm run dev
```

## Publicar

O repositório mora em **`clubedexadrezguabiruba/preparatorio-olesc`**, e o
projeto na Vercel está ligado a ele: **push em `main` publica em produção**,
em https://preparatorio-olesc.vercel.app.

Isso levou uma transferência de dono para funcionar. A conta da Vercel entra
pelo GitHub `clubedexadrezguabiruba`, e enquanto o repositório esteve numa
conta pessoal ela simplesmente não o enxergava — o erro que a CLI mostrava
falava de "typos e repositório privado" e não tinha nada a ver.

Para subir sem passar pelo Git (o que se usou até a F1):

```bash
npx vercel deploy --prod    # de dentro desta pasta, nunca da pasta pessoal
```

A ressalva importa: rodado de `C:UsersLenovo`, o comando oferece publicar a
pasta de usuário inteira.

## Gates

```bash
npm run typecheck
npm test        # contraste, FEN e lance, juiz do puzzle, sorteio da série, conteúdo
npm run lint
npm run build
```

E os dois que falam com o banco de verdade — ficam fora da CI porque precisam
das chaves, e rodam na máquina antes de cada deploy:

```bash
npm run db:rls       # o aluno lê o seu, não lê o do outro, e não grava sozinho
npm run db:tatica    # a corrente inteira: disco -> juiz -> banco -> relatório
```

`db:rls` **pula o passo do professor sem o PIN**. Para rodar completo:
`node scripts/verificar-rls.ts <PIN do doug>`.

## O curso de tática

Cada tema tem três etapas: **aquecimento** (5 puzzles fáceis), **série** (24 em
rating crescente) e **prova** (10 misturados com temas já vistos). O currículo
— oito blocos, 31 temas — está em [`lib/tatica/blocos.ts`](lib/tatica/blocos.ts),
que é a única fonte da taxonomia; o texto que o aluno lê está em
[`content/temas.json`](content/temas.json), e **ter texto escrito é o que abre o
tema**.

Quem escolhe os puzzles de cada rodada é o servidor, semeado pelo id do aluno:
dois alunos veem séries diferentes, e o mesmo aluno que recarrega a página vê a
mesma. E quem decide se o aluno acertou é o servidor também — o navegador manda
os **lances jogados**, nunca um "acertei".

Só a **primeira tentativa** de cada puzzle vira linha no banco. Depois do
primeiro erro o puzzle continua na tela para o aluno aprender, e não conta mais.

### Ensaiar como aluno

```bash
node scripts/aluno-de-teste.ts criar    # usuário alunoteste, PIN 112233
node scripts/aluno-de-teste.ts contar   # o que ficou gravado, com os tempos
node scripts/aluno-de-teste.ts apagar
```

## A apostila

Um caderno por sábado, em PDF. O caderno é um **arquivo de texto que o professor
edita sozinho** — `apostila/caderno-1.md` —, e o guia de edição, escrito para
quem não programa, está em [`apostila/COMO-EDITAR.md`](apostila/COMO-EDITAR.md).

```bash
npm run apostila:ver 1          # gera o PDF e abre na tela
npm run apostila 1              # só gera, em public/apostila/caderno-1.pdf
npm run apostila:conferir 1     # recorta os PNGs de conferência em .conferencia/
```

O texto dos temas sai de `content/temas.json`, os problemas do mesmo banco de
puzzles que o site serve, e as tarefas de `content/tarefas.json` — as três coisas
que o aluno também vê na tela. O que o caderno escreve por conta própria é só o
que é do papel: as regras da OLESC, a anotação, as três perguntas.

**O gabarito é calculado, não digitado.** As respostas saem da linha de solução
do próprio puzzle, traduzidas para a notação portuguesa (R, D, T, B, C) por
[`lib/apostila/notacao.ts`](lib/apostila/notacao.ts) — e a tradução tem uma
armadilha coberta por teste: o `R` inglês é torre e o `R` português é rei, então
a troca é simultânea, nunca em duas passadas.

Diagrama é FEN → SVG no servidor ([`lib/diagrama/`](lib/diagrama/)), com as peças
**cburnett extraídas do chessground** — as mesmas da tela, byte a byte, com um
teste que reprova se um upgrade mudar o desenho.

O PDF fica versionado em `public/apostila/` porque o painel do aluno leva a ele
por link, e a Vercel não tem Chromium para regerá-lo na build. O HTML
intermediário fica em `apostila/saida/`, fora do versionamento.

Duas builds do mesmo `.md` dão PDFs que **diferem em 4 bytes** — o carimbo de
data que o Chromium embute. Então `git status` acusa o PDF como alterado depois
de todo `npm run apostila`, mesmo sem nada ter mudado no caderno. Antes de
versionar a diferença, vale conferir se o conteúdo mudou de verdade; se forem só
os 4 bytes, `git checkout public/apostila/caderno-1.pdf` descarta o ruído.

**Legibilidade impressa é medida, não estimada.** `npm test` mede peça contra
casa em P&B pela mesma régua de contraste do site
([`lib/diagrama/tabuleiro.test.ts`](lib/diagrama/tabuleiro.test.ts)) — mas
contraste não responde *tamanho*, e por isso `apostila:conferir` recorta em
coordenada medida para um subagente descrever. O que essa conferência já mudou
está em comentário no `apostila/impressao.css`, com o número que justificou cada
mudança.

## Os puzzles

Os 166.623 puzzles de `public/puzzles/` são um recorte do banco público do
Lichess (CC0), gerado por `npm run puzzles:filtrar` a partir do CSV bruto em
`dados/` — que tem 570 MB e **não** é versionado.

O recorte é por tema do currículo (`lib/tatica/blocos.ts`) e por faixa de
rating. Dentro de cada tema, os puzzles saem **em rating crescente**, e as
faixas vêm na ordem: a série que o aluno resolve sobe de dificuldade sozinha.

Refazer o recorte:

```bash
bzip2 -dkc ~/Desktop/Ccdxdatalichess_db_puzzle.csv.bz2 > dados/lichess_db_puzzle.csv
npm run puzzles:filtrar
```

## Licenças

- **chessground** e **Stockfish**: GPL-3.0 — este site é GPL por consequência.
- **Puzzles do Lichess**: CC0.
- **Peças cburnett**: CC BY-SA 3.0 (Colin M.L. Burnett), como no Lichess.
- Posições vindas de livros comprados entram como **fato com proveniência**
  (livro, edição, página, diagrama) em `content/sources.json`. Nenhuma prosa é
  copiada, e nenhum PDF é versionado.
