---
name: aula-de-finais
description: Faz, corrige ou publica uma aula de finais a partir de um estudo do Lichess (ou PGN) — baixar, conferir com o motor, reescrever na convenção INTRODUÇÃO/AULA/TREINO/PRÁTICA, montar, conferir e publicar como aula v2 com o id da trilha. Use quando o Doug pedir "/aula-de-finais <ID> <estudo>", ou pedir para transformar um estudo em aula de finais.
---

# /aula-de-finais <ID-DA-TRILHA> <estudo do Lichess ou arquivo .pgn>

O mestre é `docs/COMO-FAZER-UMA-AULA-DE-FINAIS.md`. **Leia inteiro antes de começar**, e também:
`docs/VOZ-DO-CURSO.md` §3 a §5, as regras de símbolos e de comentário opcional do `AGENTS.md`, a linha
da aula em `docs/TRILHA-FINAIS.md` §5 e §5.1 ("sai sabendo"), e o modelo pronto
`content/finais/estudos-aula/N0-Q-MATE.pgn`.

## Passos

1. **Baixar** o estudo (`https://lichess.org/api/study/<id>.pgn?comments=true&variations=true&orientation=true`)
   para o scratchpad — PGN de terceiros não entra no repositório.
2. **Conferir a fonte:** `node scripts/conferir-estudo-finais.ts <arquivo>`. Anote cada erro e aviso.
3. **Reescrever** em `content/finais/estudos-aula/<ID>.pgn`, na convenção do doc (§1) e com o checklist
   (§4). Texto nosso, em português, dentro da régua de voz. Símbolos da fonte ficam.
   Posição adaptada: só com nota no relatório e o motor reconferindo (§2).
4. **Conferir de novo** até ficar limpo:
   - `node scripts/conferir-estudo-finais.ts content/finais/estudos-aula/<ID>.pgn`
   - `node scripts/publicar-aula-de-finais.ts <ID> content/finais/estudos-aula/<ID>.pgn --so-conferir`
     (nenhum `PERDA`, nenhum `FORA`, 0 erro; aviso só se for decisão declarada)
5. **Publicar** — uma aula por vez, nunca em paralelo:
   `node scripts/publicar-aula-de-finais.ts <ID> content/finais/estudos-aula/<ID>.pgn --publicar [--substituir] [--empate N] --link <url> --obra "<nome>"`
6. **Ver no navegador** com a conta de professor: `/finais/<ID>`, as quatro etapas, com "Voltamos a…"
   nas comparações.
7. **Portões** (`typecheck`, `lint`, `test`, `validate:content`, `build`) e diário
   (`docs/MODO-EDITOR-ONDE-PARAMOS.md`) antes do commit.

## Relatório para o Doug

- lista curta do que mudou em relação à fonte;
- **posições adaptadas** (qual, o que mudou, o que o motor diz antes e depois);
- divergências do motor que ficaram, e por quê;
- símbolo que saiu de algum lance (deve ser nenhum sem decisão do Doug);
- a saída final do `--so-conferir`.
