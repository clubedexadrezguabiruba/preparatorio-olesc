# Como se transcreve um capítulo do Yusupov

A receita do passo **F** do plano do meio-jogo. É o que um subagente de
transcrição recebe: entra um capítulo de PDF, sai um JSON bruto com as posições,
os lances e os pontos do livro. A prosa em português **não** sai daqui — ela é
escrita depois, à mão, no passo F.4.

O mapa das páginas de cada capítulo está em `docs/MEIO-JOGO-YUSUPOV-MAPA.md`.

> **Esta receita foi corrigida em 2026-09-08 com o que a transcrição do capítulo
> 3 mediu.** Os oito pontos que ela ensinou estão marcados **[piloto]** abaixo.
> Sete deles teriam produzido conteúdo errado e silencioso — errado de um jeito
> que replica perfeitamente e que nenhuma conferência mecânica pegaria.

## O princípio

**Nada é inventado, e nada é "melhorado".** O lance certo é o que o autor
imprimiu, os pontos são os que ele deu, a ordem é a dele. Se o livro dá 2 pontos
por um lance que o Stockfish acha o terceiro melhor, o exercício vale 2 pontos
por aquele lance. O que nós escrevemos é só a prosa em português, depois.

Se alguma coisa não der para ler, **diz-se que não deu**. Um campo com `null` e
uma linha em `avisos` custa cinco minutos a mais; uma FEN chutada custa um aluno
estudando uma posição que não existe.

## Passo 1 — o texto

```
pdftotext -layout -f <primeira> -l <ultima> "<pdf>" -
```

Serve para: as soluções (lances, pontos, régua de aprovação) e a teoria. **Não
serve para as FENs** — o texto de um diagrama sai como colunas de números soltos.

Nos volumes **2** e **4** não há camada de texto. Lá o passo 1 é
`pdftoppm -png -r 300 -gray` seguido de `tesseract <png> - --psm 6`, e o
resultado é mais sujo: confira contra a imagem tudo que for número de ponto.

As figurinhas viram letras latinas e sujeira: `lLl`/`tLl`/`lZl` é o cavalo,
`gd`/`E:`/`!!:`/`1'1` é a torre, `i`/`.i`/`,t`/`ib` é o bispo, `W`/`\W`/`1W` é a
dama, `i>`/`'it>`/`l!i`/`m` é o rei. O `t` colado no fim de um lance é o `+` de
xeque. Não adivinhe: leia a linha inteira e confira o lance na posição.

**[piloto] Os nomes dos jogadores não são confiáveis pelo texto.** A fonte dos
cabeçalhos de partida come letras — o extrator devolveu `P.Mor h` (Morphy),
`A.Yusu ov`, `S dor` (Sydor), `G.L telton` —, e no capítulo 3 **nenhum dos
catorze** nomes saiu inteiro. Renderize as colunas das páginas de solução a 200
dpi e leia os cabeçalhos da imagem. É rápido e resolve todos de uma vez.

## Passo 2 — os diagramas

```
python scripts/recortar-diagramas.py "<pdf>" <pagina> <pasta> --dpi 300
```

Escreve `p<pagina>-full.png` (a página inteira, reduzida — é onde se leem os
rótulos `Ex. N-k`, as estrelas de dificuldade e o glifo de quem joga) e
`p<pagina>-d1.png` … `-d6.png`, um por diagrama, com uns 95 pixels por casa.

**[piloto] A ordem dos recortes é por coluna, porque é assim que o Yusupov
numera.** Numa página de seis, `d1 d2 d3` é a coluna da esquerda (`Ex. N-1`,
`N-2`, `N-3`) e `d4 d5 d6` a da direita (`N-4`, `N-5`, `N-6`). O script já faz
isso. **Confira os rótulos impressos mesmo assim**, na página inteira: a
numeração do arquivo é uma inferência sobre a diagramação, o rótulo é o fato. Se
uma diagramação diferente embaralhar os seis, tudo continua replicando — as
posições trocadas são todas legais —, e o erro só aparece com o aluno na tela.

**Leia sempre a página inteira primeiro.** Se o script achar um número de
diagramas diferente do esperado, diga em `avisos` e leia a página inteira — não
force. Ele imprime a densidade de tinta de cada recorte (`tinta=0.35`); num
volume de sombreado mais claro, é por ela que se recalibra `DENSIDADE_MINIMA`.

Ao ler uma FEN, casa por casa, da 8ª fileira para a 1ª. As coordenadas estão
impressas na borda do diagrama do próprio livro: use-as.

**[piloto] O glifo de quem joga é um triângulo, não um quadradinho:** vazado =
brancas jogam, cheio = pretas jogam.

**[piloto] Nem todo diagrama da teoria é uma posição da partida.** Alguns são
marcados `(analysis)` e mostram a posição de uma **variante** — o `Diagram 3-2`
do volume 1 é a posição depois de `5...¤e5? 6.¤xf7! ¤xf7 7.¥xf7† ¢xf7 8.£h5† g6
9.£xc5`, impressa só para comparar com o `3-3`. Quem deduzir a FEN pela sequência
da partida grava uma posição errada que **replica perfeitamente**, porque não há
linha depois dela. **Leia o rótulo do diagrama, não só o número**, e deixe
`linha: []` nesses.

### [piloto] Os direitos de roque

A regra antiga (`-` para os dois, exceto quando a solução roca) produz FENs
legais e falsas, e o critério "a solução roca" é ambíguo porque em vários
exercícios o roque só aparece numa subvariante do comentário. A regra é outra:

**Grave os direitos que a posição realmente tinha.** Em muitos exercícios o autor
imprime a partida desde o lance 1 na seção de soluções — replique-a na `chess.js`
e os direitos saem de graça, junto com uma segunda leitura independente da FEN.
Onde a partida não vem inteira, o texto do autor costuma decidir (uma variante
com `O-O-O` prova que o direito existia). Onde nada permite saber, `-` e uma
linha em `avisos` dizendo isso.

*En passant* é `-` salvo quando a solução o joga. Meio-lance de contagem: `0 1`.

## Passo 3 — a conferência mecânica

```
node scripts/conferir-transcricao.ts M103            # sem motor
node scripts/conferir-transcricao.ts M103 --motor    # com o Stockfish
```

Para cada item, a `chess.js` valida a FEN e **replica a linha da solução
inteira**. Um lance ilegal quer dizer FEN transcrita errada — volte ao diagrama.
Depois o Stockfish mede o lance principal: se o lance do autor perde muito, isso
é aviso, não erro, e quase sempre significa uma peça no lugar errado.

**Nada é publicado com replicação ilegal.** Avisos do Stockfish são revistos um a
um e podem ficar.

## O JSON que sai

Um arquivo por capítulo, em `content/transcricao/M<vol><cap>.json`.

```jsonc
{
  "aula": "M103-PRINCIPIOS-DE-ABERTURA",
  "obra": "yusupov-build-up-1",          // o slug em content/sources.json
  "volume": 1,
  "capitulo": 3,
  "tituloOriginal": "Basic opening principles",
  "rotuloDoAutor": "Opening",            // o rótulo da seção de soluções
  "paginas": { "teoria": [31, 37], "exercicios": [38, 39], "solucoes": [40, 43] },

  "aprovacao": {                          // a régua impressa, como está
    "maximo": 31, "excelente": 25, "bom": 20, "minimo": 15, "pagina": 43
  },

  "principios": [                         // o que o capítulo afirma, em inglês,
    "Bring out your pieces quickly.",     // como o autor escreveu. Vira a etapa 1
    "Fight for the centre."               // depois de traduzido à mão.
  ],

  "teoria": [                             // os diagramas da teoria: vira a etapa 2
    {
      "id": "diag-3-1",
      "pagina": 32,
      "recorte": "p32-d1.png",            // a evidência de onde a FEN saiu
      "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1",
      "lado": "black",
      "partida": "Legal - Saint Brie, Paris 1750",
      "linha": ["Bg4", "h3", "Bh5", "Nxe5"],   // SAN, na ordem do livro; [] num (analysis)
      "comentario": "o texto do autor sobre esses lances, em inglês"
    }
  ],

  "exercicios": [                         // os doze, na ordem do livro
    {
      "id": "ex-3-1",
      "pagina": 38,
      "recorte": "p38-d1.png",
      "fen": "...",
      "lado": "white",                    // o triângulo do diagrama; tem de bater com a FEN
      "estrelas": 2,                      // a dificuldade impressa (1 a 3)
      "pontos": 2,                        // os pontos do LANCE PRINCIPAL — ver abaixo
      "pontosExtra": 1,                   // pontos que a tela não consegue medir
      "notaExtra": "Take 1 extra point if you took 2.Nc7+ into consideration.",
      "partida": "A.Yusupov - A.Khalifman, Ubeda 1997",   // "Sample game" quando não há nomes
      "solucao": ["Nb4", "Bd7", "Nc6"],   // a linha do livro, SAN, a partir da FEN
      "alternativas": [                   // outros lances que o autor credita
        { "lance": "Re1", "pontos": 1, "nota": "o texto do autor sobre ele" }
      ],
      "erros": [                          // lances que o autor nomeia como ruins
        { "lance": "Nxe5", "nota": "..." },
        { "lance": "Na5", "apos": ["Nb4", "Bd7"], "nota": "..." }
      ],
      "comentario": "a solução do autor, em inglês, como está impressa"
    }
  ],

  "avisos": [                             // tudo que não deu para ler com certeza
    "Ex. 3-7: os pontos saíram '(l point)' no OCR; lido da imagem como 1."
  ]
}
```

### [piloto] `pontos` contra `pontosExtra`

O Yusupov às vezes dá crédito por algo que **nenhuma interface consegue medir**:
"(2 points)" pelo lance, e três linhas abaixo *"Take 1 extra point if you took
this reply into consideration"*. O aluno joga um lance; ele não digita o que
considerou.

- `pontos` = os pontos do **lance principal**, o que o aluno pode ganhar jogando;
- `pontosExtra` = o resto do que o exercício vale na régua impressa, com o texto
  do autor em `notaExtra`.

O conferidor soma os dois contra o `maximo` impresso — é essa conta que prova a
transcrição inteira. A **régua da aula** sai só dos ganháveis: misturar os dois
inflaria a nota de corte com pontos que o aluno não tem como tirar.

### [piloto] `erros` e o campo `apos`

O autor nomeia como ruins, com frequência, lances que **não são jogáveis da
posição do diagrama** — respostas do outro lado, ou lances mais adiante na
variante. Para esses, `apos` guarda os lances que vêm antes, e o conferidor
replica a sequência antes de validar. Um lance do lado que não joga, sem
sequência que chegue até ele, fica só no `comentario`.

### O que o conferidor cobra

- FEN legal, e o lado a jogar da FEN igual ao campo `lado`;
- todo lance de `solucao`, `alternativas` e `erros` legal (com `apos` quando há);
- `solucao` replicável até o fim;
- doze exercícios, com ids `ex-<cap>-1` a `ex-<cap>-12`, em ordem;
- `soma(pontos) + soma(pontosExtra) === aprovacao.maximo`. **Esta é a melhor
  conferência que existe** — ela fecha a conta do livro inteiro. Se não fechar,
  algum ponto foi lido errado, e o conferidor diz quanto falta.

## O que acontece depois (não é trabalho do subagente)

Os **seis primeiros** exercícios de cada capítulo é que chegam ao aluno —
decisão do Doug em 2026-09-08, porque doze é lista de casa de adulto e o aluno
tem de 11 a 15 anos. São os seis da **primeira página impressa**, na ordem do
autor: quem escolhe continua sendo ele. Os outros seis ficam transcritos no JSON
e fora da aula; subir para doze depois é mudança de conteúdo, não de motor.

A nota de corte da aula é derivada, e a derivação está dita aqui para não virar
número mágico: soma-se os **pontos ganháveis** dos seis primeiros e aplica-se a
**mesma proporção** que o autor usa no capítulo (`minimo / maximo` da régua
impressa — nos capítulos medidos do volume 1 ela fica sempre perto de 48%).

## [piloto] Onde está o risco, medido

No capítulo 3 a teoria custou ~40% do tempo para 9 posições e os exercícios ~60%
para 12 — mas **as duas únicas decisões que podiam ter produzido conteúdo errado
e silencioso vieram as duas da teoria**: o `Diagram 3-2` que era análise
disfarçada, e um lance da partida (`13.£d3?`) que simplesmente não sobreviveu ao
extrator e só apareceu na imagem.

A razão é estrutural: nas soluções o autor imprime a partida inteira desde o
lance 1, então cada FEN de exercício nasce de **duas fontes independentes** — a
sequência replicada na `chess.js` e a leitura casa a casa do recorte — que se
confirmam uma à outra. Na teoria essa muleta não existe.

Se for preciso cortar escopo, a teoria é a parte cara. Se for preciso cortar
risco, é a parte que precisa de mais olho.
