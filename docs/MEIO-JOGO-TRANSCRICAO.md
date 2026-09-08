# Como se transcreve um capítulo do Yusupov

A receita do passo **F** do plano do meio-jogo. É o que um subagente de
transcrição recebe: entra um capítulo de PDF, sai um JSON bruto com as posições,
os lances e os pontos do livro. A prosa em português **não** sai daqui — ela é
escrita depois, à mão, no passo F.4.

O mapa das páginas de cada capítulo está em `docs/MEIO-JOGO-YUSUPOV-MAPA.md`.

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

Serve para: as soluções (lances, pontos, nome da partida, régua de aprovação) e
a teoria. **Não serve para as FENs** — o texto de um diagrama sai como colunas
de números soltos.

Nos volumes **2** e **4** não há camada de texto. Lá o passo 1 é
`pdftoppm -png -r 300 -gray` seguido de `tesseract <png> - --psm 6`, e o
resultado é mais sujo: confira contra a imagem tudo que for número de ponto.

As figurinhas viram letras latinas e sujeira: `lLl`/`tLl`/`lZl` é o cavalo,
`gd`/`E:`/`!!:`/`1'1` é a torre, `i`/`.i`/`,t`/`ib` é o bispo, `W`/`\W`/`1W` é a
dama, `i>`/`'it>`/`l!i`/`m` é o rei. O `t` colado no fim de um lance é o `+` de
xeque. Não adivinhe: leia a linha inteira e confira o lance na posição.

## Passo 2 — os diagramas

```
python scripts/recortar-diagramas.py "<pdf>" <pagina> <pasta> --dpi 300
```

Escreve `p<pagina>-full.png` (a página inteira, reduzida — é onde se leem os
rótulos `Ex. N-k`, as estrelas de dificuldade e o glifo de quem joga) e
`p<pagina>-d1.png` … `-d6.png`, um por diagrama, na ordem de leitura do livro,
com uns 95 pixels por casa.

**Leia sempre a página inteira primeiro**, para saber qual recorte é qual
exercício, e só depois os recortes. Se o script achar um número de diagramas
diferente do esperado, diga isso em `avisos` e leia a página inteira — não force.

Ao ler uma FEN, casa por casa, da 8ª fileira para a 1ª. As coordenadas estão
impressas na borda do diagrama do próprio livro: use-as. O glifo de quem joga é
um quadradinho branco (brancas jogam) ou preto (pretas jogam) ao lado do rótulo.

Direitos de roque e *en passant*: um diagrama de meio-jogo raramente diz. Escreva
`-` para os dois, **exceto** quando as torres e o rei estão nas casas de origem e
o texto da solução usa o roque; aí escreva o direito que a solução usa. Meio-lance
de contagem: `0 1` sempre.

## Passo 3 — a conferência mecânica

```
npx tsx scripts/conferir-transcricao.ts <arquivo.json>
```

Para cada item, a `chess.js` valida a FEN e **replica a linha da solução
inteira**. Um lance ilegal quer dizer FEN transcrita errada — volte ao diagrama.
Depois o Stockfish mede o lance principal: se o lance do autor perder muito, isso
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
      "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1",
      "lado": "black",
      "partida": "Legal - Saint Brie, Paris 1750",
      "linha": ["Bg4", "h3", "Bh5", "Nxe5"],   // SAN, na ordem do livro
      "comentario": "o texto do autor sobre esses lances, em inglês"
    }
  ],

  "exercicios": [                         // os doze, na ordem do livro
    {
      "id": "ex-3-1",
      "pagina": 38,
      "recorte": "p38-d1.png",
      "fen": "...",
      "lado": "white",                    // o glifo do diagrama, e tem de bater com a FEN
      "estrelas": 2,                      // a dificuldade impressa (1 a 3)
      "pontos": 2,                        // os pontos do lance principal
      "partida": "A.Yusupov - A.Khalifman, Ubeda 1997",
      "solucao": ["Nb4", "Bd7", "Nc6"],   // a linha do livro, SAN, a partir da FEN
      "alternativas": [                   // outros lances que o autor credita
        { "lance": "Re1", "pontos": 1, "nota": "o texto do autor sobre ele" }
      ],
      "erros": [                          // lances que o autor nomeia como ruins
        { "lance": "Nxe5", "nota": "..." }
      ],
      "comentario": "a solução do autor, em inglês, como está impressa"
    }
  ],

  "avisos": [                             // tudo que não deu para ler com certeza
    "Ex. 3-7: os pontos saíram '(l point)' no OCR; lido da imagem como 1."
  ]
}
```

### Regras que o conferidor cobra

- FEN legal, e o lado a jogar da FEN igual ao campo `lado`;
- todo lance de `solucao`, `alternativas` e `erros` legal a partir da FEN;
- `solucao` replicável até o fim;
- doze exercícios, com ids `ex-<cap>-1` a `ex-<cap>-12`, em ordem;
- a soma dos `pontos` dos doze igual a `aprovacao.maximo`. **Esta é a melhor
  conferência que existe** — ela fecha a conta do livro inteiro. Se não fechar,
  algum ponto foi lido errado, e o conferidor diz quanto falta.

## O que acontece depois (não é trabalho do subagente)

Os **seis primeiros** exercícios de cada capítulo é que chegam ao aluno —
decisão do Doug em 2026-09-08, porque doze é lista de casa de adulto e o aluno
tem de 11 a 15 anos. São os seis da **primeira página impressa**, na ordem do
autor: quem escolhe continua sendo ele. Os outros seis ficam transcritos no JSON
e fora da aula; subir para doze depois é mudança de conteúdo, não de motor.

A nota de corte da aula é derivada, e a derivação está dita aqui para não virar
número mágico: soma-se os pontos dos seis primeiros e aplica-se a **mesma
proporção** que o autor usa no capítulo (`minimo / maximo` da régua impressa —
nos capítulos medidos do volume 1 ela fica sempre perto de 48%).
