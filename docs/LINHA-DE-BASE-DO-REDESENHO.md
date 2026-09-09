# A linha de base do redesenho, medida antes de tocar em um pixel

Este arquivo existe para que o "ficou melhor" do redesenho seja um número, e não
uma impressão. Ele é medido de novo no fim, na mesma máquina, com a mesma receita.

## Como estas medidas foram tiradas

Servidor de desenvolvimento local, aluno de ensaio (`alunoteste`, `scripts/aluno-de-teste.ts`),
**sem nenhum progresso gravado**. Viewport de 360 × 740 px pela receita desta
máquina — `Emulation.setDeviceMetricsOverride` via CDP, porque o
`browser_resize`/`setViewportSize` do Playwright **não** leva a janela do Chrome
abaixo de ~540 px neste Windows.

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setDeviceMetricsOverride',
  { width: 360, height: 740, deviceScaleFactor: 1, mobile: true });
```

> **Uma ressalva honesta.** A conta de ensaio está zerada. Um aluno **com**
> progresso vê o mesmo esqueleto — os 36 cartões de tema aparecem de qualquer
> jeito —, mas alguns blocos ganham linha de texto. A altura real de um aluno
> com progresso é **maior** que a medida abaixo, não menor.

## Antes — `/painel`, 2026-09-09, commit `7be74ba`

| O que | Medido |
|---|---|
| Altura de rolagem a 360 px | **5.661 px** |
| Isso em telas de 740 px | **7,65 telas** |
| Links `<a href>` | **50** |
| Destinos distintos | 43 |
| Botões | 1 |
| `<section>` | **8** |

Os oito títulos, na ordem em que o aluno os encontra:

1. Aluno de Teste  2. Hoje  3. Nível 1 de 5  4. O seu nível
5. A agenda  6. Curso de tática  7. Repertório do clube  8. Curso de finais

## As metas do redesenho, na ordem

1. O cartão **AGORA** inteiro visível sem rolar, com o botão dentro da dobra.
2. O nível visível sem procurar.
3. Alguma barra de progresso visível.
4. Links do painel: de **50** para **menos de 15**.

Um `/painel` de 1,5 a 2 telas é aceitável. O problema nunca foi rolar; foi rolar
**antes** de achar informação útil.

## Depois — `/painel`, fim do Bloco 4, commit do treinador

Mesma máquina, mesma receita, mesma conta de ensaio zerada.

| O que | Antes | Depois | |
|---|---|---|---|
| Altura de rolagem a 360 px | 5.661 px | **1.502 px** | −73% |
| Isso em telas de 740 px | 7,65 | **2,03** | |
| Links na página inteira | 50 | **20** | −60% |
| Links dentro do `<main>` | 50 | **7** | −86% |
| Destinos distintos | 43 | **8** | |
| `<section>` no `<main>` | 8 | **4** | |

Os 13 links que sobraram fora do `<main>` são o **cabeçalho**, que não existia
antes: 7 destinos no topo (desktop) e 6 na barra de baixo (celular). Eles são
navegação, e a comparação honesta do conteúdo do painel é a linha do `<main>`.

### As três metas, na ordem em que foram cobradas

1. **O "AGORA" inteiro visível sem rolar, com o botão dentro da dobra** — o
   botão termina em **y = 332** de uma dobra de 740. ✅
2. **O nível visível sem procurar** — a escada dos cinco degraus termina em
   **y = 625**, inteira acima da dobra, e o número também está no cabeçalho. ✅
3. **Alguma barra de progresso visível** — a barra do dia está na dobra. ✅
4. **Links do painel abaixo de 15** — 7 no `<main>`. ✅

Nenhum estouro horizontal a 360 px.

## Depois — o site inteiro, fim do Bloco 6

Mesma receita, mesma conta de ensaio. O `/painel` cresceu 166 px em relação à
medida do Bloco 4 porque os selos entraram depois — são os 2,25 abaixo.

| Tela | Altura a 360 px | Telas | Links | Topo | Barra de baixo |
|---|---|---|---|---|---|
| `/painel` | 1.668 px | 2,25 | 20 | ✓ | ✓ |
| `/tatica` | 4.649 px | 6,28 | 49 | ✓ | ✓ |
| `/finais` | 4.707 px | 6,36 | 16 | ✓ | ✓ |
| `/aberturas` | 2.653 px | 3,59 | 33 | ✓ | ✓ |
| `/trilha` | 5.569 px | 7,53 | 103 | ✓ | ✓ |
| `/partidas` | 795 px | 1,07 | 19 | ✓ | ✓ |
| `/finais/N1-KPK` (o palco) | 816 px | 1,10 | 1 | — | — |

**Nenhuma tela estoura na horizontal a 360 px.**

### O que estes números dizem, e o que eles não dizem

As telas de **lista** continuam longas, e isso é o certo: a `/tatica` mostra 36
temas, a `/trilha` mostra 49 aulas mais 36 temas em cinco degraus. Elas são
catálogo por natureza, e catálogo rola. O que mudou é que **o aluno não começa
mais nelas**: o `/painel` decide por ele, e as listas passaram a ser o lugar
aonde se vai quando se quer escolher — não o lugar onde se cai.

O **palco da aula** é a única tela sem cabeçalho e sem barra, de propósito: a
altura dele é medida contra a janela, e cada pixel de casca sairia do tabuleiro.
Ele passa dos 740 px por 76 — era 836 px antes desta rodada, e a invariante de
"não rolar" já cedia ali; não é regressão do redesenho.

### Zero páginas órfãs

Contado sobre o código: toda rota de aluno tem pelo menos um link apontando para
ela. A `/partidas`, que tinha **zero** e só era alcançável digitando a URL, tem
seis. A `/trilha`, que tinha um enterrado dentro de `/finais`, tem dois.
