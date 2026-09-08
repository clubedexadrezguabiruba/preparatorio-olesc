# Meio-jogo: onde paramos — 7 de setembro de 2026

O módulo deixou de ser leitura com pergunta e passou a ser **aula com prática**:
o aluno lê a explicação e depois **joga o lance** que a dica ensina, no
tabuleiro. Este documento é o estado no fim do dia, com os números medidos e o
que falta.

---

## Os números, todos medidos

| o que | número |
|---|---|
| dicas com exercício no ar | **8** (m9 a m16) |
| exercícios publicados | **40** — cinco por dica |
| dicas com juiz de lance escrito | **14** (m1–m4, m6, m8–m16) |
| dicas que **não podem** ter exercício | 16, e duas delas por decisão (m5 e m7) |
| lances do tema que o motor reprova, e a tela nomeia | 12 dos 40 |
| exercícios respondidos no navegador de verdade | 40, a 360 px, 0 erro de console |
| divergência entre o número gravado e o re-medido | **0** |

---

## O que mudou de fundo

**O juiz deixou de julgar casa e passou a julgar lance.**
`lib/meiojogo/lances.ts` recebe a posição e devolve os lances que aplicam o
tema. Ele deriva o alvo das mesmas `grupos()` que `exercicios.ts` já calculava —
não há segundo critério.

**Três respostas, e não duas.** Um lance pode aplicar o tema **e perder a
partida**: a torre que ocupa a coluna aberta pendurando na casa de entrada. Esse
lance não some da lista nem é chamado de errado — ele vai para
`lancesRecusados`, com o custo que o Stockfish mediu, e a tela diz "é o lance
desta dica, mas aqui ele custa caro", com o número ao lado.

**O progresso conta trabalho, e não declaração.** A caixa "li" saiu. Uma dica
conta quando o aluno acerta o lance de **todos** os exercícios dela. A tabela
`dica_lida` não foi apagada — ela guarda o que os alunos já declararam —, mas
nada mais escreve nela.

**As tarefas da semana.** A semana 2 (a do piloto, 19–25/9) é medida: "resolver
os exercícios de 6 dicas do degrau 1000–1200". As semanas 1, 3 e 4 viraram
tarefa de marcar, porque os degraus delas ainda não têm exercício.

---

## O achado que mudou o tamanho do trabalho

Das 24 posições curadas no Bloco 3 para o exercício de **clique**, só **4**
admitem lance são que aplica o tema. O motivo não é defeito de curadoria: uma
posição boa para *reconhecer* o traço mostra o traço **pronto** — a torre já
está na sétima, o bloqueio já está feito —, e o lance precisa dele **por
fazer**. As duas exigências são opostas.

Todo o conteúdo de m9 a m16 foi recurado do zero a partir do funil novo.

---

## O funil, e os filtros que ele ganhou apanhando

`scripts/escolher-lances.ts` inverte a ordem das portas: a geométrica é
`chess.js`, custa microssegundos e derruba mais de 99% — o motor só vê o que
sobra. Por isso a amostra pôde ir de 1.200 para 80.000 puzzles.

Cada filtro abaixo nasceu de um item ruim que chegou até a leitura:

- **piso de 14 peças** — metade das posições de m9, m10 e m11 eram finais de
  cinco peças aplicando o tema ao pé da letra;
- **salto da porta 2 até 50 na escolha** (o teto de publicação continua 100) —
  a 90 centésimos há uma tática no tabuleiro, e quem foi olhar a coluna tropeça
  nela;
- **material até uma peça** — "pressione o peão" com oito pontos a menos é um
  exercício em que a resposta certa não muda nada;
- **teto de oito lances do tema** — acima disso o aluno acerta mexendo quase
  qualquer coisa.

E o defeito de arreio que quase passou: o funil abre o Stockfish com MultiPV 2 e
o `medir-lances.ts` abria com 1. Com MultiPV 2 o motor poda menos e a avaliação
sai diferente — **31 dos 40 itens divergiam só por causa disso**. Igualados os
dois, a divergência é zero.

---

## O que falta, na ordem

### 1. A prosa dos 30 exercícios de m1, m2, m3, m4, m6 e m8

**O trabalho de máquina está pronto.** Os seis juízes existem e têm contrato
executável; o funil achou 40 posições aprovadas por juiz; o
`scripts/montar-exercicios.ts` monta o esqueleto de cada item com posição,
lances aceitos, custo por lance, realce do apoio e proveniência.

O que falta é a **curadoria humana**: por item, a legenda, o convite do apoio, a
solução, o `perceptivel` e o `adequacao`. São 30 itens. As seis fichas já estão
escritas, em `docs/meiojogo-fichas-m1-m8.json`.

Para refazer o caminho:

```
npm run meiojogo:funil-lances -- --amostra 40000 --alvo 40 --exportar .scratch/lances-14.json
npm run meiojogo:montar -- .scratch/lances-14.json --por-juiz 5 \
    --dicas m1,m2,m3,m4,m6,m8 --saida .scratch/esq-novos.json
```

As seis dicas estão com `treino: null` de propósito: o esqueleto traz as frases
marcadas `ESCREVER:`, e rascunho não vai para a tela de uma criança.

### 2. A tarefa da semana 1, quando m1–m8 tiverem exercício

O degrau `ate-1000` tem exatamente seis dicas com juiz: m1, m2, m3, m4, m6 e m8.
Quando elas tiverem exercício, `s1-meiojogo` volta a ser tarefa **medida**
(`tipo: "meiojogo"`, `meta.resolver: 6`), nomeando essas seis. É o que o Doug
autorizou ao escolher "viram tarefa de marcar" — a opção dizia, com todas as
letras, que a semana 1 voltaria a ser medida quando as dicas ganhassem
exercício.

### 3. As duas dicas que ficam sem exercício, e por quê

- **m5 — "Mexa no escudo só com motivo"** é uma regra **negativa**. Não há lance
  que a aplique; há lances que a violam. O exercício honesto seria escolher
  entre dois lances, e escolher entre alternativas é o quiz que saiu.
- **m7 — "Olhe o plano do adversário"** é profilaxia: a ameaça tapada dele
  depende do que ele quer jogar, e isso é julgamento. A proposta do plano —
  "qual peça dele mira a sua casa fraca" — é exercício de **clique**, e a mesma
  decisão o descartou.

As duas continuam no ar com a explicação. Dizer "8 de 14" é melhor do que o site
fingir que todo tema tem prática.

### 4. As 16 dicas sem juiz

m17 a m30, mais m5 e m7. Elas continuam com a explicação e sem exercício, e a
lista de `/meio-jogo` marca quais têm prática. Dar juiz a elas é trabalho novo,
tema a tema, e nem todas o admitem.

---

## Como conferir que continua de pé

```
npm test                     677 testes
npm run validate:content     o gate do conteúdo
npm run meiojogo:lances      re-mede cada lance aceito no Stockfish
npm run meiojogo:tela        dirige os 40 exercícios no navegador (precisa de `npm run dev`)
npm run db:meiojogo          prova a gravação contra o Supabase de produção
npm run db:rls               prova que um aluno não vê a linha do outro
```
