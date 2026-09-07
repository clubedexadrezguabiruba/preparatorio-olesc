# Handoff — Astra: refazer o meio-jogo do preparatório OLESC

> Escrito em 2026-09-06 para o GPT Astra, a pedido do Doug.
> Repositório: `https://github.com/clubedexadrezguabiruba/preparatorio-olesc`
> Branch de referência: **`main`**, no commit `40b66df`.
> Este documento é a tarefa inteira. Não há briefing verbal por fora dele.
>
> **Leia antes:** `docs/HANDOFF-ASTRA-CONTEXTO.md` — o que é o preparatório, quem
> são os alunos, qual é o prazo e qual é o padrão editorial da casa. São dez
> minutos, e eles mudam as escolhas que você vai fazer aqui.

---

## 0. O seu papel: leitor, e só

Você tem acesso direto a este repositório no GitHub. **É acesso de leitura.**

**Não faça, em nenhuma hipótese:** commit, push, branch, pull request, edição de
arquivo, abertura de issue, comentário em issue ou PR, alteração de configuração,
nem qualquer chamada de escrita à API do GitHub.

O fluxo é este: você lê, diagnostica e escreve **uma recomendação em texto**. O
Doug lê a recomendação, decide, e passa para o Claude implementar. Quem escreve
código neste repositório é o Claude, depois da decisão do Doug. Se a sua
recomendação for boa, ela vira commit pela mão de outro.

Isso muda como você deve escrever: a recomendação precisa ser **executável por
quem não participou da sua pesquisa**. Cada item tem de trazer, junto, a
informação que o implementador vai precisar — obra, capítulo, página, diagrama,
FEN, e por quê. Uma frase como "usar uma posição clássica de peão isolado" é
inútil aqui; ela devolve o trabalho para quem for implementar.

---

## 1. O que o projeto é

Um site em Next.js que prepara crianças e adolescentes do Clube de Xadrez de
Guabiruba para a OLESC (Olimpíada Estudantil de Santa Catarina). Três módulos:
**tática** (puzzles), **finais** (aulas interativas) e **meio-jogo** (as trinta
dicas — o que esta tarefa vai refazer).

**Os alunos: 11 a 15 anos, entre 600 e 1500 de rating no chess.com.** É a faixa
real, medida, não a desejada. Guarde isso: é o critério que reprova metade dos
livros bons de estratégia, que foram escritos para 1600 e acima.

**O texto do site é 100% escrito do zero, em português do Brasil.** Nenhuma
prosa, comentário, tradução ou seleção de exercícios de livro nenhum é copiada.
O que se pode tirar de uma obra é a **posição** — que é fato, não texto — e a
ideia, que não tem copyright. Isto não é preferência de estilo: é a política de
direitos autorais do projeto, escrita em `docs/SOURCE-CORPUS.md` §1, e o
verificador de conteúdo a cobra.

### 1.1 Os quatro níveis

O curso inteiro é fatiado por força, em `lib/curso/trilha.ts`:

| id | nome | quantas dicas hoje |
|---|---|---|
| `ate-1000` | até 1000 | 8 |
| `1000-1200` | 1000 a 1200 | 8 |
| `1200-1400` | 1200 a 1400 | 8 |
| `1400-1600` | 1400 a 1600 | 6 |

Trinta no total. A distribuição por nível **não é sagrada** — se a sua proposta
pedir 9/8/7/6, diga e justifique. O que é fixo é o total de 30 e o fato de cada
dica pertencer a exatamente um destes quatro ids.

---

## 2. O que ler, e em que ordem

| Arquivo | Por quê |
|---|---|
| `content/meio-jogo.json` | **As 30 dicas como estão hoje.** 96 KB. É o objeto da crítica. |
| `lib/meiojogo/dicas.ts` | O esquema Zod: o que uma dica pode e não pode ter. Leia os comentários, que explicam o porquê de cada campo. |
| `lib/meiojogo/afirmacoes.ts` | O verificador de legendas, e o **vocabulário fechado** de afirmações. É a restrição mais dura desta tarefa. |
| `docs/MEIO-JOGO-FONTES.md` | **Levantamento de fontes já feito em 2026-09-06.** Livros, domínio público, PGN, vídeo. Não refaça este trabalho. |
| `docs/SOURCE-CORPUS.md` | A política de proveniência e o registro humano das obras. |
| `content/sources.json` | O registro que a máquina lê. Toda posição tem de citar uma obra daqui. |
| `docs/F2-ONDE-PARAMOS.md` §c e §Dívidas | Como os 30 vídeos foram escolhidos, e o que já se sabe que está fraco. |
| `app/meio-jogo/[dica]/page.tsx` | Como a dica aparece na tela do aluno. |
| `scripts/validate-content.ts` (linhas ~1470–1560) | O gate que reprova a build. |

---

## 3. O que existe hoje, medido

Trinta dicas, ids `m1` a `m30`. Cada uma tem: título, resumo de uma frase, de 1 a
3 parágrafos de explicação, uma lista "o que procurar no tabuleiro", um "cuidado"
opcional, **uma** posição com diagrama e legenda, um quiz de três opções, e um
link de vídeo do YouTube.

Os títulos atuais, na ordem:

**até 1000** — m1 Peça parada não joga · m2 Rei seguro antes de atacar · m3 O
centro é o terreno alto · m4 Coluna aberta é da torre · m5 A dama não ataca
sozinha · m6 Não enfraqueça os peões do roque · m7 Torres ligadas · m8 O rei é
peça: use-o quando as damas saírem

**1000 a 1200** — m9 Melhore a sua pior peça · m10 Peão fraco é alvo fixo · m11
Na frente, troque peças · m12 Rei no centro: abra o jogo · m13 A sétima fileira ·
m14 Peão dobrado · m15 Bloqueie o peão passado · m16 Troque os defensores do rei

**1200 a 1400** — m17 Cavalo quer casa que peão nenhum ataca · m18 Bispo bom,
bispo ruim · m19 Sem plano, faça o lance útil · m20 Conte antes de capturar · m21
Dois bispos em posição aberta · m22 Ataque na ala onde você tem espaço · m23 Peão
retardatário · m24 A base da cadeia de peões

**1400 a 1600** — m25 Casas fracas de uma cor · m26 Ataque de minoria · m27
Profilaxia: o lance dele antes do seu · m28 Ataque de flanco se responde no
centro · m29 Qualidade por casa forte · m30 Iniciativa vale um peão

---

## 4. Por que estamos refazendo — o diagnóstico do Doug

Duas coisas, e vale entender a diferença entre elas.

### 4.1 As dicas não têm lastro de livro

**As 30 posições, sem exceção, são compostas pela própria autoria do projeto.**
Todas as 30 citam a mesma entrada de `content/sources.json`:
`posicoes-do-preparatorio`, cuja descrição é "Posição composta pela autoria do
preparatório para isolar um traço só, sem transcrever diagrama de obra nenhuma".

Isso é honesto — está declarado, e não finge ser o que não é. E é **verificado**:
cada legenda é medida por `lib/meiojogo/afirmacoes.ts` contra a posição real, e o
gate reprova legenda falsa. Mas verificar que "o peão de d5 é isolado" é verdade
não é o mesmo que ter autoridade sobre **quais** trinta técnicas um jogador de
1100 precisa aprender, em que ordem, e qual posição as ensina melhor. Essa
segunda coisa é o que os livros têm e nós não temos.

Note o contraste com o módulo de finais, que é o padrão de qualidade da casa: as
aulas de finais saem de 22 obras registradas — Capablanca 1921, Freeborough 1891,
Staunton 1848, Müller, Silman, Pandolfini, De la Villa — cada posição citando
obra, capítulo e diagrama numerado. O meio-jogo é o único módulo do site sem uma
única obra por trás. É essa assimetria que o Doug quer corrigir.

### 4.2 Os vídeos foram escolhidos por busca, não por critério

Os 30 links **existem e funcionam** — foram conferidos um a um pelo oEmbed do
YouTube, que só responde para vídeo público e embutível, e o título gravado é o
título canônico devolvido pela API. Isso está feito e não precisa refazer.

O que não foi feito: **ninguém assistiu aos 30**. A escolha foi por título, canal
e duração, a partir de uma busca no YouTube. A tela é honesta sobre isso e
escreve embaixo do link que quem escolhe o que entra na aula é o professor. Mas
"o vídeo existe" é um piso muito baixo para material que vai como tarefa de casa
para uma criança de doze anos.

Os defeitos já conhecidos e declarados em `docs/F2-ONDE-PARAMOS.md`:

- **m9** está em inglês (Dr. Can's Chess Clinic) — não se achou vídeo brasileiro
  sobre "melhorar a pior peça".
- **m15** (bloqueio do peão passado) e **m20** (contar atacantes e defensores):
  o vídeo escolhido é o vizinho mais próximo do tema, não o tema.
- **m8** aponta para um vídeo da série "100 finais" do GM Krikor — quer dizer, um
  vídeo de **finais** ilustrando uma dica de meio-jogo.
- **m16** ("troque os defensores do rei") aponta para um vídeo sobre a tática
  "remover a defesa", que é assunto vizinho e mais estreito.

Suspeite dos outros pela mesma régua: um vídeo cujo título é genérico
("Transforme vantagem em vitória no xadrez!!") provavelmente não é uma aula sobre
o tema específico da dica.

---

## 5. A tarefa

Duas frentes. As duas na mesma entrega.

### 5.A — Refazer a lista dos 30 temas, do zero

**Esta é a decisão do Doug, tomada explicitamente: não é para consertar a lista
atual, é para propor a lista certa.** Você tem liberdade para derrubar temas
atuais, criar temas que não existem, mudar a ordem e mudar o nível em que cada um
entra. Se um tema atual sobreviver, que sobreviva porque você o defendeu, não por
inércia.

O critério é este: **quais trinta técnicas de meio-jogo os livros sérios ensinam
a um jogador de 600 a 1500, e em que ordem eles as ensinam.** Parta da estrutura
dos livros — os capítulos do Seirawan, os sete temas do Stean, a Parte II do
Nimzowitsch, a progressão dos Steps 4 e 5, o Book IV do manual do Emanuel Lasker
— e não da intuição sobre o que "seria bom saber".

Para **cada uma das 30 dicas propostas**, entregue:

1. **Título** em português, curto, no tom dos atuais (imperativo ou constatação
   concreta; mínimo 8 caracteres pelo esquema).
2. **Nível** (`ate-1000`, `1000-1200`, `1200-1400`, `1400-1600`) **e por quê** —
   o que o aluno precisa já saber para esta dica fazer sentido.
3. **A fonte primária**: obra, autor, edição, **capítulo e página ou número de
   diagrama**. Se a fonte for domínio público com link conferido, dê o link e a
   página do scan. Se for obra protegida, dê a referência bibliográfica precisa
   mesmo assim — o projeto compra livro.
4. **Fontes secundárias**, quando duas obras ensinarem o mesmo tema por caminhos
   diferentes e isso importar.
5. **A posição**: a FEN, mais a partida original quando houver (jogadores,
   evento, ano), mais como você chegou nela. Veja §6.3 sobre o que "chegar nela"
   exige.
6. **A legenda proposta** e **as afirmações que a sustentam**, no vocabulário
   fechado da §6.2. Isto não é opcional: legenda que o vocabulário não mede não
   entra no site.
7. **O quiz**: pergunta, exatamente três opções, o índice da certa, e o porquê.
8. **O que a dica ensina**, em três a cinco linhas de sua própria análise — o
   material que o implementador vai transformar em `explicacao` e `procure`.
   **Não escreva a prosa final e não copie a do livro**; escreva o conteúdo.

E, além da lista, entregue **a defesa da lista**: por que estes trinta e não
outros, o que saiu da lista atual e por quê, e onde a sua proposta diverge do que
os livros fazem e por que você divergiu.

### 5.B — Recurar os 30 vídeos, mesmo formato

Continua **um vídeo gratuito do YouTube por dica**, ou nenhum. A mudança é o
critério, que passa a ser declarado.

Para cada dica, dê **um vídeo recomendado e um reserva**, com:

- **título e canal**, e o **link no formato exato**
  `https://www.youtube.com/watch?v=` + os 11 caracteres do id (nada de
  `youtu.be`, nada de parâmetro extra, nada de link de playlist);
- **duração** — a faixa que funciona é de 3 a 25 minutos;
- **idioma** — português do Brasil é fortemente preferido; o inglês só entra
  quando não existir equivalente brasileiro, e aí tem de vir marcado;
- **credencial de quem apresenta**, quando houver (título FIDE, treinador);
- **por que este vídeo é sobre o tema desta dica**, e não sobre o assunto vizinho
  — esta linha é o coração da frente B, e é exatamente o que faltou da primeira
  vez;
- **o minuto em que o tema começa**, se o vídeo levar tempo para chegar nele.

**É melhor propor `null` do que propor o vizinho.** O esquema aceita vídeo nulo,
e a tela escreve "ainda não há link conferido" — o que é honesto. Um vídeo sobre
outro assunto, apresentado como a aula da dica, não é.

Nomes que o levantamento anterior já validou como canais brasileiros de
qualidade: Tr. André Basso (treinador FIDE), GM Evandro Barbosa, MF Julia
Alboredo, MF Adriano Valle / Academia XadrezValle, GM Krikor Mekhitarian, Raffael
Chess. Não se limite a eles, mas eles são o piso.

---

## 6. O contrato técnico — o que a recomendação tem de caber dentro

Esta seção existe para que a sua recomendação seja implementável. Uma proposta
que a viole é uma proposta que o Claude vai devolver.

### 6.1 O esquema de uma dica

De `lib/meiojogo/dicas.ts`, campo a campo:

| campo | regra |
|---|---|
| `id` | `m` mais o número. |
| `titulo` | mínimo 8 caracteres. |
| `nivel` | um dos quatro ids. |
| `resumo` | mínimo 20 caracteres. A técnica em uma frase. |
| `explicacao` | de 1 a 3 parágrafos, cada um com no mínimo 20 caracteres. |
| `procure` | de 2 a 4 itens, cada um com no mínimo 10 caracteres. Perguntas que o aluno se faz olhando o tabuleiro. |
| `cuidado` | opcional. O erro que a própria dica induz. |
| `posicoes` | de **1 a 3** posições. |
| `quiz` | obrigatório. Pergunta, **exatamente 3** opções, índice da certa (0 a 2), e o `porque`, com no mínimo 20 caracteres. |
| `video` | objeto com `titulo` e `url`, ou `null`. A `url` também pode ser `null` dentro do objeto. |

**Sobre o quiz:** as três opções têm de ser três planos plausíveis. Duas opções
seriam sorteio; quatro não cabem na tela do celular. E a opção errada tem de ser
o erro que um aluno daquele nível de fato comete — não um lance absurdo.

### 6.2 O vocabulário fechado das afirmações

Esta é a restrição que mais vai moldar as suas escolhas de posição, então leia
com atenção.

A dica é cortada em duas metades com donos diferentes:

- **o fato** — o que está na legenda embaixo do diagrama. É julgado por máquina,
  com `chess.js`. Se a legenda diz "a coluna d está aberta", uma função abre a
  posição, conta os peões da coluna d, e **reprova a build** se houver algum.
- **o julgamento** — qual é o plano, qual peça é a pior, o que fazer. Isso vai
  para a explicação e o quiz, onde a tela escreve que quem julga é a autoria.

Por isso toda posição carrega no mínimo **uma** afirmação, e **a legenda só pode
afirmar, como fato, o que as afirmações medem**. As afirmações disponíveis são
estas, e não há outras:

`vez` · `peca` · `rei-em` · `peoes` · `peoes-nas-colunas` · `peoes-alem-do-meio` ·
`casas-negadas` · `material-igual` · `material-a-mais` · `par-de-bispos` ·
`pecas` · `coluna-aberta` · `coluna-semiaberta` · `peao-isolado` · `peao-dobrado`
· `peao-passado` · `peao-retardatario` · `posto` · `bloqueio` ·
`corrente-de-peoes` · `peoes-na-cor-do-bispo` · `peoes-na-cor` · `atacantes` ·
`cravada` · `torres-ligadas` · `torre-na-setima` · `escudo-do-rei` ·
`janela-do-rei` · `lances-da-peca` · `roque-disponivel`

A consequência prática, e é uma consequência séria: **se um tema que você quer
propor não tem como ser ancorado por nenhuma destas afirmações, diga isso na
recomendação.** Duas saídas honestas, e você escolhe qual recomendar:

1. propor a **afirmação nova** que falta, dizendo em uma frase que pergunta ela
   faz e como uma máquina a responderia com sim ou não (é uma linha de código
   nova em `afirmacoes.ts`, e o projeto aceita pagar esse preço);
2. escolher outra posição, cuja legenda diga só o que já se mede.

O que **não** é aceitável é escrever a legenda como se o fato estivesse medido
quando não está.

Cada afirmação tem forma própria. Alguns exemplos reais tirados do arquivo atual:

```json
{ "o": "vez", "lado": "brancas" }
{ "o": "peca", "casa": "c4", "peca": "bispo", "lado": "brancas" }
{ "o": "rei-em", "lado": "brancas", "casa": "e1" }
{ "o": "peoes", "brancas": 8, "pretas": 8 }
{ "o": "coluna-aberta", "coluna": "d" }
{ "o": "peao-isolado", "casa": "d5" }
{ "o": "posto", "casa": "d5", "lado": "brancas" }
{ "o": "cravada", "casa": "c3", "por": "b4", "contra": "e1" }
{ "o": "roque-disponivel", "lado": "brancas", "tipo": "curto" }
```

Detalhes que já pegaram gente: em `coluna-semiaberta`, o `lado` é quem **não**
tem peão na coluna — quem ganha a estrada. `posto` é a casa que peão inimigo
nenhum pode atacar **e** que um peão seu defende. `escudo-do-rei` conta os peões
intactos nas três colunas à frente do rei que rocou. Leia
`lib/meiojogo/afirmacoes.ts` antes de escrever afirmação; os comentários dele
dizem o que cada uma mede.

### 6.3 Proveniência: os quatro campos, e o que eles cobram

Toda posição carrega:

```json
"provenance": {
  "bibliographicSource": "a obra, o capítulo, a página, o diagrama — em prosa",
  "editionFile": "o slug ou arquivo de uma obra em content/sources.json",
  "originalGame": "a partida original, ou null",
  "fenMethod": "como a FEN foi obtida e o que foi conferido"
}
```

`editionFile` **tem de casar** com uma entrada de `content/sources.json`. O gate
reprova o que não casar. Hoje há 22 obras registradas, quase todas de finais.

**Isso significa que quase toda obra que você recomendar ainda não está
registrada.** Não é impedimento — é um passo a mais, e ele tem regra: a §4 do
`SOURCE-CORPUS.md` só registra obra **depois** que o arquivo estiver na
biblioteca do Doug e a folha de rosto for lida, porque o registro grava a
**edição**, e edição não se cita de memória. Então, para cada obra nova que você
propuser, entregue o que o registro vai precisar: slug sugerido, título, autor,
edição com editora, cidade e ano, se é protegida ou domínio público, e a licença.
O Doug fecha o registro quando tiver o livro na mão.

### 6.4 O teto de 2 posições por obra protegida

Obra protegida por direito autoral pode dar no máximo **2 posições por dica**. O
que a lei protege é a *coleção* do autor, não o fato isolado — então tirar duas
posições de um livro é uso pontual, e tirar oito é copiar a seleção dele.

Domínio público e CC0 não têm teto. Isto já mordeu de verdade: o gate sabotou
três dicas quando foi testado.

**Leia o teto pelo que ele é.** Ele conta **por dica**, não pelo módulo. Como
cada dica tem hoje uma posição só, o gate não impediria você de tirar as trinta
do mesmo livro — ele só reclamaria se uma única dica pedisse três posições da
mesma obra protegida. Quer dizer: **a máquina não vai te segurar aqui, e o
critério é seu.** Trinta posições saídas do Seirawan passariam no gate e ainda
assim seriam copiar a seleção do Seirawan, que é exatamente o que a política de
direitos do projeto não permite. Espalhe, e prefira domínio público onde a
qualidade empatar — e diga, no resumo executivo, quantas posições saem de cada
obra, para o Doug ver a distribuição de uma vez. O
levantamento da §2 do `MEIO-JOGO-FONTES.md` já achou cinco obras de domínio
público com download real conferido, e uma delas — o Znosko-Borovsky de 1922 — é
o único livro do levantamento inteiro que é **só** sobre meio-jogo.

### 6.5 O que o gate reprova

`npm run validate:content` roda na build e reprova, entre outras coisas: FEN
ilegal, afirmação falsa (`AFIRMACAO_FALSA`), `editionFile` que não casa com obra
registrada, mais de 2 posições da mesma obra protegida numa dica, link de vídeo
fora do formato exato, e id repetido. Hoje o placar é **30 dicas, 30 posições,
125 afirmações medidas, zero problemas**. A sua proposta tem de chegar lá também.

---

## 7. O que já foi levantado — não refaça

`docs/MEIO-JOGO-FONTES.md` é um levantamento de 2026-09-06 sobre exatamente este
assunto. **Leia antes de pesquisar qualquer coisa.** Ele já traz:

- **15 livros protegidos** com edição, ISBN, faixa de rating e se têm exercícios
  — Seirawan, Chernev, Stean, Silman (dois), Weeramantry, McDonald (dois),
  Grooten, Euwe & Kramer, Pachman, Heisman, Yusupov, Chess Steps, Mednis;
- **5 obras de domínio público com download conferido** — Nimzowitsch *My
  System* (1930), Znosko-Borovsky *The Middle Game in Chess* (1922), Emanuel
  Lasker *Manual* (1927) e *Common Sense in Chess* (1910), Capablanca *Chess
  Fundamentals* (1921);
- **duas que caíram**, com o motivo — Réti (sem cópia baixável) e Edward Lasker
  (protegido no Brasil até 2052);
- estudos do Lichess, cursos do chess.com, as amostras grátis do Chess Steps;
- **bases de PGN com a licença lida no site**, não presumida — o dump CC0 do
  Lichess é o único grande com licença sem dúvida;
- as tags de puzzle do Lichess que servem para meio-jogo, com contagem;
- as ferramentas (`python-chess`, `pgn-extract`, `scoutfish`).

O que ele **deixou em aberto**, e onde você pode agregar de verdade:

1. **A data de morte do tradutor Philip Hereford** decide se a tradução de 1930
   do *My System* é domínio público no Brasil. Não foi levantada.
2. **Não existe base pública de posições organizada por tema estratégico.** Foi
   procurada e não achada. Se você conhecer uma, é achado de valor.
3. O material didático da FIDE não abriu em três tentativas.
4. O dono do canal "Xadrez Nobre" não foi confirmado.

E a recomendação que aquele levantamento já fez, e que o plano-mestre já tinha
tomado por outro caminho: **Seirawan, *Winning Chess Strategies*** é o livro
escrito exatamente na faixa de 1000 a 1500 e com testes e gabarito, e **Chernev,
*Logical Chess: Move by Move*** é a partida comentada. Você não é obrigado a
concordar — mas se discordar, discorde explicitamente e diga por quê.

---

## 8. O formato da entrega

Um documento Markdown, em português do Brasil, nesta ordem:

1. **Resumo executivo** — de 10 a 15 linhas. O que muda, o que fica, e o custo
   (livros a comprar, obras a registrar, afirmações novas a codar).
2. **A defesa da lista** — por que estes trinta temas, em que ordem, e o que saiu
   da lista atual com o motivo de cada saída.
3. **As 30 dicas**, uma por bloco, com os 8 itens da §5.A.
4. **Os 30 vídeos**, tabela com recomendado e reserva, e a coluna do porquê.
5. **As obras novas a registrar** — a tabela pronta para virar entrada de
   `content/sources.json`, com o que a §6.3 pede.
6. **As afirmações novas**, se você precisar de alguma — nome, o que mede, e como
   uma máquina responderia sim ou não.
7. **O que você não conseguiu confirmar** — seção obrigatória, mesmo que curta.

**Marque a confiança de cada coisa,** como o `MEIO-JOGO-FONTES.md` faz: `aberto`
para página que você abriu e leu, `busca` para o que apareceu em resultado sem
abrir, `não confirmado` para o que tentou e falhou, e diga quando a informação
vem do seu conhecimento e não de uma página. Este projeto trata "verificado" como
palavra que custa caro; um levantamento que mistura os três níveis sem etiqueta
vale menos que um levantamento menor e etiquetado.

**Sobre as FENs:** entregue a FEN completa, com os seis campos. Se você a montou
a partir de um diagrama impresso, diga isso e diga se conferiu a legalidade. Se
ela veio de uma partida, dê os dados da partida. O implementador vai reconferir
tudo com `chess.js` de qualquer jeito — o que ele não consegue reconferir é de
onde a posição veio.

---

## 9. Armadilhas que já custaram tempo aqui

- **A busca do YouTube traduz o título** de vídeo em inglês para o idioma de quem
  procura. Dois vídeos em inglês quase entraram no site como se fossem em
  português. O título canônico só sai do oEmbed
  (`https://www.youtube.com/oembed?url=...&format=json`).
- **Emanuel Lasker e Edward Lasker são pessoas diferentes,** sem parentesco
  próximo. A obra do primeiro é livre no Brasil desde 2012; a do segundo, só em
  2052. O sobrenome igual é armadilha conhecida.
- **O Znosko-Borovsky tem dois livros ingleses diferentes com o mesmo título.** A
  1ª edição, de 1922, é a que serve. A 2ª, de 1938, é texto reescrito e não é
  domínio público em toda parte.
- **O Brasil conta vida do autor mais 70 anos**, não os 95 da regra americana. É
  esse o critério que vale aqui, e é por ele que o Réti e o Edward Lasker foram
  tratados como foram.
- **A tradução é obra separada, com prazo próprio.** Um clássico em domínio
  público pode ter tradução protegida.
- **O Pachman circula em notação descritiva** na maioria das tiragens — P-K4 em
  vez de e4. Criança nenhuma lê isso.
- **O Yusupov *Build Up Your Chess 1*, apesar do subtítulo "The Fundamentals", é
  descrito por resenhista como desafiador para 1700 FIDE.** Não serve para a
  faixa de baixo, mesmo já estando na estante do Doug.
- **Curso pago não entra** — nem como fonte de posição, nem como link para o
  aluno. Vale para o chess.com premium, o Chessable e o curso do Rafael Leitão.
- **PGN Mentor e TWIC não podem ser redistribuídos.** Servem para consulta, não
  como fonte da apostila. O dump do Lichess é CC0 e pode.

---

## 10. O que não fazer

- **Não escreva a prosa final das dicas.** A `explicacao`, o `procure` e o
  `porque` do quiz são escritos em português do Brasil pela autoria do projeto,
  do zero, no tom da casa. Entregue o conteúdo e a análise; a redação é de outro.
- **Não copie texto, comentário, tradução ou legenda de livro nenhum.** Nem para
  o Doug ler. A posição é fato e pode ser usada; o texto do autor, não.
- **Não proponha material pago** como link para o aluno.
- **Não invente página, diagrama, ISBN ou id de vídeo.** Referência que você não
  conseguiu conferir vai etiquetada como não conferida, e isso é aceitável;
  referência inventada envenena um registro de proveniência em que o projeto
  inteiro se apoia.
- **Não mexa no repositório.** Nada de commit, branch, PR, issue ou comentário.
  Você lê e recomenda; o Doug decide; o Claude implementa.

---

## 11. Se você tiver de escolher

Se o escopo não couber na sua janela, esta é a ordem de importância:

1. **A lista dos 30 temas com fonte de livro** — obra, capítulo, página. É o
   coração do pedido.
2. **A defesa da lista** — sem ela, o Doug não tem como decidir.
3. **As posições com FEN e afirmações** — é o que mais trabalho poupa na
   implementação, mas é recuperável depois.
4. **Os vídeos** — importante, e o mais fácil de fatiar em uma segunda rodada.

Entregar as quatro pela metade é pior que entregar as duas primeiras inteiras.
