---
name: aluno-de-ensaio
description: Abre uma aula de finais no navegador e a joga como um aluno que não sabe a resposta — errando de propósito para ver se o erro tem nome, conferindo o alvo aceso no treino 1 e apagado no treino 2, e a prática nua. Use quando o Doug pedir "/aluno-de-ensaio <ID>", ou depois de publicar ou republicar uma aula de finais.
---

# `/aluno-de-ensaio <ID>` — jogar como quem não sabe

A `/revisar-aula` mede a aula **do arquivo para a tela**: lê o pacote e confere que a tela bate.
Este ensaio faz o contrário — ele **erra de propósito** e vê o que a tela responde.

## Por que ele existe, e o que só ele pega

Em 17/9/2026 descobriu-se que **nenhum treino de aula v2 mostrava desenho nenhum**. O PGN estava
certo, o `[%csl]` estava no nó da análise, e quem perdia o desenho era a **montagem**:
`lib/editor-v2/treinos.ts` nunca preenchia `questao.desenhos`, e `treino-jogavel.ts` lia
exatamente esse campo.

**Nenhuma leitura de arquivo acusaria isso, porque o arquivo estava bom.** Só um ensaio que
olha a tela pega um cano furado no meio.

E arrastar **só se prova com a mão**: o chessground recusa evento disparado por script. O que
não for jogado com o mouse não está provado.

## Como rodar

O site local precisa estar no ar (`npm run dev`, `curl` em `localhost:3000` respondendo 200) —
a `/revisar-aula` §2 explica a sessão sem senha, e este ensaio usa o mesmo `sessao.mjs`.

```
node .claude/skills/aluno-de-ensaio/aluno.mjs <ID>
```

Variáveis: `LARGURA_DO_ENSAIO` / `ALTURA_DO_ENSAIO` (padrão 1366×768),
`USUARIO_DE_ENSAIO` (padrão `alunoteste`), `BASE_DA_REVISAO`.

**Nenhuma imagem sai daqui.** Só número e texto. Se o Doug quiser ver, gere **uma** folha de
contato e mande um subagente lê-la.

## O que ele mede, treino a treino

| Quesito | O que ele faz |
|---|---|
| **o alvo aceso no treino 1** | conta os desenhos **no SVG do chessground** antes do primeiro lance. Tem de ser > 0 |
| **o alvo apagado do treino 2 em diante** | o mesmo, e tem de ser 0 — é a régua do apoio decrescente (`COMO-FAZER` §1.1) vista pelos olhos do aluno, não lida no arquivo |
| **erro com nome** | joga um lance **legal e errado**, de preferência um que a aula catalogou, e confere que a fala do professor muda e não fica vazia |
| **errar não avança** | o tabuleiro continua de pé; a lição não pula para o lance seguinte |
| **a linha até o fim** | arrasta cada lance do método com o mouse, e o painel tem de terminar em "Pronto." |
| **a prática nua** | zero desenho em cada prática: ali o juiz é o resultado |

## O que ele **não** mede, e é declarado

- **A seta vermelha do perigo no feedback do treino não tem tela.** `treino-jogavel.ts` mostra
  o feedback só como texto. Enquanto não houver tela, não há o que medir — e não se promete o
  que não aparece.
- **Rolagem, alvos de toque e tempo** são do `medir.mjs`. Este ensaio não os repete.
- **Ele não julga xadrez.** Se o erro que ele escolheu for um lance que por acaso também ganha,
  a mensagem pode ser a de "vitória fora do método" — e isso é certo, não defeito. Leia a fala
  que ele imprime antes de reprovar.

## O relatório

- uma linha por quesito, com o número, e a fala do professor entre aspas;
- **o que você não conseguiu medir, por extenso**;
- se a aula passar limpa, **desconfie e diga isso**.
