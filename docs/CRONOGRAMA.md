# Cronograma dos sábados — para o professor imprimir

Este é o documento operacional do dia: o que acontece minuto a minuto, o que
precisa estar pronto antes, e o que fazer quando alguma coisa não funcionar.
O **conteúdo** de cada bloco está no plano (`00-PLANO-MESTRE.md`); aqui está a
**condução**.

As datas moram em [`lib/curso/calendario.ts`](../lib/curso/calendario.ts) e são
as mesmas que o site usa para dizer em que semana o aluno está. Remarcar um
sábado é mudar lá — não aqui, e não nas telas.

| Sábado | Data | Tema do dia | Caderno |
|---|---|---|---|
| 1 | sáb 12/9 | Como funciona o torneio e como eu penso | 1 |
| 2 | sáb 19/9 | Abertura sem susto e tática que ganha peça | 2 |
| 3 | sáb 26/9 | O que fazer quando não tem tática | 3 |
| 4 | sáb 3/10 | Simulado de torneio | 4 + torneio |
| Véspera | sáb 10/10 | Opcional, 1–2 h leves | — |
| Torneio | 11 a 16/10 | Manutenção diária | — |

**Estado deste arquivo:** o Sábado 1 está escrito minuto a minuto. Os sábados 2
a 4 estão no esqueleto que veio do plano, e cada um ganha o seu detalhe na fase
dele (F2, F3, F4) — detalhar agora seria escrever a condução de uma aula cujo
material ainda não existe.

---

## Sábado 1 — 12 de setembro

**Tema:** como funciona o torneio e como eu penso.
**Entrega do dia:** todo aluno sai com login no site, com o caderno 1 na mão e
com duas partidas anotadas de próprio punho.

### Antes de sair de casa

- [ ] **Cadernos 1 impressos**, um por aluno, mais 2 de sobra.
      `npm run apostila 1` gera `public/apostila/caderno-1.pdf`. São 26 páginas
      — imprimir **frente e verso** e grampear. As duas últimas folhas são as
      planilhas de anotação; se faltar papel, elas são as que valem a pena
      imprimir soltas em papel comum.
- [ ] **Contas dos alunos criadas**, uma por aluno, em `/professor`. Cada aluno
      recebe um papelzinho com **usuário e PIN** — o PIN aparece uma vez só na
      tela de cadastro. Escreva os papéis em casa, não na hora.
- [ ] **Site conferido no ar:** entrar em https://preparatorio-olesc.vercel.app
      com a conta de ensaio e resolver um puzzle. Se o site estiver fora, o dia
      roda igual: os blocos de tática viram tabuleiro e projetor, e o caderno 1
      cobre a tarefa.
- [ ] Planilhas de anotação avulsas (as do caderno servem), canetas, tabuleiros
      e **relógios** — conferir pilha de cada um.
- [ ] Projetor testado com o site aberto, e o Wi-Fi da sala testado **com o
      celular de um aluno**, não com o seu.

### O dia

| Hora | Bloco | O que o professor faz |
|---|---|---|
| 0:00–0:25 | **A OLESC explicada** | Quadro, sem slide. Equipe de 4+2, 7 rodadas, três provas, a de equipe valendo o triplo. Tabuleiros e cores (1 e 3 com a cor da equipe, 2 e 4 com a contrária) — desenhe isso, é o que mais gera pergunta. Regras que pegam: anotação, peça tocada, lance ilegal, relógio e incremento, como se pede empate, comportamento. Desempates em 5 minutos, sem entrar na conta. |
| 0:25–1:25 | **Diagnóstico: 2 rodadas de 15+10** | Anotação **obrigatória** desde a primeira. Circular olhando duas coisas: quem parou de anotar, e quem está gastando tempo demais na abertura. **Recolher as planilhas no fim** — elas são o material do bloco das 2:25 e entram no relatório. |
| 1:25–1:40 | Pausa | Aproveitar para escrever no quadro os pares da rodada 2, se houver. |
| 1:40–2:25 | **Site e curso de tática** | 20 min no projetor, resolvendo em conjunto e **falando o raciocínio em voz alta** — é o modelo que eles vão copiar. Depois 20 min cada um no celular, no bloco 1. Distribuir os papéis de usuário e PIN aqui, não antes: com o papel na mão eles entram no site em vez de ouvir. |
| 2:25–3:10 | **As três perguntas** | O "contar" de Heisman: o que ele ameaça, minhas peças estão seguras, posso capturar de graça. Depois, **as planilhas do diagnóstico de volta nas mãos deles**: cada um procura na própria partida o lance em que deixou uma peça. Ninguém corrige a partida do outro em voz alta. |
| 3:10–3:50 | **Prática: 1 rodada 15+10** | Anotada, aplicando as três perguntas. Peça que cada um marque com um ponto na planilha os lances em que parou para fazer as três perguntas. |
| 3:50–4:00 | **Fechamento** | Entregar o caderno 1. Ler em voz alta a lista da tarefa da semana (ela está no caderno **e** no painel do site). Combinar de trazer as duas planilhas preenchidas no Sábado 2. |

### O que costuma dar errado, e o que fazer

- **O Wi-Fi da sala não aguenta doze celulares.** Os puzzles são arquivos
  estáticos e o site é leve, mas o primeiro carregamento de cada aluno puxa o
  tabuleiro. Se travar: metade resolve no site, metade nos diagramas do caderno
  1, e trocam depois de 10 minutos.
- **Aluno sem celular.** O caderno 1 tem 25 diagramas impressos justamente por
  isto. Ele faz a tarefa no papel e o professor lança as respostas depois.
- **O diagnóstico atrasa.** É o bloco que mais estoura. Se a segunda rodada não
  couber, corte-a: uma partida anotada já dá o material do bloco das 2:25. Não
  corte o bloco das três perguntas — ele é o conteúdo do dia.
- **Ninguém anota até o fim.** Esperado na primeira vez. Não brigue: mostre uma
  planilha incompleta e pergunte quem ganhou a partida, sem a memória de quem
  jogou. O argumento é esse.

### Depois do sábado

- [ ] Conferir em `/professor` que todos os alunos aparecem e que pelo menos um
      puzzle foi gravado por cada um.
- [ ] Guardar as planilhas do diagnóstico — elas voltam no Sábado 3, no bloco de
      análise.
- [ ] Criar o **clube da OLESC no chess.com** e mandar o link para os alunos.
      Enquanto ele não existir, a tarefa das duas partidas fica sem link no
      painel (é a pendência registrada em `content/tarefas.json`).

---

## Sábado 2 — 19 de setembro

**Tema:** abertura sem susto e tática que ganha peça.
**Estado:** esqueleto. Detalhar na F2, junto com o repertório do clube.

| Hora | Bloco |
|---|---|
| 0:00–0:15 | Revisão do relatório da semana (números da turma, sem expor ninguém) |
| 0:15–1:15 | Repertório do clube: ideias, não decoreba. Brancas e pretas, em duplas |
| 1:15–1:30 | Pausa |
| 1:30–2:15 | Tática blocos 4–5: garfo, cravada, espeto, descoberto, xeque duplo |
| 2:15–2:45 | Armadilhas de abertura em 1000–1400 (pastor, f7, Fried Liver, Légal) |
| 2:45–3:50 | Mini-torneio blitz 3+2, 5 rodadas suíço — relógio, incremento, ilegal |
| 3:50–4:00 | Tarefas; caderno 2 |

**Depende de:** repertório decidido com o Doug, treinador de linhas no site,
caderno 2 impresso, e as planilhas do Sábado 1 recolhidas.

---

## Sábado 3 — 26 de setembro

**Tema:** o que fazer quando não tem tática.
**Estado:** esqueleto. Detalhar na F3.

| Hora | Bloco |
|---|---|
| 0:00–0:45 | Planos simples de meio-jogo, 4 posições no projetor |
| 0:45–1:30 | Finais que decidem 15+10: rei e peão, torre e peão |
| 1:30–1:45 | Pausa |
| 1:45–2:15 | Gestão de relógio: orçamento por fase |
| 2:15–3:30 | Partida 25+10 anotada, com o relógio anunciado a cada 5 min |
| 3:30–3:50 | Análise pós-partida em duplas, com o motor |
| 3:50–4:00 | Tarefas; caderno 3 |

**Depende de:** o Laboratório de Finais publicado (a dependência externa do
plano), `/jogar` com relógio, e o motor na análise.

---

## Sábado 4 — 3 de outubro

**Tema:** simulado de torneio.
**Estado:** esqueleto. Detalhar na F4.

| Hora | Bloco |
|---|---|
| 0:00–0:10 | Briefing como no torneio: escalação provisória, tabuleiros, cores |
| 0:10–0:50 | Blitz 3+2, 5 rodadas suíço, com planilha de resultados |
| 0:50–1:05 | Pausa — o que fazer entre rodadas |
| 1:05–2:50 | Rápido 15+10, 3 rodadas, anotação obrigatória, professor como árbitro |
| 2:50–3:05 | Pausa |
| 3:05–3:35 | Rodada por equipe simulada, 10+5, com decisão de empate pelo time |
| 3:35–3:55 | Rotina do dia de torneio e debrief |
| 3:55–4:00 | Escalação definitiva; caderno 4 e caderno do torneio |

**Depende de:** ranking para escalação no site, modo torneio de puzzles,
caderno do torneio impresso.

---

## Véspera — 10 de outubro (opcional, 1 a 2 h)

Aquecimento, checklist da mochila, e **nada de conteúdo novo**. Se algum aluno
chegar querendo estudar uma abertura nova, o trabalho do professor é dizer não.
