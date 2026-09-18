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

**Em 2026-09-09 entrou o que faltava depois disso: como ele ensina.** A régua era
quase toda negativa, e proibição sozinha produz texto correto e sem aula dentro.
Entraram os **cinco movimentos** de quem está ensinando (§2.1), a regra de **como
uma palavra técnica entra** — mostra, nomeia, usa (§4.1) — e o **português de
manual de adulto** (§4.2), que passava pela régua antiga porque não era jargão
nosso nem jargão de xadrez, e sim o registro dos livros escritos para gente
grande.

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

### 2.1 O que ele faz — os cinco movimentos de quem está ensinando

A lista acima é toda negativa, e uma régua só de proibições produz texto correto
e morto. Estes são os movimentos positivos, e eles são o que separa **um
professor dando aula** de uma legenda descrevendo lances.

1. **Mostra antes de nomear.** A peça anda, o aluno vê o que aconteceu, e só
   então a coisa ganha nome. Nomear primeiro é pedir que ele decore um rótulo
   vazio e depois procure onde ele encaixa. Ver a §4.1, que é a regra inteira.

2. **Diz a casa, não a ideia.** *"O rei vai a c7"* ensina; *"o rei melhora a sua
   posição"* não ensina nada, porque não diz o que fazer com as mãos. Toda fala
   que descreve um lance nomeia **a casa**, e a casa está desenhada no tabuleiro
   naquele instante (§5.3).

3. **Fecha o ciclo: diz o que o lance conseguiu.** Não basta dizer para onde ir.
   Depois que a peça chega, o professor diz o que mudou — *"agora o rei preto não
   tem como chegar em b8"*. É este movimento, e não o elogio, que dá ao aluno a
   sensação de estar avançando (§2, "ele não dá parabéns").

4. **Repete a ideia com as mesmas palavras.** Se o rei "escolta" o peão na
   primeira fala, ele escolta em todas — não "acompanha", não "protege", não
   "dá cobertura". Sinônimo é enfeite de adulto: para quem está aprendendo, três
   palavras são três coisas. **A aula escolhe uma palavra por ideia e fica com
   ela**, inclusive entre aulas diferentes que ensinam a mesma coisa.

5. **Uma palavra difícil por fala, no máximo.** Uma fala com "oposição" e
   "zugzwang" juntas não ensina duas palavras: não ensina nenhuma. Se a segunda é
   mesmo necessária, ela é outra fala — o que também é a §3.3 dita de outro jeito.

---

## 3. Os números

Estes são os tetos, e são eles que a máquina lê. **Não os copie para lugar
nenhum:** quem precisa deles os lê daqui.

```json voz
{
  "falaMaxCaracteres": 200,
  "fraseMaxPalavras": 20,
  "alvoDeToquePx": 44,
  "alvoDePonteiroPx": 24,
  "proibidas": [
    "roteiro",
    "teto",
    "etapa",
    "passada",
    "degrau",
    "valendo",
    "critério",
    "domínio",
    "mostrando",
    "conversão",
    "posicional",
    "compensação",
    "iniciativa",
    "elementar",
    "profilaxia"
  ]
}
```

A lista tem **duas metades e um propósito só**. As dez primeiras são jargão de
bastidor — palavra nossa que vazou para a tela (§4). As seis últimas são o
**português de manual de xadrez para adulto** (§4.2). A máquina não distingue as
duas, e não precisa: as dezesseis têm em comum serem palavras que um professor
não diria a uma criança de doze anos com o tabuleiro na frente.

> **2026-09-18 — "valendo" entrou na lista, por decisão do Doug.** Eram quinze,
> ficam dezesseis. Ela era palavra da casa desde 9/9 e estava na tela do
> repertório em três lugares; a §4.3 conta por que saiu e o que entrou no lugar.
> Nenhuma fala das dezesseis aulas publicadas a usava, então a trava entrou sem
> reprovar conteúdo nenhum.

> **2026-09-15 — cinco palavras saíram da lista, por decisão do Doug:**
> **objetivo, método, avaliação, teoria e estrutura.** Eram vinte, ficam quinze.
> Os dois tetos (200 caracteres por fala, 20 palavras por frase) não mudaram.
> As cinco continuam nas tabelas da §4 e da §4.2 como **sugestão de quem revisa**,
> não como trava: a máquina não as aponta mais, e o professor decide se a
> palavra cabe na fala.

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

### 3.1b A aula assistida dura o que precisar

**A faixa de 40 a 70 segundos saiu da régua em 9/9/2026, a pedido do Doug.** Ela
era um veredito: a aula que durasse menos ou mais era reprovada pela
`/revisar-aula` e pelo `lib/lesson/roteiro.test.ts`. Nenhum dos dois a cobra
mais, e `roteiroSegundos` saiu do bloco de números acima.

**A conta continua, e continua impressa.** Ela é de `lib/lesson/roteiro.ts` —
digitação (7 ms/caractere) mais a pausa de leitura de cada passo, que é
45 ms/caractere com piso de 1 s, mais o `espera` que o autor pedir — e ela é o
relógio da **tela**: é ela que decide quanto tempo cada fala fica lá antes de a
próxima entrar. Isso não mudou e não pode mudar. O que saiu foi o julgamento
sobre o total. A `/revisar-aula` imprime a duração com `·`, como observação.

**O que se perdeu, escrito para não ser descoberto depois.** O piso protegia
contra a fala telegráfica — o roteiro que mostra o fim da técnica em vez da
técnica. O teto protegia contra a aula longa demais para a atenção de uma
criança de 12 anos diante de um tabuleiro que ela ainda não pode tocar. As duas
proteções passam a ser de quem lê.

### 3.1c Os alvos de toque

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
| "siga o roteiro" (e "o método da aula", só sugestão desde 15/9) | "o jeito certo", "o caminho da aula" |
| "o teto de N lances acabou" | "acabaram os N lances" |
| "Etapa concluída." | "Pronto." |
| "critério de domínio", "passada", "degrau" | não aparecem ao aluno |
| "Objetivo / Com ajuda / Sem ajuda" (como nome das abas) | **"Apresentação / Aula / Treino / Prática real"** |
| "A técnica, em 3 passos" | (some — vira a fala do professor) |
| "Mostrando: …" | (some) |
| "valendo", "sem valer" *(desde 18/9)* | **"de memória"** — ver a §4.3 |
| "Ele joga sozinho." *(desde 18/9)* | "Agora é a vez dele." |
| "A linha joga X." *(desde 18/9)* | "Aqui o lance é X." |
| "a fonte mostra esse lance como errado" *(desde 18/9)* | "esse lance parece bom e não é" |
| "linha(s)", "N linha(s)" | "1 linha" / "3 linhas", escrito por extenso |
| um caminho de URL na frase ("volta em /aberturas") | o lugar, em português ("volta aqui") |

**"Aula · treino" não é invenção.** É a mesma família que o módulo de aberturas
já usa nas três abas dele — "com a seta · sem a seta · de memória",
`TrilhaDeEtapas.tsx`. O site tem um vocabulário só, e o aluno que sai do
repertório e entra nos finais reconhece onde está.

### 4.3 "Valendo" saiu, e "de memória" entrou

**Decisão do Doug, 18/9/2026.** "Valendo" era palavra da casa desde 9/9 — estava
na terceira aba do repertório, no cartão de comando ("Lance 3 de 11, valendo.") e
no fim do treino ("Agora valendo."). Ela sai inteira, e com ela o "sem valer" da
aba do meio.

**O que havia de errado com ela.** "Valendo" não nomeia o que o aluno faz: nomeia
**a aposta**. Ela só quer dizer alguma coisa para quem já sabe que existe um
placar por trás — e a §2 diz que o aluno não precisa saber que existe um placar.
É a mesma falha de "passada" e "degrau", com a diferença de que esta passou
despercebida por nove dias por soar coloquial.

**Por que "de memória", e não outra coisa.** Porque já era o que o site dizia em
três lugares, sem ninguém ter combinado: `/aberturas` promete que "depois cobra
de memória", o fim de uma partida diz "Partida inteira, de memória, sem erro", e
o próprio treino do repertório já mandava "tente de memória" depois de dois
erros. A palavra nova não é nova — é a que já estava certa nas bordas e faltava
no meio.

E ela nomeia a **tarefa**: sem a seta, sem a dica, o lance sai da sua cabeça.

**O custo de largura continua pago.** O comentário de 9/9 mediu que em 390 px uma
linha de abas comprida quebra em duas e rouba 52 px do comentário. "De memória"
tem o mesmo comprimento de "sem a seta", que já cabia.

### 4.4 "Ele joga sozinho" — quando a frase certa diz a coisa errada

Junto com "valendo" saiu `"Ele joga sozinho."`, o cartão que aparecia enquanto o
adversário respondia. A frase queria dizer *"não espere por você, o tabuleiro
anda sozinho"*. O aluno lia *"ele joga sem mim"*.

Fica **"Agora é a vez dele. / Olhe o lance que ele faz."** — que diz de quem é o
lance, que é a informação, e manda o aluno olhar, que é o que ele tem a fazer.

**A lição geral, porque ela vale para a próxima frase.** Nenhuma palavra de
"Ele joga sozinho" é técnica; a frase passava por qualquer régua de vocabulário.
O que ela tinha era **um sujeito ambíguo e um advérbio fazendo o trabalho do
verbo**. Régua de palavra proibida não pega isto — só pega quem lê a frase
imaginando um aluno de dez anos lendo-a pela primeira vez.

**Os quatro rótulos são do Doug, de 9/9/2026, e o preço deles está medido.** Eram
três — "Aula · Treino · Valendo" —, e a apresentação entrou na frente. Em 390 px a
linha de abas **quebra em duas** e passa de 44 para **96 px de altura**; esses
52 px vêm do painel, e o comentário da aula assistida passa a **paginar**, que é
justamente o que o desenho dela proíbe. Medido no bloco 6 de 9/9/2026, com os
mesmos rótulos encurtados para isolar a causa: com "Início · Aula · Treino ·
Valendo" a linha volta a 44 px e o comentário não pagina. Os rótulos ficaram como
o Doug os escolheu; a decisão de encurtá-los é dele, e não de quem mediu.

### 4.1 Como uma palavra de xadrez entra: mostra, nomeia, usa

A §4 diz que a palavra de xadrez **entra** e que "o curso a explica na primeira
vez". Isso era verdade e não era regra — não dizia *como*. É a lacuna que mais
produz texto de manual, porque o caminho fácil é o inverso do caminho que ensina.

**Quais palavras ganham este tratamento:** só as que **nomeiam o que a aula
ensina** — oposição, casa-chave, zugzwang, afogamento, a ponte, a fortaleza, o
quadrado. Elas são o conteúdo, e o aluno precisa sair sabendo o nome, porque é
assim que ele vai reencontrar a ideia num livro, num vídeo ou na boca do
adversário. **Todo o resto que puder ser dito em português comum, é dito em
português comum** — e não vira palavra nova.

**Os três momentos, nesta ordem, e nunca ao contrário:**

1. **Mostra.** A coisa acontece no tabuleiro e o professor descreve **o que se
   vê**, com as casas, sem nome nenhum.
2. **Nomeia.** Uma fala curta, própria, só para dar o nome ao que acabou de
   acontecer.
3. **Usa.** Dali em diante o nome é usado sem explicação, como quem já combinou.

Na oposição, que é a aula 8:

> ✗ **Errado — nomeia primeiro.**
> *"Agora você vai usar a oposição: é quando os reis ficam frente a frente com
> uma casa entre eles, e quem tem a vez de jogar precisa ceder."*
>
> ✓ **Certo — mostra, depois nomeia.**
> *"Rei em e4, rei em e6 — frente a frente, uma casa no meio."*
> *"Agora é a vez das pretas. E o rei preto vai ter que sair da frente."*
> *"Isso tem nome: oposição."*

Repare no que a versão certa não faz: ela não define. Ela deixa a definição
acontecer no tabuleiro e depois pendura o nome nela. O aluno de doze anos que lê
a primeira versão decora sete palavras; o que vê a segunda entende uma ideia.

**E explica uma vez só.** Da segunda aula em diante, "oposição" é usada como
qualquer outra palavra da língua. Reexplicar é dizer ao aluno que você não
acredita que ele aprendeu.

### 4.2 O português de manual de adulto

Estas não são jargão de bastidor nem jargão de xadrez: são o **registro** dos
livros de finais escritos para adultos. Passam pela régua da §4 e não deviam —
uma criança que lê "converter a vantagem" entende que ali tem uma coisa de
gente grande e para de ler.

| Está na tela | Vira |
|---|---|
| "converter a vantagem", "a conversão" | "transformar isso em vitória", "ganhar a partida" |
| "avaliar a posição", "a avaliação" *(sugestão desde 15/9)* | "olhar quem está melhor" |
| "compensação" | (some — diga o que o lado *tem*: "um peão a menos, mas o rei ativo") |
| "posicionalmente melhor" | "melhor colocado", "no lugar certo" |
| "a iniciativa" | "quem manda no jogo" |
| "mate elementar", "é elementar" | (some — e ver a §2: ele não avisa que algo é fácil) |
| "na teoria", "a teoria diz" *(sugestão desde 15/9)* | (some — o tabuleiro é que diz) |
| "profilaxia" | "impedir antes", "tirar a ideia dele" |
| "a estrutura de peões" *(sugestão desde 15/9)* | "os peões", "os peões de vocês dois" |
| "simplificar" | "trocar peças" |
| "neutralizar" | "parar", "segurar" |

**As duas últimas linhas a máquina não pega**, e é honesto dizer por quê: a lista
proibida casa **palavra inteira com plural** (`lib/lesson/voz.ts:112`), então ela
pega "simplificação" e deixa passar "simplificando". Verbo escapa por conjugação.
Quem cobra essas duas é quem revisa — como a §3.3 e como o elogio vazio.

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
prova. Numa aula de finais é a segunda de **quatro** telas — a primeira é a
apresentação, que nem tabuleiro jogável tem —, e as duas seguintes são jogadas
com a mão: o treino com flecha e fala, a prática real nua, contra a máquina.
A demonstração não substitui o treino: ela é o que faltava **antes** dele, para
o aluno de 600 pontos que a `HANDOFF` §3 mediu.

### 6.2 "A dica é pedida, não concedida" — revogado no Treino

É a §A4 do `docs/REFERENCIA-MOVE-TRAINER.md`, medida no chess.com, e foi ela
que em **8/9/2026** mandou as casas acesas do treino para trás de um botão.

**O que muda aqui:** o chess.com dá a dica sob demanda a um **adulto que
escolheu treinar**. O nosso treino é aquecimento declarado — não grava, não
conta na escada —, e aquecimento em que a criança trava não aquece nada. Então
a ajuda é obrigatória e está sempre na tela, e a dica em texto deixa de ser
botão e vira a fala do professor.

**Flecha *ou* casa acesa** (desde 9/9/2026): as duas apontam o alvo, e o nó que
só precisa dizer "olhe esta casa" não deve inventar uma origem para a seta sair
de algum lugar. Uma das duas basta, e é o que a `superRefine` de
`lib/lesson/schema.ts` cobra da aula publicada.

E ela **aponta o alvo, nunca o lance**: a casa que importa, a intenção do rei
preto. Casa de destino do lance certo é meio lance entregue, e isso é outra coisa
— é responder pelo aluno.

**Onde isso se escreve mudou, e é a parte que se esquece.** O treino é derivado
da aula (`lib/lesson/derivar-treino.ts`), então a flecha dele **não** se escreve
na árvore: ela mora em `objective.roteiro[…].treino.arrows` — ou `.highlights` —,
dentro do passo. E ela não é o desenho daquele passo: o do passo acompanha o
lance *acontecendo*, o do nó aponta o alvo *antes* de o aluno mexer.

Quem afere continua sendo a **prática real**, e ela continua nua: sem seta, sem
casa acesa, sem dica.

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

   **Os cinco movimentos da §2.1 e a sequência da §4.1 também não têm máquina**,
   e pela mesma razão: nenhuma delas é conta sobre texto. "Mostrou antes de
   nomear?" e "repetiu a ideia com as mesmas palavras?" são leitura, não regex.
   Entram na `/revisar-aula` como quesito de **coerência**, que já existe e já é
   julgado por quem lê.

4. **Elogio vazio, exclamação e repreensão não estão no teste.** A `/revisar-aula`
   os mede lendo a tela; o `voz.test.ts`, não. Uma lista de palavras não
   distingue "Dama!" de "Muito bem!", e a segunda é a que importa.
5. **A regra "nunca rolagem" (§5.1) não vale hoje no celular, e o número está
   medido.** Em 390×844 a página da aula rola **76 px**, nas quatro telas. A conta:
   cabeçalho 128 + palco 748 + vão 12 + respiro 32 = 920, contra 844 de tela.
   O palco está certo — quem estoura é o **cabeçalho**, que o
   `app/globals.css` orçou em 50 px ("no celular ele quebra em duas linhas") e
   que mede 128 com um título real: link de voltar (16) + título em três linhas
   (64) + botão de som numa linha própria (44).

   É defeito **anterior** a este trabalho, e há duas provas. A aritmética:
   nenhum dos quatro números vem de etapa nenhuma, e ele se repete igual na
   prática real, cujo layout não foi tocado. E a medição de 9/9/2026, que o
   isolou: com a linha de abas em 96 px (quatro rótulos longos) e com ela em
   44 px (rótulos curtos), a rolagem é a **mesma, 76 px** — se viesse das abas,
   os dois números seriam diferentes. Consertá-lo é retirar o orçamento fixo do
   cabeçalho — ou torná-lo elástico, o que pede `min-height: 0` em três níveis e
   `height` no `body` da raiz — e isso é medir de novo o palco inteiro, no
   celular e no desktop. Ficou de fora aqui de propósito: fazê-lo de olho, no
   meio de outra tarefa, é como um sistema medido se quebra. Em 1366×768 a
   rolagem é **0 px** nas quatro telas.

6. **O teto de 200 caracteres foi escolhido, não medido.** Ele é o corte que faz
   caber uma fala por tela sem paginar, deduzido da caixa de comentário — não
   saiu de uma medição de quantos caracteres uma criança de 12 anos lê sem
   cansar. Se alguém medir isso, o número muda.

7. **A lista proibida não pega verbo conjugado.** `usaProibida` casa palavra
   inteira com plural (`lib/lesson/voz.ts:112`), então "simplificação" reprova e
   "simplificando" passa. Foi escolha, não descuido: um casador por radical
   reprovaria "dominar a casa" por causa de "domínio", e falso positivo em régua de voz
   treina quem escreve a ignorá-la. As duas linhas de verbo da §4.2 ficam com o
   revisor, e estão declaradas lá.

8. **A §4.2 não foi medida contra o corpus antigo.** As nove palavras de então (seis na lista desde 15/9) foram
   conferidas contra `content/lessons/` e `lib/lesson/falas.ts` — os dois lugares
   que o teste varre — e nenhuma aparecia. **Não** foram conferidas contra as
   telas de aberturas, tática e painel, que a dívida 1 já declara fora da
   varredura. Quando a dívida 1 for paga, é bem provável que a §4.2 morda lá.

9. **A proveniência dos diagramas da apresentação não tem defesa mecânica**
   (9/9/2026). A etapa 1 desenha em **FEN livre**, escrita no próprio arquivo da
   aula: ela não vira `content/positions/`, não tem os 9 campos de proveniência e
   não passa pela tablebase (que desde 15/9 não confere mais nada). É deliberado — o passo que diz "estas peças dão
   mate" precisa mostrar peças que não estão na posição da aula, às vezes mais de
   sete delas, e ninguém joga ali.

   **A regra que fecha o buraco é escrita, e é esta: se um diagrama de
   apresentação vier de um LIVRO, ele deixa de ser ilustração e vira posição** —
   arquivo em `content/positions/`, com os 9 campos, como qualquer outra. Um
   diagrama montado do zero para ilustrar material continua sendo ilustração.

   O que a máquina cobra é só o que ela sabe: `INTRO_FEN_ILEGAL` (o mesmo
   `fenProblem` do `checkPosition` — reis colados, xeque impossível) e
   `INTRO_FEN_REDUNDANTE` (repetir a FEN da aula, que se diz omitindo o campo).
   Nenhum dos dois olha de onde o diagrama veio. Quem olha é o Doug.

10. **A faixa de 40 a 70 s da aula assistida saiu da régua** (9/9/2026, §3.1b).
    Com ela saíram duas proteções: o **piso**, contra a fala telegráfica, e o
    **teto**, contra a aula longa demais para a atenção de uma criança de 12
    anos. A duração continua impressa pela `/revisar-aula`, com `·`. As duas
    proteções passam a ser de quem lê.
