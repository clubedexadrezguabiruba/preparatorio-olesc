# A voz do curso — quem fala com o aluno, e com que palavras

> Escrito em 2026-09-08, junto com a reforma da Etapa 1 da `N1-KPK`.
>
> **Este documento é uma régua, não um conselho.** Os números da §3 são lidos
> por uma máquina (`lib/lesson/voz.test.ts`) e por uma skill
> (`.claude/skills/revisar-aula/`), e nenhum dos dois tem cópia própria deles:
> quem quiser mudar a régua muda **aqui**, e os dois passam a cobrar o número
> novo. Duas cópias de um teto seriam duas opiniões sobre a régua.
>
> Ele vale para **o site inteiro** — finais, aberturas, tática, painel, índice.
> O que ele **ainda não fez** é varrer as telas antigas: a §7 declara isso com
> todas as letras, e a dívida é minha, não do documento.

---

## 1. Por que este documento existe

Três réguas de voz já existiam neste repositório, espalhadas, e elas não se
contradizem:

- `docs/HANDOFF-ASTRA-CONTEXTO.md` §3 — *"a idade de 11 a 15 é a régua da
  linguagem"* —, §6.2 (o vocabulário da casa) e §7 (o padrão editorial);
- `docs/REPERTORIO.md` §5 — *"português de adolescente de 12 anos, frase curta,
  sem jargão de adulto e sem falar com o aluno como se ele tivesse 8"* — e a
  medição da §8.1, que é a razão de este documento existir;
- a voz que os textos já praticam sem nunca ter sido escrita: "você" direto,
  travessão puxando a consequência, casa nomeada concretamente, erro que explica
  a consequência em vez de repreender.

O que faltava era **quem fala** (§2), **quanto ele fala** (§3) e **o que ele não
diz** (§4). Faltava, sobretudo, um número: a §8.1 do repertório mediu **20 de 98
comentários com uma frase de 32 palavras ou mais**, a maior com 47 — sob uma
régua que já pedia "frase curta" desde sempre. Régua sem número não pega.

---

## 2. Quem é o professor

**É uma pessoa, e ela tem nome: o professor Douglas.** Ele já tem retrato
(`components/lesson/Professor.tsx`) e já se apresenta na tela
(`ProfessorSeApresenta.tsx`). Tudo o que a tela diz ao aluno sai da boca dele.

Disso decorre o resto:

- **Ele fala com um aluno, não com uma turma.** "Você", nunca "vocês", nunca
  "nós" institucional. "Vamos ver" é reunião; "olha o que acontece" é aula.
- **Ele não dá parabéns por nada.** Elogio vazio — "muito bem!", "excelente!",
  "você está indo ótimo!" — não é reforço, é ruído: o aluno de 11 anos que
  ouve isso a cada lance para de ouvir. O que substitui o elogio é **dizer o
  que o lance conseguiu**: "o peão em b6 está defendido pelo rei em c7" ensina;
  "isso!" não.
- **Ele não avisa que algo é fácil.** "É simples", "é só", "basta" — quem erra
  depois disso não erra um exercício, erra um exercício fácil.
- **Ele não repreende.** Erro é consequência, não falta: *"o seu rei tapou o
  caminho do peão"* em vez de *"cuidado! você não devia ter feito isso"*.
- **Ele não fala de si nem do sistema.** O aluno não precisa saber que existe
  uma etapa, um critério de domínio ou um roteiro. Ele precisa saber o que
  fazer com as peças.

O molde é o treinador do chess.com, medido em `docs/REFERENCIA-MOVE-TRAINER.md`
— e o que se copiou dele foi a **forma** (uma fala por vez, ao lado de um
retrato, num balão com bico), nunca as palavras.

---

## 3. Os números

Estes são os tetos, e são eles que a máquina lê. **Não os copie para lugar
nenhum:** quem precisa deles os lê daqui.

```json voz
{
  "falaMaxCaracteres": 200,
  "fraseMaxPalavras": 20,
  "roteiroSegundos": [40, 70],
  "alvoDeToquePx": 44,
  "alvoDePonteiroPx": 24,
  "proibidas": [
    "método",
    "roteiro",
    "tentativa",
    "teto",
    "etapa",
    "passada",
    "degrau",
    "critério",
    "domínio",
    "mostrando",
    "objetivo"
  ]
}
```

### 3.1 Fala ≤ 200 caracteres

Uma **fala** é tudo o que o professor diz ao aluno dentro de uma aula: o passo
do roteiro da Etapa 1, o feedback de um lance, a dica, o texto de um erro
nomeado, a frase que abre a partida.

O corte é 200 porque é o que **cabe numa tela sem paginar**. A caixa de
comentário (`components/lesson/Comentario.tsx`) mede o espaço que sobrou e
parte o texto em páginas quando ele não cabe; paginar é a rede de segurança,
não o plano. Numa aula assistida, que anda sozinha, uma fala paginada é pior
que uma fala longa: o tabuleiro para e espera um toque que o aluno não sabe que
deve dar.

**A mediana do repertório é 276 caracteres**, e por isso este número vai brigar
com o que já está escrito. Ver a §7.

### 3.1b A aula assistida dura de 40 a 70 segundos

O piso é o que separa uma aula de uma legenda: abaixo de 40 s o roteiro não
mostrou a técnica, mostrou o fim dela. O teto é atenção de criança de 12 anos
diante de um tabuleiro que ela ainda não pode tocar — passou de 70 s, ela toca.

A conta é de `lib/lesson/roteiro.ts`: digitação (7 ms/caractere) mais a pausa de
leitura de cada passo, que é 45 ms/caractere com piso de 1 s, mais o `espera`
que o autor pedir. A `N1-KPK` sai em **47 s**.

E os alvos: **44 px onde há dedo** (o mínimo AAA da WCAG 2.5.5) e **24 px onde
há ponteiro** (o mínimo AA da 2.5.8). Os dois já valem no motor de aula — o
`LessonButton` é `min-h-11`, e o botão de som desce a 36 px só no desktop, com
a conta escrita no próprio arquivo. A revisão os confere **na tela**, e só em
botão: link de texto dentro de uma linha de texto é a exceção "inline" da
própria norma, e cobrar 44 px dele empurraria o cabeçalho para fora do palco.

### 3.2 Frase ≤ 20 palavras

Vale para **toda** frase de tela — fala, título, rótulo de botão, texto do
índice. É a régua da §5 do `REPERTORIO.md` com um número: 20 palavras é o corte
abaixo do qual nenhuma das 20 frases reprovadas na §8.1 teria caído.

Uma frase acaba em `.`, `!`, `?` ou `…`. O travessão **não** fecha frase — ele é
a marca desta casa, e é ele que puxa a consequência: *"o peão anda — e anda
duas casas"*.

### 3.3 Uma ideia por fala

Esta não tem número, e é a mais importante das três. Se a fala tem um "e além
disso", são duas falas. Se ela explica um lance e avisa de um perigo, são duas
falas — e o perigo provavelmente não é fala nenhuma (§5).

Quem cobra isto é quem lê, não a máquina. Está aqui para ser citada numa
revisão.

---

## 4. As palavras que não chegam ao aluno

**Não é jargão de xadrez.** Cravada, oposição, zugzwang, casa-chave e coluna
aberta são o que o curso ensina — elas entram, e o curso as explica na primeira
vez. É jargão de **professor e de desenvolvedor** que vazou para a tela.

| Está na tela | Vira |
|---|---|
| "o método da aula", "siga o roteiro" | "o jeito certo", "o caminho da aula" |
| "tentativa" | "de novo", "mais uma vez" |
| "o teto de N lances acabou" | "acabaram os N lances" |
| "Etapa concluída." | "Pronto." |
| "critério de domínio", "passada", "degrau" | não aparecem ao aluno |
| "Objetivo / Com ajuda / Sem ajuda" | **"Aula / Treino / Valendo"** |
| "A técnica, em 3 passos" | (some — vira a fala do professor) |
| "Mostrando: …" | (some) |

**"Aula · treino · valendo" não é invenção.** É a mesma família que o módulo de
aberturas já usa nas três abas dele — "seta · treino · valendo",
`TrilhaDeEtapas.tsx`. O site passa a ter um vocabulário só, e o aluno que sai do
repertório e entra nos finais reconhece onde está.

**O que a lista proibida não é:** ela não impede a palavra de existir no código,
no comentário de um arquivo, num documento ou numa mensagem de erro do gate. Ela
vale para o que o **aluno lê**. "Etapa" continua sendo o nome da coisa entre nós;
ele é que não precisa dele.

---

## 5. As regras de tela

Estas são de forma, não de palavra, e são as que a `/revisar-aula` mede:

1. **Nunca rolagem.** Em 1366×768 e em 390×844, nenhuma das telas de aula rola —
   nem a página, nem um bloco por dentro dela. O palco tem altura fechada
   (`app/globals.css`, "O palco da aula"); o que não cabe é texto demais, e a
   correção é cortar o texto, nunca abrir uma barra.
2. **Um comentário por vez.** Nunca dois blocos de prosa competindo na mesma
   tela. Se há duas coisas a dizer, elas são duas falas em momentos diferentes.
3. **O texto não compete com o tabuleiro.** Toda casa citada na fala está
   desenhada no tabuleiro naquele momento, e todo desenho é citado na fala. "O
   rei vai para c7" pede a seta `c6→c7`; uma seta que ninguém menciona é ruído.
4. **Nada de aviso lido antes de precisar dele.** O bloco "onde se erra", lido
   antes do primeiro lance, é o aviso que uma criança decora e não usa. O mesmo
   texto, dito **na hora em que ela comete o erro**, vira comportamento. É por
   isso que os `dangers` saíram da Etapa 1 e vivem em `errors`.
5. **Um caminho só.** Dois botões que fazem a mesma coisa para o aluno são um
   botão. Dois gestos para o mesmo avanço são um gesto.

---

## 6. Os dois precedentes que esta régua revoga

Precedente revogado em silêncio volta sozinho daqui a seis meses. Os dois estão
escritos, com o motivo de então e o motivo de agora.

### 6.1 "Assistir não é treinar" — revogado só para a Etapa 1

Em **6/9/2026** o módulo de aberturas revogou o modo em que a linha andava
sozinha. O motivo está em `lib/repertorio/passada.ts`: *"o aluno via a linha
andar sozinha e chegava ao quiz sem ter movido uma peça"*. Está certo, e
continua valendo lá.

**O que muda aqui:** naquele desenho, assistir era o **único** contato antes da
prova. Numa aula de finais é a primeira de três telas, e as duas seguintes são
jogadas com a mão — a do meio com flecha e fala, a última nua, contra a máquina.
A demonstração não substitui o treino: ela é o que faltava **antes** dele, para
o aluno de 600 pontos que a `HANDOFF` §3 mediu.

### 6.2 "A dica é pedida, não concedida" — revogado na Etapa 2

É a §A4 do `docs/REFERENCIA-MOVE-TRAINER.md`, medida no chess.com, e foi ela
que em **8/9/2026** mandou as casas acesas da Etapa 2 para trás de um botão.

**O que muda aqui:** o chess.com dá a dica sob demanda a um **adulto que
escolheu treinar**. A nossa Etapa 2 é aquecimento declarado — não grava, não
conta na escada —, e aquecimento em que a criança trava não aquece nada. Então
a flecha é obrigatória e está sempre na tela, e a dica em texto deixa de ser
botão e vira a fala do professor.

E a flecha **aponta o alvo, nunca o lance**: a casa que importa, a intenção do
rei preto. Casa de destino do lance certo é meio lance entregue, e isso é outra
coisa — é responder pelo aluno.

Quem afere continua sendo a Etapa 3, e ela continua nua: sem seta, sem casa
acesa, sem dica.

---

## 7. Dívidas declaradas (nada disto é esquecimento)

1. **As telas antigas não foram varridas.** Aberturas, tática, painel e índice
   continuam com a voz que tinham. Este documento é a régua contra a qual elas
   serão corrigidas, e a correção ainda não aconteceu. O teste da §3 varre hoje
   as aulas de `content/lessons/` e as falas de `lib/lesson/falas.ts` — só isso.
2. **O teto de 200 caracteres briga com o repertório.** A mediana de lá é 276, e
   estender este teto aos 363 comentários compilados reescreveria o corpus
   inteiro. Aqui ele vale para as falas de **aula de finais**. Estender é
   decisão de outro dia, e ela não está tomada.
3. **"Uma ideia por fala" (§3.3) não tem máquina.** Nenhum teste a cobra, e ela
   é a régua que mais decide a qualidade de uma fala. Quem a cobra é quem
   revisa.
4. **Elogio vazio, exclamação e repreensão não estão no teste.** A `/revisar-aula`
   os mede lendo a tela; o `voz.test.ts`, não. Uma lista de palavras não
   distingue "Dama!" de "Muito bem!", e a segunda é a que importa.
5. **A regra "nunca rolagem" (§5.1) não vale hoje no celular, e o número está
   medido.** Em 390×844 a página da aula rola **76 px**, nas três telas. A conta:
   cabeçalho 128 + palco 748 + vão 12 + respiro 32 = 920, contra 844 de tela.
   O palco está certo — quem estoura é o **cabeçalho**, que o
   `app/globals.css` orçou em 50 px ("no celular ele quebra em duas linhas") e
   que mede 128 com um título real: link de voltar (16) + título em três linhas
   (64) + botão de som numa linha própria (44).

   É defeito **anterior** a este trabalho, e a aritmética prova: nenhum dos
   quatro números vem da etapa 1 nova, e ele se repete igual na etapa 3, que
   este trabalho não tocou no layout. Consertá-lo é retirar o orçamento fixo do
   cabeçalho — ou torná-lo elástico, o que pede `min-height: 0` em três níveis e
   `height` no `body` da raiz — e isso é medir de novo o palco inteiro, no
   celular e no desktop. Ficou de fora aqui de propósito: fazê-lo de olho, no
   meio de outra tarefa, é como um sistema medido se quebra. Em 1366×768 a
   rolagem é **0 px** nas três telas.

6. **O teto de 200 caracteres foi escolhido, não medido.** Ele é o corte que faz
   caber uma fala por tela sem paginar, deduzido da caixa de comentário — não
   saiu de uma medição de quantos caracteres uma criança de 12 anos lê sem
   cansar. Se alguém medir isso, o número muda.
