# Mapa das páginas — série do Yusupov

Onde cada capítulo do módulo de meio-jogo começa e termina dentro do PDF. É a
folha de rota do pipeline de transcrição (§F do plano): o subagente que
transcreve um capítulo recebe daqui as três faixas de página — teoria,
exercícios e soluções — e não precisa procurar.

Os seis PDFs estão em `biblioteca/`, com o nome igual ao slug da obra —
`yusupov-build-up-1.pdf`, `yusupov-boost-1.pdf`, `yusupov-evolution-1.pdf`,
`yusupov-build-up-2.pdf`, `yusupov-boost-2.pdf` e `yusupov-evolution-2.pdf` —,
como todas as obras do corpus. As entradas do registro estão em
`content/sources.json` com esses mesmos slugs.

**Todas as páginas abaixo são páginas do PDF**, não a página impressa. No volume 1
o deslocamento medido é `página impressa + 1 = página do PDF`.

## O formato, medido

Todo capítulo da série tem a mesma anatomia, e é ela que vira a aula:

| parte do capítulo | vira | como se reconhece a página |
|---|---|---|
| teoria, com diagramas `Diagram N-k` | etapa 2 (exemplo) | muito texto (190–340 palavras), 0–2 diagramas |
| duas páginas `Exercises`, doze diagramas `Ex. N-1` a `Ex. N-12` | etapa 3 (exercícios) | pouco texto (59–121 palavras), 3–6 diagramas |
| soluções: lance certo, pontos por lance, e a régua de aprovação | gabarito e régua | muito texto, 0 diagramas, termina em `Scoring` |

A separação "pouco texto + muitos diagramas" é o que distingue a dupla de
exercícios das páginas de teoria, e foi assim que as faixas abaixo foram
medidas — não a olho.

## Volume 1 — *Build Up Your Chess 1: The Fundamentals* (266 p., com camada de texto)

Seis capítulos entram, e são a entrega de sexta 11/9. Medido em 2026-09-07 com
`pdftotext -layout`.

| aula | cap. | título | teoria | exercícios | soluções |
|---|---|---|---|---|---|
| `M103-PRINCIPIOS-DE-ABERTURA` | 3 | Basic opening principles | 31–37 | **38–39** | 40–43 |
| `M106-O-VALOR-DAS-PECAS` | 6 | The value of the pieces | 65–69 | **70–71** | 72–74 |
| `M108-CENTRALIZAR-AS-PECAS` | 8 | Centralizing the pieces | 83–86 | **87–88** | 89–92 |
| `M113-REALIZAR-VANTAGEM-MATERIAL` | 13 | Realizing a material advantage | 129–133 | **134–135** | 136–138 |
| `M114-COLUNAS-ABERTAS-E-POSTOS` | 14 | Open files and outposts | 139–143 | **144–145** | 146–148 |
| `M120-PONTOS-FRACOS` | 20 | Weak points | 193–197 | **198–199** | 200–202 |

Doze exercícios por capítulo, seis por página: **72 exercícios localizados**.

### A régua de aprovação de cada capítulo

Lida da página de `Scoring`. Onde está `?`, a linha não sobreviveu ao OCR do
`pdftotext` e tem de ser lida da imagem na transcrição — o gate confere o máximo
de outro jeito, somando os pontos dos doze exercícios.

| cap. | máximo | excelente | bom | **nota de corte** | página |
|---|---|---|---|---|---|
| 3 | 31 | 25 | 20 | **15** | 43 |
| 6 | 19 | 16 | 13 | **9** | 74 |
| 8 | 27 | ? | ? | **12** | 92 |
| 13 | ? | 18 | 15 | **11** | 138 |
| 14 | ? | 17 | 14 | **10** | 148 |
| 20 | 23 | 20 | 17 | **12** | 202 |

A nota de corte é o que o motor usa: `exercises.aprovacao.minimo`. "Aula
concluída" é chegar nela, e não acertar tudo — é a régua do próprio autor, e ela
já prevê que um aluno da faixa erre uma parte.

## Os outros cinco volumes

Ainda não mapeados página a página — cada um é mapeado no P que o transcreve
(P5 a P8 do plano). Os capítulos que entram estão no `role` de cada entrada do
`content/sources.json` e no plano.

| vol. | slug | camada de texto? | capítulos que entram | quando |
|---|---|---|---|---|
| 1 | `yusupov-build-up-1` | sim | 3, 6, 8, 13, 14, 20 | P0–P4 (7 a 11/9) |
| 3 | `yusupov-evolution-1` | sim | 5, 11, 14, 22 + 6, 8, 10, 13, 15, 17 | P5 (12 a 15/9) |
| 2 | `yusupov-boost-1` | **não** (116 MB de imagem) | 2, 4, 5, 7, 11, 14, 18, 22 | P6 (15 a 18/9) |
| 6 | `yusupov-evolution-2` | sim | 2, 3, 5, 6, 7, 9, 10, 14, 15, 17, 20, 21, 22, 24 | P7 (19 a 25/9) |
| 5 | `yusupov-boost-2` | sim | 1, 2, 6, 9, 14, 17, 21 | P8 (26/9 a 2/10) |
| 4 | `yusupov-build-up-2` | **não** (36 MB de imagem) | 6, 8, 13, 14, 18, 23 + 4, 16 | P8 (26/9 a 2/10) |

A ordem de execução põe os volumes **com** texto antes dos **sem** texto dentro
de cada nível. Na tela o aluno vê tudo na ordem da série (volume 1 → 6); o que
ainda não foi escrito aparece como "em escrita", o padrão de finais.

O Tesseract OCR foi instalado em 2026-09-07 (`winget install
UB-Mannheim.TesseractOCR`) justamente para os volumes 2 e 4: neles o passo F.1 do
pipeline é `pdftoppm` + `tesseract` em vez de `pdftotext`.
