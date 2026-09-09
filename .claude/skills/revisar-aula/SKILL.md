---
name: revisar-aula
description: Confere uma aula de finais pronta no site local — gates, voz, flechas, tempo, experiência e coerência —, corrige o que dá para corrigir e devolve um relatório com o antes e o depois. Use quando uma aula de `content/lessons/` acabou de ser escrita ou alterada, ou quando o Doug pedir "/revisar-aula <ID>".
---

# `/revisar-aula <ID>` — a régua rodando

Uso: `/revisar-aula N1-KPK`.

Sem isto, `docs/VOZ-DO-CURSO.md` é um conselho que a aula 2 já esquece. Esta
skill é a régua **rodando**: ela abre a aula no navegador de verdade, joga-a, e
mede cada quesito contra um número.

**Nenhum número mora aqui.** Todos vêm de `docs/VOZ-DO-CURSO.md` §3, lidos por
`lerRegua()`. Se você precisar de um teto para decidir alguma coisa, leia o
documento — não escreva o número nesta página nem no seu relatório como se fosse
seu. Duas cópias de um teto são duas opiniões sobre a régua.

---

## 1. Os gates, antes de olhar qualquer tela

```
npm run typecheck && npm run lint && npm test && npm run validate:content
```

**Gate vermelho encerra a revisão ali.** Não se revisa a experiência de uma aula
que não compila: o que você veria na tela seria a versão anterior, ou nada.
Diga qual gate caiu, cole a saída dele, e pare.

## 2. O site local

Se já houver um `next dev` no ar em `localhost:3000`, use o que existe — subir
um segundo só ocuparia outra porta e confundiria a medida. Senão:

```
npm run dev
```

e espere `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
responder `200`.

**A aula exige login.** `lib/supabase/sessao.ts` só deixa `/` e `/entrar`
abertas. O `sessao.mjs` desta pasta resolve isso sem senha nenhuma: ele usa a
chave de serviço do `.env.local` para gerar um acesso de uso único da conta de
ensaio (`alunoteste`) e o transforma nos cookies que o `@supabase/ssr` leria.
Não escreve nada no banco. Trocar de conta é `USUARIO_DE_ENSAIO=professorteste`.

## 3. A medição

```
node .claude/skills/revisar-aula/medir.mjs <ID>
```

Ele leva ~2 minutos, roda nas duas telas (1366×768 e 390×844), **joga o treino
inteiro até a promoção com o mouse**, e imprime uma linha por quesito: `ok` ou
`✗`. As linhas com `·` são observações para o olho humano, não reprovações.

**Nenhuma imagem entra na conversa.** Uma captura custa ~4.800 tokens e é relida
a cada turno até o fim da sessão. Se o Doug pedir para ver, gere **uma folha de
contato só** — as três telas lado a lado, num arquivo em disco — e mande um
subagente lê-la e devolver a descrição medida em texto. Nunca N imagens soltas,
e nunca reabra uma imagem já descrita.

---

## 4. Os cinco quesitos, e o que cada um mede

| Quesito | O que é medido, e por quem |
|---|---|
| **Voz e texto** | `node --test lib/lesson/voz.test.ts` — teto de caracteres por fala, teto de palavras por frase e a lista de palavras de bastidor, sobre `content/lessons/*.json` **e** sobre `lib/lesson/falas.ts`. O que a máquina **não** mede está na §7 do documento: "uma ideia por fala", elogio vazio, exclamação, repreensão. Esses você lê. |
| **Flechas e casas** | `medir.mjs`: toda casa citada numa fala está desenhada naquele passo; todo desenho é citado; a etapa 2 tem seta em **todos** os nós; nenhuma seta liga a origem ao destino do lance certo; a etapa 3 tem **zero** desenho. |
| **Tempo** | `medir.mjs`: a duração da aula assistida contra a faixa da régua; e o comentário **nunca pagina** — se paginou, a fala passou do teto. `Pausar` segura por 10 s. |
| **Experiência** | `medir.mjs`: rolagem zero nas três telas e nas duas resoluções (página **e** blocos internos); botões acima do alvo mínimo, que muda com o que aponta. |
| **Coerência da aula** | O treino jogado até o fim com o mouse; e a linha do roteiro é a linha da árvore (`lib/lesson/roteiro.test.ts`). As três etapas jogarem a MESMA posição já é recusa de arquivo (`lessonSchema`), então não se confere de novo aqui. |

---

## 5. O que você conserta, e o que você marca

**Conserte o que precisar.** Texto fora da régua, rótulo de bastidor, casa
citada e não desenhada, botão duplicado: corrija na árvore de trabalho e
**não commite nada**. O git é a rede — desfazer é um `git diff` de distância.

**Uma exceção, e ela não é burocracia: flecha e casa acesa são julgamento de
xadrez.** Aplique a correção que você consegue justificar em uma frase, e marque
cada uma no relatório como **"conferir no tabuleiro"**. É o que a §10 da
`docs/TRILHA-FINAIS.md` já manda para toda posição deste módulo: *"o gate pega
resultado errado, não diagrama lido errado… é a única verificação que máquina
nenhuma faz aqui."*

**Se a etapa 3 falhar por lentidão do motor** — o Stockfish em WASM leva tempo
para carregar, e mais ainda numa máquina ocupada —, diga isso com essas
palavras. Não reprove a aula por um relógio.

---

## 6. O relatório

- os cinco quesitos, cada um com o número que saiu, não com um adjetivo;
- **o antes e o depois de cada frase trocada**, para a correção ser lida e não
  só aceita;
- as flechas marcadas como "conferir no tabuleiro";
- **o que você não conseguiu medir, por extenso.** Trabalho verde e trabalho
  completo não são a mesma coisa — é a §7.4 do `docs/HANDOFF-ASTRA-CONTEXTO.md`,
  e a seção é obrigatória mesmo que curta.

**Se a aula passar limpa, desconfie e diga isso.** Quem escreve a aula e quem a
revisa passam a ser o mesmo agente, e um revisor que arruma o próprio texto
tende a se aprovar. Uma aula recém-escrita que sai verde de primeira é sinal de
que a régua está frouxa — e aí o que sobe é a régua, não o elogio.

---

## 7. Dívida conhecida, para não a redescobrir a cada aula

Em **390×844 a página rola 76 px, nas três telas**, e isso é defeito do
orçamento de altura do cabeçalho, não da aula: `app/globals.css` reserva 50 px
para ele e um título real gasta 128. Está medido na §7.5 de
`docs/VOZ-DO-CURSO.md`. Enquanto ele não for consertado, `medir.mjs` vai
reprovar três linhas de "experiência" no celular em **toda** aula. Não gaste a
revisão nisso: cite a dívida e siga.
