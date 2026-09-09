# Decisões que eu tomei sozinho

Este arquivo existe por causa da **Regra 1** do plano do redesenho
(`quero-melhorar-o-layout`): quando a corrida encontra uma escolha que é de
produto — sua, não minha — e você não está aqui, eu **escolho**, sigo, e escrevo
aqui o que decidi, qual era a alternativa e a linha para desfazer.

Nada aqui está trancado. Cada linha tem um "como desfazer" e é uma mudança
pequena. Como é git, o outro lado nunca se perde.

---

## Bloco 0 — o merge de `main` em `repertorio`

### 1. `content/tarefas.json`: o eixo dos níveis venceu o das semanas

**O conflito.** O `repertorio` reescreveu as tarefas do eixo *semana* para o eixo
*nível* (`s1-finais`, `s1-partidas`, `s1-anotacao`, `s1-coordenadas` → `n1-…`,
`n2-…`, …). O `main`, no mesmo período, **reescreveu o texto** de uma tarefa que
o `repertorio` já havia apagado: `s1-finais` virou *"Dominar 2 aulas de finais
(classe E)"*, com o detalhe novo *"As seis primeiras já estão abertas…"*.

**O que eu fiz.** Fiquei com a versão do `repertorio` inteira. O eixo do site
deixou de ser a data em 2026-09-09 (commit `394f75d`), e ressuscitar uma tarefa
`semana:` para preservar a redação nova seria reabrir uma decisão sua.

**O que se perdeu.** A redação nova do `main` para a tarefa de finais. Ela não
tem lugar no eixo novo: nenhuma tarefa `n1-*` fala de "dominar 2 aulas".

**Como desfazer.** `git show origin/main:content/tarefas.json` tem o texto
intacto; é copiar o `detalhe` para uma tarefa `n1-finais` nova.

### 2. `lib/finais/trilha.ts`: `Nivel` mora em `lib/curso/nivel.ts`, não aqui

**O conflito.** Os dois branches implementaram "níveis" na trilha de finais, e de
formas diferentes:

- O `main` criou `NIVEIS`, `NIVEL`, `type Nivel`, `nivelDaOrdem()` e `doNivel()`
  **dentro de** `lib/finais/trilha.ts`, e manteve a coluna `sabado` em cada aula.
- O `repertorio` importa `Nivel` de `lib/curso/nivel.ts` — a mesma casa que
  `lib/tatica/blocos.ts` usa — e apagou `sabado`.

**O que eu fiz.** Fiquei com a versão do `repertorio`. Uma escada de cinco níveis
que atravessa tática, finais e repertório não pode ter a sua definição morando
dentro do módulo de finais; e o próprio comentário do `main` dizia que `sabado`
sairia "na Etapa 2", que é exatamente o que o `repertorio` fez.

**O que eu trouxe do `main` mesmo assim** — porque é conteúdo, não arquitetura:

- A **reordenação do nível 1**, aula por aula: `N0-MATING-MATERIAL` passa a ser a
  ordem 1 e nasce **jogável** (`formato: "completa"`, era `"leitura"`);
  `N0-Q-MATE` ganha o nome novo *"a técnica do L"*. As outras 44 aulas não mudam.
- Os testes que protegem essa decisão: a contagem de formatos vira **9 completas,
  39 curtas, 1 leitura**, e nasce *"a ordem do nível 1 é a do documento, aula por
  aula"*, cravada por id.

**O que se perdeu.** As funções `doNivel()` e `nivelDaOrdem()` do `main`, e os
três testes dele que dependiam delas (tamanho de cada nível: 6, 6, 6, 16, 15; os
18 da meta da OLESC). O invariante de ordem continua testado no `repertorio`
("o nível de uma aula nunca é menor que o de uma aula anterior").

**Como desfazer.** `git show origin/main:lib/finais/trilha.ts` tem as funções.
Se elas voltarem, o lugar certo é `lib/curso/nivel.ts`, recebendo a `ordem`.

### 3. O merge de volta no `main` ficou para você

**Por quê.** O branch `main` está **checkout em outra worktree**
(`C:/Users/Lenovo/Desktop/preparatorio-olesc`). Mexer num branch que está aberto
noutra pasta é a forma mais fácil de deixar aquela pasta num estado que ninguém
entende — e você não está aqui para ver acontecer.

**O que eu fiz em vez disso.** O `repertorio` recebeu o `main` inteiro e ficou
verde nos cinco portões; o redesenho corre num branch novo, `layout-escuro`,
tirado dele. Quando você voltar, o `main` recebe tudo de uma vez.

**Como terminar** — na pasta `preparatorio-olesc` (a do `main`):

```
git merge repertorio     # avanço direto, sem conflito: o repertorio já tem tudo
```
