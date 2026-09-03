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
