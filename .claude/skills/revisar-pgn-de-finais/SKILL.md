---
name: revisar-pgn-de-finais
description: Roda os cinco revisores de aula de finais em série sobre o PGN — arquiteto, scaffolding, símbolos, voz e desenho —, cada um corrigindo a sua camada, com a assinatura conferindo entre um e outro, e devolve um relatório único sem commitar nada. Use quando o Doug pedir "/revisar-pgn-de-finais <ID>", ou antes de publicar uma aula de finais.
---

# `/revisar-pgn-de-finais <ID-DA-TRILHA>`

A revisão que acontece **antes de a aula existir**, no PGN. A outra é a `/revisar-aula`, que
mede a **tela** da aula já publicada. As duas não se substituem: o que a primeira não vê é a
montagem; o que a segunda não vê é a decisão didática antes de o arquivo virar aula.

**Nada aqui commita.** O `git diff` desfaz qualquer linha.

## A hierarquia, e por que ela é esta

| Ordem | Agente | O que **escreve** | O que **nunca** toca |
|---|---|---|---|
| 1 | `finais-arquiteto` | a planta: renomeia, reordena, funde capítulos | conteúdo novo |
| 2 | `finais-scaffolding` | **cria** passos, quadros e treinos que faltam | nomes e ordem |
| 3 | `finais-simbolos` | os símbolos (`!`, `?`, `$n`) | texto e desenho |
| 4 | `finais-voz` | o texto dentro das chaves | estrutura e símbolo |
| 5 | `finais-desenho` | `[%cal]` e `[%csl]` | texto |

Primeiro se sabe **para que serve a aula e quais posições ela usa** — sem isso o resto é
decoração. Depois o **andaime** que leva o aluno até lá. Só então símbolo, texto e desenho, que
são acabamento e dependem de uma planta que parou de mexer. **Desenho por último** porque "casa
citada é casa desenhada" depende do texto final.

## Os passos

### 0. Cópia de segurança

```bash
cp content/finais/estudos-aula/<ID>.pgn "$SCRATCHPAD/<ID>-antes-da-revisao.pgn"
```

### 1. A tabela do motor, uma vez só

```bash
node scripts/conferir-estudo-finais.ts content/finais/estudos-aula/<ID>.pgn
```

Guarde a saída. **Você a entrega aos agentes 1 e 3; nenhum deles roda o motor de novo.**

### 2. A assinatura de partida

```bash
node scripts/assinatura-da-aula.ts <ID> content/finais/estudos-aula/<ID>.pgn --gravar "$SCRATCHPAD/<ID>-0.json"
node scripts/publicar-aula-de-finais.ts <ID> content/finais/estudos-aula/<ID>.pgn --so-conferir
```

O `--so-conferir` **sozinho não basta**: ele conta só os problemas do julgamento e deixa
`PERDA` e `FORA` apenas impressos. A assinatura vê os dois, mais os capítulos, os textos, os
símbolos, os desenhos e as questões por treino.

### 3. Os cinco, em série, com a assinatura entre cada dois

Para cada agente, na ordem:

1. Chame o subagente com o `<ID>`, o caminho do PGN, a tabela do motor e o que os agentes
   anteriores relataram.
2. Confira a camada:

   ```bash
   node scripts/assinatura-da-aula.ts <ID> content/finais/estudos-aula/<ID>.pgn \
     --contra "$SCRATCHPAD/<ID>-<n-1>.json" --camada <arquiteto|scaffolding|simbolos|voz|desenho>
   ```

   **Saída 1 é um portão vermelho: pare a corrida e diga o nome do agente e o campo.** Não
   passe para o próximo — o agente seguinte escreveria em cima de um arquivo já torto.

   **O que a trava julga, e o que ela só lê.** As camadas são `capitulos`, `fens`, `lances`,
   `simbolos`, `textos`, `desenhos` e `questoesPorTreino`. Já `problemas`, `perdas` e `fora`
   são **leitura**: não são coisas que um agente escreve, são o que a régua diz sobre o
   arquivo depois. Elas ficam fora do julgamento de camada e têm régua própria — **piorar**
   para a corrida (um erro novo, uma perda nova, um capítulo que passou a ficar de fora);
   diminuir é o trabalho acontecendo.

   *Isto custou uma corrida para aparecer:* na primeira versão `problemas` entrava na
   comparação como qualquer campo, e o revisor de desenho que derrubou os avisos de 7 para 2
   foi acusado de sair da camada dele — pela própria prova de que tinha feito o trabalho. Três
   agentes acharam o defeito no mesmo dia, cada um por conta.
3. Grave a assinatura nova: `--gravar "$SCRATCHPAD/<ID>-<n>.json"`.

**Depois do agente 2**, e só dele, rode o motor de novo: ele é o único que cria posição, e o
`--so-conferir` não chama o Stockfish.

### 4. A segunda volta, se houver — e é uma só

Se o agente de voz escreveu alguma marca `PEDE QUADRO:`, rode os agentes **2 a 5** mais uma
vez, com aquelas marcas como pauta. **Uma vez, e depois nunca mais na mesma corrida.** Sem
marca, não há segunda volta.

### 5. O julgamento final

```bash
node scripts/conferir-estudo-finais.ts content/finais/estudos-aula/<ID>.pgn
node scripts/publicar-aula-de-finais.ts <ID> content/finais/estudos-aula/<ID>.pgn --so-conferir
node scripts/assinatura-da-aula.ts <ID> content/finais/estudos-aula/<ID>.pgn --contra "$SCRATCHPAD/<ID>-0.json"
git diff -- content/finais/estudos-aula/<ID>.pgn
```

## Sem paradas no meio

Tudo o que precisa do Doug vira **lista única no fim**. Só duas coisas param a corrida:

1. **um portão vermelho** — a assinatura acusando escrita fora da camada, ou `conferir-estudo`
   com lance ilegal;
2. **um agente que quebrou o arquivo** — o PGN deixou de montar.

Nos dois casos: diga o que aconteceu, mostre o `git diff`, e pare. Não tente consertar o
trabalho de um agente com outro agente.

## O relatório — um só, no fim

- **o que mudou** — antes → depois de cada frase, capítulo, símbolo e desenho, mais o diff de
  vocabulário do agente de voz;
- **a lista de decisões** — capítulo que talvez deva sair, divergência motor × professor,
  desenho que pede olho no tabuleiro, exceção de tema;
- **os números** — quantos achados da régua antes e depois, quantas falas reescritas contra o
  orçamento, quantos nós de treino apontam alvo;
- **o que não deu para medir**, por extenso. Trabalho verde e trabalho completo não são a mesma
  coisa.

E a instrução que fecha a `/revisar-aula` vale aqui: **se a aula passar limpa, desconfie e diga
isso.** Quem escreve e quem revisa são o mesmo agente.

## Quando ela roda sozinha

Ao publicar (`publicar-aula-de-finais.ts --publicar`), pelo hook de `.claude/settings.json`. É
caro e demorado, e é por isso que ela não roda a cada salvamento: reescreveria o texto embaixo
da mão de quem está escrevendo. Ao salvar um PGN de aula rodam só **as máquinas**, que são
segundos e custam zero.
