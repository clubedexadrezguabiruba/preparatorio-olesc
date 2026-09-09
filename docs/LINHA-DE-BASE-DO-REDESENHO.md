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

## Depois — o resto do site

_(preenchido no fim do Bloco 6)_
