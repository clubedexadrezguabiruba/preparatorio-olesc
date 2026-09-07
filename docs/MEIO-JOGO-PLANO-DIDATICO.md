# Meio-jogo — plano didático e de reestruturação (v2.3)

> Destino: `docs/MEIO-JOGO-PLANO-DIDATICO.md`. Branch `meio-jogo-livros` ou filha.
> **Nada em `main`.**
>
> **v2.3** — quinta escrita, e a primeira feita **depois de executar**. A v1 foi
> revista pela Astra; a v2 respondeu; a v2.1 corrigiu a segunda revisão; a v2.2
> mudou a fonte dos exercícios depois da observação do Doug de que posição não é
> obra protegida; a **v2.3 registra os Blocos 1 e 2 feitos** e corrige o que o
> plano afirmava e a execução desmentiu. A §1 é o histórico.
>
> **Escopo aprovado:** 8 conceitos até o piloto; expansão para os 30 só depois
> da análise do piloto e das correções.

---

## Retomada — leia isto primeiro numa sessão nova

Este plano foi escrito em **2026-09-07**, depois de duas revisões externas. A
sessão que o escreveu foi encerrada com `/clear`. Para retomar:

**Decidido pelo Doug, não reabrir:**

1. **Escopo:** 8 conceitos (m9–m16) com sequência completa até o piloto de
   19–25/9. Os outros 22 ficam como estão, só com a leitura melhorada. Expansão
   para os 30 **depois** do torneio.
2. **Unidade de progresso:** "li" continua contando na trilha e no painel; o
   acerto de reconhecimento é um **segundo número**, ao lado. Nada de
   `somarMeioJogo`, `mapa.ts` ou `content/tarefas.json` muda de unidade.
3. **Teto de citação:** aprovado em 2026-09-07 — no meio-jogo o teto passa a
   contar **capítulo** (máximo 2 por capítulo), não obra.
   `PROTECTED_SOURCE_CAP = 2` continua intocado para as aulas de finais. Ver
   §3.1 para o raciocínio inteiro, que precisa ir para o `content/sources.json`.

**Em aberto, para o Doug resolver fora do código:** se a escola precisa avisar
alguém sobre gravação de tempo e acerto de menores (o site já faz isso na
tática; nada de novo se abre).

**Onde começar:** **Bloco 3** da §11 — a fatia de 8 conceitos, curada. Os Blocos
0, 1 e 2 estão feitos (commits `783a9db`, `0959930`, `de0d38b`, `ea54d85`), e o
número medido de cada um está no fim do bloco correspondente.

**O que o Bloco 2 mudou neste plano, e que você precisa saber antes de curar
posição:**

1. **Os oito conceitos da fatia (m9–m16) têm tarefa, os oito.** Era a dúvida que
   travava o Bloco 3; está respondida.
2. **`casa-negada` não tem estoque** — 6 posições em 444, 1,4%. É a tarefa de
   **m3**, que não está na fatia, mas a conta vale para quando ele entrar.
3. **A classificação dos 30 mudou em 12 entradas**, com o total intacto em 15/15.
   Ela mora em `MAPA`, em `lib/meiojogo/exercicios.ts`, com o porquê de cada uma.
4. **O teto agora conta capítulo**, e toda posição de livro tem de declarar
   `provenance.capitulo` — o gate recusa livro sem ele.

**Leituras de contexto, nesta ordem:** `docs/MEIO-JOGO-DIDATICA-MEDIDO.md` (o que
a sessão anterior mediu), este arquivo, e as duas revisões da Astra em `docs/`.
**Não refaça as medições** — elas estão nos dois documentos, com a procedência de
cada número.

---

## Contexto

O módulo tem 30 dicas de meio-jogo, cada uma com **uma** posição de livro que
serve ao mesmo tempo de exemplo ensinado e de teste. Daí saem os problemas:

- **22 dos 30 quizzes são respondíveis sem olhar o tabuleiro** — a explicação
  precisa explicar, e ao explicar entrega a resposta da pergunta abaixo.
- **Não há onde praticar.** Entre ler "o peão isolado é alvo" e escolher um plano
  contra ele falta a etapa do meio, que é a que se treina.
- **A ficha bibliográfica empurra a explicação para fora da tela** — 765
  caracteres em média contra 547 da explicação inteira.
- **A prosa é escrita em notação algébrica e o tabuleiro não a acompanha** — 29
  das 30 dicas citam casa ou lance, 4,5 referências por dica, e nada na tela liga
  "d5" à casa d5.
- **Meio-jogo contribui com zero minutos** para a meta de 120 min/dia: a view
  `minutos_por_dia` (`0005_revisao.sql:199`) soma só tática e finais.
- ~~**O texto das tarefas do painel está desatualizado**~~ — **corrigido no
  Bloco 1**, e era pior do que este parágrafo dizia: não eram 2 dos 4 `detalhe`,
  eram **os 4**. `s3` prometia "posto avançado" e "bispo bom e bispo mau", que
  são m15 e m14, do degrau anterior; `s4` prometia "ataque de minoria" e
  "sacrifício de qualidade", que não existem. O gate não pegava porque
  `lib/tarefas/tarefas.test.ts` conferia só a contagem; agora
  `problemasDoDetalheDeMeioJogo` confere id, degrau e o título literal na prosa.

**A condição que governa tudo:** alunos de 12 a 15 anos, 700 a 1700 no
chess.com, e **muitos verão estes conceitos pela primeira vez**. Saber resolver
tática não implica saber o que é um posto.

O resultado pretendido, ao longo de semanas e não de uma tela: o aluno se
**familiariza**, **reconhece com ajuda**, **reconhece sozinho**, **aplica com
apoio** e depois **decide sozinho** — com o conceito voltando dias depois.

---

## 1. Histórico das versões

### v1 → v2 (primeira revisão)

Aceitos e corrigidos: a contradição do estoque (3 posições consumidas, revisão
prometendo inéditas); a progressão sem apoio; a regra "só há número onde há juiz
de máquina", trocada por três níveis de evidência; os contratos do que cada
tarefa mede; dicas diferentes recebendo a mesma tarefa; o feedback específico; o
esquema de registro; a notação algébrica; o piloto antes de escalar.

Recusados com motivo: rebaixar a "afirmação a confirmar" números que eu medi
nesta sessão; construir a fila de correção humana antes do torneio; as datas
propostas, porque a semana de 19–25/9 já é uma janela de piloto real.

### v2 → v2.1 (segunda revisão) — o que mudou

| # | Ponto | Veredito | O que a v2.1 faz |
|---|---|---|---|
| 1 | "posição final é quieta por construção" | **Ela está certa e eu estava errado.** Medido agora: **49,7% das posições finais estão em xeque** e 14,9% têm peça pendurada de cavalo ou mais. Só **35,4%** passam num filtro estático | A frase sai. Entra um funil de três portas, com número em cada uma (§3) |
| 2 | "troca um risco por outro" (material) | Certa | Posição final é **candidata**, nunca apropriada automaticamente (§3) |
| 3 | "candidatos a descartar" não mede dificuldade | Certa, eu superdimensionei | Vira **característica do item**, uma variável entre várias; a dificuldade real sai das tentativas dos alunos (§3) |
| 4 | as 7 posições não cobrem os 5 degraus | **Lacuna real** | Alocação explícita degrau a degrau, e o degrau 5 declarado como pós-torneio (§5) |
| 5 | o feedback do isolado generaliza demais | Certa — **e o defeito está no conteúdo publicado**, não só no meu exemplo | Redação corrigida, e `m12` entra na lista de prosa a consertar (§7) |
| 6 | a aplicação de m12 está mal definida | Certa | Item trocado por um delimitado, sem cálculo (§7) |
| 7 | o piloto não avaliará a revisão espaçada | Certa | Limite declarado no relatório do piloto (§11, Bloco 5) |
| 8 | "um terço errou" não decide reescrita | Certa | O número **sinaliza para exame**, não manda reescrever (§11) |
| 9 | falta critério para item fácil demais | Certa, eu não tinha | Cinco sinais examinados no piloto (§11) |
| 10 | realce automático de 136 coordenadas | Certa | O realce é **autoral, por passo**, não extraído por expressão regular (§8) |
| 11 | "acima da dobra" briga com o layout | Certa | Critério trocado por "sem ida e volta", testado e não fixado de antemão (§8) |
| 12 | a fatia tem de casar com a tarefa real | **Certa, e a minha lista estava errada** | Conferido: `s2-meiojogo` é do degrau **1000–1200**, que é exatamente **m9–m16**. Meu m7 é `ate-1000` e cai na semana 1. A fatia passa a ser m9–m16 (§10) |
| 13 | tempo como sinal, não diagnóstico | Certa | Escrito no relatório; consentimento é chamada do Doug, não desenho meu (§9) |
| 14 | migração na véspera do piloto | Certa | Fluxo técnico fecha em **16/9**, com 17–18/9 de folga; e 56 posições deixa de ser meta (§10, §11) |

### Um ganho que a segunda revisão provocou

Ela pede "verificação tática própria de cada posição". Fui ver o que existe:
**o projeto já roda o Stockfish 18 offline, em node.** `scripts/motor-repertorio.ts`
o faz, com as três armadilhas da build já resolvidas e documentadas ali, usando
os mesmos 7,3 MB de `public/engine/` que a aula serve ao aluno. A verificação
tática não é heurística nem promessa: é a segunda porta do funil da §3.

### v2.1 → v2.2 (observação do Doug: "posição não é protegida, podemos copiar")

**Ele está certo, e por um caminho mais forte que o geral.** A v2.1 tirava todos
os exercícios do recorte CC0 do Lichess porque eu tratava `PROTECTED_SOURCE_CAP`
como se fosse limite legal. É política editorial do projeto, e a premissa dela
não se sustenta aqui. Ver §3.1. A consequência é a §3.2: **livro para ensinar e
guiar, partida real para testar transferência** — não um ou outro.

### v2.2 → v2.3 (a execução dos Blocos 1 e 2) — o que o plano errou

Quatro afirmações minhas não sobreviveram ao contato com o código. Ficam aqui
porque a próxima versão deste plano vai ser escrita por quem só tem o documento.

| # | O que a v2.2 dizia | O que a execução mediu |
|---|---|---|
| 1 | "2 dos 4 `detalhe` do painel não descrevem" | **4 de 4.** Eu só tinha conferido `s1` e `s2` |
| 2 | "35,4% passam na porta 1" | **30,9%** numa amostra uniforme sobre os 37 temas e as três faixas. Mesma ordem de grandeza, número diferente |
| 3 | "8 dicas de julgamento" era hipótese | O total é 15/15, como antes — mas **12 das 30 trocaram de lado**. O total estava certo por acidente |
| 4 | o estoque do Lichess "não é o gargalo" | Verdade para 11 tarefas. **`casa-negada` sai com 6 posições em 444** e não sustenta um degrau |

E dois achados que o plano não previa: **cinco das 30 posições saem do mesmo §22
do Capablanca**, todas do Exemplo 52 — uma partida comentada só —, e o teto por
dica não vê isso; e a identidade de **Philip Hereford ficou confirmada em duas
fontes independentes**, o que torna a tradução do *My System* livre no Brasil
desde 2008 sem que `protected` precise mudar (§3.1).

---

## 2. O modelo de aprendizagem

### 2.1 A progressão, em cinco degraus

| degrau | o que o aluno faz | apoio | grava? | quando |
|---|---|---|---|---|
| **1. familiaridade** | lê o exemplo, com a casa realçada | tudo à vista | não | piloto |
| **2. reconhecimento guiado** | acha o traço em posição nova, com apoio em escada: convite → realce dos candidatos → solução explicada | pedido, nunca imposto | sim, **com o nível de apoio** | piloto |
| **3. reconhecimento independente** | acha o traço sozinho, de primeira | nenhum | sim | piloto |
| **4. aplicação guiada** | escolhe entre **duas** razões ou duas decisões concretas | duas opções, tema anunciado | sim, como gabarito curado | piloto |
| **5. aplicação independente** | plano em posição nova, sem o tema anunciado | nenhum | sim, como gabarito curado | **pós-torneio** |

Regras de adequação ao iniciante, que valem para todo texto novo:

- **Linguagem concreta antes do termo.** "Nesta coluna não há nenhum peão" antes
  de "coluna aberta"; o termo entra colado à imagem.
- **Pergunta delimitada antes de pergunta ampla.** "Qual peça chega a essa casa?"
  antes de "qual é o melhor plano?".
- **Contraste simples primeiro.** Coluna aberta × fechada agora; "coluna aberta
  sem casa de entrada útil" na retomada, semanas depois.
- **Pedir ajuda não é errar.** O apoio fica a um toque; o registro guarda que foi
  usado; a tela não chama isso de falha.
- **Sem relógio visível, sem exigir domínio na primeira passagem, sem pré-teste**
  de conceito ainda não ensinado.

### 2.2 A regra de evidência

Substitui "só há número onde há juiz de máquina"
(`app/meio-jogo/Quiz.tsx:19-23`), que confundia quem calcula com o que o número
autoriza a dizer.

> **Todo acerto vira número. O que muda é o que ele deixa você afirmar.**
>
> | nível | quem julga | vale para qualquer posição? | o relatório diz |
> |---|---|---|---|
> | **fato** | regra geométrica sobre a FEN, na hora | sim | "reconheceu o traço" |
> | **gabarito curado** | a autoria julgou **aquela** posição e assinou | não — só aquele item | "escolheu o que a autoria defende" |
> | **resposta aberta** | pessoa | — | não vira número; fica para o professor ler |
>
> As três nunca se somam na mesma barra.

O texto de `Quiz.tsx` é reescrito para dizer a regra nova — mudança de política
declarada, não esquecimento corrigido.

---

## 3. De onde vêm as posições

### 3.1 O teto de citação: por que ele não se aplica a posição

`PROTECTED_SOURCE_CAP = 2` (`lib/lesson/schema.ts:171`, cobrado em
`validate-content.ts:1166`) limita a **duas posições por aula/dica** o que vem de
obra marcada `protected`. Eu tratei isso como restrição legal. Não é — é política
editorial do projeto, e a premissa dela não vale aqui, por três razões:

1. **A posição é fato, não obra.** Uma FEN é o arranjo das peças. O que a
   Lei 9.610 protege num livro de xadrez é o texto, as anotações e a
   seleção/organização da coletânea (art. 7º, XIII) — não o arranjo.
2. **Nestes dois livros, a camada protegida não é a que copiamos.** O
   `content/sources.json` já registra o motivo: o texto de Nimzowitsch é livre no
   Brasil **desde 2006** (morreu em 1935), o de Znosko-Borovsky **desde 2025**, e
   o único prazo em aberto é o **da tradução inglesa** — de Philip Hereford num
   caso, de tradutor não nomeado no outro. **Tradução é a camada do texto.** A
   FEN do diagrama CXLVIII não deve nada ao Hereford.
3. **O próprio registro previa isto.** A licença do Nimzowitsch diz, com todas as
   letras: *"Marcar como protegida não custa nada aqui — nenhuma dica usa mais de
   uma posição da mesma obra."* Agora custa.

**O que sobra de preocupação real, e a mitigação.** Copiar *a seleção* — esvaziar
os diagramas do capítulo do peão isolado — é reproduzir a curadoria do
Nimzowitsch, e é aí que a proteção fina de coletânea morde. A regra editorial
nova, que endereça isso e não o que não existe:

> **As posições de livro de uma dica vêm de obras diferentes** sempre que o
> conceito aparecer em mais de uma, e nenhuma dica tira mais de **duas** do mesmo
> **capítulo**. O teto passa a contar capítulo, não obra.

**Aprovado pelo Doug em 2026-09-07.** A decisão é dele porque é
jurídico-editorial, não técnica; o raciocínio acima vai inteiro para o
`content/sources.json`, ao lado das licenças reescritas, para que quem abrir o
arquivo em 2027 saiba por que a classificação mudou sem que nenhuma data nova
tenha aparecido.

**A mudança no código:** `PROTECTED_SOURCE_CAP` continua valendo para as aulas de
finais, onde as obras são de autores vivos ou recentes (de la Villa, Silman,
Seirawan). O meio-jogo ganha teto próprio, por capítulo, e as licenças de
`nimzowitsch-my-system-1930` e `znosko-middle-game-1930` são reescritas com o
raciocínio acima — **mudança declarada no arquivo, não um `false` silencioso**.

### 3.2 Livro para ensinar, partida real para testar

Não é livro **ou** Lichess. O que decide é uma coisa que a segunda revisão da
Astra deixou clara: **um diagrama que o autor escolheu para ilustrar o conceito
tem o traço encenado.** Isso é exatamente o que se quer no exemplo e no
reconhecimento guiado — e é exatamente o que **não** se quer no reconhecimento
independente, que existe para saber se o aluno acha o traço quando ninguém o
montou para ele. Livro didático, por definição, nunca dá isso.

| degrau | fonte | por quê |
|---|---|---|
| 1 exemplo | **livro** | é o que o autor escolheu para ensinar |
| 2 reconhecimento guiado (×2) | **livro**, de obra diferente da do exemplo | traço encenado é o certo enquanto há apoio |
| 3 reconhecimento independente | **partida real, CC0** | traço não encenado é o que prova reconhecimento |
| 4 aplicação guiada | a mesma do degrau 3 | |
| reserva de revisão (×3) | metade livro, metade partida | alterna encenado e não encenado |

**O material já existe, e é medido.** Os PDFs não estão na biblioteca do projeto
(`laboratorio-finais/biblioteca/` tem 20 livros, todos de finais mais o
Capablanca 1921), mas a extração da sessão anterior está em
`Documents/Codex/2026-09-06/…/work/` — **102 MB**: o texto completo de *My
System* (**319 das 330 páginas**), o do Znosko, 31 páginas do Nimzowitsch, 31 do
Capablanca e 22 do Znosko já renderizadas em PNG, mais o pipeline
(`read_pages`, `assemble.py`, `verify`) que fez as 30 transcrições. **Extrair
mais 16 diagramas é repetir um caminho que existe.** O primeiro passo é trazer
esse material para a biblioteca do projeto — é pasta de trabalho temporária, e o
que só existe ali se perde.

**Quantas transcrições, medido para a fatia do piloto.** Dos 8 conceitos m9–m16,
**7 vêm do *My System*** e m14 vem do Capablanca. Precisam de 2 posições de livro
guiadas cada = **16 diagramas novos** (de obras diferentes, pela regra da §3.1) —
contra as 30 que a sessão anterior fez de uma vez.

### 3.3 O funil do Lichess, para o degrau 3 e metade das reservas

A FEN guardada no recorte é a posição **antes** do erro do adversário; a que o
solucionador vê sai depois de `lances[0]` (`lib/tatica/puzzles.ts:18-20`). Nos
dois estados há tática forçada no tabuleiro.

Jogar a linha inteira do puzzle produz uma posição de partida real, CC0, com
20,6 peças em média, e **não** produz uma posição quieta. Medido nesta sessão,
sobre 6.577 posições finais:

| porta | o que reprova | resultado |
|---|---|---:|
| — | linhas que fecham sem lance ilegal | 19.731 de 19.731 |
| **1. estática** | rei em xeque | **49,7% reprovadas** |
| | mate em 1 disponível | 0,0% |
| | peça de cavalo ou mais pendurada (atacada e não defendida) | 14,9% |
| | **passam** | **35,4%** |
| **2. motor** | Stockfish 18 offline, pelo caminho de `scripts/motor-repertorio.ts`: reprova se o melhor lance ganha material ou dá mate, ou se a avaliação salta entre as linhas candidatas | a medir no Bloco 2 |
| **3. humana** | os seis passos da curadoria (§6) | sempre |

Depois da porta 1, ainda sobram **648 posições com peão isolado único** naquela
amostra de 6.577 — que é 1/9 das 59.193 FENs únicas de meio-jogo do recorte. O
estoque não é o gargalo; a minha afirmação sobre ele é que estava errada.

**A posição final é candidata, nunca apropriada automaticamente.** Ela nasce com
desequilíbrio de material — é o que a combinação produziu. Para reconhecimento
estrutural isso é aceitável e fica escrito na legenda; para os itens de
aplicação, o material entra no julgamento da autoria, item a item.

**Sobre dificuldade.** Quantos peões há no tabuleiro para "ache o isolado",
quantas colunas semiabertas fazem ruído para "ache a aberta" — isso é
**característica do item**, uma variável entre várias, ao lado de familiaridade
visual, número de elementos concorrentes e clareza do enunciado. Serve para
ordenar uma escada inicial. **A dificuldade real será estimada pelas tentativas
dos alunos**, no piloto. O `rating` do puzzle não é usado como dificuldade da
nossa pergunta: ele é do puzzle tático original.

---

## 4. O que cada tarefa mede — o contrato

Cada tarefa é uma função `respostaDaTarefa(fen, tarefa): Casa[]` **e um contrato
escrito**, no mesmo arquivo, cobrado pelo gate:

```
o que mede · o que NÃO autoriza concluir · exemplo válido · contraexemplo ·
o que faz com resposta múltipla · a frase do enunciado · a frase do feedback
```

Três contratos, escritos aqui porque a revisão os apontou nominalmente:

**`peca-na-casa-de-origem`** — *mede* que há uma peça daquele tipo na casa
inicial. *Não autoriza concluir* que ela nunca saiu: a FEN não tem histórico, e a
peça pode ter ido e voltado. O enunciado diz "está na casa onde começou".

**`peca-com-menos-lances`** — *mede* mobilidade agora. *Não autoriza concluir*
que é a pior peça nem a que deve ser melhorada; peça parada pode estar segurando
algo. Contraexemplo já medido em m17: o bispo de d2 empata com a torre de a1 em
2 lances. Só entram posições em que o mínimo é único, e o teste cobra isso.

**`bispo-com-peoes-na-propria-cor`** — *mede* a relação estrutural entre o bispo
e os peões do próprio lado. *Não autoriza concluir* que o bispo é ruim, que deve
ser trocado ou que está inútil. O termo "bispo mau" **não aparece no enunciado**;
aparece na explicação, onde há espaço para dizer que é comparação, não decreto.

O mesmo tratamento para `posto`, `casa-negada` e `peao-retardatario`, cujos
critérios já estão implementados e comentados em
`lib/meiojogo/afirmacoes.ts:422-470`.

**Uma tarefa por objetivo, não por traço.** m12 ("faça do isolado um alvo") e m28
("dê atividade ao seu isolado") não podem receber o mesmo exercício.

**Feito no Bloco 2**, e o mapa mora em `MAPA`, em `lib/meiojogo/exercicios.ts`,
com o porquê de cada uma das 30 entradas. O que separa m12 de m28 é o campo
`alvo`: em m12 o aluno procura o isolado **dele**, em m28 o **seu** — mesma
geometria, pergunta oposta, e um teste recusa duas dicas com o mesmo par
`(tarefa, alvo)`. O mesmo vale para m1 e m24, que dividem
`peca-na-casa-de-origem`: numa é a sua peça que não saiu, na outra é o rei dele
que não rocou.

A classificação antiga estava errada porque foi feita pelas **afirmações da
legenda**, e não pelo que a dica ensina — o quiz de **m7** pergunta "se o cavalo
de e3 sair, qual peça passa a atacar a dama de c3?", que é ataque descoberto e
`chess.js` confere, e mesmo assim m7 constava como julgamento puro. Refeita, ela
mudou 12 das 30 entradas.

---

## 5. Alocação das posições, degrau a degrau

A v2 listava 7 posições sem dizer quais serviam à aplicação. Corrigido:

| degrau | posição | fonte | quantas | entra no piloto? |
|---|---|---|---:|---|
| 1 familiaridade | exemplo (a que já existe) | livro | 1 | sim |
| 2 reconhecimento guiado | posição nova | **livro**, obra diferente | 2 | sim |
| 3 reconhecimento independente | posição nova | **partida real CC0** | 1 | sim |
| **4 aplicação guiada** | **a mesma do degrau 3**, pergunta mais funda | — | 0 novas | sim |
| **5 aplicação independente** | posição nova, sem tema anunciado | a decidir | 1 | **não — pós-torneio** |
| revisão | reserva | metade livro, metade partida | 3 | **não — antes de ligar a revisão** |

**Por que o degrau 4 reusa a posição do 3, de propósito.** Para primeiro contato,
trocar a posição **e** o tipo de pergunta ao mesmo tempo são duas mudanças. Manter
a posição que o aluno acabou de ler e aprofundar a pergunta isola a exigência
nova. É julgamento de desenho, não economia — e é **hipótese a observar no
piloto**: se os alunos responderem o degrau 4 por memória do degrau 3, a posição
se separa.

**Escalonamento dos prazos**, que resolve o aperto da véspera:

- **antes do piloto (16/9):** 3 posições novas por conceito × 8 = **24**, sendo
  **16 transcrições de livro** e **8 de partida real curada**
- **antes de ligar a revisão (Bloco 6):** as 3 reservas × 8 = **24** (12 e 12)
- **pós-torneio:** a posição do degrau 5

**24 não é meta.** Se o prazo apertar, corta-se o número de conceitos — quatro
conceitos com sequência íntegra valem mais que oito pela metade. **A revisão
humana não é cortada em nenhuma hipótese.** Ordem de corte dentro do conceito, se
faltar tempo: cai uma das duas posições guiadas antes de cair a independente.

**Quando a reserva acabar**, o sistema repete a posição menos recentemente vista
e **grava que foi repetida**. Não finge novidade, e o relatório nunca conclui
transferência a partir de item repetido. Repetição consolida; ela só não prova
que o aluno leva o traço para um tabuleiro novo.

Os intervalos **2‑7‑14** são hipótese operacional herdada da tática
(`lib/tatica/revisao.ts:60`), adotados por consistência para o aluno, não por
serem ideais. Erro → volta em 2. Acerto **no prazo** → 7, depois 14, depois sai.
Acerto **antes** do prazo → não move o agendamento, **mas conta como desempenho**
no relatório: pontualidade e desempenho são duas colunas. Ausência → continua
devido, sem penalidade acumulada.

---

## 6. A ficha do conceito, e a curadoria

Cada conceito ganha uma ficha, cobrada pelo gate: objetivo concreto ·
pré-requisitos · vocabulário novo · exemplo de ensino · reconhecimento com apoio ·
erro mais provável e o feedback dele · aplicação, e quando entra · reservas ·
**limites da evidência que este conceito gera**.

**Curadoria de cada posição, em seis passos**: achar candidato → conferir
posição, lado analisado e origem → conferir que o traço é perceptível →
**passar pelas portas 1 e 2 do funil e examinar o que sobrou** → escrever
pergunta, alternativas aceitáveis, justificativa e feedback → revisar adequação
ao estágio. Nenhuma posição entra sem os seis.

**O feedback específico sai quase de graça.** `conferirAfirmacao` já devolve a
frase em português que explica a recusa — `"d5 tem vizinho em c6"`,
`"nenhum peão das brancas defende e5"` (`lib/meiojogo/afirmacoes.ts:246-251`). O
aluno clica em c6 e a tela responde **sobre a casa que ele clicou**. O que se
escreve à mão é uma linha por tarefa: por que isso importa — e ela passa pelo
crivo da §7.

---

## 7. Dois exemplos concretos, e uma correção de conteúdo

**As FENs abaixo são reais e verificadas nesta sessão.** Nenhuma foi inventada.

### 7.1 Estrutural — peão isolado (m12)

**Degrau 1 — o exemplo, de livro.**
`r2q1rk1/pb2bppp/1p2pn2/8/1nBP4/2N1BN2/PP2QPPP/R2R2K1 w - - 0 1`
(Nimzowitsch, *My System*, diagrama CXLVIII). O diagrama realça **d4** enquanto a
legenda o cita.

**Degrau 2 — reconhecimento guiado.** Puzzle `4vF66`, posição final da linha:
`r3r1k1/1bp2N2/pn4pb/1p5n/7Q/1PN4P/P1B2PP1/R3R1K1 b - - 0 26`
Conferido: 23 peças, **sem xeque**, e exatamente um peão sem vizinho no tabuleiro
inteiro — g6. Ainda precisa passar pela porta 2 (motor) e pela 3 (humana) antes
de virar item.

- Enunciado: *"Um peão sem nenhum peão amigo nas colunas ao lado. Toque nele."*
- Apoio, a um toque: *"Olhe coluna por coluna: quais têm peão do mesmo lado
  vizinho?"* → realce dos quatro peões pretos → solução explicada.
- Se tocar em b5: *"b5 tem vizinho em a6."* — gerada pelo juiz.
- Depois do acerto, a linha escrita à mão:
  > *"Como não há peão amigo nas colunas vizinhas, esse peão não pode receber a
  > defesa simples de outro peão na estrutura atual. Por isso pode exigir defesa
  > de peças, ou virar alvo."*

**Degrau 4 — aplicação guiada**, na mesma posição, duas opções, sem cálculo:
*"Por que não ter vizinho importa aqui?"*
(a) porque nenhum peão preto pode defendê-lo · (b) porque ele está numa casa
clara. Gabarito curado, com a justificativa e as refutações escritas ao lado.

O item da v2 — *"para atacar g6, qual casa a peça branca precisa alcançar
primeiro?"* — **sai**: exige cálculo e admite mais de uma resposta defensável.

### 7.2 A correção de conteúdo que a revisão desenterrou

A crítica ao meu feedback vale para a prosa **já publicada**. A explicação de m12
diz hoje, em `content/meio-jogo.json`:

> *"Ninguém o defende de graça — cada defesa custa uma peça parada."*

É forte demais pelo mesmo motivo: o rei pode defendê-lo, uma peça pode defendê-lo
sem ficar parada, e o peão pode avançar ou ser trocado.

**Feito.** m12 foi reescrita no Bloco 1, e o Bloco 2 varreu as outras 29: 244
campos de prosa, **72 frases com marca de universalidade, 6 reescritas em 5
dicas** — m3 ("para lá qualquer peça chega em menos lances": a torre de a1 chega
a a8 em um lance e a d4 em dois), m5 duas vezes, m13 ("peão dobrado perde…
defender o vizinho": ele defende em diagonal, c3 defende b4 e d4), m16 e m20
("peão retardatário **não pode** avançar": pode, e é capturado — que é outra
coisa).

A varredura virou `npm run meiojogo:prosa`, e **não é gate**: definição e
geometria podem ser absolutas porque são. Ela diz onde ler, e quem decide é a
autoria.

### 7.3 Julgamento — m7

m7 ganha `ataque-descoberto` nos degraus 2 e 3 (*"tire o cavalo de e3 do
tabuleiro na sua cabeça: que peça branca passa a mirar a dama preta?"* — fato,
juiz de máquina) e um item de duas opções no degrau 4. **m7 não entra na fatia do
piloto**: é do degrau `ate-1000`, cuja tarefa cai na semana 1.

Para as dicas que **de fato** sobrarem sem nenhum fato depois da reclassificação:
escolher entre dois planos plausíveis, escolher a razão que sustenta um plano, ou
comparar duas decisões concretas — sempre com gabarito curado e assinado.
**"A partida de hoje é o treino" saiu do plano**: o conceito pode não aparecer.

---

## 8. A tela

| contexto | o que a v2.1 faz |
|---|---|
| **computador** | tabuleiro grudado à esquerda, texto rolando ao lado |
| **celular** | tabuleiro grudado no topo e **um passo por vez** embaixo. **Hipótese a testar no piloto**, não regra decidida — o tamanho do tabuleiro sai do teste |
| **prosa e notação** | `Diagrama` ganha `realce?: Casa[]`; as casas já são desenhadas em `lib/diagrama/tabuleiro.ts:171-181`. **O realce é autoral, por passo** — o conteúdo diz o que acender em cada passo. As 136 referências medidas **não viram 136 destaques**: acender tudo aumenta a carga em vez de baixá-la |
| **exercício** | pergunta e posição juntas; solução oculta até a tentativa |
| **bibliografia** | `citacaoCurta` (≤ 90 caracteres) embaixo do diagrama; o resto num `<details>` no pé. Medido: nenhum dos 30 `bibliographicSource` cabe em 90 hoje (média 204) |

**O critério de aceite visual não é "explicação acima da dobra".** Ela tem razão:
em 360 px, cabeçalho + tabuleiro + legenda + citação já passam de uma tela, e
exigir isso encolheria o tabuleiro. O critério é **ausência de ida e volta**: com
o tabuleiro grudado, o aluno lê o passo atual com a posição à vista e nunca
precisa rolar para cima para conferir uma casa. Isso se testa com Playwright
(`package.json:49`) e com os alunos, **não se fixa de antemão**.

Acessibilidade é critério de aceite: certo/errado não pode depender só de cor, a
casa é selecionável por teclado, e o realce tem forma além de cor.

**A ordem da página**

```
1  cabeçalho · 2  DIAGRAMA (com realce) + legenda + citação de 1 linha
3  EXPLICAÇÃO passo a passo, cada passo acendendo o que ele cita
4  "o que procurar" + cuidado
5  TREINO: guiado, guiado, independente — grava, com o apoio registrado
6  APLICAÇÃO guiada — grava como gabarito curado
7  vídeo · 8  caixa "li" · 9  <details> da proveniência · nav
```

O treino vem **depois** da explicação: testar antes de ensinar funciona para quem
tem o que ativar. Quem testa antes aqui é a revisão, dias depois.

---

## 9. O registro e o relatório

Uma tabela criada completa — colunas que não se retrofitam depois de haver linhas
de aluno de verdade:

```
tentativa_meiojogo
  id  ·  aluno uuid → perfis
  dica text            -- m12
  item text            -- id do exercício no conteúdo
  conceito text        -- a tarefa, para a fila de revisão
  habilidade text      -- reconhecimento | aplicacao
  nivel_evidencia text -- fato | curado
  versao text          -- versão do conteúdo; item editado não se compara
  resposta text        -- a casa ou a opção; NUNCA um booleano
  acertou boolean      -- derivado no servidor
  primeira boolean · tentativa smallint
  apoio smallint       -- 0 nenhum · 1 convite · 2 realce · 3 solução vista
  inedita boolean      -- posição nova para este aluno, ou repetida
  tempo_ms integer · criada_em timestamptz
```

Molde de `tentativas_puzzle` (`0001_fundacao.sql:52`): RLS ligada, **só política
de `select`**, insert exclusivo da chave de serviço. E a regra de
`lib/tatica/gravar.ts:30-40`: **o navegador manda a casa, nunca um `acertou`**.

**Cinco cliques até acertar não são cinco exercícios** — `primeira`, `tentativa` e
`apoio` existem para a conta ser possível.

**No relatório**, quatro linhas que nunca se somam:

```
Leitura declarada      12 de 30 dicas
Reconhecimento          4 de 5 sem apoio  ·  2 com apoio
Aplicação (curado)      1 de 3
Revisão pendente        3 conceitos
```

Com a nota na tela: poucos itens não são domínio consolidado.

**Tempo.** O terceiro ramo entra na `minutos_por_dia` (`create or replace view`;
`lib/curso/hoje.ts:30` tipa `bloco: string`, nada quebra). Fica escrito que
**minuto não é medida de aprendizagem** e que **tempo curto não é diagnóstico**:
pode ser releitura, retorno à página ou compreensão rápida. O professor recebe
tempo como sinal contextual. O grampo de 30 min de `gravar.ts:28` vale aqui.

**Consentimento.** O site já grava tempo e acerto de tática de menores; o treino
de meio-jogo não abre superfície nova. Se a escola exigir aviso ou autorização
para o que já é gravado, **é chamada sua** — não é coisa que eu desenhe aqui.

---

## 10. Escopo: a fatia do piloto

**Aprovado:** 8 conceitos antes de 26/9; expansão para os 30 só depois da análise
do piloto e das correções. As outras 22 dicas continuam no ar como estão, com a
leitura melhorada do Bloco 1 — nenhum aluno perde nada.

**A fatia é m9–m16, e não a lista da v2.** Conferido em `content/tarefas.json`:
`s2-meiojogo` é do degrau **1000–1200**, e esse degrau é exatamente
**m9, m10, m11, m12, m13, m14, m15, m16**. A tarefa manda ler **6** dos 8 — a
fatia cobre com duas de folga. O m7 da v2 sai: é `ate-1000`, e sua tarefa é a da
semana 1.

Ordem de corte, se o prazo apertar: cortam-se conceitos da fatia, na ordem
inversa desta lista, mantendo sequência íntegra nos que ficam. **Nunca se corta a
revisão humana.**

---

## 11. Blocos, com número medido no fim de cada um

Hoje é **7/9**. Rotina começa **13/9**. `s2-meiojogo` cai em **19–25/9**. Aula de
meio-jogo **26/9**. Torneio **11–16/10**.

### Bloco 0 — documentos e resgate da biblioteca — **feito em 2026-09-07**
Commitados `docs/MEIO-JOGO-DIDATICA-MEDIDO.md`, este plano, e as duas revisões
(`docs/MEIO-JOGO-REVISAO-1-ASTRA.md`, `docs/MEIO-JOGO-REVISAO-2-ASTRA.md`).

**O resgate achou mais do que o previsto.** A pasta temporária
(`Documents/Codex/2026-09-06/…/files-mentioned-by-the-user-handoff/`) não tinha
só texto extraído — tinha os **PDFs originais**, em `outputs/livros/`:
`nimzowitsch-my-system-1930.pdf` (330 pág.), `znosko-borovsky-middle-game-1930-
reimpressao.pdf` (248 pág.) e `capablanca-fundamentals-reimpressao-biblioteca.pdf`
(270 pág.) — exatamente os três nomes que `content/sources.json` já esperava e
que não estavam na `laboratorio-finais/biblioteca/`. Testados com
`pdftotext -f N -l N+4`, o mesmo critério do README da biblioteca: **os três
legíveis de origem**. Foram para lá, e o README ganhou a entrada no inventário.
Dois PDFs do Lasker vieram junto por estarem na mesma pasta de risco; nenhum
está em `sources.json` ainda.

O texto já extraído, as páginas em PNG e o pipeline (`read_pages.py`,
`assemble.py`, `verify.ts` e o resto) não são PDF — pela própria regra da
biblioteca ("nada além de PDF nesta pasta"), foram para
`.scratch/meio-jogo-extracao/` **deste** repositório, que já é a convenção do
projeto para rascunho de sessão. 126 arquivos, 34 MB.

**Um achado que muda o Bloco 2:** dentro do material resgatado havia
`hereford.html`, uma pesquisa (Britbase) que identifica "Philip Hereford" — o
tradutor do *My System*, cujo prazo de proteção está em aberto desde a sessão
anterior — como pseudônimo de **Arthur Hereford Wykeham George (1871–1937)**.
**Não verificado numa segunda fonte.** Se confirmado, a tradução inglesa de *My
System* passa a domínio público no Brasil desde 2008, e a obra deixa de precisar
de qualquer teto — nem por capítulo. Fica registrado para o Bloco 2 conferir
antes de reescrever a licença de `nimzowitsch-my-system-1930` em
`content/sources.json`; ver `.scratch/meio-jogo-extracao/hereford.html`.
→ **Número, medido:** `git status` limpo de docs pendentes; os três PDFs legíveis
pelo teste padrão da biblioteca; e o texto de `nimzowitsch-my-system-1930-pages.json`
lido a partir de `.scratch/` (não do temp) achou a página do diagrama CXLVIII no
índice 208 de 330 — conferido.

### Bloco 1 — a leitura, para as 30 — **feito em 2026-09-07** (`0959930`, `ea54d85`)
`citacaoCurta` nas 30 e `<details>` no pé; explicação logo abaixo do diagrama;
`realce` autoral no `Diagrama`; tabuleiro grudado; **a prosa de m12 corrigida**;
os `detalhe` de `s1-meiojogo` a `s4-meiojogo` batendo com as dicas que existem;
m11 e m22 com a ressalva na tela (`video.ressalva`).

**O plano errou por metade num número, e a correção é para cima.** Ele dizia que
2 dos 4 `detalhe` do painel prometiam dicas inexistentes. Conferidos os quatro,
são **4 de 4**: `s3` prometia "posto avançado" e "bispo bom e bispo mau", que são
m15 e m14 — do degrau **anterior** —, e `s4` prometia "ataque de minoria" e
"sacrifício de qualidade", que não são dica de degrau nenhum. A checagem antiga
só tinha olhado `s1` e `s2`.

**Três decisões de desenho que saíram da medição, e não da intenção:**

- **duas colunas só a partir de 1024 px.** Com `max-w-2xl` e duas colunas em
  1100 px o tabuleiro saía com 304 px — **menor que os 320 px do celular**;
- **o realce é camada separada, não tabuleiro por passo.** Um diagrama inteiro
  custa 24,7 KB de marcação, e três passos seriam 74 KB no dado móvel do aluno;
- **o estado do passo escolhido está na palavra, não na cor.** "Passo 3 aceso ·
  d4, c5" contra "Passo 3 · acende d4, c5". O caminho até aí está no commit
  `ea54d85`, e vale ler antes de mexer: a borda que passava no piso de 3:1 da
  WCAG 1.4.11 pesava 2,16× uma linha de rótulo, num lugar onde nada mais passa de
  1,35:1.

→ **Número, medido:** 360×640 com Playwright, nas 30 dicas — **69 passos, e em
todos o passo escolhido é lido com o tabuleiro inteiro dentro da janela**; nenhum
cartão muda de altura ao ser escolhido; zero erro de console; zero rolagem
horizontal (a FEN de 53 caracteres do `fenMethod` de m24 empurrava a página
30 px para o lado). Citação de uma linha: **máximo 69 de 90** caracteres, contra
os 204 de média de antes. E os 4 `detalhe`: `problemasDoDetalheDeMeioJogo` acusa
**26 problemas na prosa que estava no ar e 0 agora**.

### Bloco 2 — o juiz, o contrato e o funil — **feito em 2026-09-07** (`de0d38b`)
`lib/meiojogo/exercicios.ts`: **13 tarefas**, cada uma com os sete campos do
contrato e com teste de caso favorável **e** adversarial. Dois desses campos são
FEN e resposta esperada, e o teste os roda — **o contrato é o teste**, e um que a
implementação desmente reprova no `npm test`.

A conversa UCI saiu de `motor-repertorio.ts` para `scripts/motor.ts`: dois
drivers seriam duas opiniões sobre a mesma posição. `npm run meiojogo:funil` e
`npm run meiojogo:prosa` deixam as duas varreduras repetíveis.

**A reclassificação mudou 12 das 30, com o total intacto.** Continuam 15 dicas
com fato conferível e 15 sem — mas ganharam tarefa m1, m3, m7, m15, m17 e m24, e
perderam m2, m5, m6, m18, m19 e m29. Um total certo por acidente, com metade das
entradas erradas. m7 recebeu `ataque-descoberto`, como a §7.3 previa.

**A varredura da prosa:** 244 campos, 72 frases com marca de universalidade,
**6 reescritas em 5 dicas** (m3, m5×2, m13, m16, m20) — mais m12, corrigida no
Bloco 1. A marca não reprova: definição e geometria podem ser absolutas porque
são.

**A §3.1 entrou inteira.** `CAPITULO_CAP = 2`, `provenance.capitulo` obrigatório
em posição de livro, `PROTECTED_SOURCE_CAP` intocado para finais, e as duas
licenças reescritas com o raciocínio. **O achado do Bloco 0 sobre "Philip
Hereford" foi conferido em duas fontes independentes** — o registro dos Varsity
Chess Matches e as Chess Notes de Edward Winter —, e as duas citam a mesma
primária: o obituário do *British Chess Magazine* de julho de 1937, p. 361. É
Arthur Hereford Wykeham George (1871–1937), e a tradução é livre no Brasil desde
2008. **`protected` continua `true` de propósito**, e a licença diz por quê: o
campo deixou de sustentar uma afirmação legal aqui e passou a ligar o teto
editorial — que é o que se quer ligado.

→ **Número, medido** em 2.500 puzzles do recorte CC0, linha jogada até o fim:

```
porta 0   2500 de 2500 linhas fecham sem lance ilegal
porta 1   60,5% xeque · 8,6% peça pendurada · 0 mate em 1  →  30,9% passam
porta 2   Stockfish 18, profundidade 12, salto > 100 centésimos:
          10,6% avaliação salta · 0,6% segunda linha é mate  →  88,8% passam
```

Sobrando 444 posições, quantas servem a cada tarefa com resposta única:

```
peca-com-menos-lances 331 · peao-na-semiaberta 294 · peao-isolado 208
casa-de-bloqueio 167 · peao-retardatario 158 · posto 155
peca-na-casa-de-origem 140 · bispo-com-peoes 128 · peao-dobrado 127
coluna-aberta 122 · torre-na-setima 47 · casa-negada 6
```

E `validate:content` **recusa uma terceira posição do mesmo capítulo** — provado
ponta a ponta com o conteúdo real adulterado e restaurado, além do teste
unitário favorável e adversarial.

**Dois números que o plano não previa e ficam declarados:**

- **a porta 1 deixa passar 30,9%, e não os 35,4%** que a §3.3 registrava. Não é
  contradição: a amostra de agora é uniforme sobre os 37 temas e as três faixas
  de rating, e a anterior era outra. A ordem de grandeza se manteve;
- **cinco das 30 posições saem do mesmo §22 do Capablanca** (m4, m20, m25, m26,
  m30), e todas do Exemplo 52 — que é **uma** partida comentada. O teto aprovado
  é por dica e não vê isso; o gate imprime a concentração e não reprova.

  **E isto não é questão jurídica** — eu cheguei a escrever que era, e estava
  errado. Capablanca morreu em 1942 e a obra é domínio público no Brasil desde
  2013; `capablanca-fundamentals-reimpressao` já está registrada como livre, sem
  teto nenhum. O que sobra é **didático**: cinco das trinta dicas mostram
  momentos de um jogo só, e a pergunta é se o aluno aprende o conceito ou aquela
  partida. **Nenhuma das cinco está na fatia do piloto**, então não afeta
  setembro; o momento de olhar é a expansão de 8 para 30, depois do torneio.

### Bloco 3 — a fatia de 8 conceitos, curada (até 15/9)
24 posições novas — **16 transcritas de livro** (7 conceitos do *My System*, 1 do
Capablanca; as guiadas de obra diferente da do exemplo) e **8 de partida real**,
pelas três portas do funil. Todas pelos seis passos. As 8 fichas. Enunciados,
escada de apoio, feedback, e os itens de aplicação guiada com alternativas,
justificativa e refutações escritas.
→ **Número:** `validate:content` imprime *"8 conceitos com sequência do degrau 1
ao 4, 24 posições novas (16 de livro, 8 de partida), 8 fichas, 0 posição sem os
seis passos, 0 capítulo com mais de 2"*.

### Bloco 4 — a tela e a gravação (até 16/9)
Prop nova no `ChessBoard` ligada a `events.select` do chessground
(`dist/board.js:179` — dispara em casa vazia também; cuidados medidos: `events`
nunca `undefined`, `ChessBoard.tsx:239-245`, e `viewOnly` fora da criação,
`:204-214`). `Treino.tsx` com a escada de apoio. Migration `0006` e a gravação.
**Migrar antes, deployar depois** (`0005_revisao.sql:24-29`).
→ **Número:** `db:migrar` "1 de 1"; `db:rls` cobrindo a tabela nova;
`scripts/verificar-meiojogo.ts` prova contra produção que casa errada grava
`acertou=false`, que `apoio`, `primeira` e `inedita` chegam certos, e que a linha
entra na `minutos_por_dia` no dia de Guabiruba.
→ **17 e 18/9 são folga.** Se o Bloco 4 escorregar, corta-se conceito da fatia,
não a folga.

### Bloco 5 — **o piloto** (19–25/9) e a aula (26/9)
A turma faz a tarefa da semana com m9–m16 no ar. O professor observa; eu leio as
linhas. Nada de conteúdo novo.

**O que este piloto pode validar:** apresentação, compreensão do enunciado, uso
do apoio, interação, e os exercícios iniciais.
**O que ele NÃO valida, e o relatório dirá isso:** retenção, transferência
tardia, e os intervalos 2‑7‑14 — a revisão espaçada só existe no Bloco 6. E doze
alunos numa semana detectam problema de uso; não provam eficácia.

**O que o professor tem de observar com os olhos, e nenhum número dirá:**

1. **O aluno descobre que dá para tocar nos passos?** A explicação está cortada
   em cartões, e tocar num deles acende no tabuleiro as casas que ele cita. O
   cartão escolhido se distingue por fundo de cartão, contorno claro e pela
   palavra do rótulo — "Passo 3 **aceso**" contra "Passo 3 · **acende**".
   **Decisão adiada para depois do piloto, pelo Doug, em 2026-09-07:** se os
   alunos não perceberem que os passos são tocáveis, entra uma barra fina e
   escura na beirada esquerda do cartão escolhido, como reforço. Ela foi tirada
   por ser o padrão que o conferidor de design reprova, e volta com o aval dele
   e a exceção registrada. Ver o commit `ea54d85` para o caminho inteiro.
2. **O aluno olha o tabuleiro enquanto lê?** É o que o tabuleiro grudado existe
   para permitir, e ninguém mediu isso com criança.
3. **Um passo por vez faria diferença no celular?** É a hipótese da §8, que não
   foi construída de propósito — construí-la antes seria decidir o que o piloto
   decide.

→ **Número:** por aluno, itens de reconhecimento com e sem apoio, e **cinco
sinais examinados** — erro alto, acerto quase universal, uso frequente de apoio,
clique muito rápido, e padrão nas alternativas escolhidas. Um item em que ~4 dos
12 erraram **entra na lista de exame**, não na de reescrita: erro alto pode ser
enunciado ruim, dificuldade adequada, conceito mal ensinado, posição ambígua ou
problema de interface, e a diferença se descobre olhando o aluno, não a
porcentagem.

### Bloco 6 — correção e revisão espaçada (até 2/10)
Corrigir o que o piloto e a aula mostraram. As 24 posições de reserva curadas.
`lib/meiojogo/revisao.ts`, `/meio-jogo/revisao`, a linha no cartão "Hoje", as
quatro linhas do relatório, e os casos de `meiojogo` que **hoje faltam** em
`lib/tarefas/estado.test.ts` (medido: zero) e em `scripts/mutation-check.ts`
(medido: zero).
→ **Número:** com aluno de teste que erra 3 itens, o painel mostra a revisão dois
dias depois **com posições da reserva**; e cada item da lista de exame do Bloco 5
está resolvido ou justificado por escrito.

### Depois do torneio (19/10 em diante)
Expandir dos 8 para os 30 sobre um desenho que passou por alunos. O degrau 5
(aplicação independente). O quiz de plano em posição própria curada — **e não
necessariamente de livro**: transcrever 30 diagramas de PDF é opção, não
condição. Fila de resposta aberta para o professor.
→ **Número:** a catraca do vazamento desce de **22 → 0 de 30**.

---

## 12. Verificação

**Todo bloco:** `npm test` · `npm run validate:content` · `npm run typecheck` ·
`npm run lint` · `npm run build`.

**Blocos com banco, na máquina** (não há banco de desenvolvimento):
`npm run db:migrar` · `npm run db:rls` · `npm run db:tatica` ·
`node --conditions=react-server scripts/verificar-meiojogo.ts`.

**No navegador**, com `scripts/aluno-de-teste.ts` e Playwright em 360 px:

1. `/meio-jogo/m12` — cada passo lido com o tabuleiro à vista; o realce acende o
   que o passo cita; o `<details>` do pé abre com o texto completo.
2. Treino: pedir apoio, errar, acertar. Conferir as três linhas em
   `tentativa_meiojogo` com `apoio`, `tentativa`, `primeira` e `inedita` certos.
3. `/painel` — a revisão de meio-jogo e os minutos incluindo o treino.
4. `/professor/<aluno>` — as quatro linhas separadas, sem soma entre elas.
5. Teclado e leitor de tela no treino; certo/errado legível sem cor.

---

## 13. Critérios de aceite

**Pedagógicos** — o enunciado é entendível por quem só recebeu o ensino previsto;
o exercício mede a habilidade que declara; o feedback explica em vez de dizer
certo/errado; apoio, repetição e desempenho independente são distinguíveis; há
posições para as revisões prometidas; **nenhuma heurística aparece como verdade
universal** (vale para a prosa já publicada); as dicas de julgamento têm prática
estruturada.

**Visuais** — a instrução atual é lida com a posição à vista, sem ida e volta;
pergunta e posição juntas na tentativa; solução oculta até a tentativa; toque,
teclado, zoom e indicação não-cromática conferidos em 360 px; bibliografia
acessível sem ocupar o espaço de aprendizagem.

**Técnicos** — correção derivada no servidor; isolamento provado por `db:rls`;
primeira tentativa distinguida das assistidas; testes com casos adversariais; a
fila funciona depois de erro, atraso e **esgotamento da reserva**; os minutos não
duplicam; migration verificada antes do deploy.

> Contagem de testes, posições e caracteres apoia a engenharia. **Não demonstra
> aprendizagem** e não substitui os critérios acima.

---

## 14. Riscos, e o que depende de verificação

1. ~~**A porta 2 do funil ainda não tem número.**~~ **Resolvido no Bloco 2**, e o
   estoque não é o gargalo: o motor derruba 11,2% do que a porta 1 aprova, e
   sobram centenas de posições por tarefa. **A exceção é `casa-negada`: 6 em
   444.** Peão do meio ataca duas casas, e duas casas negadas são duas respostas
   — a tarefa só tem resposta única em arranjos raros. Ela é a tarefa de **m3**,
   que não está na fatia; quando m3 entrar, ou fica sem exercício ou ganha outra.
2. ~~**A reclassificação dos 30 conceitos pode mudar o mapa das tarefas.**~~
   **Feita no Bloco 2**, e mudou 12 das 30 entradas. O mapa mora em `MAPA`, em
   `lib/meiojogo/exercicios.ts`. **Os oito da fatia têm tarefa, os oito.**
3. **A posição final carrega desequilíbrio de material.** Para reconhecimento
   estrutural é aceitável e vai escrito; para aplicação, entra no julgamento da
   autoria item a item.
4. **24 posições em oito dias, das quais 16 são transcrição de diagrama
   impresso**, é o gargalo — e transcrição é a parte cara: a sessão anterior
   gastou 560 caracteres em média só descrevendo como conferiu cada uma. O corte
   é em conceitos, nunca em revisão humana.
4b. **O material dos livros está fora do repositório**, numa pasta de trabalho
   temporária de outra sessão. Enquanto o Bloco 0 não o resgatar, todo o §3.2
   depende de 102 MB que ninguém garante que estarão lá amanhã. E os PDFs
   originais não estão na máquina — o que há é o texto extraído e 84 páginas em
   PNG; se faltar uma página, ela vem do Internet Archive
   (`mysystemchesstre0000aron`, `middlegameinches00znos`), com rede.
4c. **A mudança de política da §3.1 é julgamento jurídico-editorial, não
   técnico.** Está escrita com o raciocínio à vista para poder ser contestada, e
   quem assina é você.
5. **O modo "um passo por vez" no celular e o reuso da posição no degrau 4 são
   hipóteses.** Saem do piloto validados ou revertidos.
6. **O piloto não valida retenção nem os intervalos**, e doze alunos numa semana
   não provam eficácia. Se ele não acontecer, a entrega é declarada não validada
   com o público — revisão de adulto não substitui aluno usando.
7. **Consentimento e uso do tempo pelo professor** são decisão sua, não desenho
   meu.
8. ~~**Não verificado por mim nesta sessão:** a suíte verde com 574 testes.~~
   **Rodada nos Blocos 1 e 2:** 606 testes verdes, mais `validate:content`,
   `typecheck`, `lint` e `build`. O custo real de JS do treino continua não
   medido — o treino ainda não existe (Bloco 4).

9. **Pendências declaradas dos Blocos 1 e 2, nenhuma bloqueante:**
   - **`Quiz.tsx` não foi reescrito** com a regra de evidência da §2.2. Não está
     na lista de nenhum dos dois blocos, e o Bloco 2 é "sem tela". Ele é
     candidato natural ao Bloco 4, que já mexe na tela.
   - **"Um passo por vez" no celular não foi construído.** A §8 o declara
     hipótese a testar no piloto, e o número do Bloco 1 é atendido pelo tabuleiro
     grudado. Construí-lo antes do piloto seria decidir o que o piloto decide.
   - ~~**A barra lateral do passo escolhido.**~~ **Adiada pelo Doug em
     2026-09-07, para depois do piloto**, e agora é o item 1 da lista de
     observação do Bloco 5. A leitura da tela recomendava voltar a ela com 2 px
     e tinta escura — mesmos 6,14:1 com o peso da borda clara, e "barra à
     esquerda" é a gramática de *item atual* —, mas é o padrão que o conferidor
     de design reprova. Quem decide é a criança tocando, não o argumento.
   - **`npm run lint` estava vermelho antes do Bloco 1**, por um `verify.ts` que
     o resgate do Bloco 0 trouxe para `.scratch/`. Resolvido ignorando
     `.scratch/**`, pelo motivo do `.garimpo/**`.
