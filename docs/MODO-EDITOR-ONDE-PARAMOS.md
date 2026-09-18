# Modo editor — onde paramos

> **Atualização de 10/09/2026:** o Doug aprovou o
> [`EDITOR-V2-PLANO-FINAL.md`](EDITOR-V2-PLANO-FINAL.md). Ele substitui a proposta v2 e
> passa a reger a continuação. As seções históricas abaixo continuam registrando o que
> existia antes dessa aprovação.

> **Especificação funcional de 11/09/2026:**
> [`EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md`](EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md)
> reúne todas as funções, interações e critérios de aceite do produto. Outro agente deve
> ler plano + especificação antes deste diário; este arquivo diz o estado, não redefine
> o produto.

> **Prazo e alunos reais (13/09/2026, decisão do Doug):** não há alunos reais no site até
> **18/09/2026** — só contas de teste —, e 18/09 é o prazo das fatias 7–10. O banco pode
> receber migração aditiva sem nova consulta. Na fatia 7, a N0-LADDER é publicada em v2 de
> verdade como piloto; o arquivo v1 dela não muda um byte.

> **As travas de 15/09/2026 (decisão do Doug):** tablebase, limite de 7 peças, livro-base, prática única, quatro
> etapas e ficha obrigatória saíram do código; o treino declara o resultado que cobra. Ver a seção "As travas de 15/9".

**Data:** 2026-09-15. **Branch:** `modo-editor`. A menção
histórica a “Bloco 2 suspenso” nas seções antigas explica a interrupção que levou à
nova arquitetura; não rege mais o trabalho.

## Estado de hoje, em vinte linhas

Este arquivo é longo e cronológico. Se você só precisa saber onde estamos, é aqui — e
cada linha aponta a seção que conta a história inteira.

**Fechado:**

- **Bloco 0/A inteiro** — legalidade dos lances, diagnóstico localizado na tela,
  regressão de conteúdo e proveniência/certificação. Ver “o Bloco 0/A fechado”.
- **Corpus e tetos (§17)** — linha de 500 meios-lances, árvore de 1.000 nós, e sete
  tetos com o número medido atrás de cada um. Ver “Bloco B começa pelo freio”.
- **Importar PGN (§13.1)** — auditoria do que a varredura não lê, relatório de perdas
  antes de aplicar, lote transacional, recusa explícita de variante não padrão. Ver
  “o importador de PGN” e “a tela de importar”.
- **Cor do desenho** — as quatro cores do Lichess atravessam do PGN ao tabuleiro. Ver
  “a cor do desenho, como no Lichess”.
- **Navegação por teclado (§7)** — ← → ↑ ↓, Home e End andam na árvore; o foco segue a
  seta; campo de texto engole o atalho. **Falta a conferência humana da tecla real.**
  Ver “o teclado anda na árvore”.
- **Desenhar com o botão direito (§10.2)** — seta e casa acesa nascem com o mouse, nas
  quatro cores do Lichess, e cada desenho entra no Desfazer. **Falta a conferência
  humana do gesto real.** Ver “desenhar com o botão direito”.
- **Reordenar capítulos (§8.2)** — a coluna segue a ordem única do fluxo; arrastar muda
  o capítulo como um slide, o menu oferece a mesma ação pelo teclado e um Desfazer
  devolve a ordem anterior. Ver “reordenar capítulos no fluxo”.
- **Adicionar capítulo (§8.3)** — três das cinco portas: posição inicial, montador de
  peças e FEN colada. **Teste humano aprovado**, inclusive os três arrastos. Ver
  “adicionar capítulo e montar a posição”.
- **Trocar a posição inicial de um capítulo (§9)** — poda a partir do primeiro lance
  ilegal de cada ramo, irmãos legais preservados, textos afetados marcados para
  revisão, e a cascata que revalida as análises filhas e netas. Ver “trocar a posição
  inicial de um capítulo”.
- **As sete fatias de 11/9 (§8.3, §8.4, §9, §11.3, §14, §5.2, §19.2)** — renomear,
  duplicar e excluir capítulo com impacto; as três ações contextuais do lance; o menu
  do lance com as onze ações no botão direito e no `•••`; o escritor e as quatro saídas
  de PGN; “Nova aula” com id derivado e a porta da aula vazia; e a lista das revisões
  pendentes. Um calculador de impacto só (`lib/editor-v2/impacto.ts`) atende às quatro
  edições que perdem nós. Ver “sete fatias numa rodada”.

- **Paleta clicável de desenho (§10.2 e §25)** — seta, casa, cor e limpar em botões; a
  cor sem Shift/Alt, com os atalhos ainda valendo. Fecha a fatia 3 do roteiro. **Teste
  humano aprovado em 12/9**, inclusive a reprodução do defeito consertado: o clique
  esquerdo apagava o desenho inteiro da posição. Ver “a paleta clicável de desenho”.

- **Prévia, reprodução e comparação (§15)** — a prévia usa o player do aluno, com a
  aula inteira, o capítulo ou "daqui"; as velocidades não comprimem a leitura da
  narração; e a comparação volta ao ponto de escolha, com o caso de aceite de rei e
  peão provado contra a regra do jogo. **Teste humano aprovado em 12/9**, inclusive a
  geometria em 1366×768 e as duas metades da regra da velocidade. Ver “prévia,
  reprodução e comparação”.

- **Narração criada, ordenada e com pausa manual (§12.2)** — as duas meias entregas
  que o teste de 12/9 destapou: escrever narração num lance que não tinha nenhuma,
  trocar a ordem de duas narrações do mesmo lance, e o interruptor "parar até o aluno
  clicar em Continuar". **Teste humano aprovado em 12/9**, com as 11 perguntas do
  roteiro. Ver "narração pela tela".

- **Fatia 6 aberta, parada 6A fechada (§16.1, §16.2 e começo de §16.4)** — "Criar
  treino daqui" está habilitado no percurso do capítulo, abre uma prévia e cria uma
  ou duas tarefas derivadas com IDs estáveis, posição inicial, respostas, defensor,
  término, obrigatoriedade e lugar no fluxo. O defensor pode jogar antes da primeira
  pergunta e depois da última. Ensaio real aprovado na N0 e 1.030 testes verdes. Ver
  "fatia 6 — nascimento e colocação do treino".

- **Parada 6B no código (§16.3)** — a janela de autoria do treino: várias respostas
  corretas, correta fora do método, erro conhecido nomeado, feedback por resposta, dica
  com desenho, explicação final, continuação e término conferidos antes de salvar, num
  Desfazer só. Dois defeitos achados na revisão e um no ensaio, os três consertados.
  **Roteiro de 13 itens aprovado na tela em 12/9, rodado pelo Playwright** a pedido do
  Doug — ver "fatia 6 — autoria das perguntas e respostas".

- **Parada 6C, defensor jogável (§16.4)** — "⏵ Jogar na prévia" joga o treino no
  `TreeStage`, o runtime do aluno, sem gravar nada; a defesa é estável na tentativa,
  gira entre tentativas e pode ser fixa; o defensor abre e fecha a linha quando ela
  começa ou acaba na vez dele; e a autoria acrescenta a segunda defesa a partir de uma
  variante da análise. **Roteiro de 14 itens aprovado na tela pelo Playwright em 12/9**,
  1.052 testes e 42/42 mutações. Ver "fatia 6 — o defensor jogável".

- **Lista de lances coberta em 1366×768, consertada em 13/9 (§7, §25)** — o bloco de
  edição ficava por cima da lista e roubava o clique do `•••`. Agora ele tem teto de
  metade da coluna e rola por dentro; a lista rola na própria coluna e o clique do mouse
  abre o menu. Ver "a lista de lances deixa de ficar coberta".

- **Texto próprio de cada defesa, e a régua de voz no treino, em 13/9 (§16.3, §16.4, plano
  §6 e §12)** — cada resposta do defensor, a de abertura e a de fecho ganham um texto
  opcional, que o aluno lê logo depois do feedback só quando o defensor joga aquele lance.
  Todo texto do treino que chega ao aluno passa pela régua, que avisa na janela e não
  impede salvar. 1.067 testes, 42/42 mutações, e **ensaio pelo Playwright**: tentativas
  1, 2 e 3 → d2, d3, d2, cada uma com o seu texto. Ver "o texto de cada defesa".

- **Parada 6D, propriedade (§16.5)** — treino derivado, personalizado e independente;
  cópia operacional no primeiro ajuste pedagógico; origem histórica preservada; fonte
  atual, alterada ou removida; diff, snapshot e Refazer em um Desfazer; troca explícita
  de fonte e IDs preservados quando o ponto de origem é o mesmo. **Roteiro aprovado no
  Playwright em 13/9**, com arrasto real pela cópia sem fonte, 1.082 testes e 42/42
  mutações. A fatia 6 está fechada. Ver "fatia 6 — propriedade do treino".

- **Fatia 7, publicação v2 (§20), 13/9** — Conferir com as regras que impedem publicar e o
  verde preso ao manifesto; publicação atômica recuperável fase a fase, com reativar e
  desativar; o aluno segue o fluxo v2 no mesmo player; progresso por publicação e revisão,
  idempotente, com a migração 0010 aplicada; conversão explícita da v1 com diff, snapshot e
  Desfazer. **A N0-LADDER está publicada em v2 localmente** (`pub-64ffac2c7bb1e700`), com 0
  divergências da v1. 54/54 mutações, `db:rls` 52/52, `db:finais:v2` 18/18 e **roteiro de 10
  itens no Playwright**. Ver "fatia 7 — publicação v2".

- **Fatia 8, repertório (§21) e aulas extras (§22), 13/9** — o `--check` do repertório passa a
  comparar com o disco (o JSON tinha 1.099 `\r\n` fora da fonte); o escritor emendador reescreve só
  o jogo tocado (11/11 arquivos byte a byte, 23/23 jogos com expansão idêntica); Aplicar é
  transação recuperável com impacto em ids e progresso; `/editor/repertorio` edita pelo painel e
  pelos comandos do v2 e cria abertura nova; as extras `EX-` com nível e classe entram na trilha
  por dados e a publicação mostra o efeito real no fechamento do nível. 57/57 mutações, `db:rls`
  52/52, `db:finais:v2` 18/18 e **roteiro de 14 itens no Playwright**, com 5 defeitos achados e
  consertados na sessão. Ver "fatia 8 — repertório e aulas extras".

- **Fatia 9, Stockfish do professor (§23 e §23.1), 13/9** — o motor virou fábrica (`criarMotor`),
  com o aluno numa instância e as exportações de sempre; a análise contínua do professor entrega
  por profundidade, 4 por segundo, e descarta a posição velha; barra, faixa de uma linha, linhas em
  SAN, seta cinza, tecla L, pausa com prévia/janela/aba, nos dois editores e **nunca para o aluno**
  (guarda automática de imports). A regra de aceite da tela foi aplicada inteira: bloco de edição a
  40% e linhas recolhidas em 1 com "+N" → 5 lances inteiros ligado, 6 desligado, tabuleiro igual.
  1.247 testes, 57/57 mutações e **roteiro de 14 itens no Playwright**, p95 da troca de posição 33,6 ms. Ver
  "fatia 9 — Stockfish do professor".

- **Fatia 10, paradas 10A–10H, 14/9** — ensaios de navegador guardados no repositório (`npm run e2e`,
  limpeza por SHA-256); **proveniência** (§19.1) e porta "Posição do acervo"; **prática** pela tela
  (§17.1); **introdução e quadros** (§7.1) e **ordem da aula** (§18); **importar estudo do Lichess
  por link e por arquivo** (§13.2), 9/9 capítulos no destino; **atalhos** numa tabela única (`x`,
  `?`), foco preso e devolvido, axe sérias/críticas **→ 0**, editor a 375 px **865 → 375**. A **aula
  do zero** (o estudo "Mate de Dama e Rei" recriado à mão) e a **aula importada** foram publicadas e
  jogadas pelo aluno de teste até o mate, com 5 tentativas no banco cada. **Desempenho medido e
  acelerado, mas 5 das 6 metas de §24 ainda passam do alvo** (116–149 ms contra 100; abrir a árvore
  de 1.000 nós em 2.031 ms contra 2.000) — decisão do Doug pendente. Ver "Fatia 10" e "Parada 10H".

- **Mudar o modo de uma parte, 15/9 (pedido do Doug)** — "Mudar para…" no `•••` do capítulo, do treino e
  do quadro da introdução: introdução ↔ capítulo ↔ treino, com o que sai e o que fica à vista antes de
  confirmar e um Desfazer. A importação deixou de perder os lances de um capítulo marcado como introdução.
  6 testes, ensaio no navegador. **Prática fica para a parada 2.** Ver "Mudar o modo de uma parte".

- **O modo de cada capítulo pelo nome, 16/9 (pedido do Doug)** — a importação do estudo lê o nome do capítulo
  ("Introdução", "AULA", "TREINO", "PRÁTICA") antes das pistas do Lichess, e o capítulo sem lances pode virar
  capítulo de posição parada. Os seletores **Vira** já chegam preenchidos; o professor muda antes de importar ou
  pelo "Mudar para…" depois. **Sem build, conteúdo, mutações e repertório** (727 MB livres). Ver "O modo de cada
  capítulo pelo nome".

**Aberto, na ordem:**

1. **10I — o teste humano do Doug** pelo roteiro numerado, reescrito em 14/9 em torno de "editar uma aula
   pronta e criar uma do zero, comparando com o Lichess" (48 itens, Partes 0–5).
2. Os itens de §28 ainda desmarcados, com o que falta em cada um, estão na tabela da Parada 10H.
3. Pendências da fatia 10: a importação junta os parágrafos de 1 narração; a prática não tem campo de
   texto para o aluno; setas do `EditorDeRepertorio`, da introdução do aluno e da passada fora do
   registro único de atalhos.

**Dívida conhecida:** a lista mostra **6 lances inteiros** em 1366×768 (5 com o motor ligado) e **5** em
1280×720. A rolagem lateral a 375 px foi paga na 10F.

**Isto não declara o editor pronto.** O roteiro de §27 tem as fatias 1 a 5 fechadas no
código e no teste humano. As fatias 6 a 9 e as paradas 10A–10G estão fechadas no código e em
ensaios pelo Playwright, **sem teste com uma pessoa** — ele é a 10I. §28 tem **14 de 30** itens
marcados. Prazo das fatias 7–10: 18/09/2026.

Este arquivo existe para outro agente (ou outra conta) continuar de onde este
parou, sem ter a conversa na mão. O plano inteiro está em
[`MODO-EDITOR-PLANO.md`](MODO-EDITOR-PLANO.md), ao lado deste — ele foi copiado
para cá justamente porque morava fora do repositório e ia se perder na troca.

> **Leia o plano antes de escrever código.** Ele traz as dez decisões, a régua
> de uso ("leigo edita sem instrução"), o que fica fora e por quê, e a divisão
> em seis blocos. Este arquivo só diz o que já foi feito e o que mudou de rota.

---

## Atualização vigente — fundação e piloto do Editor v2

Entregue em 10/09/2026, após a aprovação do plano final:

- contrato Zod do documento v2, diagnóstico estrutural de IDs, raízes, ciclos,
  órfãos, dois pais, percursos e referências;
- adaptador **somente leitura** do formato atual para v2. A N1-KPK vira uma
  análise, um capítulo explícito, 13 narrações e 11 lances sem alterar o JSON v1;
- reconstrução de FEN e SAN por nó; comandos transacionais para capítulo,
  comentário, NAG, novo lance, variante principal e exclusão de ramo;
- Undo/Redo, recuperação em IndexedDB, autosave separado em `.editor/v2/`,
  escrita atômica, `baseHash`, conflito e exclusão mútua no servidor;
- rota paralela `/editor/v2/finais/[aula]` e botão **Abrir v2** na bancada. O
  editor antigo e o conteúdo publicado continuam intactos;
- piloto visual com capítulos, tabuleiro, painel, narração, comentários e os
  seis símbolos. Jogar continuação existente navega; lance divergente cria
  variante;
- após teste do Doug, o painel deixou de recuar a linha principal a cada lance:
  agora é **vertical**, numerado e no mesmo eixo. Só variantes reais recebem
  recuo curto, limitado a dois níveis visuais — uma partida de 60 lances não
  vira uma escada.

Evidência executada: 772 testes do repositório verdes; 6 testes focados v2
verdes; tipos, lint e build Next verdes após o ajuste visual;
conteúdo verde com 38 consultas de tablebase vindas do cache; repertório
`--check` verde. No navegador real foram conferidos login de professor, abertura
da N1-KPK, seleção por painel e tabuleiro, comentário, NAG, autosave, dois Undo,
Redo e restauração do estado original.

Continuação da mesma rodada: a variante real foi preservada e medida no
navegador. A linha principal inteira ficou em `x=29`; os oito lances da variante
ficaram em `x=41`, sempre no mesmo eixo — 12 px de recuo, sem escada. O
comportamento passou para função pura e teste automatizado. O validador também
passou a detectar ciclos entre posições iniciais de análises. Tipos, lint e os
8 testes focados v2 ficaram verdes.

Continuação seguinte: o conflito agora aparece como estado próprio, nunca
sobrescreve silenciosamente e oferece **Baixar minha cópia** ou **Abrir versão
do disco**. Ao abrir a versão do disco, a edição local continua preservada no
IndexedDB. Falha do IndexedDB ganhou aviso verdadeiro e exportação manual; o
autosave no disco continua sendo tentado. Tipos, lint e 8 testes v2 ficaram
verdes após essa mudança.

Ensaio seguinte concluído com a N0-LADDER: duas abas partiram do mesmo hash; A
gravou, B recebeu conflito sem sobrescrever; B abriu a versão do disco somente
depois do ACK do IndexedDB; sua cópia sobreviveu ao reload; A restaurou o arquivo
original sem apagar a recuperação de B; e “Descartar” apagou somente a cópia de
B. A chave do IndexedDB passou de `aula` para `aula + sessão da aba`. O teste
também revelou e corrigiu uma promessa prematura: a interface não diz mais que
preservou antes da confirmação do armazenamento local. A N0-LADDER terminou sem
o comentário temporário.

Continuação do contrato: `PraticaV2` agora conserva posição, lado, objetivo e
configuração do Stockfish; `TreinoV2` ganhou perfil (final certificado ou linha
autoral), propriedade e estado da fonte independentes, receita versionada,
questões por posição, respostas com feedback, erros nomeados, defesa e próxima
questão, término por ramo, dicas, obrigatoriedade e revisão da avaliação. O
adaptador v1 preserva a ordem `capítulo → treino → prática`. Na N1-KPK, os seis
nós do treino guiado viram seis questões: `c6c7` conserva `e7e6 → n2` e o fim
conserva `b7b8q → promotion`. Os três arquivos de aula atuais foram adaptados
em memória sem erro e sem alteração de bytes.

O campo `praticas` tem compatibilidade de leitura com os rascunhos v2 anteriores.
O rascunho real da N1-KPK, já com a variante criada pelo Doug, continuou válido
com 20 nós e reapareceu igual depois de duas recargas no navegador. As duas abas
temporárias da N0-LADDER usadas no ensaio de conflito foram fechadas, e o
rascunho v1 que elas recriavam — byte a byte igual ao publicado — foi removido.

Evidência desta continuação: 779 testes do repositório e 12 testes focados v2
verdes; tipos, lint, build, conteúdo (38 consultas de tablebase, todas do cache),
42/42 mutações vermelhas e repertório `--check` verdes.

Continuação final desta rodada: o download da cópia em conflito foi testado no
navegador. O JSON baixado continha exatamente a edição da aba B, validou no
schema e não sobrescreveu a versão da aba A. Os arquivos temporários da
N0-LADDER e o download de ensaio foram removidos depois da conferência.

O Bloco 0/A avançou no contrato conceitual: o documento v2 agora representa
metadados didáticos, introduções, proveniência por hash, exceções editoriais,
catálogo de erros e mensagens, e certificação separada da autoria. O diagnóstico
passou a ter código, gravidade e localização precisa. O fluxo enumera também as
introduções e recusa entidades ausentes ou repetidas. Rascunhos antigos continuam
legíveis e são enriquecidos em memória somente quando sua origem ainda possui o
hash esperado; isso preservou o rascunho local real da N1-KPK, inclusive sua
variante de 20 nós, sem regravá-lo à força no disco.

Evidência deste checkpoint: 785 testes do repositório e 18 testes focados v2
verdes; tipos, lint completo, build Next, validação de conteúdo (38 consultas de
tablebase, todas do cache) e repertório `--check` verdes. A validação de mutações
foi **interrompida de propósito a pedido do Doug**, quando 37 das 42 mutações já
tinham sido corretamente rejeitadas. Portanto, ela não falhou, mas também não
foi concluída para estas alterações.

**Primeiro ponto exato a retomar:** executar `npm run validate:mutations` até o
fim e exigir 42/42 mutações vermelhas. Depois, concluir os portões v2 ainda
abertos para legalidade/proveniência/certificação e ligar o diagnóstico
localizado à ação visual de ir ao problema. Só então avançar ao Bloco B
(importação/leitura de PGN, teclado e corpus de partidas longas). Este commit é
um checkpoint seguro; não declara o Bloco 0/A nem o plano inteiro concluídos.

## Continuação — o portão da legalidade e o diagnóstico na tela

**As mutações foram concluídas: 42 de 42 vermelhas**, duas vezes — antes e depois
das mudanças desta rodada. O número não é herdado de commit anterior.

### O portão que faltava: legalidade dos lances

O validador v2 emitia 35 códigos e **nenhum** julgava se os lances são jogáveis.
Quem conferia era o desenhador do painel, e o modo de reprovar era **estourar uma
exceção** (`arvore.ts`) — que apaga a tela inteira em vez de dizer qual lance está
errado. Pior do que o código sugeria: o `throw new Error("lance ilegal no nó …")`
daquele arquivo **nunca roda**, porque a chess.js 1.4 estoura dentro do próprio
`move()` antes dele. O professor receberia `Invalid move: {...}`, em inglês.

Agora `problemasDaAulaV2(aula, positions?)` e `validarAulaV2(valor, positions?)`
aceitam as posições e, com elas, julgam legalidade. Quatro decisões que mordem:

- **`positions` é opcional, e isso é contrato.** Quem tem o pacote (tela, gate)
  recebe o julgamento de legalidade; quem só julga a forma do documento
  (recuperação local, rascunho colado) chama sem e recebe **exatamente** o veredicto
  de antes. Há teste que fixa isso nos dois sentidos.
- **Poda por ramo, não por árvore** (plano final §5): achado o lance impossível, o
  ramo para ali e os irmãos continuam sendo julgados. Sem isso um erro viraria uma
  cascata que esconde o único que importa — há teste medindo "1 erro, e não um por
  lance restante".
- **Árvore quebrada não é percorrida com tabuleiro.** Ciclo, filho ausente, nó órfão
  ou dois pais impedem o percurso; a legalidade só roda em análise cuja forma fechou.
  Um "lance ilegal" num grafo quebrado seria consequência, não causa.
- **Um tabuleiro só, com `undo`.** O percurso é em profundidade, cada lance jogado
  uma vez. `arvore.ts` continua recalculando desde a raiz por nó — ver a dívida de
  desempenho abaixo.

Códigos novos: `LANCE_ILEGAL`, `LANCE_AUSENTE`, `POSICAO_INEXISTENTE`.

### O diagnóstico chegou à tela

`lib/editor-v2/diagnostico-visual.ts` (novo) traduz a localização estruturada no
vocabulário do professor e diz para onde a tela deve ir. `analise-n1-kpk / node-7`
vira **"o 2º lance do capítulo «Rei e peão contra rei»"**, com botão *Ir para o
problema*. Cobre lance do percurso, posição de partida, lance de variante, quadro
de introdução, pergunta e resposta de treino, prática, etapa do fluxo e a aula.

Duas regras que a implementação fixa:

- **Sem destino navegável, sem botão.** "Esta aula não declara seus metadados" é da
  aula inteira; um botão ali não levaria a lugar nenhum, e um botão que não faz nada
  ensina a desconfiar dos outros.
- **Ordinal concorda em gênero.** "o 3º lance", "a 3ª etapa", "a 2ª pergunta". A
  primeira versão escrevia "a 2º pergunta" na tela de um professor de português.

Na tela (`PainelDeProblemas.tsx`, novo): lista com os bloqueantes na frente, cada
item marcado *impede* ou *aviso*, e um resumo de uma linha — "2 problemas impedem a
publicação · 1 aviso" —, porque "3 problemas" não responde se dá para publicar.

**E o editor deixou de quebrar.** A reconstrução de posições em `EditorV2.tsx` está
sob `try`: quando um lance impossível impede montar o tabuleiro, a tela mostra a
lista de problemas e uma frase explicando por que o tabuleiro sumiu, em vez de uma
página em branco. O painel de lances cai para o UCI cru e continua clicável, então o
professor ainda alcança o lance errado. Nada é corrigido sozinho.

### Evidência desta continuação

**802 testes** do repositório verdes (eram 785), sendo **17 novos focados no v2** —
7 do portão de legalidade e 10 do tradutor. Tipos, lint, build Next, validação de
conteúdo (38 consultas de tablebase, todas do cache), repertório `--check` e
**42/42 mutações** verdes. O rascunho real `.editor/v2/N1-KPK.json` não foi tocado:
20 nós, e a impressão digital conferida antes e depois
(`92879926bfb4439b9d66ff8695566129c576424ec0ea7d14e60627cca3f7d243`).

### O que esta rodada NÃO cobre

- **A rodada de navegador não foi feita.** `/editor/v2/finais/N1-KPK` pede login de
  professor, e o agente não usa credencial do Doug. Falta conferir na tela: a aula
  real abrindo sem problema na lista; uma aula **temporária** quebrada de propósito
  mostrando a frase certa e o botão levando ao lance; e a remoção da temporária.
- **Proveniência e certificação** continuam abertos como portões: hoje o validador
  confere se o registro **existe** (`POSICAO_SEM_PROVENIENCIA`,
  `CERTIFICACAO_SEM_PROVENIENCIA`), não se ele **bate** com o conteúdo.
- **Dívida de desempenho medida por leitura, não por benchmark:**
  `sansDaAnalise` chama `quadroDoNo` para cada nó, e `quadroDoNo` rejoga a partida
  desde a raiz — custo quadrático. **Paga na continuação seguinte; ver abaixo.**

## Continuação — a partida de 60 lances, medida e acelerada

### O que foi exercitado no navegador (com o Doug logado)

`/editor/v2/finais/N1-KPK` abriu com o rascunho real: tabuleiro, 20 lances, **nenhum
problema na lista**. Numa cópia **temporária** da N0-LADDER, quebrada de propósito:
*"1 problema impede a publicação"*, a frase nomeando o lance e o capítulo, o tabuleiro
substituído pela explicação, e **"Ir para o problema" marcou o nó certo** (o 2º lance).
Com a cópia válida: comentário escrito chegou ao disco, NAG aplicado, e
**Desfazer/Refazer voltaram um gesto por vez** (comentário, depois símbolo) e
devolveram o estado original.

**Corpus de partida longa:** 60 lances completos (120 meios-lances) e 3 variantes em
profundidades 2, 30 e 80 — 124 nós. A regra visual do Doug **se manteve**: a lista
inteira tem só **duas** posições horizontais (linha principal e variante), **13 px** de
recuo, **zero rolagem horizontal**. Numeração correta até `60.Rh7+`.

### A dívida de desempenho: 758 ms → 24 ms

`mapaDaAnalise` (novo, em `arvore.ts`) percorre a análise **uma vez**, com um tabuleiro
e `undo`, e devolve posição, SAN e numeração de todos os nós. `sansDaAnalise` e
`rotulosDaAnalise` passaram a ser leituras dele; a tela faz **uma** chamada em vez de
três, e o mapa **não depende do nó selecionado** — trocar de lance na lista não
recalcula a árvore.

Medido em Node, sem navegador no meio, na árvore de 121 nós, média de 20 execuções:

| | Antes | Depois |
|---|---|---|
| Calcular a árvore inteira | **757,8 ms** | **24,1 ms** |

**32× mais rápido.** Na tela, com relógio confiável, a mediana de selecionar um lance
ficou em **72 ms** (60, 66, 67, 72), abaixo do alvo de 100 ms do plano (§17).

Teste de regressão conta as chamadas em vez de cronometrar: `jogadas === nós - 1`,
um lance por nó. Cronômetro em teste falha sozinho em máquina lenta; contagem não.

### Uma correção: as primeiras medidas de tela estavam infladas

A primeira rodada relatou "1,1 s por clique" usando `requestAnimationFrame` duplo
para esperar o render. **Neste navegador um rAF duplo VAZIO custa 392 ms**, e às vezes
trava em 1 s exato. O problema era real — 758 ms de conta de verdade —, mas o número
de tela não era o da conta. **Protocolo para as próximas rodadas:** medir com
`setTimeout(0)` (custa 1 ms aqui), nunca com `requestAnimationFrame`, e confirmar com
medida em Node quando o que se quer é o custo do algoritmo.

### Outras duas coisas que a rodada ensinou

- **O navegador embutido nunca tem foco** (`document.hasFocus() === false`), então
  `elemento.blur()` não dispara nada e campos que salvam ao sair do campo parecem
  quebrados. É preciso despachar `focusout` à mão. Isso me fez julgar um comentário
  como perdido quando ele estava correto.
- **O tabuleiro não aceita lance por evento simulado.** Quatro tentativas (ponteiro,
  mouse, na peça, clique-clique); o chessground não seleciona. É o que o plano já
  prevê (§19). **Arrastar peça continua sendo teste humano**, do Doug.

### O que a rodada NÃO cobre, e é o próximo ponto

- **A lista de lances não rola por dentro.** **Paga na continuação seguinte; ver
  abaixo.**
- **Proveniência e certificação:** **fechados na continuação seguinte; ver abaixo.**

## Continuação — a lista de lances passa a rolar por dentro

Com 60 lances, a lista tinha **4.420 px** e empurrava a página para **5.452 px**:
quem rolava era a página, e o tabuleiro saía da tela justamente enquanto o professor
procurava um lance lá embaixo.

O conserto é o mesmo que o editor v1 já tinha aprendido: **altura fechada** no `main`,
`min-h-0` na linha de baixo (sem ele um filho flex nunca encolhe abaixo do próprio
conteúdo) e rolagem própria em cada coluna.

**Duas correções que só apareceram medindo:**

1. Pôr `overflow-y-auto` também na coluna dos lances **desabou a lista para 0 px** —
   quem rola ali é a `<ol>`, e a coluna precisa apenas ceder altura. A `PainelDeLances`
   também passou a reclamar a altura que sobra (`flex-1`), senão encolhia a zero.
2. **A altura fechada vale só a partir de `lg`.** Em tela estreita as três colunas
   empilham, e altura fechada espremia a lista a zero — medido em 375 px. Abaixo de
   `lg` a página volta a rolar como antes. O plano (§16) diz que o alvo da autoria é o
   desktop; isto não promete paridade no celular, só evita quebrar o que funcionava.

Medido em **1366×768**, com a partida de 60 lances e 123 lances na lista:

| O quê | Antes | Depois |
|---|---|---|
| Lista de lances | cresce até 4.420 px | **rola por dentro**, 369 px visíveis (~10 lances) |
| Página na vertical | 5.452 px, rolando | **768 px, sem rolagem** |
| Tabuleiro ao rolar a lista | saía da tela | **fica parado e inteiro na tela** (560 px) |
| Rolagem horizontal | não | **não** |
| Recuo das variantes | 13 px, duas posições | **13 px, duas posições** |

Conferido em 375×812 que a tela estreita não regrediu: a lista não desaba e a página
rola como antes.

**Fica declarado:** 369 px mostram cerca de 10 lances por vez. É utilizável e não foi
ajustado; se incomodar, o espaço sai do bloco de edição embaixo da lista.

Evidência desta continuação: **806 testes** do repositório verdes, **39 focados no
v2**; tipos, lint, build Next, conteúdo (38 consultas de tablebase, todas do cache),
repertório `--check` e **42/42 mutações** verdes. Artefatos temporários da N0-LADDER
removidos. O rascunho real `.editor/v2/N1-KPK.json` continua com 20 nós e a mesma
impressão digital (`92879926…`).

---

## Continuação — proveniência e certificação: o Bloco 0/A fechado

O validador conferia se a revisão **existe**; nunca se ela **bate**. Uma aula podia
registrar "posição aprovada, conteúdo tal" e a posição ter mudado depois: a frase
continuava no arquivo, agora descrevendo outra coisa. É o buraco que o plano final
nomeia em §12 e §9.

### As três regras, e por que as severidades são diferentes

| Código | Severidade | O que pega |
|---|---|---|
| `PROVENIENCIA_CADUCA` | **aviso** | o `conteudoHash` registrado não é mais o da posição no arquivo |
| `PROVENIENCIA_DIVERGE` | **aviso** | a aula diz `approved` e o arquivo da posição diz `candidate` |
| `CERTIFICACAO_SEM_APROVACAO` | **erro** | um treino diz "conferido" sobre posição que a aula não registra como aprovada |

**Os dois primeiros são avisos de propósito.** Descrevem o mundo de fora mudando —
alguém mexeu no arquivo da posição depois de a revisão ter sido registrada. Travar o
salvamento prenderia o professor num rascunho que ele não consegue nem guardar, por um
estrago que não foi ele que fez; o plano (§7) diz que o rascunho aceita pendência
identificada e que quem exige tudo em ordem é a publicação. **Quando a publicação v2
existir, estas duas passam a impedir** — está escrito no código, junto da regra.

**O terceiro é erro** porque não descreve o mundo de fora: é o documento contradizendo
a si mesmo, e quem escreveu desfaz na hora. O adaptador nunca o produz — ele carimba
`herdada-v1` justamente para não inventar confirmação que ninguém fez, e há teste
fixando isso.

### Onde cada conferência roda, e por quê

O hash vem do `node:crypto`, que **não existe no navegador**. Então:

- `hashDoConteudo` saiu para `lib/editor-v2/hash.ts` e é **a mesma função** que o
  adaptador usa para registrar e o validador usa para conferir. Duas cópias divergiriam
  no dia em que alguém mexesse numa delas, e o sintoma seria "toda posição está caduca"
  — alarme falso que ensina a ignorar o alarme. Há teste fixando a igualdade.
- `problemasDaAulaV2(aula, positions?, hashDaPosicao?)` recebe o hash **injetado**.
  Sem ele, as conferências de conteúdo simplesmente não são afirmadas — nem viram aviso
  falso, nem silêncio enganoso.
- A página (servidor) confere a proveniência na abertura e manda o resultado pronto
  para a tela em `problemasDaOrigem`. Não é gambiarra: a proveniência responde "o
  arquivo da posição mudou", e isso não muda enquanto o professor escreve. O que muda a
  cada tecla — forma, referências, legalidade — continua sendo recalculado na tela.

### Evidência

**813 testes** do repositório verdes, **46 focados no v2** (7 novos nesta rodada);
tipos, lint, build Next, conteúdo (38 consultas de tablebase, todas do cache),
repertório `--check` e **42/42 mutações** verdes. As 3 aulas reais passam no portão
novo sem acusar nada. Na tela, a N1-KPK real abriu com tabuleiro, 19 lances e
**nenhum problema** — o portão não produz alarme falso no conteúdo que existe.

### O Bloco 0/A está fechado

Os quatro portões que faltavam foram fechados nesta sequência: **legalidade dos
lances**, **diagnóstico localizado na interface**, **regressão de conteúdo** (as aulas
v1 continuam íntegras e jogáveis) e **proveniência/certificação**. A diferença entre
aviso e erro bloqueante passou a ser decidida por regra escrita, não por acidente.

**Isto não declara o editor pronto.** O Bloco B inteiro continua aberto.

### O próximo ponto exato: Bloco B

1. **Importação e leitura de PGN** (plano §11): reaproveitar `lib/repertorio/pgn.ts`,
   auditar tokens não reconhecidos, relatório de perdas antes de aplicar, lote
   transacional. O writer não é pré-requisito do importador.
2. **Navegação por teclado** (§16): setas para andar na árvore, atalhos só fora de
   campo de texto, foco visível. **Não pode ser verificada pelo agente** — a tecla não
   chega à página do navegador embutido; é teste humano do Doug.
3. **Corpus e limites** (§17): a partida de 60 lances já é fixture e está medida; falta
   a linha de 500 meios-lances e a árvore de 1.000 nós, com os limites de bytes, nós e
   profundidade declarados antes de liberar a importação.

**Dívida conhecida, medida e não paga:** a lista de lances mostra ~10 lances por vez em
1366×768; se incomodar, o espaço sai do bloco de edição abaixo dela.

---

## Continuação — Bloco B começa pelo freio: o corpus grande e os tetos

**Por que o corpus veio antes do importador.** O plano final (§17) manda declarar os
limites de bytes, nós e profundidade **antes** de liberar a importação. Na ordem
contrária o importador nasceria sem teto: um PGN de torneio inteiro entraria, a tela
tentaria montar a árvore e o professor receberia uma página branca — sem aviso e sem
nada para consertar. Então o Bloco B começa pelo freio de mão.

### As duas fixtures que faltavam, e por que elas são geradas

`lib/editor-v2/corpus.ts` (novo) constrói a linha de **500 meios-lances** e a árvore de
**1.000 nós** com comentários e variantes. Elas são **reconstruídas** a cada execução, a
partir de uma semente fixa, em vez de guardadas em JSON: 500 lances gravados seriam
dezenas de milhares de bytes de conteúdo que ninguém consegue revisar num diff, e que
viram lixo silencioso no dia em que o esquema mudar. Semente fixa, e não `Math.random`:
teste que falha só às terças é pior que teste nenhum.

Duas regras fazem a linha chegar aos 500 sem virar absurdo: captura é desempatada por
último (senão o sorteio come as peças e a partida morre afogada por volta do lance 40),
e lance que dá mate ou afogamento é recusado, porque são os únicos que zeram os lances
legais. Repetição e regra dos 50 **não** são recusadas — o plano diz que a linha longa é
fixture de navegação, "não necessariamente partida competitiva concluída pelas regras de
empate".

### Os tetos, e o número medido atrás de cada um

`lib/editor-v2/limites.ts` (novo). Medido em 11/09/2026, Node 24 no Windows, **mediana de
20 execuções em processo limpo**:

| O quê | Lances | Prof. | Bytes | Percorrer a árvore | Validar |
|---|---|---|---|---|---|
| N1-KPK (real) | 11 | 11 | 13 KB | 1 ms | 1 ms |
| linha de 500 | 500 | 500 | 33 KB | 69 ms | 180 ms |
| árvore de 1.000 | 1.000 | 317 | 94 KB | 289 ms | 278 ms |
| linha **no teto** | 1.000 | 1.000 | 66 KB | 328 ms | 335 ms |
| árvore **no teto** | 2.000 | 625 | 191 KB | 611 ms | 571 ms |

Daí saem os tetos: **2.000 lances por análise** (no teto, abrir custa ~1,2 s, ainda
abaixo do alvo de 2 s do plano e já sem folga para dobrar de novo), **4.000 por aula**,
**1.000 meios-lances de profundidade** (o dobro da partida mais longa já jogada em
torneio; medida, a recursão não chega perto de estourar a pilha), **2 MB** por arquivo,
**4.000 comentários** e **4.000 desenhos**.

Acima do teto o professor lê os **dois** números, nunca "aula grande demais":
*"esta análise tem 2.100 lances e o limite é 2.000"*. Saber que precisa cortar cem, e não
dois, é a diferença entre consertar e desistir.

### Três decisões que mordem

- **Teto é erro, e erro não tranca o salvamento.** No v2 `severidade: "erro"` significa
  *impede a publicação* — o painel escreve "impede" e o rascunho continua gravando. É o
  que o plano (§7) manda: o rascunho aceita pendência identificada. Um teto que travasse
  o salvamento prenderia o professor dentro de um arquivo grande demais para ele
  conseguir encolher.
- **Os tetos rodam sem o pacote de posições.** Legalidade e proveniência precisam das
  posições; tamanho, não. Quem recupera um rascunho local, sem pacote nenhum, ainda
  precisa saber que o arquivo não cabe — e há teste fixando isso.
- **A medida da profundidade não é recursiva.** O que ela mede é justamente árvore funda;
  medi-la com recursão seria o medidor estourando antes do medido.

### A primeira medição estava errada, e o erro é do método

A primeira rodada relatou **176 ms** para a árvore de 1.000 nós. A execução seguinte, com
mais fixtures vivas na memória do mesmo processo, relatou **468 ms** para exatamente a
mesma conta. A diferença era pressão de memória do próprio medidor.

`scripts/medir-corpus-v2.ts` (novo) passou a rodar **um processo por caso**, com cinco
execuções de aquecimento descartadas, e a relatar **mediana e p95** em vez de média. Os
números repetem: duas execuções seguidas da árvore de 2.000 deram 613 e 612 ms. É o
mesmo tipo de armadilha do `requestAnimationFrame` de 10/09 — o cronômetro medindo o
cronômetro.

### Evidência desta continuação

**822 testes** do repositório verdes (eram 813), sendo **9 novos** em
`lib/editor-v2/limites.test.ts`; tipos, lint, build Next, conteúdo (38 consultas de
tablebase, todas do cache), repertório `--check` e **42/42 mutações** verdes, rodados
depois desta mudança e não herdados. O rascunho real `.editor/v2/N1-KPK.json` continua
intocado, com a mesma impressão digital (`92879926…`). Nenhum arquivo temporário ficou.

**Não houve rodada de navegador, e não devia haver:** esta mudança é de biblioteca e de
script; nada na tela muda enquanto nenhuma aula encostar num teto, e nenhuma encosta.

### O que esta rodada NÃO cobre

- **Orçamento de expansão de treino** (§17) continua aberto: ele é teto do derivador, e
  o derivador ainda não existe. Está escrito no código, junto dos outros tetos.
- **O aviso de aproximação** — "você está em 1.900 dos 2.000" — não existe. A decisão foi
  não inventar barulho de interface antes de o importador ter onde mostrá-lo: quem vai
  dizer isso é o relatório de perdas da importação, com o número na mão antes de aplicar.

### O próximo ponto exato

**Importação e leitura de PGN** (plano §11), agora com o freio pronto:
`medidasDaAulaV2` já devolve os seis números que o relatório de perdas precisa mostrar
antes de aplicar. O buraco medido no leitor atual (`lib/repertorio/pgn.ts`) é a auditoria
que o plano exige: a varredura **descarta em silêncio** tudo que a expressão regular não
reconhece — não há token de "não entendi isto", e portanto não há como listar as perdas.
É por aí que o importador começa.

Depois dele, **navegação por teclado** (§16), que é teste humano do Doug — a tecla não
chega à página do navegador embutido.

---

## Continuação — o importador de PGN, medido no estudo real do Doug

### Primeiro o buraco que o plano manda tapar: a varredura descartava em silêncio

`lib/repertorio/pgn.ts` lia o PGN com uma expressão regular de alternativas. O que ela
não casava **sumia**: nenhum token, nenhum aviso, nenhum jeito de saber que sumiu. O
plano (§11) proíbe exatamente isso — "auditar tokens não reconhecidos… não descartar
tokens silenciosamente" —, porque o importador precisa mostrar as perdas antes de aplicar.

A correção não é uma alternativa nova na expressão regular. Uma alternativa "qualquer
coisa" competiria com as outras e roubaria o que elas deviam pegar. O não reconhecido é o
**buraco entre um casamento e o seguinte**, mais o rabo depois do último. Cada jogo passou
a carregar seu `naoReconhecidos`.

Medido nos 15 arquivos PGN que existem entre o repertório do projeto e a pasta de
downloads do Doug — 56 jogos: **zero achados**. A auditoria não é barulhenta. E num PGN
quebrado de propósito ela acha: `1. e4 ¿¿ e5` devolve `¿¿`, e `1. e4 {sem fechar` devolve
o `{s` órfão — junto com a prosa virando SAN de mentira, que é o outro sintoma da mesma
chave aberta.

### O importador: ler nunca aplica

`lib/editor-v2/importar-pgn.ts` (novo) tem duas metades, e a separação é o ponto:

- `lerImportacaoPgn` **não toca em aula nenhuma**. Lê o arquivo, monta o que entraria e
  devolve, jogo por jogo, o título, os lances, as variantes, os comentários, o que é
  recusado e o que se perde.
- `aplicarImportacaoPgn` é a única que muda o documento, e só com a lista escolhida.

**O lote é transação de verdade:** a aula nova é montada inteira numa cópia, conferida na
cópia, e só então devolvida. Se qualquer jogo escolhido for recusado, ou se o conjunto
estourar os tetos de §17, **nada** entra e o motivo volta nomeado, com "Nada foi
aplicado" escrito na frase. Meia importação deixa a aula num estado que o professor não
pediu e não sabe descrever.

**Recusa é na porta** (variante que não é xadrez padrão, jogo sem lance, FEN inicial
impossível). **Perda não recusa**: lance impossível, token não reconhecido, cor de seta.
Jogar fora vinte variantes certas por causa de uma torta seria o oposto do que se quer.

### Duas mudanças de contrato que a importação exigiu

1. **Uma análise pode começar numa FEN crua** (`inicio: { tipo: "fen" }`). Era isso ou
   fabricar um arquivo de posição na importação — e §12 é categórico: "FEN importada não é
   posição automaticamente aprovada". Fabricar daria ao material de fora a mesma aparência
   do material revisado, e o professor perderia o único sinal que separa os dois. Agora a
   diferença é estrutural, e o validador diz `FEN_IMPORTADA_SEM_REVISAO` (aviso; vira
   impeditivo quando a publicação v2 existir).

   **Com uma exceção:** partida que começa do começo não gera aviso. A posição inicial do
   xadrez não é material de ninguém e não tem o que revisar; vinte avisos que não pedem
   trabalho ensinariam a ignorar os que pedem.

2. **O nó guarda as diretivas cruas** (`diretivas`). `desenhos` guarda o que a tela sabe
   desenhar, e a tela deste projeto desenha **numa cor só** — o `G` de verde e o `R` de
   vermelho do Lichess não têm onde morar ali. Então a seta aparece na tela, a cor é
   **anunciada como perda**, e o texto original (`[%cal Ge2e4]`) fica guardado inteiro e
   opaco, de onde a cor volta num round-trip futuro. Nada ali é interpretado.

   O cabeçalho do PGN também ficou: `origemPgn` guarda tags, resultado e o que não foi
   reconhecido. Sem ele o professor não teria como voltar à origem do que edita.

### O teste com o arquivo de verdade, e os dois defeitos que ele achou

Rodado nos quatro PGNs da pasta de downloads — **42 jogos, 1.524 lances**:

| Arquivo | Jogos | Lances | Comentários | Perdas |
|---|---|---|---|---|
| Estudo P1 do Lichess (12 capítulos) | 12 | 170 | 88 | 0 |
| P1.07 sozinho | 1 | 6 | 6 | 0 |
| Caro-Kann comentado | 9 | 259 | 259 | 0 |
| 20 partidas canônicas | 20 | 1.089 | 0 | 0 |

Todos validam no esquema, todas as árvores são percorridas com tabuleiro sem erro, e a
única queixa do validador é a que o plano manda existir.

Conferência independente, contada no texto do arquivo e não perguntada ao código: o
capítulo P1.07 tem linha principal de 2 lances, três variantes (`1.Kg1`, `1.Kh3`,
`1...Kg4 2.Kg2`) e 6 comentários. O importador devolveu **6 lances, 3 variantes, 6
comentários**. Bate.

**Os dois defeitos que só o arquivo real (e o teste) mostraram:**

1. **153 identificadores repetidos.** Os ids de nó são únicos na **aula inteira**, não
   dentro da análise — e 12 capítulos numerados `no-1`, `no-2`… colidiram todos. Lendo o
   código de um capítulo só, isso é invisível. Agora o id do lance carrega o apelido do
   capítulo.
2. **Um lance impossível matava as variantes que eram alternativas a ele.** O `( … )` do
   PGN quer dizer "em vez deste lance": as variantes saem da **mesma** posição que ele.
   Podar o ramo é cortar o que vem *depois* do lance impossível, não o que estava *ao
   lado*. Um teste escrito para essa regra ficou vermelho e apontou o lugar.

### Evidência desta continuação

**841 testes** do repositório verdes (eram 822), sendo **19 novos** — 4 da auditoria do
leitor de PGN e 15 do importador; tipos, lint, build Next, conteúdo (38 consultas de
tablebase, todas do cache), repertório `--check` e **42/42 mutações** verdes, rodados
depois desta mudança. O rascunho real `.editor/v2/N1-KPK.json` continua com a mesma
impressão digital (`92879926…`). Nenhum arquivo temporário ficou.

### O que esta rodada NÃO cobre

- **Não há tela.** O importador é biblioteca: o professor ainda não tem onde soltar um
  arquivo, ver o relatório, escolher os capítulos e clicar em aplicar. **É o próximo
  passo exato.**
- **Importação por URL do Lichess** (§11) não entra ainda — arquivo exportado primeiro.
- **Exportar** continua fora: o plano diz que o escritor não é pré-requisito do
  importador, e o round-trip só é prometido quando houver escritor para provar.
- **A cor do desenho não chega à tela.** Está preservada no arquivo e anunciada como
  perda; fazer a tela desenhar em cores é decisão de interface, não de importação.

---

## Continuação — a cor do desenho, como no Lichess

A rodada anterior guardava a seta e **jogava a cor fora**, anunciando-a como perda. O
Doug recusou, e com razão: anotar em verde, vermelho e amarelo é metade do que uma seta
diz. Agora a cor atravessa inteira — do PGN ao arquivo, e do arquivo ao tabuleiro.

### O documento

`corDesenhoV2Schema` tem as quatro cores do Lichess pelo nome: **verde, vermelho,
amarelo, azul**. `[%cal Ge2e4]` vira `{ de: "e2", para: "e4", cor: "verde" }`. Guardar o
nome, e não a letra do exportador, é o que deixa o arquivo legível num diff e
independente de quem exportou.

**Cada entrada aceita duas formas, e isso é a promessa que protege o que já existe.** A
forma curta (`["e2","e4"]`) é a das três aulas v1, e sem cor declarada a tela desenha com
os pincéis de sempre — ligar a cor **não repinta sozinho** o conteúdo publicado. Há teste
fixando que as duas formas dão exatamente o mesmo resultado que davam antes.

Não há `transform` no schema: o que entra é o que sai. Um schema que normalizasse faria o
editor gravar de volta um arquivo reescrito que o professor não pediu.

### O azul é o caso difícil, e a decisão está declarada

**Este projeto não tem azul de propósito.** A seta era azul até 8/9/2026 e foi trocada
porque *o tabuleiro é azul*: a marca sumia dentro do cenário, e está medido na folha que
qualquer azul acima de 50% de claridade reprova o piso de 3:1 contra a casa clara.

Então o azul do Lichess é **desenhado** com o roxo do plano. **No arquivo ele continua
sendo `"azul"`** — a escolha do professor é preservada inteira, e no dia em que o
tabuleiro deixar de ser azul basta trocar uma linha. O que não se pode é gravar "roxo"
onde o professor escreveu azul.

Contraste das quatro contra as duas casas, calculado em 11/09/2026:

| Cor | Pincel | Casa clara | Casa escura |
|---|---|---|---|
| verde | `pincel-defendida` | 5,83:1 | **3,23:1** |
| vermelho | `pincel-pendurada` | 12,60:1 | 6,99:1 |
| amarelo | `pincel-alternativa` | 6,31:1 | 3,50:1 |
| azul → roxo | `pincel-plano` | 8,53:1 | 4,73:1 |

As quatro passam o piso de 3:1 nas duas casas; o verde na casa escura é o mais apertado.

**Limitação declarada, não escondida:** verde e amarelo separam-se por apenas **1,08:1**
de luminância — em escala de cinza são quase a mesma cor. Quem os separa é a matiz (152
contra 75), que é a mesma solução que a folha já usa para os três verdes do tabuleiro. O
Lichess tem exatamente o mesmo problema. Se incomodar, o conserto é afastar a claridade
de um dos dois, e isso é decisão do Doug.

### A tela passou a desenhar

O tabuleiro do editor v2 **não desenhava nada** — o canal de desenho nunca tinha sido
ligado ali. Agora as setas e casas acesas do lance selecionado aparecem, pelo canal dos
desenhos automáticos (`shapes`). O canal de quem desenha com o mouse continua desligado:
**mostrar** o desenho que veio do arquivo é esta rodada; **desenhar** com o botão direito
é gesto que entra com o painel de edição.

### A guarda contra o defeito mudo

Um nome de pincel errado não dá erro: o chessground desenha com o padrão dele, ou nada. A
seta some e parece que o professor não desenhou. `ChessBoard` passou a conferir, na
montagem, que todo pincel que a paleta do autor pede existe na tabela — e grita no
console se não existir. É a mesma regra que já valia para o token ausente.

### Evidência desta continuação

**847 testes** do repositório verdes (eram 841), sendo **6 novos** — 3 das cores no
tabuleiro e 3 do importador. Tipos, lint, build, conteúdo, repertório `--check` e
**42/42 mutações** verdes.

**No navegador**, em 1366×768, sem login (a rodada do editor v2 pede credencial do Doug):
a aula pública N0-LADDER abriu, o tabuleiro desenhou o corte e o selo como antes, e o
console ficou **sem uma única mensagem** — o que é a prova de que a guarda nova não
disparou, ou seja, os quatro pincéis existem. Medidos no navegador, os quatro tokens
resolvem para cores reais, nenhum ausente.

**O que falta ver na tela, e é teste do Doug:** uma seta verde e uma vermelha importadas
de um PGN, desenhadas no editor v2. Nenhum dos quatro PGNs da pasta de downloads traz
`[%cal]`, então esse caminho está provado por teste e por medida de cor, não por
fotografia.

---

## Continuação — a tela de importar, exercitada no navegador

O importador existia como biblioteca desde a rodada anterior; o professor não tinha onde
usá-lo. Agora há um botão **Importar PGN** no cabeçalho do editor v2 e uma janela que
segue a ordem da decisão: escolher o arquivo, **ver o que ele tem**, marcar o que entra,
e só então aplicar. O botão de aplicar não existe antes do relatório, porque antes do
relatório não há decisão — só aposta.

### Três decisões da tela

- **Recusa trava a caixa; perda não.** Um capítulo recusado aparece riscado, com o motivo
  em vermelho e a caixa desmarcada **e desabilitada**: o que não pode entrar não pode ser
  escolhido por engano. Perda aparece em âmbar, uma linha cada, e não impede nada — quem
  aplica sem ler pelo menos leu.
- **O número do rodapé responde antes.** "Com o que está marcado, a aula fica com 17 de
  4.000 lances" é a pergunta que o professor faria depois de aplicar. Passando do teto, o
  botão trava e diz por quê, em vez de deixar aplicar e devolver um erro que ele não sabe
  desfazer.
- **A leitura espera 300 ms.** Ler 20 partidas custa 145 ms, medido; sem a espera, um
  texto colado e depois ajustado à mão relê o arquivo a cada tecla e a caixa trava.

### Importar é um comando, e cabe num Desfazer

`IMPORTAR_JOGOS` entrou em `comandos.ts`. Doze capítulos de uma vez é a edição mais cara
que o editor faz, e é exatamente a que o professor mais vai querer desfazer quando vir
que escolheu o arquivo errado. A recusa do importador vira a mensagem da tela sem ser
reescrita: *"o jogo 2 não pode ser importado: … Nada foi aplicado"* diz o que fazer;
"não deu certo" não diria.

Foco (§16): ao abrir, vai para a caixa de texto; `Esc` fecha; o `Tab` não escapa da
janela; ao fechar, o foco volta para o botão que abriu.

### A rodada de navegador — e desta vez com fotografia da cor

Feita em **1366×768**, na **N0-LADDER** (cópia temporária), nunca na N1-KPK real. Num
arquivo de três jogos — um capítulo real do estudo P1 do Doug, um Chess960 e um com
defeito de propósito:

| O que a tela mostrou | Confere? |
|---|---|
| "3 jogo(s) no arquivo · **2 podem entrar**" | sim |
| P1.07 — 6 lances, 3 variantes, 6 comentários | sim, contado no PGN |
| Chess960 riscado, *"não entra — este jogo é de Chess960…"* | sim |
| duas perdas do jogo torto: o `¿¿` e o `Qh8` impossível | sim |
| "a aula fica com **17** de 4000 lances" (9 + 6 + 2) | sim |
| aplicar: dois capítulos novos, tela pulou para o primeiro | sim |
| aviso de proveniência da FEN importada, com *Ir para o problema* | sim |
| **Desfazer** devolveu a aula a um capítulo e ao estado "✓ salvo" | sim |

**A cor, medida no tabuleiro de verdade.** Selecionando o lance que trazia
`[%cal Gh2h1,Rf3f2]`, o desenho saiu com **duas linhas**, uma em
`lab(36,89% -47,5 29,2)` e outra em `lab(7,36% 61,5 18,4)` — exatamente os tokens do
verde e do vermelho. No lance com `[%csl Yh1]`, um círculo em `lab(35,89% 20,9 75,8)`, o
amarelo. É a fotografia que faltava na rodada da cor.

Console sem uma mensagem em toda a sessão. Artefatos temporários removidos
(`.editor/v2/N0-LADDER.json` e o rascunho v1 que a abertura recria). O rascunho real
`.editor/v2/N1-KPK.json` continua com a mesma impressão digital (`92879926…`).

### Evidência desta continuação

**849 testes** verdes (eram 847), sendo 2 novos do comando de importação; tipos, lint,
build, conteúdo, repertório `--check` e **42/42 mutações** verdes.

### O que esta rodada NÃO cobre

- **Importar por URL do Lichess** (§11) continua fora: arquivo exportado primeiro.
- **Desenhar com o botão direito** no editor v2 ainda não existe — a tela **mostra** o
  desenho que veio do arquivo, não deixa criar um.
- **Escolher onde o capítulo entra.** Os importados vão para o fim do fluxo, na ordem do
  arquivo. Reordenar capítulos é gesto que ainda não existe no editor v2.
- **Renomear na hora de importar.** O título vem do `ChapterName`; mudar depois, pelo
  campo "Nome do capítulo", funciona.

### O próximo ponto exato

**Navegação por teclado** (§16): setas para andar na árvore, atalhos só fora de campo de
texto, foco visível. A tecla não chega à página do navegador embutido, então a
conferência final é teste humano do Doug.

---

## Continuação — o teclado anda na árvore (11/9/2026)

### O que o professor ganha

Com o cursor fora de um campo de texto:

| Tecla | O que faz |
|---|---|
| ← | volta um lance, para o pai; na posição inicial, para |
| → | avança um lance, pelo primeiro filho — a linha principal |
| ↑ ↓ | andam **na lista desenhada**, entrada por entrada, variantes incluídas |
| Home | volta à posição inicial |
| End | desce até o fim da linha atual, seguindo o primeiro filho |

O lance selecionado pelo teclado **recebe o foco** e rola para dentro da vista
(`block: "nearest"`, o mínimo necessário — a lista não dá um pulo quando o lance já
estava à vista). A linha de ajuda fica escrita acima da lista: atalho que ninguém
descobre não existe.

### Três decisões, e o porquê de cada uma

**↑ ↓ seguem a tela, não a árvore.** Poderiam pular entre irmãos, mas aí haveria uma
ordem secreta que o olho não vê. Andando na ordem desenhada, o cursor anda como o olho
anda — e a variante aparece no caminho, em vez de precisar ser caçada.

**Qualquer modificador devolve a tecla.** Ctrl, Alt, Meta ou Shift junto com a seta faz
o atalho deixar de ser nosso. É o espaço do navegador e do Desfazer/Refazer (Ctrl+Z), e
roubá-lo quebraria os dois.

**Campo de texto engole o atalho (§16).** Escrever dentro do comentário do lance e ver o
lance mudar por baixo do texto seria perder o que se estava escrevendo sem entender por
quê. `INPUT`, `TEXTAREA`, `SELECT`, `contenteditable` e `role="textbox"` bloqueiam. A
janela de importação aberta também bloqueia: lá as setas são da janela.

Detalhe de implementação que evita um defeito silencioso: o atendedor de teclado é
registrado **uma vez**. A árvore chega por uma caixinha (`useRef`) atualizada depois de
cada desenho, e o nó atual vem da própria `setNodeId`. Reinstalar o ouvinte a cada lance
selecionado é o caminho curto para perder uma tecla no meio da troca.

### Evidência desta continuação

A conta — dado o documento, o nó e a ação, qual nó fica selecionado — mora num arquivo
puro e é provada em Node, sem tela: **8 testes novos**, incluindo o ciclo no documento
que não pode travar o End e o nó que deixou de existir. **857 testes** verdes (eram
849); tipos, lint, build, conteúdo, repertório `--check` e **42/42 mutações** verdes.

No navegador embutido, em 1366×768, com a N0-LADDER: a linha de ajuda aparece; a
sequência → → → ← ↓ End Home levou a seleção a Rg4, Kd2, R1g3, Kd2, R1g3, Rg1# e
“Posição inicial”, e o `activeElement` acompanhou a seleção em cada passo; a mesma seta
disparada de dentro do `textarea` não mexeu na seleção.

**Isto prova o manipulador, não o teclado** (§19). Evento disparado por script não é
tecla: a página do navegador embutido nunca tem foco. **A conferência da tecla real
continua sendo teste humano do Doug** — abrir o editor v2, clicar num lance e usar as
setas.

Artefatos temporários removidos. O rascunho real `.editor/v2/N1-KPK.json` continua com a
mesma impressão digital (`92879926…`).

### O que esta rodada NÃO cobre

- **A tecla real**, pelo motivo acima.
- **Atalhos de edição** (apagar lance, promover variante por tecla) continuam fora:
  §16 pede navegação, e edição por tecla sem confirmação é perda de trabalho.
- **Desenhar com o botão direito**, **reordenar capítulos**, **URL do Lichess** e
  **exportar PGN** seguem abertos, na mesma ordem.

### O próximo ponto exato

**Desenhar com o botão direito** no editor v2: hoje o canal `shapes` do tabuleiro só
mostra o desenho que veio do arquivo; criar seta e casa acesa com o mouse exige o canal
`desenhavel` e um comando novo no histórico, para caber no Desfazer.

---

## Continuação — desenhar com o botão direito (11/9/2026)

### O que o professor ganha

O tabuleiro do editor v2 deixou de ser só vitrine do desenho que veio do arquivo: agora
o desenho **nasce ali**, com o mouse, nas quatro cores do Lichess.

| Gesto | Cor |
|---|---|
| botão direito arrastando | seta verde; clicando sem arrastar, casa acesa verde |
| Shift + botão direito | vermelho |
| Alt + botão direito | azul (desenhado com o roxo do plano — ver "a cor do desenho") |
| Shift + Alt + botão direito | amarelo |

Repetir o mesmo gesto na mesma casa apaga o traço; repetir com outra cor troca a cor.
Cada mudança **entra no histórico**: um Ctrl+Z devolve o desenho anterior, inclusive
quando o gesto foi apagar. E há um botão **"Apagar desenhos desta posição"** embaixo do
tabuleiro, com a legenda das quatro cores ao lado — ferramenta de desenho descobrível
sem botão direito é exigência do §16, e atalho que ninguém descobre não existe.

O desenho pertence **à posição selecionada**, como no arquivo: trocar de lance troca o
desenho, e voltar ao lance traz o dele de volta.

### Três decisões, e o porquê de cada uma

**O comando guarda a lista inteira, não "acrescente esta seta".** É o que o tabuleiro
sabe dizer: o chessground devolve o conjunto de formas depois de cada gesto, inclusive
quando o gesto foi apagar. Um comando de acrescentar teria de adivinhar, por diferença,
o que o professor fez.

**Pincel desconhecido é descartado, não adivinhado.** Se um dia chegar uma forma com
pincel fora das quatro cores, ela não vira cor inventada no arquivo do professor.

**A cópia crua do desenho sai junto.** Um nó importado guarda `[%cal …]`/`[%csl …]` como
texto opaco, para o round-trip do PGN (§11). Isso é o mesmo desenho guardado duas vezes:
se o professor apagasse uma seta e o texto cru ficasse, a exportação ressuscitaria a
seta apagada. Ao reescrever o desenho de um nó, só essas duas diretivas saem —
`[%clk]`, `[%anno]` e o que o próximo exportador inventar continuam intactos e opacos.

Uma porta a menos no Desfazer: gesto sem efeito não vira passo. O tabuleiro avisa da
mudança mais vezes do que ela acontece — um clique com o botão esquerdo numa casa vazia
já devolve a lista —, e sem essa porta o histórico encheria de passos que não desfazem
nada.

### Evidência desta continuação

A tradução entre a forma do tabuleiro e o desenho do arquivo mora num arquivo puro e é
provada em Node, sem tela: **10 testes novos** — as quatro cores de ida e volta, o
pincel desconhecido, o desenho vazio que não vira campo no arquivo, a diretiva crua que
sai e o relógio que fica, o comando que não cria passo quando nada muda. **867 testes**
verdes (eram 857); tipos, lint, build, conteúdo, repertório `--check` e **42/42
mutações** verdes.

No navegador embutido, em 1366×768, com a N0-LADDER: quatro desenhos gravados no arquivo
(seta vermelha a1–a8, seta azul h1–h4, casa verde e5, casa amarela d4) aparecem no
tabuleiro pelo canal novo, cada um na sua cor; "Apagar desenhos desta posição" apagou os
quatro e "Desfazer" trouxe os quatro de volta. Nenhum erro no console.

**Isto prova o caminho do dado, não o gesto** (§19): o tabuleiro não aceita botão direito
por evento simulado. **A conferência do gesto real continua sendo teste humano do
Doug** — abrir o editor v2, desenhar com o botão direito nas quatro cores, trocar de
lance e voltar.

Artefatos temporários removidos. O rascunho real `.editor/v2/N1-KPK.json` continua com a
mesma impressão digital (`92879926…`).

### O que esta rodada NÃO cobre

- **O gesto real**, pelo motivo acima.
- **Paleta clicável** (escolher a cor num botão, em vez de segurar Shift/Alt): a legenda
  mostra as quatro cores, mas ainda não se desenha clicando nelas.
- A legenda e o botão ficam **abaixo do tabuleiro**, e em 1366×768 exigem uma rolagem
  curta da coluna do meio — a mesma dívida de altura já registrada para a lista de
  lances.
- **URL do Lichess** e **exportar PGN** seguem abertos.

### O próximo ponto exato

**Paleta clicável de desenho**: escolher a cor num controle visível, sem exigir que o
professor conheça Shift/Alt.

---

## Reordenar capítulos no fluxo, entregue em 11/9/2026

A coluna de capítulos agora mostra a ordem que está em `fluxo`, a única ordem
pedagógica do documento. O cadastro de capítulos não é reordenado nem ganha campo de
posição: ele continua sendo cadastro, e a etapa inteira — com o mesmo ID — é que muda
de lugar no fluxo.

Há dois caminhos para o mesmo gesto:

- arrastar o capítulo como um slide; a metade de cima ou de baixo de cada cartão é o
  alvo, e uma linha marca onde ele cairá sem fazer a coluna mudar de altura;
- abrir `•••` e escolher **Mover para cima** ou **Mover para baixo**. O menu recebe
  foco e funciona pelo teclado, como exige o §5 do plano.

Cada movimento é um comando transacional. Desfazer e Ctrl+Z devolvem a etapa ao lugar
anterior; soltar no vão que já ladeia o capítulo devolve o mesmo objeto e não polui o
histórico. A seleção acompanha a identidade do capítulo, não o número que ele passou a
ocupar. Ao reabrir a aula, o primeiro capítulo também é escolhido pela ordem do fluxo,
e não pela ordem acidental do cadastro.

Dois testes novos cobrem a etapa real se movendo sem trocar IDs nem reordenar o
cadastro, o Desfazer e o gesto sem efeito. Os sete portões passaram: tipos, lint,
**869 testes**, build, conteúdo, **42/42 mutações** e repertório `--check`.

No navegador autenticado, em 1366×768, a N0-LADDER recebeu dois capítulos temporários.
O menu abriu por teclado e moveu o último para cima; Desfazer e Refazer restauraram as
duas ordens; o arrasto real levou o capítulo selecionado ao início; o autosave gravou;
e, depois de recarregar, a lista manteve a ordem do fluxo e abriu no primeiro capítulo
dessa ordem. O console ficou sem erros. Os arquivos temporários da N0-LADDER foram
removidos no fim.

### O próximo ponto exato

**Paleta clicável de desenho**: transformar a legenda das quatro cores em escolha de
pincel que funcione sem Shift/Alt, preservando o gesto atual do Lichess.

---

## Adicionar capítulo e montar a posição, entregue em 11/9/2026

Até aqui um capítulo só nascia de importação de PGN. Agora nasce da tela: o botão
**Adicionar capítulo**, junto à coluna da esquerda, abre um diálogo com três das cinco
portas de §8.3 — **posição inicial**, **montar posição** e **colar FEN**. A quarta
(PGN) continua na janela de importar, e a janela diz isso em voz alta em vez de fingir
que tem cinco abas. A quinta (URL do Lichess) continua não existindo.

### O montador não é um segundo tabuleiro

O `ChessBoard` já sabia montar desde o B8.4 — `movable.free`, `deleteOnDropOff` e
`events.change` estão documentados na prop `montagem` dele. O que faltava era a
**paleta**, e paleta não é tabuleiro: a peça começa **fora** dele. Quem sabe fazer esse
gesto é o próprio chessground (`api.dragNewPiece`), e a prop `montagem` ganhou um
`aoLigar` que entrega esse punho ao montador — mais um `porPeca`, que é o equivalente
**sem arrasto** exigido por §25: clique na peça, clique na casa.

As peças da paleta são as **mesmas** do tabuleiro. O sprite mora no `cburnett.css` do
pacote, preso ao seletor `.cg-wrap piece.<peça>.<cor>`; por isso o contêiner da paleta
também é `.cg-wrap`, e um bloco novo em `globals.css` desfaz as três coisas que ele
herda e que ali não fazem sentido (rebordo, sombra e o posicionamento a 12,5%). Um
segundo jogo de imagens daria duas damas ligeiramente diferentes na mesma tela — e a de
arrastar não seria a que cai no tabuleiro.

### Duas regras que a chess.js não cobre, e que um montador comete o tempo todo

Medido em 11/9/2026: `validateFen("4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1")` devolve
`{ok:true}` — quatro direitos de roque sem uma torre no tabuleiro. E
`validateFen("4k3/8/8/8/8/8/8/4K3 w - e6 0 1")` também — casa de en passant sem peão
nenhum que pudesse ter passado por ela. As duas são exatamente o que sai de um montador
em que o professor não mexeu nas opções avançadas.

`problemaDosCamposDaFen` passou a cobrir as duas, e `problemaDaPosicaoMontada` soma esse
juízo ao `fenProblem` de sempre. **Fora** do `fenProblem`, de propósito: ele responde
"dá para jogar aqui?" e é o juiz do gate sobre conteúdo publicado; endurecê-lo mudaria o
veredicto sobre material já aprovado sem ninguém ter pedido. As caixinhas de roque que a
posição não permite se desmarcam sozinhas, e ficam desabilitadas com o motivo escrito.

Nada disso afirma alcançabilidade histórica (§11 do plano final). A tela diz "esta
posição não serve: o roque curto das brancas está marcado, mas não há rei em e1 e torre
em h1" — o que o projeto consegue provar, e só.

### Os ids nascem antes do comando, e é por isso que o Refazer devolve o mesmo capítulo

`prepararNovoCapitulo` confere o formulário e decide os quatro ids (`analise-…`,
`capitulo-…`, `etapa-capitulo-…`, `no-…-0`) **sem tocar na aula**. O comando
`ADICIONAR_CAPITULO` só carrega o que já foi decidido. Se o id nascesse dentro do
executor, cada Refazer fabricaria um capítulo **parecido** com outro id — e qualquer
narração, treino ou etapa que apontasse para ele ficaria apontando para um fantasma.

Um apelido só é aceito quando os **quatro** ids que ele gera estão livres: conferir só o
do capítulo deixaria passar a colisão do nó raiz, que é a que ninguém enxerga lendo a
tela. Dois capítulos chamados "Oposição" viram `capitulo-oposicao` e
`capitulo-oposicao-2`.

A etapa entra **depois** da etapa do capítulo selecionado, e o seletor "Entra…" permite
escolher outro lugar ou o fim da aula. O cadastro de capítulos continua sendo cadastro:
o novo é o último dele e o segundo do fluxo ao mesmo tempo. **Não há segunda ordem.**

A análise nasce com `inicio: { tipo: "fen" }`, como a importada, e pelo mesmo motivo de
§12: FEN que não passou por revisão de proveniência não pode ganhar a aparência de
posição aprovada. O validador emite `FEN_IMPORTADA_SEM_REVISAO` como **aviso** — o
trabalho que falta, não um defeito da criação. A posição inicial do xadrez é a exceção e
não gera aviso nenhum.

### Evidência desta continuação

**Os sete portões verdes:** tipos, lint, **890 testes** (17 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 17 testes novos cobrem: recusa de nome vazio com o campo apontado; cinco posições
impossíveis recusadas em português; `prepararNovoCapitulo` não tocando na aula; a
criação inteira com ids estáveis e documento válido; a posição inicial padrão sem aviso
de proveniência; a etapa entrando depois do capítulo atual e no fim quando não há
escolha; o cadastro não virando segunda ordem; Desfazer removendo capítulo, análise e
etapa e Refazer devolvendo **os mesmos quatro ids**; nomes repetidos; nome que não vira
id; aplicação repetida recusada; a composição da FEN com o roque em ordem canônica; e os
roques possíveis por posição.

**No navegador autenticado, com a N0-LADDER:**

- o diálogo abriu com o foco no campo do nome, `aria-modal`, e `Esc` fechou devolvendo o
  foco ao botão que o abriu;
- confirmar sem nome manteve o diálogo aberto e escreveu a recusa; confirmar com
  `8/8/8/8/8/8/4k3/4K3 w - - 0 1` respondeu "esta posição não serve: reis adjacentes
  (e1 e e2)" **sem apagar o nome nem a FEN já digitados**;
- a porta da FEN criou o capítulo, que entrou logo depois do selecionado, foi escolhido
  sozinho e abriu na sua posição inicial, com três peças no tabuleiro e o painel dizendo
  "Arraste uma peça no tabuleiro para criar o primeiro lance";
- Desfazer tirou o capítulo inteiro; Refazer devolveu `capitulo-rei-e-peao-pela-mao`,
  `analise-rei-e-peao-pela-mao`, `no-rei-e-peao-pela-mao-0` e a etapa — os mesmos ids,
  conferidos no arquivo gravado;
- o autosave gravou e, depois de recarregar, a ordem do fluxo continuou
  `introdução → capítulo → capítulo → treino → prática`;
- **o montador foi exercitado com o ponteiro real**: Limpar esvaziou o tabuleiro (e
  apagou sozinho os quatro roques), rei branco em e1, rei preto em e5 e peão branco em
  e2 foram postos pelo caminho sem arrasto, e a linha de veredicto passou de "falta o
  rei branco" a "Posição válida" com `8/8/8/4k3/8/8/4P3/4K3 w - - 0 1`;
- o capítulo montado foi criado e gravado com exatamente essa FEN;
- em **1366×768** a janela com o montador aberto mede 1.031 px e rola por dentro, mas o
  rodapé é grudado: o botão **Criar capítulo** fica visível em `top 703`, e não há
  rolagem horizontal;
- o console ficou limpo. Uma reclamação do React sobre a etiqueta `<piece>` apareceu e
  foi paga: o elemento passou a ser escrito como HTML cru, de duas listas fechadas do
  próprio arquivo.

Os arquivos temporários `content/rascunhos/lessons/N0-LADDER.json` e
`.editor/v2/N0-LADDER.json` foram removidos no fim. O SHA-256 de
`.editor/v2/N1-KPK.json` continua
`92879926bfb4439b9d66ff8695566129c576424ec0ea7d14e60627cca3f7d243`, conferido antes e
depois. Nenhuma aula publicada foi tocada.

### Uma armadilha de medição, para quem vier depois

Duas vezes o ensaio pareceu achar um defeito que não existia, e as duas causas valem
mais que o susto:

1. **O tabuleiro "parou de desenhar".** Com o painel do navegador atrás de outra janela,
   o `requestAnimationFrame` não roda, e o chessground redesenha por ele: `cg-board`
   fica sem filho nenhum enquanto a FEN no estado do React está certa. Uma fotografia
   traz a página de volta e os 32 `<piece>` reaparecem. **Leia a FEN do estado, não a
   contagem de peças no DOM**, quando o painel estiver escondido.
2. **Seis cliques no mesmo lote viraram três peões.** Clique disparado por ferramenta
   chega mais rápido que o React consegue confirmar o estado, e o `armada` que o
   tabuleiro enxerga é o anterior. Um clique por chamada, com a leitura entre eles,
   devolveu o resultado correto. Nenhum professor clica seis vezes em 16 ms.

### O que esta rodada NÃO cobre

- Os três arrastos do montador **já foram conferidos pelo Doug** (seção abaixo); o
  que continua valendo é a regra de método: gesto de arrastar não se prova por script,
  porque o chessground recusa evento não confiável
  (`if (!(s.trustAllEvents || e.isTrusted)) return`, `drag.js:6`).
- **Aula vazia.** O botão vive junto à lista de capítulos, e a tela ainda mostra "esta
  aula ainda não tem capítulo editável" quando não há nenhum. Enquanto "Nova aula"
  (§5.2) não existir, isso não acontece na prática — mas a porta precisa nascer junto
  com ela.
- **Continuam abertas, sem redução de escopo:** importação por URL do Lichess; writer e
  exportação de PGN; as ações contextuais de §8.3 (**mostrar esta variante na aula**,
  **começar desta posição**, **duplicar como independente**); **trocar a posição inicial
  de um capítulo que já existe**, com poda por ramo e marcação para revisão (§9);
  renomear/duplicar/excluir capítulo com impacto (§8.4); editor completo de treinos;
  publicação v2; repertório; e a barra Stockfish.
- A paleta clicável de **desenho** (a cor sem Shift/Alt) continua aberta — é outra
  paleta, e não foi tocada aqui.

### Teste humano do montador — 11/9/2026, aprovado

Doug exercitou os três gestos que o script não alcança, e os três passaram: **arrastar
peça da paleta para o tabuleiro**, **arrastar peça já posta para outra casa** e
**arrastar para fora para remover**. Com isso, §9 fica coberto nesta fatia pelas duas
vias — o arrasto e o equivalente por clique.

No mesmo teste ele montou, do zero, um capítulo de **dois peões contra cavalo**
(`3k4/4n3/8/8/2PP4/8/8/4K3 w - - 0 1`) e jogou nele até 30 nós. Esse trabalho está no
autosave local `.editor/v2/N1-KPK.json`, que **não** é versionado e **não** é conteúdo
publicado.

**A lição de protocolo, para a próxima rodada:** o teste foi feito na N1-KPK porque foi
para lá que o endereço do agente apontou, e a N1-KPK é justamente o rascunho protegido
do combinado. O endereço de ensaio é `/editor/v2/finais/N0-LADDER`, e só ele.

### O próximo ponto exato

**Trocar a posição inicial de um capítulo existente** (§9): o montador já existe e já
sabe compor e validar a posição; o que falta é o cálculo de impacto — quais ramos
continuam legais, poda a partir do primeiro lance ilegal de cada ramo, irmãos legais
preservados, e comentários/narrações/desenhos/treinos afetados marcados para revisão,
tudo numa transação com Desfazer.

---

## Trocar a posição inicial de um capítulo, entregue em 11/9/2026

Até aqui a posição inicial de um capítulo nascia com ele e não mudava mais. Agora o
botão **Trocar a posição inicial…**, na coluna da esquerda logo abaixo do nome do
capítulo, abre o montador **já carregado com a posição de agora**, mostra as duas FENs
lado a lado e recalcula o estrago a cada peça movida.

### A regra é uma frase, e ela decide tudo

§5 do plano final: *"podar no primeiro lance ilegal de cada ramo; não descartar os
ramos legais"*. Duas coisas saem daí, e as duas têm teste:

1. **O ramo cortado mantém o prefixo legal.** Uma linha que só fica ilegal no 8º lance
   conserva os sete primeiros — eles continuam sendo lances legais de uma partida que
   agora começa noutro lugar. Cortar o ramo inteiro jogaria fora trabalho válido.
2. **Os irmãos não se contaminam.** O percurso é uma busca em profundidade com **um**
   tabuleiro que desfaz o lance ao voltar, igual ao de `mapaDaAnalise`: cada irmão
   parte da posição do pai, então um ramo morto não mata o vizinho.

### O que a máquina sabe, e o que ela se recusa a fingir que sabe

Ela sabe dizer que um lance ficou ilegal. Ela **não** sabe dizer que um comentário
ficou mentiroso — "o rei branco já está na oposição" continua gramaticalmente perfeito
e factualmente falso. Por isso nasceu `revisaoPendenteV2Schema`: um campo `revisao`
opcional no nó (cobre comentário e desenhos), na narração e no quadro de introdução,
com `motivo` de lista fechada. Tudo o que sobrevive à troca é marcado.

A marca é **aviso, nunca erro** — o documento continua válido e o autosave continua
gravando. Ela aparece no painel de problemas como `REVISAO_PENDENTE` e, junto do
comentário e da narração, como uma tarja com o botão **Já reli**, que é um comando
desfazível como qualquer outro. Marca sem porta de saída seria armadilha.

**Um defeito de tabela que isto destapou, e foi pago junto.** `problemasDaAulaV2`
considerava "saudável" a análise que não acrescentasse **nenhum** problema no seu laço
— e o portão de legalidade só roda nas análises saudáveis. O primeiro aviso posto
naquele laço (a marca de revisão) teria calado a conferência de legalidade exatamente
na análise que acabou de mudar de chão. Agora só **erro** derruba a saúde da análise.

### Por que existem bloqueios, e não só podas

Um nó podado pode ser apontado **de fora** da análise: por um treino, por um quadro de
introdução, por outra análise que comece nele. §5 manda "cancelar, remover
explicitamente os dependentes ou materializar os dependentes como independentes" — e
nenhuma das três é escolha de máquina. Então a troca **para**, diz o nome de quem
depende, e o botão fica desabilitado. Medido na aula real: tirar o rei preto de e7 na
N1-KPK mata `1…Ke6` e os dez lances seguintes, e o treino guiado — que tem questões em
cinco deles — bloqueia a troca inteira.

Cancelar nunca custa nada, porque `calcularTrocaDePosicao` **só lê**. É o mesmo par de
`novo-capitulo.ts`: quem calcula não escreve, e o comando carrega o plano já decidido —
é isso que faz o Refazer repetir a mesma poda, e não uma terceira.

### O que a troca reabre

- **Proveniência.** Quando a análise larga uma posição revisada e **nada mais na aula a
  usa**, a revisão volta a `candidate`. Os treinos afetados não contam como "ainda
  usam": é a mesma troca que reabre a certificação deles, e um selo que acabou de voltar
  a pendente não atesta coisa nenhuma.
- **Certificação e avaliação.** Todo treino que pisa nesta análise volta a
  `revisaoAvaliacao: "pendente"`, a certificação volta a `estado: "pendente"`, e a
  `fonte` passa a `alterada` quando havia receita. A `propriedade` **não** muda — §8:
  fonte alterada e personalizado são condições distintas, e só um ajuste autoral
  personaliza.
- **Percursos.** O `caminho` do capítulo é truncado no primeiro nó podado; um
  `inicioNodeId` podado devolve o capítulo à raiz com percurso vazio.

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/trocar-posicao.ts` | **novo** — o cálculo do impacto, a poda, os bloqueios, a aplicação e o `semRevisao` |
| `lib/editor-v2/trocar-posicao.test.ts` | **novo** — 20 testes |
| `components/editor-v2/DialogoTrocarPosicao.tsx` | **novo** — a janela: duas FENs, colar FEN, o montador reusado e o impacto ao vivo |
| `lib/editor-v2/modelo.ts` | `revisaoPendenteV2Schema`, o campo `revisao` em três lugares, o aviso `REVISAO_PENDENTE` e o conserto da saúde da análise |
| `lib/editor-v2/comandos.ts` | `TROCAR_POSICAO_INICIAL` e `REVISAO_RESOLVIDA` |
| `lib/editor-v2/novo-capitulo.ts` | `camposDaFen` — o caminho de volta da FEN para os seis campos do montador |
| `components/editor-v2/Montador.tsx` | `CamposDaMontagem` passa a ser o tipo compartilhado |
| `components/editor-v2/EditorV2.tsx` | o botão, a janela e as duas tarjas de "Já reli" |

O montador **não** foi duplicado e `problemaDaPosicaoMontada` continua sendo o único
juiz de posição, como o combinado mandava. `fluxo` não foi tocado: trocar a posição de
um capítulo não mexe na ordem da aula.

### Evidência — e o buraco dela

**Os sete portões verdes:** tipos, lint, **912 testes** (22 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 20 testes novos cobrem: as recusas em português (FEN vazia, sem os seis campos,
posição impossível, e trocar uma posição por ela mesma); calcular sem tocar na aula; as
duas FENs e o nome de cada ramo cortado com a numeração do painel (`1. e4`, `2. e4`); a
poda a partir do primeiro ilegal e só dali; o irmão legal sobrevivendo, com o pai
perdendo só o filho que caiu; o documento continuando válido e a árvore inteira legal na
posição nova; comentário e desenho sobreviventes marcados e os podados sumindo com o nó;
a narração do lance podado removida e as outras marcadas; o percurso truncado e o início
reiniciado; o treino com avaliação, fonte e certificação reabertas; a proveniência
reaberta quando fica órfã e mantida quando outra parte da aula ainda a usa; o quadro de
introdução marcado; os três bloqueios (treino, introdução, análise dependente) com nome
e com a aula intacta; Desfazer devolvendo a aula inteira e Refazer devolvendo os mesmos
ids; e o "Já reli" desfazível.

**No navegador autenticado, com a N0-LADDER:**

- o botão abriu a janela com o montador **já carregado** com a posição do capítulo
  (`8/8/8/8/8/4k3/6R1/6RK w - - 0 1`), as duas FENs lado a lado, e trocar a posição por
  ela mesma foi recusado com "esta já é a posição inicial deste capítulo";
- colar `k7/8/8/8/8/8/6R1/6RK` (rei preto tirado de e7 para a8) escreveu na hora
  **`1… Kd2` deixa de ser legal — saem 8 lances, dele em diante**: o `1. Rg4` de antes
  dele sobreviveu, que é a regra da fatia inteira, medida na tela;
- no mesmo instante a tarja vermelha nomeou o **«Treino guiado»** e o botão **Trocar a
  posição** ficou desabilitado — o bloqueio de §5 acontecendo de verdade, não em teste;
- com um peão preto em a7 (que não atrapalha nenhum dos nove lances) nada foi podado, a
  troca aplicou, e o painel de problemas passou a mostrar **17 avisos**: 16 marcas de
  revisão mais o `FEN_IMPORTADA_SEM_REVISAO` que a análise ganha ao passar a começar
  numa FEN crua;
- **Desfazer** levou os avisos a 0 e devolveu a aula inteira; **Refazer** trouxe os 17
  de volta com as mesmas tarjas;
- **Já reli** tirou uma marca só (17 → 16 avisos, 2 → 1 tarja);
- o autosave gravou, e o arquivo em disco trazia `inicio` na FEN nova, 10 nós, 12 de 13
  narrações marcadas, 3 quadros marcados e o treino em `pendente / alterada / pendente`;
- **depois de recarregar a página**, os 16 avisos, os 9 lances e a tarja continuavam lá;
- em **1366×768** a janela mede 975 px e rola por dentro, com o rodapé grudado: o botão
  **Trocar a posição** fica em `top 703`, e não há rolagem horizontal;
- `Esc` fechou devolvendo o foco ao botão que abriu, e o console ficou limpo.

### O teste humano — 11/9/2026, e os dois defeitos que ele achou

Doug exercitou os três gestos que o script não alcança, e os três passaram: **arrastar
peça da paleta para o tabuleiro**, **arrastar peça já posta para outra casa** e
**arrastar para fora para remover**.

O mais convincente foi o primeiro. Ele largou uma **dama preta em d5** — e o impacto
respondeu `1. Rg4` deixa de ser legal. A torre continuava em g2: o lance não morreu por
falta de peça, morreu porque a dama nova **cravou a torre** na diagonal d5–h1, que
termina no rei branco. É regra de xadrez calculada na posição nova, e não contagem de
peças.

**Defeito 1 — o véu fechava a janela no meio do arrasto.** Soltar a peça fora do
tabuleiro termina com o ponteiro no véu escuro, e o navegador dispara o `click` no
ancestral comum entre onde o botão desceu e onde subiu: o próprio véu, que fechava a
janela. A montagem ia junto. O véu passou a exigir que o gesto tenha **começado** nele
— e a mesma correção foi para o **Adicionar capítulo**, que tinha o defeito idêntico e
escapou do teste de 11/9 por sorte de onde a peça caiu. As duas condições foram
conferidas na tela depois: arrastar para fora remove a peça e a janela fica; clicar na
área escura sem arrastar continua fechando.

**Defeito 2 — a contagem do bloqueio somava repetidos.** A tarja dizia *"«Treino
guiado» usa **12** lances que a posição nova torna ilegal"* numa árvore que só tinha 8
para perder: as três listas do treino (início, questões e receita de origem) se
sobrepõem, e eram somadas cruas. Agora conta lances distintos, e o teste que cobria o
caso foi corrigido junto. Confirmado na tela: com 9 nós podados, a tarja diz 9.

**Defeito 3 — o "Já reli" engolia a narração inteira.** O botão vivia dentro do
`<label>` do campo, então o nome acessível dele era *"Narração mostrada ao aluno
Marcada para revisão… O rei preto anda para onde quiser… Já reli"* — o parágrafo
inteiro anunciado como nome de um botão de duas palavras (§25). A tarja e o botão
saíram de dentro do rótulo; o nome acessível agora é **"Já reli"**, conferido na árvore
de acessibilidade.

O `content/rascunhos/lessons/N0-LADDER.json` que apareceu durante a rodada foi removido
no fim; `.editor/v2/N0-LADDER.json` nunca chegou a existir. O SHA-256 de
`.editor/v2/N1-KPK.json` é
`4be602ca224f065f630efe11948b696e33dbaa95a5fdfc12c03a6c912eacb822`, **igual** antes e
depois. Nenhuma aula publicada foi tocada.

### O que esta fatia NÃO cobre

- **A cascata sobre análise dependente.** Uma análise que comece num nó desta muda de
  tabuleiro junto, e a árvore dela também precisaria ser revalidada. Hoje isso
  **bloqueia** a troca, com o nome do capítulo. Nenhum conteúdo atual cai nesse caso —
  "começar desta posição" (§8.3) ainda não existe, e é ela que criaria
  `inicio: { tipo: "referencia" }`. Quando existir, esta cascata precisa nascer junto.
- **Limpar a marca de um quadro de introdução.** `semRevisao` trata nó e narração; o
  quadro é marcado e ainda não tem botão, porque o editor de introdução não tem tela.
- **Continuam abertas, sem redução de escopo:** importação por URL do Lichess; writer e
  exportação de PGN; as ações contextuais de §8.3 (**mostrar esta variante na aula**,
  **começar desta posição**, **duplicar como independente**); renomear/duplicar/excluir
  capítulo com impacto (§8.4); editor completo de treinos; publicação v2; repertório;
  e a barra Stockfish.

### Uma lição de método, para quem vier depois

**Os três defeitos desta rodada foram achados pelo gesto humano, não pelo teste.** Os
912 testes automáticos estavam verdes com o véu fechando a janela, com a contagem
somando repetidos e com o rótulo engolido — e os três são exatamente o tipo de coisa
que só aparece com um ponteiro de verdade numa tela de verdade. O corolário prático: um
diálogo com montador dentro precisa do ensaio de arrastar **antes** de ser dado por
pronto, e o arrasto que termina fora do tabuleiro é o caso que mais vale testar, porque
é o único que sai da janela.

### O próximo ponto exato

Com esta fatia fechada, o que segue em §8.4 e §8.3 é: **renomear, duplicar e excluir
capítulo com impacto transitivo** — o mesmo par calcular/aplicar desta fatia, com os
mesmos bloqueios, aplicado à exclusão; e as três ações contextuais (**mostrar esta
variante na aula**, **começar desta posição**, **duplicar como independente**). A
segunda delas é a que cria `inicio: { tipo: "referencia" }`, e é com ela que a cascata
bloqueada aqui precisa nascer.

---

## Sete fatias numa rodada, entregues em 11/9/2026

Esta foi uma rodada longa: sete fatias de uma vez, com os portões rodados ao longo do
caminho e **um** teste humano no fim. O que entrou:

| § | Fatia |
|---|---|
| 8.4 | Renomear, duplicar e excluir capítulo, com impacto |
| 8.3 | As três ações contextuais do lance |
| 9 | A cascata que antes bloqueava |
| 11.3 | O menu do lance: botão direito e `•••` com o mesmo conjunto |
| 14 | Writer e exportação de PGN |
| 5.2 | Nova aula, e a porta da aula vazia |
| 19.2 | A lista das revisões pendentes |

### A decisão que organizou a rodada: um calculador de impacto, não quatro

Quatro edições diferentes desta rodada perdem nós — trocar a posição inicial, excluir
capítulo com a análise, excluir a partir de um lance, substituir a continuação — e as
quatro fazem **a mesma pergunta**: quem aponta para o que vai sumir, e com que nome o
professor o conhece?

A primeira resposta já existia, escrita dentro de `trocar-posicao.ts`. O caminho barato
seria copiá-la três vezes; o resultado seriam quatro opiniões sobre o que é uma
dependência, divergindo no dia em que só uma fosse corrigida. Então ela saiu de lá para
`lib/editor-v2/impacto.ts`, **antes** de qualquer fatia nova ser escrita, e as quatro
passaram a usar a mesma conta. `trocar-posicao.ts` encolheu; nenhum dos 20 testes dele
mudou de veredicto por causa da mudança.

### As três saídas de §5, e a que não cabe em todo mundo

O plano final manda "cancelar, remover explicitamente os dependentes ou materializar os
dependentes como independentes". Nenhuma das três é escolha de máquina, então a tela
pergunta **item por item**, e o botão de confirmar fica desabilitado com a conta do que
falta ("Faltam decidir 2 dependentes").

A terceira não serve a todos, e dizer isso em voz alta foi parte do trabalho:

- uma **análise** que começa num nó desta materializa-se guardando a FEN daquele nó;
- um **quadro de introdução** faz o mesmo, trocando a referência pela FEN;
- um **treino** não faz. Toda questão dele nomeia um `{analiseId, nodeId}`, e o schema
  não sabe representar uma questão sem esse endereço; materializar um treino exigiria
  copiar a árvore que ele percorre, e isso é o editor de treinos (§16). A opção fica
  **desabilitada com o motivo escrito na tela**, e não só num `title` — §11.3 pede o
  motivo, e `title` só aparece para quem já parou o mouse em cima.

A FEN da materialização é resolvida **no cálculo** e viaja dentro do plano, porque
aplicá-la depois seria perguntar a posição de um nó que já não existe.

### A cascata: o bloqueio de ontem deixou de ser a resposta

A fatia anterior bloqueava a troca quando outra análise começava num nó desta, e o
diário registrou por quê: "começar desta posição" não existia, nenhum conteúdo caía
nesse caso, e revalidar uma segunda árvore era trabalho sem cliente. A fatia §8.3 desta
rodada criou exatamente o cliente.

Agora a troca **enfileira** as filhas: para cada análise que começa num nó que
**sobreviveu**, a poda calcula a FEN nova daquele nó e revalida a árvore dela com a
mesma regra — primeiro ilegal de cada ramo, irmãos preservados, sobreviventes marcados
—, na mesma transação. E atravessa as netas: uma análise que começa na filha entra na
fila atrás dela. `visitadas` existe porque o validador aceita e acusa ciclos entre
inícios de análises, e percorrer um deles aqui seria um laço infinito num documento que
o professor ainda não consertou.

**Um caso continua bloqueando, e é outro caso.** Quando o nó de origem da filha é
justamente um dos podados, ela não mudou de chão — ela ficou **sem** chão, e aí §5
manda devolver a decisão a quem é dela. A diferença entre "mudou de tabuleiro" e "ficou
sem tabuleiro" é a fatia inteira, e as duas foram medidas na tela (abaixo).

### As três ações de §8.3 são três coisas, e a tela explica qual

| Ação | O que copia | Do que continua dependendo |
|---|---|---|
| Mostrar esta variante | nada | dos próprios lances da partida |
| Começar desta posição | nada | só da posição escolhida |
| Duplicar como independente | tudo daqui para baixo | de nada |

As três dividem o mesmo formulário — nome, orientação, onde entra — e por isso moram
numa janela só; o que muda entre elas é explicação, não campo, e três janelas iguais com
um parágrafo diferente ensinariam o professor a pular o parágrafo. O parágrafo traz o
número real: "esta posição e 6 lances daqui para baixo são copiados".

Na duplicação, **o lance selecionado vira a raiz da cópia e larga o `uci`**: a posição
que ele produzia agora é o chão da análise nova. O comentário, os desenhos, os símbolos
e as diretivas opacas dele vão junto — são da posição, e a posição é a mesma.

### O escritor de PGN, e o aviso do plano que ele respeita

§6 do plano final é um aviso explícito: "a conversão atual [de `annotations.ts`] não
preserva necessariamente as cores de autoria. A exportação não pode prometer preservação
de cor usando uma conversão que a descarta".

`escrever-pgn.ts` **não passa por `annotations.ts`**. Ele lê `no.desenhos`, onde a cor
está guardada com o nome dela, e escreve a letra do Lichess direto — a mesma tabela da
importação, no sentido inverso. Medido no ciclo: `[%cal Ge2e4,Rd1h5]` entra, vira seta
verde e seta vermelha, e sai `[%cal Ge2e4,Rd1h5]`.

Sobra um caso em que a cor **não** atravessa, e ele é anunciado em vez de escondido: as
setas na forma curta do material v1 (`["e2","e4"]`) não declaram cor. Saem em verde, e
cada uma vira uma perda declarada com o nome da casa.

**Uma regra só, nos dois sentidos:** `%cal` e `%csl` são sempre reconstruídos a partir
de `desenhos`, que é o que o professor edita. As outras diretivas guardadas saem
verbatim. A exceção que fecha a regra é o `%cal` com uma letra de cor que o editor não
modela — o importador a recusou e anunciou a perda; se o escritor a descartasse também,
quem perdeu na importação perderia de novo, agora em silêncio. Ela é reemitida.

E o que **não** cabe num PGN é dito com a contagem desta aula, não num parágrafo fixo:
"13 narrações ficam de fora", "1 treino não cabe". Aviso genérico o professor aprende a
pular; um que diz *quantas* ele lê.

### Nova aula, e o beco que ela teria criado

Até aqui, uma aula sem capítulo mostrava "esta aula ainda não tem capítulo editável" e
mais nada. Enquanto "Nova aula" não existia, ninguém chegava lá. Com ela, **toda** aula
recém-criada chega — e a primeira coisa que o professor veria seria um aviso sem botão.

A porta da aula vazia nasceu junto, como o diário da fatia anterior pediu: o mesmo
título, os mesmos dois botões que criam conteúdo, e o mesmo diálogo da coluna da
esquerda.

O identificador é **derivado** do título e do nível (`N2-PEAO-DE-TORRE-NA-SETIMA`,
`EX-ENSAIO-DE-AULA-NOVA`) e mostrado desabilitado enquanto o professor digita. §5.2 diz
que o professor não digita ids internos; ele também não pode ficar sem ver o que vai
virar nome de arquivo, URL e chave do progresso do aluno.

**A aula extra ganhou um campo `nivel` nos metadados.** §22 exige nível explícito, e o
`EX-` não traz número nenhum; sem o campo, a única forma de declará-lo seria editar a
trilha à mão, que é código. As aulas do curso continuam sem ele: o `N2` do id já responde,
e duas fontes seriam duas respostas.

A tela diz, em voz alta, o que ela **não** faz: pôr a aula na trilha do curso é passo
separado, porque a trilha é uma lista em código.

### O buraco das revisões pendentes, fechado pelos dois lados

`semRevisao` tratava nó e narração. O **quadro de introdução** era marcado pela troca de
posição e não tinha como ser desmarcado, porque o editor de introdução não tem tela —
uma marca sem porta de saída é uma armadilha, e §5 manda resolvê-las antes de publicar.
Ele passou a ser um terceiro caso do mesmo comando.

E nasceu a lista de §19.2: um `<details>` fechado que diz quantas são, e que abre com o
**trecho** de cada texto marcado, o endereço em português, um botão que leva até lá e um
"Já reli". Ela é fechada por padrão porque é lista de trabalho, não alarme: dezesseis
linhas abertas no alto empurrariam o tabuleiro para fora da janela.

**"Já reli todas" fica no fim da lista, não ao lado do cabeçalho**, e pede confirmação.
Ao lado do cabeçalho ela seria o primeiro botão da tela, e apagaria dezesseis avisos com
um clique de quem só queria fechar o painel. É uma ação só no histórico: um Ctrl+Z
devolve as dezesseis.

### Um casco de diálogo, e o defeito do véu pago uma vez só

Havia duas janelas com o mesmo casco de acessibilidade escrito duas vezes, e esta rodada
acrescentaria cinco. Sete cópias de um contrato de foco são sete chances de uma
envelhecer sozinha — e a prova já estava no diário: o defeito do véu que fechava a janela
no meio do arrasto existia nas **duas**, e só uma tinha sido exercitada.

`components/editor-v2/Dialogo.tsx` guarda o contrato inteiro: `role="dialog"`,
`aria-modal`, foco ao abrir, `Tab` que não escapa, `Esc` que fecha, rodapé grudado — e a
regra do véu, que só fecha quando o gesto **começou** nele.

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/impacto.ts` | **novo** — o calculador de impacto comum, os dependentes e as três saídas de §5 |
| `lib/editor-v2/capitulo.ts` | **novo** — duplicar e excluir capítulo (§8.4) |
| `lib/editor-v2/acoes-do-lance.ts` | **novo** — as três ações de §8.3, o corte de §11.3 e a lista do menu |
| `lib/editor-v2/escrever-pgn.ts` | **novo** — o writer de PGN (§14) |
| `lib/editor-v2/nova-aula.ts` | **novo** — o id derivado e a aula vazia válida (§5.2) |
| `lib/editor-v2/revisoes.ts` | **novo** — a lista de §19.2 |
| `lib/editor-v2/trocar-posicao.ts` | a cascata, e o impacto tirado daqui para `impacto.ts` |
| `lib/editor-v2/comandos.ts` | seis comandos novos, e `REVISOES_RESOLVIDAS` |
| `lib/editor-v2/modelo.ts` | `metadados.nivel`, para a aula extra declarar o nível |
| `lib/editor-v2/rascunhos.ts` | `idsDeDocumentosV2`, e a pasta v2 passando a aceitar `EX-` |
| `lib/editor/rascunhos.ts` | `caminhoDeAula` ganha o schema da pasta — ver o defeito abaixo |
| `components/editor-v2/Dialogo.tsx` | **novo** — o casco de todas as janelas |
| `components/editor-v2/PainelDeResolucoes.tsx` | **novo** — a escolha por dependente |
| `components/editor-v2/MenuDoLance.tsx` | **novo** — o menu do botão direito e do `•••` |
| `components/editor-v2/DialogoDoLance.tsx` | **novo** — as três ações de §8.3 numa janela |
| `components/editor-v2/DialogoDeCorte.tsx` | **novo** — excluir a partir daqui e substituir continuação |
| `components/editor-v2/DialogoExcluirCapitulo.tsx`, `DialogoDuplicarCapitulo.tsx` | **novos** — §8.4 |
| `components/editor-v2/DialogoExportar.tsx` | **novo** — as quatro saídas de §14 |
| `components/editor-v2/ListaDeRevisoes.tsx` | **novo** — §19.2 |
| `components/editor-v2/FormularioDeNovaAula.tsx` | **novo** — §5.2 |
| `app/editor/v2/nova/page.tsx` | **nova** — a porta de "Nova aula" |
| `app/editor/v2/acoes.ts` | `criarAulaV2` |
| `app/editor/page.tsx` | "+ Nova aula" e a lista dos rascunhos que só existem no v2 |
| `app/editor/v2/finais/[aula]/page.tsx` | abre também a aula que não tem v1 por trás |
| `components/editor-v2/EditorV2.tsx`, `PainelDeLances.tsx`, `ListaDeCapitulos.tsx` | a ligação de tudo, e a porta da aula vazia |

`fluxo` continua sendo a única fonte da ordem dos capítulos, e o montador continua sendo
um só, com `problemaDaPosicaoMontada` como único juiz de posição.

### Evidência

**Os sete portões verdes:** tipos, lint, **967 testes** (55 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 55 testes novos cobrem, por fatia:

- **cascata (3):** a filha revalidada com a FEN nova do nó de origem e o comentário dela
  marcado; a neta atravessada; e a filha cujo nó de origem foi podado continuando a
  bloquear;
- **§8.4 (12):** nome vazio que não apaga o anterior; a duplicação que não toca na aula e
  decide todos os ids de uma vez; a cópia com ids novos, percurso e narração remapeados,
  atribuição conservada e a prova de independência (editar o original não a alcança); a
  cópia de um capítulo que começava numa referência materializando a FEN; Desfazer e
  Refazer com os mesmos ids; excluir só o capítulo sem levar a análise, com o aviso de
  órfã; a recusa de levar a análise compartilhada, nomeando quem mais a usa; as contagens
  reais do que vai junto; a recusa sem escolha para cada dependente; remover e
  materializar na mesma transação; a análise dependente removida levando o capítulo dela;
  e a exclusão inteira voltando com um Desfazer;
- **§8.3 e §11.3 (15):** a variante mostrada sem copiar lance nenhum; a promoção posterior
  que **não** muda o percurso escolhido; começar desta posição criando `referencia` com
  continuação vazia; a duplicação materializando a FEN, largando o `uci` da raiz e
  trazendo as narrações; excluir a partir daqui contra substituir continuação; as
  contagens e o percurso cortado; a recusa de excluir a posição inicial; o bloqueio com
  nome e a materialização que o resolve; o Desfazer do corte; e as onze ações do menu,
  com as impossíveis desabilitadas e o motivo;
- **§14 (16):** sete **expectativas independentes** — o PGN da posição padrão sem
  FEN/SetUp, a variante depois do lance que ela substitui, o número forçado depois do
  comentário, os símbolos colados e o `$140`, a FEN de agora e não a do cabeçalho
  importado, a seta v1 em verde com a perda declarada, e a chave no comentário — mais
  nove de round-trip: a árvore idêntica depois do ciclo, as cores atravessando inteiras,
  o NAG sem botão e o `[%clk]` sobrevivendo, a cor desconhecida reemitida, o desenho
  apagado que **não** ressuscita, a variante com a FEN do ponto de partida, o `[Event]`
  preservado, a ordem do fluxo e as contagens do que não cabe;
- **§5.2 e §19.2 (9):** o id derivado com acentos resolvidos; a aula vazia válida e sem
  aviso nenhum; a extra declarando o nível no documento e a do curso não; as quatro
  recusas apontando o campo; os três tipos de marca com trecho e endereço; o quadro de
  introdução que agora se resolve; "Já reli todas" como uma ação só; o desenho sem
  comentário listado pelo que ele é; e a aula extra **gravada e relida em disco**.

**No navegador autenticado, com a N0-LADDER:**

- o `•••` de um lance abriu as onze ações de §11.3, com "Tornar linha principal"
  desabilitada dizendo "este lance já é a linha principal da posição anterior" e "Criar
  treino daqui" dizendo "o editor de treinos ainda não existe";
- **mostrar esta variante** criou «A escada, passo 2» e a lista de lances continuou com
  os mesmos 9 — nenhuma análise nova, nenhum lance copiado;
- **começar desta posição** a partir de `3. Rg2` criou um capítulo que abriu dizendo
  "Arraste uma peça no tabuleiro para criar o primeiro lance" — continuação vazia, como
  §4 manda;
- **a cascata, medida nos dois sentidos.** Com o rei preto no lugar e um peão a mais, a
  janela da troca escreveu *"O capítulo «Derivada do passo 3» começa nesta partida e muda
  de tabuleiro junto: a árvore dele continua inteira de pé"* e o botão **ficou
  habilitado**. Com o rei preto tirado de e3 para a8, o mesmo capítulo voltou a aparecer
  como bloqueio — *"começa num lance que a posição nova torna ilegal"* —, ao lado do
  «Treino guiado» com 8 lances;
- **excluir a partir de `3. Rg2`** mostrou 5 lances, 7 narrações pelo texto, o percurso
  cortado e o treino reaberto; os dois dependentes com escolha própria; o treino com
  "Tornar independente" apagado e o motivo escrito embaixo; e o rodapé dizendo "Faltam
  decidir 2 dependentes" enquanto o botão estava desabilitado. Com «remover o treino» e
  «tornar independente» o capítulo, a exclusão aconteceu — e o capítulo derivado passou a
  acusar `FEN_IMPORTADA_SEM_REVISAO`, que é exatamente o que materializar faz;
- **um Desfazer** devolveu os 5 lances, o treino e a referência da filha, juntos;
- **Exportar** mostrou as quatro saídas e o texto antes de copiar. O PGN do capítulo saiu
  com `[SetUp "1"]`, `[FEN "8/8/8/8/8/4k3/6R1/6RK w - - 0 1"]` e
  `1. Rg4 Kd2 2. R1g3 Kc1 3. Rg2 Kb1 4. Re2 Ka1 5. Rg1# *`. "PGN de todas as partidas"
  trouxe os dois jogos, e o segundo com a FEN **resolvida** da referência
  (`8/8/8/8/6R1/8/6R1/2k4K b - - 5 3`). O rodapé disse "13 narrações ficam de fora" e "1
  treino não cabe";
- **a lista de revisões** apareceu com 16 textos depois da troca, e os três primeiros
  eram os **quadros da introdução** — os que antes não tinham botão. Um "Já reli" levou
  17 avisos a 16 e 16 marcas a 15; "Já reli todas", com a confirmação, levou a 1 aviso; um
  Desfazer devolveu as 15;
- **Nova aula:** o identificador `EX-ENSAIO-DE-AULA-NOVA` apareceu enquanto o título era
  digitado, a aula foi criada, o navegador foi levado a ela, e a tela mostrou a **porta da
  aula vazia** — "Esta aula ainda não tem capítulo", com "+ Adicionar capítulo" e
  "Importar PGN". O capítulo criado ali abriu no editor completo, com "✓ salvo".

Os arquivos temporários `content/rascunhos/lessons/N0-LADDER.json`,
`.editor/v2/N0-LADDER.json` e `.editor/v2/EX-ENSAIO-DE-AULA-NOVA.json` foram removidos no
fim. O SHA-256 de `.editor/v2/N1-KPK.json` continua
`4be602ca224f065f630efe11948b696e33dbaa95a5fdfc12c03a6c912eacb822`, conferido antes e
depois. Nenhuma aula publicada foi tocada.

### O defeito que 966 testes não pegaram, e o navegador pegou no primeiro clique

Criar a primeira aula extra pela tela devolveu **uma tela de erro de servidor**. A causa,
com arquivo e linha: `caminhoDeAula` (`lib/editor/rascunhos.ts:96`) conferia todo id com
`lessonIdSchema`, que é `^N[0-9]+-[A-Z0-9-]+$`. O `EX-` que `aulaIdV2Schema` aceita — e
que o próprio §22 exige — era recusado na hora de escrever o arquivo.

**Por que nenhum teste chegou perto.** Todos os testes que usam aula extra a fabricam
**em memória** (`EX-TROCA`, `EX-CAPITULO`, `EX-PGN`…), e memória não tem guardião de
caminho. Nenhum tinha escrito uma em disco.

O conserto foi dar a `caminhoDeAula` o schema da pasta: o v1 continua com o id do curso,
a pasta do v2 passa o dela. **As duas travas continuam de pé** — a expressão regular sem
barra nem ponto, e a conferência do caminho resolvido —, e o teste novo cobre as duas:
grava um `EX-…` de verdade num diretório temporário, relê, e confere que `../fora`
continua estourando.

A lição de método, para quem vier depois: **um schema que aceita uma forma nova não prova
que o caminho inteiro a aceita.** O teste que vale é o que leva a forma nova até o disco.

### O que esta rodada NÃO cobre

- **Os gestos de ponteiro.** Arrastar peça no montador, arrastar capítulo para reordenar,
  desenhar com o botão direito e abrir o menu com o botão direito do mouse continuam
  sendo teste humano: o chessground recusa evento não confiável, e um `click` disparado
  por ferramenta prova o manipulador, não o gesto.
- **"Desfazer tudo"** usa `window.confirm`, que o navegador embutido não responde; ele
  não foi exercitado nesta rodada.
- **Um ruído de console honesto:** o painel do navegador guarda as duas linhas do erro de
  servidor **anterior** ao conserto do `EX-`, e o leitor de console não as limpa na
  navegação. Depois do conserto, a página recarrega com todas as requisições em 200 e
  desenha normalmente.
- **Continuam abertas, sem redução de escopo:** importação por URL do Lichess (§13.2);
  editor completo de treinos (§16); publicação v2 (§20); repertório (§21); e a barra
  Stockfish (§23). Nenhuma saiu do escopo do projeto.
- A paleta clicável de **desenho** (a cor sem Shift/Alt) continua aberta.
- **"Criar treino daqui"** aparece no menu **desabilitada, com motivo** — ela nasce com
  §16, e aparecer apagada é melhor do que sumir sem explicação.

### O próximo ponto exato

O roteiro de §27 tem as fatias 1, 2 e 4 fechadas, e a 3 (ferramentas de desenho e edição
contextual) quase — falta a **paleta clicável de cor**, que é o que torna o desenho
descobrível sem Shift/Alt (§10.2 e §25).

Depois dela, a fatia 5 do roteiro: **reprodução, pausas, velocidades e comparação**
(§15). Ela é a que fecha o piloto que motivou o v2 — "uma posição de rei e peão: linha
correta até o empate, retorno ao ponto de escolha e linha errada até a derrota, na mesma
aula" —, e agora ela tem com que ser feita: "mostrar esta variante na aula" existe, e é
por ela que os dois capítulos de comparação nascem.

A importação por URL do Lichess (§13.2) segue deliberadamente fora: é a única que depende
de rede, e isso é outra classe de risco.

---

## A paleta clicável de desenho, entregue em 12/9/2026

Fecha a fatia 3 do roteiro de §27. Até aqui o desenho do editor só nascia do botão
direito, e a cor só se escolhia segurando Shift, Alt ou os dois. §10.2 pede o contrário
em voz alta — *"a tela também possui ferramentas clicáveis: seta, casa, cor e limpar,
**para que o recurso seja descoberto sem conhecer atalhos**"* —, e §25 repete pelo outro
lado: *"ação de botão direito tem equivalente em botão/teclado"*.

Agora desenhar é: escolher **Seta** ou **Casa**, escolher a cor, clicar nas casas.
Nenhuma tecla segurada. **Os atalhos continuam valendo**, e a legenda deles ficou dentro
da paleta, porque quem já aprendeu o Shift continua precisando dela — e porque é ela que
explica por que a mesma cor aparece de dois jeitos.

### Uma sala, duas portas, e uma regra só

O chessground, no `addShape` (`draw.js`), faz três coisas com o traço novo: se já existe
um com **as mesmas pontas** e a **mesma cor**, apaga; se existe com cor diferente, troca
a cor; se não existe, acrescenta. A paleta repete isso à risca, em
`lib/editor-v2/paleta-de-desenho.ts`. Duas portas para o mesmo desenho com duas regras
diferentes seriam duas maneiras de o professor se enganar.

A seta precisa de dois cliques, porque o tabuleiro só sabe falar de uma casa por vez.
Entre os dois, a paleta guarda a origem e a tela diz em voz alta que está esperando o
destino. **Clicar duas vezes na mesma casa desiste da seta**, e não vira casa acesa:
acender casa é a outra ferramenta, e adivinhar qual delas o professor queria seria
inventar intenção.

`Esc` sai por degraus — primeiro esquece a seta pela metade, depois devolve o tabuleiro
ao movimento de peça. Clicar na ferramenta que já está ligada também a desliga. Um modo
em que não se sabe sair é uma armadilha.

### O defeito que a paleta destapou: o clique esquerdo apagava o desenho inteiro

Para a paleta funcionar, o clique esquerdo na casa precisa chegar ao editor. Ao ligar
esse caminho, apareceu um defeito que já existia — e que apagava trabalho do professor.

**A causa, com arquivo e linha.** O `drag.start` do chessground
(`node_modules/@lichess-org/chessground/dist/drag.js:17-20`) começa assim:

```js
if (!previouslySelected && s.drawable.enabled &&
    (s.drawable.eraseOnMovablePieceClick || !piece || piece.color !== s.turnColor))
    drawClear(s);
```

e o `clear` (`draw.js:65-71`) zera as formas **e avisa o `onChange`** com a lista vazia.
Num tabuleiro do Lichess isso é o certo: a seta é rabisco de análise, e o primeiro clique
limpa a mesa. Num editor de autoria é perda de trabalho — o desenho é conteúdo do
arquivo. Um clique numa casa vazia apagava as setas da posição sem ninguém pedir.

**Por que ignorar toda lista vazia não serve.** Apagar o último traço com o botão direito
também chega ao `onChange` com a lista vazia, e é um gesto legítimo. O que separa os dois
é o `drawable.current`: o traço apagado pelo botão direito chega com o gesto **ainda de
pé** (o `end` chama `addShape` antes do `cancel`), e a limpeza do clique chega sem gesto
nenhum. O conserto é essa linha, em `components/board/ChessBoard.tsx`, e devolve ao
tabuleiro as formas que o React já tinha.

**A honestidade da evidência.** Este defeito foi **lido no código do pacote, não
reproduzido na tela**: `drag.start` sai na primeira linha quando o evento não é confiável
(`drag.js:6`), então nenhum script chega até ele. Ele entra no roteiro do teste humano
abaixo como item 6, e é o único desta rodada cuja *reprodução* ainda falta — a causa e o
conserto estão escritos.

### Três decisões de acabamento

**A cor escolhida não se anuncia só pela cor.** §25 é explícito: *"estado não depende
apenas de cor: seleção usa forma/texto/borda"*. Cada botão traz o nome da cor escrito e,
quando é o escolhido, ganha o aro e o `✓`.

**A bolinha mostra a cor com que o traço vai sair.** O azul do professor é desenhado com
o pincel `plano` deste site — a explicação inteira está em `annotations.ts`. Mostrar um
azul diferente do que aparece no tabuleiro seria mentir na etiqueta.

**Com a ferramenta na mão, ninguém move peça.** `movable.color` vira `undefined`, e com
isso `isMovable` é falso para toda casa: nenhuma peça arrasta e nenhuma fica selecionada.
`viewOnly` não serviria — ele barra o `drag.start` inteiro, e o toque na casa nunca
chegaria ao editor. O interruptor entra pelo **efeito de sincronização**, e não na
criação: `desenhavel` e `montagem` são lidas uma vez e exigiriam `key`, mas este modo
liga e desliga o tempo todo.

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/paleta-de-desenho.ts` | **novo** — a máquina de estados: ferramenta, cor, seta pela metade e a regra do segundo clique |
| `components/editor-v2/PaletaDeDesenho.tsx` | **novo** — os botões, a instrução que muda sozinha e a legenda dos atalhos |
| `components/board/ChessBoard.tsx` | a prop `desenhando` e a guarda contra o `drawClear` do clique |
| `components/editor-v2/EditorV2.tsx` | o estado da paleta, o clique na casa e o `Esc` |

O estado da paleta é **da sessão, não do documento**: qual ferramenta está na mão não é
conteúdo da aula, e por isso não entra no autosave nem no Desfazer. O que entra no
Desfazer é o traço, pelo mesmo comando `DEFINIR_DESENHOS` do botão direito.

Uma nota de React, para quem vier depois: a seta pela metade guarda **o lance em que
começou**, e a origem pendurada é *derivada* — trocar de lance a esquece sem custar um
efeito que chama `setState`. O lint do projeto recusa esse efeito, e com razão: é cascata
de render.

### Evidência

**Os sete portões verdes:** tipos, lint, **982 testes** (15 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 15 testes novos cobrem: o clique que não desenha nada enquanto nenhuma ferramenta
está na mão; a casa acesa num clique; o azul saindo no pincel `plano` e voltando "azul"
no arquivo; os dois cliques da seta e o primeiro que não desenha; o segundo clique na
mesma casa desistindo; a repetição com a mesma cor apagando e com outra cor trocando; a
seta e a casa da mesma origem convivendo; o resto do desenho intocado; o botão da
ferramenta ligada desligando; a troca de ferramenta esquecendo a origem e a troca de cor
**não** esquecendo; a instrução da tela batendo com o estado; e o caminho inteiro —
paleta → formas → arquivo —, com **apagar o último traço omitindo o campo** em vez de
gravar lista vazia, que é o que §10.2 exige.

**O que esta rodada NÃO prova, e por quê.** Nenhum clique no tabuleiro foi exercitado:
o `drag.start` do chessground sai na primeira linha quando o evento não é confiável
(`drag.js:6`), e o navegador embutido desta sessão caiu na tela de login — a porta do
editor exige professor autenticado (`lib/editor/acesso.ts`). Tudo o que depende de ver a
tela está no roteiro numerado abaixo.

### O teste humano desta fatia — o roteiro numerado

Abrir `/editor/v2/finais/N0-LADDER` (e **só** esse endereço; a N1-KPK é o rascunho
protegido), em 1366×768:

1. **A paleta aparece?** Embaixo do tabuleiro devem estar três botões — Mover peças,
   Seta, Casa —, quatro botões de cor com o nome escrito, e "Apagar desenhos desta
   posição".
2. **Casa acesa num clique.** Clicar em **Casa**, escolher **vermelho**, clicar em `d4`.
   A casa acende em vermelho. Clicar em `d4` de novo: apaga. Clicar em `d4`, trocar para
   **amarelo**, clicar em `d4`: troca a cor, sem empilhar dois traços.
3. **Seta em dois cliques.** Clicar em **Seta**, **verde**, clicar em `e2` — a frase
   embaixo deve dizer "Seta de e2: clique na casa de destino" — e clicar em `e4`. A seta
   verde nasce.
4. **Desistir.** Clicar em **Seta**, clicar em `a1`, clicar em `a1` de novo: nada é
   desenhado, e a frase volta ao início. `Esc` no meio de uma seta faz o mesmo.
5. **Nenhuma peça se mexe com a ferramenta na mão.** Com **Seta** ou **Casa** ligada,
   tentar arrastar uma torre: ela não deve sair do lugar, e nenhum lance novo pode
   aparecer na lista.
6. **O defeito consertado — este é o item importante.** Voltar a **Mover peças**,
   desenhar duas ou três setas (pela paleta ou pelo botão direito) e então **clicar com
   o botão esquerdo numa casa vazia**. Os desenhos **têm de continuar lá**. Antes deste
   conserto eles sumiam todos.
7. **O desenho é da posição.** Desenhar em um lance, andar para o seguinte (`→`), voltar
   (`←`): o desenho tem de voltar com ele.
8. **Desfazer.** `Ctrl+Z` depois de cada traço devolve o desenho anterior, inclusive
   quando o gesto foi apagar.
9. **Os gestos antigos continuam.** Botão direito arrastando (verde), com Shift
   (vermelho), com Alt (azul) e com Shift+Alt (amarelo).
10. **Apagar desenhos desta posição** apaga só a posição atual — conferir que o lance
    vizinho manteve o dele.

### O que esta fatia NÃO cobre

- **Desenhar pelo teclado.** A paleta tira o Shift/Alt do caminho, mas apontar a casa
  continua sendo gesto de ponteiro — como mover peça, que também não tem caminho de
  teclado no editor. Não é regressão; é uma porta que ainda não existe, e fica escrita
  aqui para não ser dada por fechada.
- **A espessura.** Continua 10 para todas as cores no desenho livre, como §10.2 manda; a
  paleta não oferece escolha de espessura, e não deve oferecer.
- **Alvo/dica de treino.** §10.2 separa desenho explicativo de alvo de treino em dois
  contextos. O segundo nasce com o editor de treinos (§16) e não existe ainda.

### O próximo ponto exato

A fatia 5 do roteiro de §27: **prévia, reprodução e comparação** (§15).

---

## Prévia, reprodução e comparação, entregue em 12/9/2026

Fecha a fatia 5 do roteiro de §27 — a que motivou o v2. O professor abre
**Pré-visualizar** e vê a aula como o aluno a vê: a aula inteira, só o capítulo, ou daqui
em diante.

### A decisão que manda em tudo: não existe um segundo player

§15.1 não é uma preferência, é um requisito com a palavra "nunca": *"usa o mesmo runtime
do aluno, **nunca** um segundo player aproximado"*. O plano final §16 repete: *"não
reproduzir o comportamento pedagógico em um segundo player exclusivo do editor"*.

O runtime do aluno é o `ObjectiveStage` — a aula assistida das aulas de finais. É lá que
moram as cinco coisas que fazem a aula ser a aula: o relógio que espera a leitura, a
digitação da fala caractere a caractere, o som do lance, as duas camadas de desenho e o
palco de altura fechada. Um player só do editor copiaria as cinco e divergiria na
primeira que alguém consertasse.

Então **o player do aluno cresceu controles**, em vez de ganhar um irmão. Uma prop nova,
opcional, chamada `previa`; sem ela, o componente se comporta exatamente como antes, e é
assim que a página do aluno continua o chamando. O que ela leva:

| Campo | Para quê |
|---|---|
| `relogio` | o tempo de cada passo, e `null` quando ele não anda sozinho |
| `autoria` | o desenho do documento v2, que tem cor — o do v1 não tem |
| `animacaoMs` | o "movimento" que a velocidade altera |
| `aoTerminar` | encadeia o próximo capítulo na prévia da aula inteira |
| `controles` | troca os dois botões do aluno pela barra de §15.2 |

`controles` é render-prop pelo mesmo motivo que `edicaoDaFala` já era: o player não deve
saber o que é uma velocidade nem o que é fechar uma prévia.

### A velocidade, e o que ela pode e não pode acelerar

§15.2 e o plano final §6 dizem a mesma frase: *"velocidade altera movimentos e
intervalos; o tempo de leitura da narração permanece calculado pela régua existente"* —
*"isso evita acelerar involuntariamente a leitura"*.

A tradução para este runtime é uma linha, e ela é a fatia inteira:

- **onde há texto**, o relógio é a régua de leitura do aluno (`pausaDoPasso`), e a
  velocidade **não encosta nela**;
- **onde não há texto**, o que corre não é leitura, é intervalo — o lance acontece e o
  próximo vem. Aí a velocidade vale inteira.

Isso não é um meio-termo: é o que faz o 2× ser de fato duas vezes mais rápido numa
partida importada, onde a maioria dos lances ainda não tem narração, **e** manter legível
o capítulo narrado. A animação da peça obedece à velocidade porque ela é literalmente o
"movimento" da frase: 180 ms a 1×, 90 a 2×, 360 a 0,5×.

Os dois números têm o mesmo valor e significados diferentes — o piso de leitura do aluno
e o intervalo sem fala são ambos 1000 ms — e por isso estão escritos em dois lugares, com
o motivo em cada um. Fundi-los faria a velocidade acelerar a leitura pela porta dos
fundos.

### A comparação é lida dos percursos, e não declarada num campo

§15.3 pede que a experiência mostre a linha, **volte de forma compreensível à posição de
comparação** e mostre a alternativa. O documento não tem um campo "isto é uma
comparação", e não deve ter: os capítulos de comparação nascem de *"mostrar esta variante
na aula"*, que só cria um capítulo apontando para um percurso. Um campo a mais seria uma
segunda verdade, pronta para divergir do percurso no dia em que um dos dois mudasse.

Então a comparação é **calculada**: dois capítulos da mesma análise que compartilham um
começo e depois se separam estão comparando linhas, e o último nó em comum é o ponto de
escolha. Com mais de um candidato vale o de começo comum mais longo — é a bifurcação mais
perto, e é a que o professor acabou de criar.

**O retorno é um passo do player, não uma tela.** Ele entra logo depois do último passo
da bifurcação, sem lance, com o tabuleiro parado na posição da escolha:

> Voltamos à posição inicial. Em «A defesa certa: o empate» a partida seguiu com 1… Kd7;
> agora, a outra escolha: 1… Ke8.

Uma tela intermediária tiraria o tabuleiro justamente do momento em que ele é o
argumento. E o passo de retorno só existe na prévia da **aula inteira**: no capítulo
sozinho não há de onde voltar, e inventar o aviso ali seria mentir sobre o que o aluno
verá.

### Quatro decisões menores, e o porquê

**A prévia toma a tela inteira.** O palco da aula (`.aula-palco`) é dimensionado pela
altura da janela, e a promessa dele é rolagem zero. Espremido dentro do casco do
`Dialogo` — centrado, rolando por dentro, com rodapé grudado — o professor veria um palco
que o aluno nunca vê. O contrato de teclado é o mesmo (`Esc` fecha, `Tab` não escapa), e
por isso ele saiu do `Dialogo` para `components/editor-v2/foco.ts`: dois cascos, um
contrato. É a mesma lição que criou o `Dialogo`.

**A prévia guarda o cálculo, não o pedido.** Ela recebe um retrato do documento no
instante em que abriu. É o isolamento que §15.1 exige — da seleção e do Undo da autoria —
e ele sai de graça: não há comando, não há `aplicar`, não há caminho daqui até o
documento.

**Nada é gravado.** O `onStageDone` do runtime do aluno simplesmente não é passado; não
existe caminho da prévia até `registrarEtapa`. §20.2 exige isso, e a tela **diz** isso,
em vez de deixar o professor descobrir depois.

**Lance sem narração vira passo de fala vazia.** A prévia não inventa texto: se o
professor ainda não escreveu, o aluno veria o lance em silêncio, e é o silêncio que a
prévia mostra. Serve de dobradinha — ela também é o mapa do que falta escrever.

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/previa.ts` | **novo** — a tradução do documento em passos, a comparação calculada e o relógio de §15.2 |
| `components/editor-v2/Previa.tsx` | **novo** — a moldura, a barra de controles e a passagem de capítulo |
| `components/editor-v2/foco.ts` | **novo** — `Esc` e a prisão do `Tab`, agora num lugar só |
| `components/lesson/ObjectiveStage.tsx` | a prop `previa`, opcional; o aluno não passa nada |
| `components/board/ChessBoard.tsx` | `animacaoMs`, para a velocidade alcançar o movimento |
| `components/editor-v2/Dialogo.tsx` | passou a usar o `foco.ts` |
| `components/editor-v2/EditorV2.tsx` | o botão, a janela das três entradas e a prévia |

### Evidência

**Os sete portões verdes:** tipos, lint, **1.007 testes** (25 novos), build, conteúdo
(38 consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Dois deles ficaram vermelhos por alguns minutos, por um motivo que não era deste código
— a seção "os dois portões vermelhos", abaixo, conta o que foi, porque a lição de método
vale mais que o susto.

Os 25 testes novos, por assunto:

- **§15.1, os passos (6):** o primeiro passo é a posição de partida e não tem lance; cada
  lance do percurso vira um passo, na ordem; lance sem narração vira fala vazia e a
  prévia não inventa texto; duas narrações no mesmo nó viram dois passos com o lance
  jogado **uma vez**; a pausa manual atravessa; e os desenhos viajam com a cor da autoria;
- **§15.1, «daqui» (3):** começa na posição do lance escolhido e não no começo do
  capítulo, com a FEN conferida contra a chess.js; lance fora do percurso **não** abre
  «daqui», porque variante não toca sozinha; e o percurso é o início mais o caminho;
- **§15.1, a aula inteira (2):** a ordem é a do `fluxo` e não a do cadastro; cada capítulo
  leva a própria orientação, e os dois lados convivem na mesma prévia;
- **§15.2, o relógio (4):** a velocidade **não** comprime a leitura, em 0,5× e em 2×, e o
  número é o da régua do aluno; vale inteira no intervalo sem fala; a pausa manual não
  anda em velocidade nenhuma; e o movimento obedece;
- **§15.3, a comparação (4):** a bifurcação achada num lance, com o rótulo e o que cada
  linha joga dali; a bifurcação na posição inicial; o capítulo que é só o começo do outro
  **não** é comparação; e, com três linhas, o começo comum mais longo ganha;
- **§15.3, o caso de aceite obrigatório (6):** abaixo.

**O caso de aceite de §15.3, com a regra do jogo por trás.** A posição é rei branco d5,
peão e4, rei preto e7, **pretas jogam** — `8/4k3/8/3K4/4P3/8/8/8 b - - 0 1`, com o preto
segurando a oposição. Duas linhas, na mesma aula:

- **«A defesa certa: o empate»** — `1… Kd7 2.e5 Ke7 3.e6 Ke8 4.Kd6 Kd8 5.e7+ Ke8 6.Ke6`,
  e o teste confere na chess.js que a posição final é **afogamento**, e portanto empate;
- **«O engano: a derrota»** — `1… Ke8? 2.Ke6 Kd8 3.Kf7 Kd7 4.e5 Kd8 5.e6 Kc7 6.e7 Kd7
  7.e8=Q+`, e o teste confere que a dama está em e8 e que não há empate nenhum.

Os testes provam, além das duas linhas: que a prévia da aula inteira traz as duas na
ordem do fluxo; que o passo de retorno aparece **na posição da escolha**, sem lance, logo
antes do primeiro lance diferente, com a frase inteira conferida palavra por palavra; que
fora esse passo os lances são exatamente o percurso; que a **narração da mesma posição é
diferente em cada passagem** (§15.3, item 4); que a pausa manual do ponto de escolha
chega ao relógio como `null`; e que a prévia do capítulo sozinho **não** inventa o
retorno.

### Os dois portões que ficaram vermelhos por dez minutos, e a lição que sobra

Enquanto esta parada rodava, **outra sessão do Claude Code estava editando o mesmo
repositório** — `preparatorio-olesc-e1`, aberta às 13h22 — e reescreveu `content/sources.json`
(13:47:55) e `docs/SOURCE-CORPUS.md` (13:48:50), trocando o livro-base do módulo de finais
do De la Villa para o Silman.

`content/divida-de-licenca.md` ainda não foi atualizado junto, e é isso que deixa
`validate:content` e `validate:mutations` vermelhos:

```
✖ [DIVIDA_DESATUALIZADA] content/divida-de-licenca.md
    o inventário do regime integral não bate com o conteúdo
```

O mesmo `validate:content` passou verde nesta sessão minutos antes, com este código já
compilando, e os dois arquivos não foram tocados por nenhum commit desta rodada. Era um
estado intermediário da edição da outra sessão. **Nada foi alterado nesses arquivos
daqui**, de propósito: mexer no trabalho em curso de outra sessão é a forma mais barata
de perder os dois. Minutos depois ela terminou — `divida-de-licenca.md` e
`TRILHA-FINAIS.md` entraram junto — e os dois portões voltaram ao verde sozinhos, com
**42/42 mutações vermelhas**.

**A lição de método, para quem vier depois:** quando um portão de *conteúdo* fica
vermelho numa rodada que só mexeu em *código*, a primeira pergunta não é "o que eu
quebrei". É `git status` e `ls -la` nos arquivos que o portão nomeia. Aqui o carimbo de
horário respondeu em dez segundos — `content/sources.json` escrito às 13:47:55, enquanto
o portão rodava — e o `ListAgents` deu o nome da sessão vizinha. Dois comandos, e a
alternativa era passar meia hora procurando um defeito que não existia no meu lado.

### O teste humano desta fatia — o roteiro numerado

Abrir `/editor/v2/finais/N0-LADDER` e clicar em **Pré-visualizar**:

1. **As três entradas.** A janela oferece "A aula inteira", "Só este capítulo" e "Daqui em
   diante". Com um lance de variante selecionado, a terceira fica **apagada**, e a
   explicação embaixo dela diz por quê.
2. **O capítulo toca.** O tabuleiro anda sozinho, a fala é digitada, e o passo só vira
   depois do tempo de leitura — como na aula do aluno.
3. **Pausar e continuar.** `⏸ Pausar` para; `⏵ Reproduzir` volta a andar.
4. **Voltar e avançar** andam um passo por clique, e atravessam a borda do capítulo
   quando há outro antes ou depois.
5. **A velocidade.** Em 2×, um trecho **sem narração** anda visivelmente mais rápido; um
   trecho **com narração** leva o mesmo tempo. É este o teste da regra de §15.2, e é o
   único jeito de conferi-la com o olho.
6. **Repetir capítulo** volta ao primeiro passo do capítulo; **Reiniciar** volta ao
   primeiro capítulo da prévia.
7. **A pausa manual.** Numa narração marcada como pausa manual, a aula **para** e o botão
   vira **Continuar**.
8. **A comparação.** Criar, pela ação "mostrar esta variante na aula", dois capítulos que
   se separam num lance; abrir "A aula inteira": ao chegar na bifurcação o tabuleiro para
   e a frase "Voltamos a …" aparece antes do lance alternativo.
9. **Isolamento.** `Esc` ou "Fechar prévia" devolve o editor **no mesmo capítulo e no
   mesmo lance** em que estava, e o `✓ salvo` não vira "alterado" por ter assistido.
10. **A geometria em 1366×768.** O palco da prévia tem uma barra a mais que o do aluno —
    o cabeçalho da prévia. Conferir que o tabuleiro não é empurrado para fora e que a
    página não ganha rolagem. **Este é o item com maior chance de precisar de ajuste**, e
    é medição, não opinião.

### O que esta fatia NÃO cobre

- **Treino dentro da prévia.** A prévia reproduz capítulos. Jogar o treino como o aluno
  joga nasce com o editor de treinos (§16), que não existe.
- **Prática contra Stockfish** (§17.1) na prévia, pelo mesmo motivo.
- **Introdução e quadros explicativos** (§7.1) não entram na prévia ainda: o editor de
  introdução não tem tela, e reproduzir o que não se pode editar seria mostrar um trecho
  que o professor não consegue consertar.
- **A pausa manual no meio de uma fala paginada.** A prévia para no passo, não na página;
  a régua de voz existe para a fala não paginar, e o caso não foi exercitado.
- A prévia **não** foi vista pelo agente no navegador: a porta do editor exige professor
  autenticado e o navegador embutido estava deslogado. Quem a viu foi o Doug — seção
  abaixo.

### Teste humano da paleta e da prévia — 12/9/2026, aprovado

O Doug rodou o roteiro numerado inteiro na `N0-LADDER`, logado, e **as 19 perguntas
passaram**. Com isso ficam conferidos pela mão os gestos e as medidas que nenhum script
alcança:

- **a paleta**, com os três botões de ferramenta, as quatro cores nomeadas e a bolinha na
  cor com que o traço sai;
- **o desenho por clique**: a casa acesa num clique, o apagar pelo mesmo gesto, a troca de
  cor sem empilhar traço, os dois cliques da seta com a frase que muda entre eles, e o
  desistir;
- **nenhuma peça se move** com a ferramenta na mão;
- **o defeito do clique esquerdo**, que era o item mais importante do roteiro: os desenhos
  continuaram na tela depois do clique numa casa vazia. Com isso a **reprodução** que
  faltava a este conserto está feita — a causa já estava lida no pacote (`drag.js:17-20` →
  `draw.js:65-71`), e agora o comportamento consertado foi visto;
- **o que já existia não quebrou**: o desenho por posição, o Desfazer de cada traço, e os
  quatro gestos de botão direito;
- **a prévia**: as três entradas, o capítulo tocando com o relógio de leitura, os seis
  controles, o retorno ao editor no mesmo capítulo e no mesmo lance sem sujar o `✓ salvo`;
- **a regra da velocidade de §15.2, nas duas metades**: em 2× o trecho sem narração anda
  mais rápido **e** o trecho com narração leva o mesmo tempo. Esta é a única conferência
  possível dessa regra, e ela é do olho;
- **a geometria em 1366×768**: o tabuleiro da prévia cabe inteiro e a página não ganhou
  rolagem, apesar da barra a mais do cabeçalho da prévia;
- **a comparação**, criada pela ação "mostrar esta variante na aula": ao chegar na
  bifurcação o tabuleiro parou e a frase do retorno apareceu antes do lance alternativo.

Os artefatos do ensaio foram removidos no fim: `content/rascunhos/lessons/N0-LADDER.json`
(conferido byte a byte igual à aula publicada, SHA-256 `943151…03c3`, como no commit
`15b390c`) e `.editor/v2/N0-LADDER.json`, que guardava os capítulos «4… Kc1» e «5. Rg1#»
criados no teste da comparação. O SHA-256 de `.editor/v2/N1-KPK.json` continua
`4be602ca224f065f630efe11948b696e33dbaa95a5fdfc12c03a6c912eacb822`, conferido antes e
depois. Nenhuma aula publicada foi tocada.

### A dívida que o teste humano destapou

A **pausa manual não tem interruptor na tela**. O modelo tem o campo
(`narracao.pausa: "manual"`), a prévia o respeita e há teste provando que ela não anda
sozinha em velocidade nenhuma — mas a caixa de narração só edita o texto, e não há comando
que escreva o campo. §12.2 pede o interruptor.

É meia entrega: o player honra uma marca que ninguém consegue pôr. Fica registrada aqui
como a primeira coisa a fazer antes ou junto da fatia 6, e não como "coberto por §15.2".

### O próximo ponto exato

O interruptor da pausa manual (§12.2), acima — é pequeno e fecha a meia entrega.

Depois, a fatia 6 do roteiro de §27: **autoria de treinos e defensor** (§16). Ela é a que
destrava "Criar treino daqui", que hoje aparece no menu do lance desabilitada com o motivo
escrito.

---

## Narração pela tela: criar, ordenar e pausar — 12/9/2026

Fecha as **duas meias entregas** que o teste humano de 12/9 destapou, antes de abrir a
fatia 6. As duas eram do mesmo tipo: o dado existia no modelo, e não havia onde mexer
nele pela tela.

**Buraco 1 — criar narração.** Só existia `EDITAR_NARRACAO`, que exige a narração já
existente, e a caixa só aparecia para as narrações que já estavam no documento. Numa aula
montada do zero **não havia como escrever uma narração**: elas só nasciam de comentário
de PGN importado, e a prévia entregue em 12/9 tocava em silêncio.

**Buraco 2 — o interruptor da pausa manual.** `narracao.pausa` existia, a prévia o
respeitava e havia teste disso; faltavam o comando e o controle.

### O que o professor vê agora

Abaixo do comentário, no lance selecionado:

- **"+ Escrever narração"** (ou **"+ Outra narração neste lance"**, quando já há uma).
  Abre uma caixa vazia com o cursor dentro. A narração nasce **quando a caixa perde o
  foco com algo escrito**; deixada vazia, é desistência e nada é criado.
- Em cada narração, a caixa **"Parar aqui até o aluno clicar em Continuar"**. A frase
  diz o efeito, e não o nome do campo.
- Com duas ou mais narrações no mesmo lance: o rótulo vira "Narração 1 de 2", e aparecem
  **"↑ Antes"** e **"↓ Depois"**.
- Num lance de **variante fora do percurso** do capítulo, em vez do botão, a frase: a
  narração só existe nos lances que o capítulo reproduz.

### As decisões, e o porquê

**A narração continua sendo do capítulo, não do nó.** Os três comandos novos recebem o
`capituloId` e não tocam no comentário da análise — o caso das duas comparações que
explicam a mesma posição de jeitos diferentes continua provado em `previa.test.ts`.

**A ordem é a do array, sem campo `ordem`.** A prévia já filtra `capitulo.narracoes` pelo
nó e toca na ordem em que aparecem. Um campo a mais seria uma segunda verdade. "Mover"
troca de lugar **só com a vizinha do mesmo lance**; narrações de lances diferentes nunca
se atravessam, e na ponta o comando devolve a mesma aula (não entra no histórico).

**Narração só em lance do percurso.** Numa variante, ela seria texto que a prévia nunca
toca — escrito pelo professor achando que o aluno ia ler. O executor recusa com a frase,
e a tela nem oferece o botão.

**O id é calculado, não sorteado** (`narracao-<nó>`, o prefixo da importação, com sufixo
só se já estiver em uso). Chega pronto no comando, pelo mesmo motivo do
`ADICIONAR_CAPITULO`: o Refazer devolve a mesma narração, e não uma parecida.

**Sem narração vazia no documento.** O schema pede `texto` com pelo menos um caractere, e
§12.2 já diz que esvaziar remove. Por isso a caixa nova é estado da **sessão** até ganhar
texto — e trocar de lance a fecha sem efeito nenhum, porque a chave deixa de casar.

**Os botões de ordem usam `aria-disabled`, não `disabled`.** O desabilitado de verdade
tiraria o foco de quem acabou de levar a narração até a ponta, e esconderia o `title` que
explica. É a regra que a lixeira já documentava.

### O defeito achado no caminho: sair da caixa sem mudar nada sujava o Desfazer

**Reproduzido por teste.** Sair da caixa de narração — ou de comentário — sem mudar o
texto empilhava um passo no Desfazer que não desfazia nada, e mandava gravar. §6.1: *"ação
sem efeito não entra no histórico nem dispara autosave"*.

**A causa, com arquivo e linha.** `aplicarNoHistorico` (`lib/editor-v2/comandos.ts:291`)
só ignora o comando quando recebe **o mesmo objeto**; e `EDITAR_NARRACAO` (`:209-218`) e
`EDITAR_COMENTARIO` (`:230-234`) montavam sempre uma aula nova, com texto igual ou não.
Como as duas caixas gravam no `onBlur`, cada clique fora era uma edição.

**O conserto** é uma linha em cada comando: texto igual devolve a mesma aula.

```
ANTES   ✖ §6.1: sair da caixa de narração sem mudar o texto não entra no histórico
          AssertionError: Values have same structure but are not reference-equal
        ✖ §6.1: sair da caixa de comentário sem mudar o texto não entra no histórico
          AssertionError: Values have same structure but are not reference-equal
DEPOIS  ✔ os dois (pass 2, fail 0)
```

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/narracoes.ts` | **novo** — `podeNarrar`, `novoIdDeNarracao`, e as três edições: nova, movida, pausa |
| `lib/editor-v2/narracoes.test.ts` | **novo** — 11 testes |
| `lib/editor-v2/comandos.ts` | `ADICIONAR_NARRACAO`, `MOVER_NARRACAO`, `DEFINIR_PAUSA_DA_NARRACAO`; e a porta do "sem efeito" nas duas caixas |
| `components/editor-v2/EditorV2.tsx` | o botão, a caixa nova, o interruptor e os dois botões de ordem |

### Evidência

**Os sete portões verdes:** tipos, lint, **1.018 testes** (11 novos), build, conteúdo (38
consultas de tablebase, todas do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 11 testes: a primeira narração num lance mudo, **com a prévia passando de fala vazia a
fala escrita** e o comentário intocado, e o documento válido pelo `validarAulaV2`; a
segunda narração entrando depois da primeira; o id sem colisão, igual em duas chamadas, e
o id repetido recusado; criar num Desfazer, com o Refazer devolvendo **o mesmo id**; texto
vazio não criando nada; lance de variante recusado; mover para cima trocando a ordem **na
prévia**, e voltando; mover na ponta sem efeito e sem atravessar outro lance; o
interruptor escrevendo o campo, a prévia recebendo `pausaManual`, o Ctrl+Z desligando,
ligar o que já está ligado não entrando no histórico; e os dois do defeito acima.

**O que esta rodada NÃO prova.** Nada foi visto na tela: o navegador embutido caiu na
tela de login (a porta do editor exige professor autenticado). Os comandos, a ordem na
prévia e o histórico estão provados por teste; **o botão, o foco automático da caixa, o
salvar ao clicar fora e a geometria** ficam para o roteiro abaixo.

**Os artefatos.** Havia um `content/rascunhos/lessons/N0-LADDER.json` fora do git, de
15:15, anterior a esta sessão e **byte a byte igual à aula publicada** (SHA-256
`943151…03c3`). Foi apagado e conferido (`Test-Path` → `False`; `git status content/`
vazio). O SHA-256 de `.editor/v2/N1-KPK.json` foi conferido antes e depois:
`4be602ca…b822`.

### O teste humano desta rodada — o roteiro numerado

Abrir `/editor/v2/finais/N0-LADDER`, logado, em 1366×768. Perguntas de sim ou não:

1. Num lance **do capítulo** sem narração, aparece **"+ Escrever narração"** logo abaixo
   do comentário?
2. Clicar nele abre uma caixa vazia **com o cursor já dentro**?
3. Escrever "Teste um" e clicar fora: a caixa vira **"Narração mostrada ao aluno"** com o
   texto, e o estado passa por "salvando" até **"✓ salvo"**?
4. Com o foco fora das caixas, **Ctrl+Z** apaga a narração, e **Ctrl+Shift+Z** a devolve?
5. Abrir a caixa nova e clicar fora **sem escrever**: nada aparece, e o estado continua
   **"✓ salvo"**?
6. **"+ Outra narração neste lance"**, escrever "Teste dois": os rótulos viram **"1 de 2"**
   e **"2 de 2"**, com **↑ Antes** e **↓ Depois**?
7. **↑ Antes** na segunda troca a ordem na tela? E **↑ Antes** na primeira aparece apagado
   e não faz nada?
8. Marcar **"Parar aqui até o aluno clicar em Continuar"** numa delas, e abrir
   **Pré-visualizar → Só este capítulo**: as duas falas tocam **na ordem nova**, e a aula
   **para** na marcada, com o botão virando **Continuar**?
9. Num lance de **variante fora do capítulo**, aparece a frase "Este lance é de uma
   variante fora do capítulo…" no lugar do botão?
10. **O defeito consertado.** Clicar numa caixa de narração ou de comentário que já tem
    texto e clicar fora **sem mudar nada**: o estado continua **"✓ salvo"**, sem passar a
    "alterado"?
11. Recarregar a página (F5) depois do "✓ salvo": as narrações, a ordem e a pausa
    continuam lá?

Depois do teste, os artefatos voltam: `content/rascunhos/lessons/N0-LADDER.json` e
`.editor/v2/N0-LADDER.json`. **Não commitar**; apagar como no fim desta rodada.

### Teste humano — 12/9/2026, aprovado

O Doug rodou o roteiro na `N0-LADDER`, logado, e **as 11 perguntas passaram**: o botão,
o foco automático da caixa, o salvar ao clicar fora, o Desfazer/Refazer, a desistência
com a caixa vazia, a ordem com ↑/↓, a pausa manual parando a prévia no **Continuar**, a
frase no lance de variante, o **defeito consertado** (sair da caixa sem mudar nada não
suja o "✓ salvo") e a persistência depois do F5. Os artefatos do ensaio foram apagados
no fim.

### O que esta rodada NÃO cobre

- **Mover narração para outro lance.** §12.2 pede ordenar "quando houver mais de uma", e
  a ordem que importa é dentro do lance. Levar uma fala de um lance para outro seria
  recortar e colar; não foi pedido e não existe.
- **Narração da introdução e dos quadros** (§7.1): continua sem tela, com a introdução.
- **A régua de voz no texto novo** (§12.2, último item): **não verificada nesta rodada**.
  A tela não avisa enquanto se digita, e a publicação v2 (§20), onde o texto do aluno
  seria julgado, ainda não existe. Fica aberta com a publicação.

## Fatia 6 — nascimento e colocação do treino (parada 6A)

Entregue em 12/09/2026. Esta seção abre a fatia 6; **não fecha §16 inteiro**.

### O que ficou completo nesta parada

- `Criar treino daqui`, antes apagado, fica disponível na posição inicial ou num
  lance do percurso selecionado que ainda tenha continuação. Variante fora do
  percurso e último lance continuam apagados, cada um com o motivo escrito.
- A janela mostra antes da confirmação: título, FEN inicial, lado do aluno,
  capítulo/trecho, perfil de linha autoral, objetivo, respostas derivadas, respostas
  do defensor, feedback, condição de término, lugar no fluxo e obrigatoriedade.
- O professor escolhe brancas, pretas ou ambos. Ambos cria duas tarefas e duas etapas
  com IDs próprios. O turno vem de `chess.js`, nunca da posição par/ímpar do passo.
- Se a linha começa na vez do defensor, `defesaInicial` executa antes da primeira
  pergunta. Se ela acaba na vez dele, `defesaFinal` executa e então aplica a condição
  terminal. A N0 prova os dois casos no treino das pretas.
- O treino de capítulo entra logo depois do capítulo. A opção geral entra antes das
  práticas finais. `fluxo` continua sendo a única ordem; nenhum campo de colocação é
  salvo no treino.
- Criar um ou dois treinos é um comando só. Desfazer remove o conjunto; Refazer devolve
  os mesmos IDs porque todos já chegam decididos no comando. Lista vazia não foi
  introduzida no documento.
- A origem guarda análise, nós relevantes, versão do derivador e impressão digital
  das dependências. Ancestrais, posição inicial, percurso, lado e objetivo participam;
  título não participa. Variantes não viram solução automaticamente.
- Uma derivação aceita no máximo 200 meios-lances. A recusa mostra o tamanho real e o
  teto e manda começar mais adiante.

Arquivos centrais: `lib/editor-v2/treinos.ts`,
`components/editor-v2/DialogoCriarTreino.tsx`, `lib/editor-v2/modelo.ts`,
`lib/editor-v2/comandos.ts`, `lib/editor-v2/acoes-do-lance.ts`,
`components/editor-v2/PainelDeLances.tsx` e `components/editor-v2/EditorV2.tsx`.

### Evidência automática e medida

Os testes novos cobrem a N0 real, a N1 real sem escrevê-la, brancas, pretas, ambos,
defesa inicial/final, mate, promoção, posições de cada pergunta, ordem no fluxo,
IDs de Undo/Redo, recusas, hash de dependência, referência quebrada e teto 200/201.
Rodada dirigida: **65/65**. Rodada completa: **1.030/1.030**.

Medição em Node 24/win32, no notebook desta rodada, descartando a primeira execução:

- N0-LADDER, ambos os lados, 9 perguntas: mediana 8,85 ms; p95 26,78 ms; máximo
  58,08 ms, em 100 amostras;
- N1-KPK, ambos, 11 perguntas: mediana 7,83 ms; p95 11,69 ms; máximo 13,81 ms,
  em 100 amostras;
- linha de 200 meios-lances, ambos: mediana 61,83 ms; p95 67,57 ms; máximo
  67,73 ms, em 20 amostras;
- linha de 300: p95 222,49 ms. Por isso 200, e não 300, virou o teto. A linha de 500
  foi medida à parte com só 10 amostras (mediana 356,93 ms; máximo 570,84 ms); não foi
  chamada de p95.

Sete portões antes do commit: `typecheck`, `lint`, **1.030 testes**, `build`, conteúdo
verde (18 posições, 3 aulas), **42/42 mutações vermelhas** e repertório `--check`
(27 linhas em 11 arquivos, nada escrito).

### Ensaio real pela tela — aprovado nesta rodada

Em `/editor/v2/finais/N0-LADDER`, logado:

1. o menu da posição inicial mostrou `Criar treino daqui` habilitado;
2. a prévia mostrou cinco perguntas das brancas e quatro das pretas;
3. no treino das pretas, mostrou o defensor começando com `g2g4` e terminando com
   `g4g1`, em mate;
4. criar inseriu as duas tarefas antes do treino v1 que já existia, e chegou a
   `✓ salvo`;
5. Desfazer removeu as duas de uma vez; Refazer restaurou as duas e os mesmos IDs;
6. no último lance `Rg1#`, a ação ficou apagada com “não há nenhum lance depois desta
   posição para virar treino”.

Não houve gesto de tabuleiro nesta entrega. Portanto nada de ponteiro foi dado como
provado por script.

O ensaio foi limpo: `content/rascunhos/lessons/N0-LADDER.json` e
`.editor/v2/N0-LADDER.json` não existem. O SHA-256 da N1 permaneceu
`4be602ca224f065f630efe11948b696e33dbaa95a5fdfc12c03a6c912eacb822`.

### O que continua aberto — sem reduzir §16 nem §28

- **Parada 6B, autoria completa (§16.3):** editar dicas/desenhos, explicação final,
  várias respostas corretas, alternativa correta fora do método com feedback próprio,
  erro conhecido nomeado, continuação executável e todas as condições terminais.
- **Parada 6C, defensor jogável (§16.4):** prévia no runtime do aluno, estabilidade
  dentro da tentativa, rotação determinística entre tentativas e escolha fixa.
- **Parada 6D, propriedade (§16.5):** primeiro ajuste materializa a cópia; fonte
  atual/alterada/removida, aviso e diff; independente; refazer com snapshot e Undo;
  IDs de questões sobrevivendo ao mesmo ponto de origem; gate sem sobrescrever autoria.
- O checklist mestre de §28 continua desmarcado para respostas completas, defensor e
  propriedade. A lista visível na lateral ainda é leitura, não a tela de edição dessas
  três paradas.

### O próximo ponto exato

Parada 6B: abrir um treino da lista lateral e concluir a autoria de questões e
respostas de §16.3, inclusive o caso medido pelo plano de duas respostas com feedback
distinto e um erro conhecido.

---

## Fatia 6 — autoria das perguntas e respostas (parada 6B)

Entregue em 12/09/2026, em duas mãos: o código foi escrito numa sessão do Codex, que
parou pelo limite de uso no meio do ensaio no navegador; uma sessão do Claude Code
retomou dali, revisou, achou e consertou dois defeitos, rodou os portões e commitou.
**Não fecha §16**: 6C e 6D continuam abertas.

### O que o professor ganha

- Cada treino da lista lateral virou um botão **"Abrir autoria"**.
- A janela edita, numa **cópia**: título, objetivo, explicação ao concluir, término de
  segurança (objetivo, mate ou limite de meios-lances) e, por pergunta, a **dica sob
  demanda** com **desenho próprio** (botão direito no tabuleiro da janela).
- Por pergunta, três portas: **+ Resposta correta**, **+ Correta fora do método** e
  **+ Erro conhecido**. Cada resposta tem lance(s) em UCI, julgamento, feedback próprio
  e o que acontece depois: o defensor responde e avança para uma pergunta, aceita e
  repete, ou encerra o ramo numa condição (mate, promoção, empate pelas regras, vitória
  certificada ou objetivo autoral).
- Erro conhecido ganha **nome curto e explicação**, guardados no catálogo da aula.
- O rodapé diz, enquanto se edita, a primeira coisa que impede salvar. **Salvar autoria**
  só habilita quando toda resposta aceita tem continuação ou término executável.

### As regras que a conferência impõe (`lib/editor-v2/autoria-treino.ts`)

- Lance ilegal na posição da pergunta é recusado.
- O mesmo lance em duas respostas da mesma pergunta é recusado.
- Toda pergunta precisa de pelo menos uma resposta aceita.
- **Avançar** exige defesa legal **e** chegar exatamente à posição da próxima pergunta.
- **Encerrar** exige provar a condição: mate é mate, promoção termina em promoção,
  empate é empate pelas regras; vitória certificada só em final certificado; objetivo
  autoral exige a explicação de conclusão.
- Erro conhecido precisa de nome e explicação, e repete a pergunta.
- Salvar é **um comando só** (`EDITAR_TREINO`): um Desfazer devolve o treino e o
  catálogo; o Refazer devolve os mesmos IDs.
- O primeiro ajuste material marca o treino como **personalizado** e a revisão de
  avaliação como pendente — a proteção mínima para a máquina não sobrescrever autoria.
  O diff e o "refazer a partir da aula" são da 6D.

### Duas decisões de modelo, para quem contestar

- **`julgamento` ganhou `alternativa`** (`modelo.ts`), ao lado de `correta` e `erro`:
  aceita, mas fora do método ensinado. É o que §16.3 chama de "alternativas corretas
  fora do método, com feedback próprio".
- **O adaptador v1 passou a ler `methodAlternatives` como `alternativa`**, e não como
  `correta` (`adaptar-v1.ts`). No v1 esse lance é elogiado com *"Boa alternativa.
  Continue pela linha ensinada."* e a peça volta — aceito, mas não é a linha. Nenhum
  outro código decide por esse valor; conteúdo v1 e as 42 mutações continuam verdes.
- O catálogo de erros ganhou `nome`, **opcional**, para os catálogos v1 continuarem
  legíveis.

### Os dois defeitos achados na revisão

**1. O espaço digitado sumia.** A janela confere a edição a cada tecla, e a conferência
aparava o texto **no próprio objeto que a tela mostrava**: o espaço depois de "Boa"
desaparecia antes da palavra seguinte.
Causa: `autoria-treino.ts:58` fazia cópia **rasa** do treino; as perguntas e respostas
continuavam sendo os objetos do estado da tela, e `:79` (apaga dica vazia) e `:92`
(apara o feedback) os alteravam. Conserto: cópia funda (`structuredClone`) no começo.

**2. Salvar sem mudar nada personalizava o treino.** Abrir a autoria e salvar marcava
"personalizado" e entrava no Desfazer — contra §16.5 (só o primeiro ajuste materializa)
e §6.1 (sem efeito, sem histórico).
Causa: `autoria-treino.ts:62` marcava a propriedade antes de saber se algo mudou.
Conserto: depois de conferir, se treino e catálogo são iguais aos do documento, devolve
o próprio documento; só então marca personalizado.

```
ANTES   ✖ §16.3: conferir a edição não altera o que o professor está digitando
            -  feedback: 'Boa ',   +  feedback: 'Boa',   -  dica: ''
        ✖ §6.1 e §16.5: salvar sem mudar nada não personaliza o treino nem entra no histórico
            + 'personalizado'   - 'derivado'
DEPOIS  ✔ os dois (autoria-treino.test.ts: 6 de 6)
```

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/autoria-treino.ts` | **novo** — conferência da edição, aplicação, id de resposta e erro no catálogo |
| `lib/editor-v2/autoria-treino.test.ts` | **novo** — 6 testes |
| `components/editor-v2/DialogoEditarTreino.tsx` | **novo** — a janela de autoria |
| `lib/editor-v2/comandos.ts` | `EDITAR_TREINO` |
| `lib/editor-v2/modelo.ts` | `alternativa` no julgamento; `nome` opcional no erro do catálogo |
| `lib/editor-v2/adaptar-v1.ts` | `methodAlternatives` → `alternativa` |
| `components/editor-v2/EditorV2.tsx` | a lista de treinos clicável, a janela, o foco devolvido ao fechar |

### Evidência

**Os sete portões verdes:** tipos, lint, **1.036 testes**, build, conteúdo (18 posições,
3 aulas, 38 consultas de tablebase do cache), **42/42 mutações vermelhas** e repertório
`--check`.

Os 6 testes da autoria, na N0 real: duas corretas com feedbacks distintos, uma correta
fora do método, um erro nomeado, dica, desenho e explicação de conclusão, com o documento
válido pelo `validarAulaV2`; continuação que não chega à próxima pergunta recusada;
término "mate" recusado quando não é mate; Desfazer/Refazer conservando IDs e catálogo;
e os dois defeitos acima.

**O que esta rodada NÃO prova.** Nada foi visto na tela: o ensaio do Codex parou pelo
limite, e o navegador desta sessão caiu no login. A janela, o desenho da dica pelo botão
direito, o rodapé mudando enquanto se digita e o foco ao fechar ficam para o roteiro.

**Os artefatos.** O ensaio interrompido deixou `content/rascunhos/lessons/N0-LADDER.json`
(byte a byte igual à publicada, `943151…03c3`); foi apagado e conferido. O SHA-256 de
`.editor/v2/N1-KPK.json` continuou `4be602ca…b822`.

### O teste humano desta parada — o roteiro numerado

Abrir `/editor/v2/finais/N0-LADDER`, logado, em 1366×768. Se ainda não houver treino, no
menu da **posição inicial** usar **Criar treino daqui**, lado **brancas**, e criar.

1. Na lateral, o treino aparece como botão, com **"Abrir autoria"**?
2. Clicar abre a janela com título, objetivo, explicação ao concluir, término, a lista de
   perguntas e o tabuleiro da **Pergunta 1**?
3. **O defeito 1:** no feedback da primeira resposta, digitar "Boa escolha, continue". As
   palavras ficam **separadas por espaço**?
4. **O defeito 2:** fechar com Cancelar, abrir de novo e clicar **Salvar autoria** sem
   mudar nada. O treino continua **"ligado à aula"** e o estado continua **"✓ salvo"**?
5. Na Pergunta 1, **+ Resposta correta**: o rodapé fica vermelho dizendo que `a1a2` não é
   legal, e **Salvar autoria** fica apagado?
6. Trocar o lance para `g2g3` e "Depois desta resposta" para **Aceita e repete esta
   pergunta**, com um feedback diferente do da resposta 1. O rodapé volta a dizer que
   todas as respostas têm continuação ou término?
7. **+ Correta fora do método** com `g2g5`, repetindo, e **+ Erro conhecido** com `g2h2`,
   com nome e explicação. O rodapé continua verde?
8. Na resposta 1, trocar para **Encerra o ramo → Mate**. O rodapé diz **"a posição final
   não é mate"**? Voltar para "Defensor responde e avança" e conferir que volta a
   habilitar.
9. Na **Dica sob demanda**, escrever uma dica e desenhar uma seta com o **botão direito**
   no tabuleiro de baixo. A seta aparece também no tabuleiro da pergunta?
10. **Salvar autoria**: a janela fecha, o **foco volta ao botão do treino**, a lista diz
    **"personalizado"** e o estado chega a "✓ salvo"?
11. **Ctrl+Z** volta a "ligado à aula" de uma vez, e **Ctrl+Shift+Z** devolve
    "personalizado"?
12. **Esc** fecha a janela sem salvar nada?
13. F5 depois do "✓ salvo": reabrindo a autoria, as quatro respostas, os feedbacks, o
    nome do erro, a dica e o desenho continuam lá?

Depois do teste, apagar `content/rascunhos/lessons/N0-LADDER.json` e
`.editor/v2/N0-LADDER.json`. **Não commitar.**

### O roteiro rodado na tela pelo Playwright — 12/9/2026

A pedido do Doug, o roteiro acima foi rodado pelo Playwright em vez da mão, em
`/editor/v2/finais/N0-LADDER`, 1366×768, com o Doug fazendo o login. O Playwright passa
pela entrada do próprio navegador: clique, teclado e **botão direito arrastado chegam
como eventos confiáveis**, ao contrário do `dispatchEvent` que o chessground recusa
(`drag.js:6`). O que ele não mede é a hesitação de uma pessoa — isso continua sendo do
teste de uso de §20.

Usou o treino que já existia na N0 (**"Treino guiado"**, brancas, 5 perguntas), com a
Pergunta 1 em `8/8/8/8/8/4k3/6R1/6RK w - - 0 1`.

| Item | Resultado medido |
|---|---|
| 1 | botão "Treino guiado · Brancas · 5 perguntas · ligado à aula · Abrir autoria" |
| 2 | título, objetivo, explicação, término, 5 perguntas, tabuleiro e FEN; rodapé verde |
| 3 | digitado tecla a tecla, o campo ficou **"Boa escolha, continue"** — espaços intactos |
| 4 | Cancelar descartou a digitação e devolveu o foco ao treino; salvar sem mudar deixou **"ligado à aula"** e o **Desfazer apagado** |
| 5 | "a1a2 não é legal na posição da pergunta 1", Salvar apagado |
| 6 | `g2g3` repetindo, feedback próprio: rodapé verde, Salvar habilitado |
| 7 | julgamentos `correta, correta, alternativa, erro`; rodapé verde |
| 8 | "a posição final não é mate", Salvar apagado; **a volta a "avança" falhou** — ver abaixo |
| 9 | seta g2→g4 com o botão direito arrastado no tabuleiro da dica: elementos desenhados 3 → 4 **nos dois tabuleiros** |
| 10 | janela fechada, foco no botão do treino, **"personalizado"**, "✓ salvo" |
| 11 | Ctrl+Z → "ligado à aula"; Ctrl+Shift+Z → "personalizado"; "✓ salvo" |
| 12 | Esc fechou; o título mudado não ficou |
| 13 | depois do F5: as 4 respostas, os feedbacks, "Torre ao alcance", a dica e a seta |

Console do navegador: nenhum erro ou aviso durante todo o roteiro.

### O terceiro defeito: trocar o que vem depois e voltar perdia a defesa escrita

**Reproduzido na tela (item 8).** Na Resposta 1, "Encerra o ramo → Mate" e de volta a
"Defensor responde e avança": a defesa `e3d2`, que estava no documento, virava o marcador
`a1a2`, e o Salvar não reabilitava até se redigitar a defesa.

**A causa:** `components/editor-v2/DialogoEditarTreino.tsx:197-204`, o `onChange` de
"Depois desta resposta", montava o efeito do zero a cada troca, sem olhar o que a
resposta tinha no documento.

**O conserto:** a lógica foi para `efeitoAoTrocarTipo` (`autoria-treino.ts`) — primeiro
**sem mudar o comportamento**, para o teste falhar pelo comportamento e não por função
inexistente —, e depois ganhou uma linha: voltar ao tipo que a resposta já tinha no
documento devolve o efeito do documento. Resposta nova continua recebendo o padrão.

```
ANTES   ✖ §16.3: trocar o que vem depois da resposta e voltar não perde a defesa já escrita
            +  move: 'a1a2'   -  move: 'e3d2'
DEPOIS  ✔ (autoria-treino.test.ts: 8 de 8)
NA TELA volta a "avança": defesa e3d2, próxima pergunta 2, rodapé verde, Salvar habilitado
```

**O que o conserto não cobre:** numa resposta **nova**, ainda não salva, ir a outro tipo e
voltar recomeça do marcador — ela não tem efeito no documento a devolver.

Portões depois dos três consertos: tipos, lint, **1.038 testes**, build, conteúdo,
**42/42 mutações vermelhas** e repertório `--check`. Artefatos do ensaio apagados e
conferidos; SHA-256 da N1-KPK `4be602ca…b822`, intacto.

### O que esta parada NÃO cobre

- **Lance pelo tabuleiro.** As respostas se escrevem em UCI (`g2g3`). Jogar a resposta
  arrastando a peça é mais natural e não existe ainda — dívida de uso, não de contrato.
- **A resposta nova nasce com `a1a2`**, um lance de marcador que o rodapé recusa até ser
  trocado. Funciona, mas ensina pela recusa.
- **Várias defesas numa resposta.** O modelo aceita a lista; a janela edita as que
  existem e não oferece acrescentar outra. É o assunto da 6C.
- **Parada 6C — defensor jogável (§16.4):** jogar o treino na prévia com o runtime do
  aluno, resposta estável na tentativa, rotação entre tentativas e escolha fixa.
- **Parada 6D — propriedade (§16.5):** fonte atual/alterada/removida, aviso e diff,
  independente, refazer a partir da aula com snapshot, IDs de questão sobrevivendo, e o
  gate nunca reescrevendo autoria.
- Os itens de §28 sobre respostas, defensor e propriedade continuam desmarcados até o
  teste humano desta parada e as paradas 6C e 6D.

### O próximo ponto exato

Parada 6C — defensor jogável (§16.4): jogar o treino na prévia com o runtime do aluno,
resposta estável na tentativa, rotação entre tentativas e escolha fixa.

---

## Fatia 6 — o defensor jogável (parada 6C)

Entregue em 12/09/2026. **Não fecha §16**: a 6D (propriedade, diff e refazer a partir da
aula) continua aberta.

### O que o professor ganha

- Cada treino da lista lateral ganhou **"⏵ Jogar na prévia"**. A prévia joga o treino no
  **`TreeStage`**, o mesmo componente em que o aluno treina, com o mesmo juiz
  (`judgeMove`) e a mesma escolha de defesa (`lib/lesson/defensor.ts`). Não há segundo
  player. O cabeçalho diz a tentativa, a política do defensor e que nada é gravado.
- **A defesa é estável dentro da tentativa e gira entre tentativas**, pela conta que já
  existia (`(base + tentativa) % n`), sem `Math.random()`. A chave do lugar é o id da
  pergunta, e o contador é o da store, que "Começar de novo" soma.
- **Escolha fixa:** o seletor "Defensor" da autoria troca entre "Troca de defesa a cada
  tentativa" e "Joga sempre a primeira defesa". O botão **"Usar sempre esta"** põe a
  defesa no topo e liga a fixa.
- **O defensor que começa joga antes da pergunta**, e o que fecha joga antes da
  conclusão. As duas coisas se repetem a cada tentativa.
- **A segunda defesa** entra por **"+ Outra resposta do defensor"**, até 4 por resposta.
- **Lance legal fora da linha** recebe *"Este lance não faz parte da linha treinada. Tente
  outro."* e não encerra a tentativa. Erro conhecido e correta fora do método usam o
  feedback da própria resposta.

### As duas decisões do Doug (12/9/2026)

- **A. Escolha fixa:** `defensor.politica` passou de `"deterministica" | "autoral"` para
  `"deterministica" | "fixa"`. `autoral` só aparecia em dois testes; a N1-KPK usa
  `deterministica`. Na fixa, só a primeira defesa de cada resposta chega ao runtime, e
  uma lista de um item devolve sempre ele: a conta do defensor não mudou.
- **B. De onde vem a segunda defesa:** só de uma **variante que a análise já tem** depois
  do lance do aluno. Toda pergunta aponta para uma posição da análise; criar essa
  posição por dentro do treino mexeria na fonte dele, e isso é da 6D. Sem variante, a
  janela diz: "jogue-a no tabuleiro do capítulo, como variante". A pergunta que vem
  depois da defesa nova nasce **sem resposta**, e a conferência não deixa salvar antes
  de o professor escrevê-la.

### Como o treino chega ao runtime (`lib/editor-v2/treino-jogavel.ts`)

É tradução, como `previa.ts` faz para capítulos. Pergunta → nó; resposta aceita que
avança ou encerra → lance esperado (`reply`/`replies`); aceita que repete →
`authorAlternatives`; erro conhecido → `mistakes`, com o texto da resposta. Todo lance
legal conta como "não perde", exceto o erro classificado como **perde o resultado**; os
dois textos de reserva viram a frase da linha treinada. `termino.limite` em
meios-lances vira lances do aluno, metade arredondada para cima.

O `TreeStage` ganhou uma entrada opcional `v2` — `aberturaDoDefensor`, `defesaFinal` e
`desenhoDoNo`, este com a cor da autoria. **A aula v1 não passa nada disso, e o caminho
dela ficou o mesmo.** A conta que aplicava a resposta do defensor por dentro do
componente saiu, sem mudar o comportamento, para `aplicarUci` em `lib/lesson/tree.ts`,
usada pelas três vezes em que o defensor joga.

### As regras novas da conferência, com o teste antes e depois

`problemaDasDefesas` (`lib/editor-v2/defesas-do-treino.ts`), chamada por
`prepararEdicaoDeTreino` antes da legalidade:

```
ANTES   ✖ §16.4: a mesma defesa duas vezes na mesma resposta é recusada
            actual: true   expected: false
        ✖ §16.4: uma resposta aceita até 4 defesas, o teto do runtime do aluno
            actual: "a continuação não chega à posição da próxima pergunta"   expected: /até 4 defesas/
DEPOIS  ✔ os dois (autoria-treino.test.ts: 12 de 12)
```

### Escrito

| Arquivo | O que é |
|---|---|
| `lib/editor-v2/treino-jogavel.ts` | **novo** — o treino traduzido para o `TreeStage` |
| `lib/editor-v2/treino-jogavel.test.ts` | **novo** — 8 testes, com o "aluno simulado" |
| `lib/editor-v2/defesas-do-treino.ts` | **novo** — variantes oferecidas, acrescentar, remover, usar sempre esta, as duas regras |
| `components/editor-v2/PreviaDoTreino.tsx` | **novo** — a moldura da prévia jogável |
| `components/lesson/TreeStage.tsx` | entrada opcional `v2`; resposta do defensor por `aplicarUci` |
| `lib/lesson/tree.ts` | `aplicarUci` |
| `lib/editor-v2/autoria-treino.ts` | chama `problemaDasDefesas` |
| `components/editor-v2/DialogoEditarTreino.tsx` | seletor do defensor, segunda defesa, usar sempre esta, remover defesa |
| `components/editor-v2/EditorV2.tsx` | o botão "⏵ Jogar na prévia" e o foco devolvido |
| `lib/editor-v2/modelo.ts` | `politica: "deterministica" \| "fixa"` |

### Evidência automática

**Os sete portões verdes:** tipos, lint, **1.052 testes** (eram 1.038), build, conteúdo
(18 posições, 3 aulas, 38 consultas de tablebase do cache e 0 pela rede), **42/42
mutações vermelhas** e repertório `--check` (nada escrito).

O "aluno simulado" joga a N0 real em Node, com a segunda defesa numa variante criada por
`ADICIONAR_LANCE`:

| tentativa | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| gira | e3d3 | e3d2 | e3d3 | e3d2 | e3d3 | e3d2 |
| fixa | e3d2 | e3d2 | e3d2 | e3d2 | e3d2 | e3d2 |

Também provados em Node: errar e voltar não muda a defesa; o treino das pretas abre com
`g2g4` e fecha com `g4g1` em mate; a tradução não altera a aula; e um teste de imports
prova que `PreviaDoTreino` e `TreeStage` não têm caminho até gravação, ações do
servidor, Supabase ou `LessonPlayer`.

### O roteiro rodado na tela pelo Playwright — 12/9/2026

Em `/editor/v2/finais/N0-LADDER`, logado, em **1366×768 de CSS de verdade** (ver a
armadilha abaixo). Arrastes com o mouse do Playwright, que chegam como eventos confiáveis.

| Item | Resultado medido |
|---|---|
| 1 | "⏵ Jogar na prévia" na lista; a prévia abre com "Tentativa 1" e o aviso de final certificado |
| 2 | geometria: tabuleiro 672 px (fim em 761), painel até 765, página sem rolagem (768/768 e 1366/1366) |
| 3 | g2→g3: "Este lance não faz parte da linha treinada. Tente outro.", torre de volta a g2, ainda Tentativa 1 |
| 4 | g2→g4: o defensor jogou **e3→d2** sozinho; último lance destacado e3-d2 |
| 5 | g1g3, g3g2, g2e2, g4g1: respostas d2c1, c1b1, b1a1 e "PRONTO."; "Começar de novo" → **Tentativa 2**, peças de volta |
| 6 | fechar: foco no botão "Jogar na prévia", Desfazer apagado, "✓ salvo"; **nenhuma chamada de rede** além dos 28 arquivos estáticos desde o carregamento |
| 7 | treino das pretas criado; na prévia, aos 150 ms torre em g2 sem último lance; aos 1,45 s o defensor jogou **g2→g4** |
| 8 | pretas até o fim: aos 200 ms de b1a1, rei em a1 e torre em g4; aos 1,5 s o defensor jogou **g4→g1** e veio "PRONTO." |
| 9 | recomeçar as pretas: a Tentativa 2 refaz a abertura g2→g4 |
| 10 | variante **1… Kd3** criada arrastando o rei no tabuleiro do capítulo; "✓ salvo" |
| 11 | "+ Outra resposta do defensor" ofereceu só "Defensor joga Kd3 (e3d3)"; escolhida: defesas e3d2 e e3d3, "Pergunta 6 · 0 respostas", rodapé "a pergunta 6 precisa de ao menos uma resposta", Salvar apagado |
| 12 | Pergunta 6: `a1a2` recusado; g1g3 repetindo deixou o rodapé verde; salvo → "6 perguntas · personalizado" |
| 13 | rotação: tentativas 1, 2 e 3 → rei em **d2, d3, d2**; na tentativa 4, um erro antes e depois g2→g4 → **d3** |
| 14 | "Usar sempre esta" → e3d3 no topo, política fixa e o aviso "é a que o defensor joga sempre"; salvo; tentativas 1, 2 e 3 → **d3, d3, d3**; no disco, `politica: "fixa"` e defesas `e3d3, e3d2` |

Console da sessão inteira: 0 erros e 0 avisos.

### A armadilha de medição desta rodada

O navegador do Playwright desta máquina roda com **`devicePixelRatio` 0,667**.
`setViewportSize(1366, 768)` entrega **2049×1152 px de CSS**, e nem `Control+0` nem
`Emulation.setDeviceMetricsOverride` mudaram isso. Para medir 1366×768 de CSS, use
**`setViewportSize(911, 512)`** e confira `innerWidth`/`innerHeight` antes de acreditar
em qualquer número. As medidas de "1366×768" das rodadas anteriores provavelmente
foram tiradas a 2049×1152.

### Dois achados da rodada, abertos

- **O feedback que descreve a defesa mente numa das tentativas.** O feedback é da
  resposta do aluno, e o modelo não tem texto por defesa. No "Treino guiado", a
  resposta diz "O rei preto desce para d2"; na tentativa em que o rei foi a d3, o painel
  disse isso mesmo assim. O código faz o que o contrato manda; a decisão é do Doug:
  texto por defesa no modelo, ou um aviso na autoria quando uma resposta ganha a
  segunda defesa.
- **A lista de lances fica coberta em 1366×768 de CSS de verdade.** O bloco de edição
  (y 184→756) fica por cima da lista, que não rola por dentro; o clique no `•••` da
  posição inicial caiu no botão "??". O teclado (foco e Enter) funcionou. Não é código
  desta parada; ficou registrada como tarefa separada, com as medidas. **Consertado em
  13/9** — ver "a lista de lances deixa de ficar coberta".

### O que esta parada NÃO cobre

- **Final certificado na prévia** não consulta a tablebase para lance fora da linha: o
  cache mora no disco do servidor e a tentativa não pode consultar a rede. A prévia
  responde com a frase da linha treinada e diz isso no cabeçalho. O julgamento
  certificado continua em §17.
- **A defesa nova só vem de variante.** Resposta com mais de um lance usa o primeiro
  para achar a variante; a conferência recusa se os outros não chegarem à mesma
  pergunta.
- **Remover uma defesa** apaga junto a pergunta que ela abria só quando essa pergunta
  está vazia. Pergunta com resposta escrita fica, e pode ficar sem caminho até ela.
- **O treino das pretas termina em "PRONTO."** com o rei do aluno levando mate, porque a
  derivação da 6A diz que o ramo encerra em mate. É a receita, não o runtime; vale
  revisar o texto de conclusão desse caso.
- **Não houve teste de uso com uma pessoa.** O Playwright não mede hesitação; isso é do
  teste de §20.
- **Parada 6D — propriedade (§16.5):** fonte atual/alterada/removida, aviso e diff,
  independente, refazer a partir da aula com snapshot, IDs de questão sobrevivendo e o
  gate nunca reescrevendo autoria.
- Os itens de §28 sobre defensor e respostas continuam desmarcados até a 6D fechar a
  fatia.

**Os artefatos.** Antes do ensaio já existia `content/rascunhos/lessons/N0-LADDER.json`,
das 20:01, byte a byte igual à publicada (`943151…03c3`), sem outra sessão do Claude
rodando. O ensaio criou `.editor/v2/N0-LADDER.json`. Os dois foram apagados depois de o
Playwright sair da página, e a ausência foi conferida. SHA-256 de `.editor/v2/N1-KPK.json`
antes e depois: `4be602ca…b822`.

### O próximo ponto exato

Parada 6D — propriedade (§16.5). Antes dela, o Doug decide o que fazer com o feedback
que descreve a defesa.

---

## Continuação — a lista de lances deixa de ficar coberta (13/9/2026)

Fecha o segundo achado da 6C (§7, §11.3 e §25: "alvos não se sobrepõem").

### Reproduzido na medida certa

Playwright com `setViewportSize(911, 512)`, conferido `innerWidth` 1366 e `innerHeight`
768, na N0-LADDER, logado:

| O quê | Antes | Depois |
|---|---|---|
| Coluna da direita | y 155→752, 597 px | igual |
| Caixa da lista (título, ajuda, posição inicial e `<ol>`) | **0 px** | 269 px |
| `<ol>` dos lances | **0 px** visíveis de 304 | **169 px** visíveis de 304; rola até 133 px, a página não se move |
| Bloco de edição | y 184→**756**, 572 px, passa do fim da coluna | y 453→739, 284 px, rola por dentro (570 px de conteúdo) |
| Sobreposição lista × bloco | o bloco pintado por cima | **0 px** |
| `elementFromPoint` no centro do `•••` (x1037 y240) | botão **"??"** | o próprio **`•••`** |
| Clique do mouse no `•••` | caía no "??" | **menu aberto**, 11 ações, `aria-expanded="true"` |
| Lances inteiros visíveis / clicáveis no centro | 0 / 0 | **5 / 5** |
| Tabuleiro | — | 558 px, y 168→727 |
| Página | 768×1366, sem rolagem | igual |

Console: 0 erros e 0 avisos.

### A causa, uma só

`components/editor-v2/EditorV2.tsx:1219` (antes do conserto): o bloco de edição é um item
flex da coluna, sem teto e sem rolagem. Um item flex tem `min-height: auto` e **não
encolhe abaixo do próprio conteúdo**, então exigia os 570 px dele. A caixa da lista
(linha 1191, `flex-1 min-h-0`) fica com o que sobra, e sobrava zero. O conteúdo dela
transbordava a caixa de altura zero e era pintado **por baixo** do bloco, que vem depois no
DOM.

A continuação "a lista de lances passa a rolar por dentro" mediu 369 px de lista em
"1366×768". Foi medida sem a correção de zoom da 6C: a tela real tinha 2049×1152, onde o
bloco cabia.

### O conserto

`lg:max-h-[50%] lg:overflow-y-auto` no bloco de edição: ele nunca passa da metade da
coluna e rola por dentro quando tem mais que isso. Com pouco conteúdo, fica do tamanho do
conteúdo e a lista ganha o resto. Só vale a partir de `lg`; abaixo disso as colunas
empilham e nada mudou (conferido em 375×811: `<ol>` de 304 px inteira, bloco de 548 px
inteiro, página rolando).

### Por que não há teste automático

Não há lógica: é uma classe de CSS. Os testes do projeto rodam em Node, sem motor de
layout, e o repositório não tem suíte de navegador. A prova é a geometria da tabela, antes
e depois, com `elementFromPoint` e o clique do mouse.

### O que esta rodada NÃO cobre

- **5 lances inteiros por vez** em 1366×768. É utilizável; se incomodar, o ajuste é o teto
  de 50%.
- **Rolagem para o lado em 375 px** (600 px de conteúdo). Não é deste conserto, que só age
  a partir de `lg`; não foi investigada.
- Não medido com um capítulo de muitas narrações. O teto é proporcional, então o bloco
  rola em vez de crescer, mas não foi olhado na tela.

**Os artefatos e o navegador.** O navegador do Playwright estava preso pela sessão da 6C,
aberta desde 12/9 às 20:14; com autorização do Doug, só aquele Chrome foi encerrado. O
ensaio criou `content/rascunhos/lessons/N0-LADDER.json`; `.editor/v2/N0-LADDER.json` não
chegou a nascer, porque nada foi editado. O rascunho foi apagado depois de o Playwright sair
da página, e a ausência dos dois foi conferida. SHA-256 de `.editor/v2/N1-KPK.json` antes e
depois: `4be602ca…b822`.

---

## Continuação — o texto de cada defesa, e a régua de voz no treino (13/9/2026)

Fecha o primeiro achado da 6C: *o feedback que descreve a defesa mente numa das
tentativas*. **Decisão do Doug, caminho (a):** cada defesa ganha um texto próprio e
opcional, que o aluno lê quando o defensor joga aquele lance — também a de abertura e a
de fecho. E, pedida junto: **todo texto do treino que chega ao aluno passa pela régua de
voz, que avisa e não impede salvar.** Não antecipa nada da 6D.

### O que o professor ganha

- Embaixo de cada "Resposta do defensor", a caixa **"O que o aluno lê quando o defensor
  joga e3d2 (opcional)"**. Embaixo do "Último lance do defensor", a mesma caixa para o
  fecho. No bloco "Defensor", quando o treino começa na vez dele, a caixa da abertura
  (**antes a janela nem mostrava a defesa inicial**).
- Na prévia, o painel mostra o **feedback da resposta seguido do texto da defesa que saiu
  naquela tentativa**, numa fala só. Sem texto, fica só o feedback, como antes.
- Na lateral da janela, **"Régua de voz: N avisos"**, com o lugar em nomes (Pergunta 1 ·
  resposta 1 · defesa e3d3) e o motivo; o rodapé soma "· N avisos da régua de voz". O
  Salvar continua habilitado.

### As decisões, e o porquê

- **Feedback + texto, e não o texto no lugar do feedback** (Doug). O defensor responde em
  620 ms; trocar o texto apagaria o que foi dito sobre o lance do aluno antes de ele ler.
- **A régua confere a soma**, porque é a soma que o aluno lê: um feedback de 150
  caracteres e um texto de 60 cabem sozinhos e estouram juntos. A tradução e a régua usam
  a mesma função (`juntarFala`), para a conta e a tela não divergirem.
- **Avisa, não bloqueia** (Doug), como o editor v1 já fazia no salvamento
  (`app/editor/acoes.ts:66`). Decidir se a publicação v2 bloqueia é da fatia 7.
- **Texto do fecho sem o lance do fecho é recusado** pela conferência: o texto não teria
  quando aparecer, e apagá-lo em silêncio perderia autoria.
- **A chave do texto inclui o lance do aluno** (`pergunta:lanceDoAluno:defesa`): duas
  respostas da mesma pergunta podem levar à mesma defesa com feedbacks diferentes.
- **O formato v1 não ganhou campo.** O texto viaja por um mapa ao lado da árvore
  (`falasDoDefensor`) e chega ao `TreeStage` pela entrada opcional `v2`; a aula v1 não passa
  essa entrada, e cada linha nova está atrás de `v2?.`. Um teste prova que `replySchema`
  continua recusando `texto`.
- **As contas da régua mudaram de arquivo, sem mudar uma linha.** Moravam em
  `lib/lesson/voz.ts`, que importa `node:fs` e por isso não roda na janela, que é do
  navegador. Foram para `lib/lesson/regua.ts`; `voz.ts` as reexporta, e a página do v2 lê
  os números do documento no servidor e os entrega à janela.
- **Dois textos padrão da própria janela usavam "método"**, palavra proibida: o feedback
  com que nasce a "correta fora do método" e a mensagem padrão do catálogo vazio. Viraram
  "…mas não é o caminho ensinado."

### O que a régua colhe do treino (`lib/editor-v2/voz-do-treino.ts`)

Título (rótulo), objetivo, introdução, explicação ao concluir, texto da abertura, dica de
cada pergunta, e por resposta: feedback + texto de cada defesa que tem texto, feedback +
texto do fecho, e o feedback sozinho onde ele aparece sozinho. **Fica fora** o texto do
catálogo de erros e as mensagens padrão, que o treino v2 não mostra (o erro conhecido usa
o feedback da resposta; o lance fora da linha usa a frase fixa da linha treinada).

### Os testes, antes e depois

15 testes novos em `texto-da-defesa.test.ts` e `voz-do-treino.test.ts`. Antes, com o
mínimo para os arquivos carregarem e nenhum comportamento novo:

```
ANTES   ✖ o documento aceita um texto na defesa, na defesa inicial e na defesa final
            actual: false   expected: true
        ✖ cada tentativa lê o texto da defesa que o defensor jogou
            actual: 'A torre fecha mais uma fileira.'
            expected: 'A torre fecha mais uma fileira. O rei preto vai para d3.'
        ✖ com a escolha fixa, o painel lê sempre o texto da primeira defesa
        ✖ o treino das pretas lê o texto da abertura e o do fecho
            actual: undefined   expected: 'As brancas levam a torre para g4.'
        ✖ conferência: o texto da defesa é aparado, o vazio é omitido, e a tela não é alterada
        ✖ conferência: texto do último lance do defensor sem o lance é recusado
            actual: true   expected: false
        ✖ salvar o mesmo texto não personaliza; escrever um texto novo personaliza
        ✖ régua: a soma feedback + texto paga o teto de uma fala     actual: 0   expected: 1
        ✖ régua: palavra de bastidor na abertura e no fecho é apontada
        ✖ régua: dica, objetivo e explicação ao concluir entram na conta
        ✖ régua: os treinos que "Criar treino daqui" faz na N0 passam sem aviso
        ✖ régua: os textos com que a janela preenche uma resposta nova passam na régua
            usa "método": 'Este lance funciona, mas segue outro método.'
        ✔ (3 guardas: defesa sem texto fica só com o feedback; o texto anda com a defesa
           em "usar sempre esta", remover e trocar o tipo e voltar; replySchema v1 sem texto)
        ℹ tests 15  pass 3  fail 12
DEPOIS  ℹ tests 15  pass 15  fail 0
          gira — tentativa 1: e3d3 → "A torre fecha mais uma fileira. O rei preto vai para d3."
          gira — tentativa 2: e3d2 → "A torre fecha mais uma fileira. O rei preto desce para d2."
          (e assim até a 6, alternando)
```

### Os sete portões

Tipos, lint, **1.067 testes** (eram 1.052), build, conteúdo (18 posições, 3 aulas, 38
consultas de tablebase do cache e 0 pela rede), **42/42 mutações vermelhas** e repertório
`--check` (nada escrito).

### O ensaio pelo Playwright — 13/9/2026

Em `/editor/v2/finais/N0-LADDER`, logado, `setViewportSize(911, 512)` conferido em
`innerWidth` 1366 e `innerHeight` 768. Clique, teclado e arraste do mouse do Playwright.

| Item | Resultado medido |
|---|---|
| 1 | variante **1… Kd3** criada arrastando o rei de e3 a d3 no tabuleiro do capítulo; "✓ salvo" |
| 2 | autoria do "Treino guiado": a caixa nova embaixo da defesa; **0 avisos** da régua |
| 3 | feedback reescrito pelo teclado sem "O rei preto desce para d2."; na defesa e3d2, "O rei preto desce para d2." |
| 4 | "+ Outra resposta do defensor" ofereceu só "Defensor joga Kd3 (e3d3)" |
| 5 | texto de e3d3 digitado com "Nesta tentativa…": **"Régua de voz: 1 aviso — Pergunta 1 · resposta 1 · defesa e3d3: usa "tentativa""**, rodapé "…· 1 aviso da régua de voz" |
| 6 | corrigido para "O rei preto vai para d3.": **0 avisos** |
| 7 | Pergunta 6: resposta g1g3 que repete; rodapé verde; salvo → "6 perguntas · personalizado" |
| 8 | no disco: defesas `e3d2` e `e3d3`, cada uma com o seu `texto`; o feedback sem a frase |
| 9 | prévia, g2→g4 arrastado: **tentativa 1 → rei em d2**, painel "…Para cima não dá mais. O rei preto desce para d2." |
| 10 | **tentativa 2 → rei em d3**, painel "…Para cima não dá mais. O rei preto vai para d3." |
| 11 | **tentativa 3 → rei em d2**, texto do d2 de novo |
| 12 | fechar a prévia devolveu o foco ao botão "Jogar na prévia" do treino |
| 13 | "Criar treino daqui" pelas **pretas**; na autoria, abertura "As brancas levam a torre para g4." e fecho "A torre desce para g1 e dá mate."; no disco, os dois textos |
| 14 | prévia das pretas: aos 150 ms o painel diz "Faça o seu lance…"; **aos 1,65 s, depois de g2→g4, "As brancas levam a torre para g4."** |
| 15 | pretas até b1→a1: conclusão **"PRONTO. O rei preto vai a a1, o canto. Ele não tem mais nenhuma fileira para descer. A torre desce para g1 e dá mate."** |

Console da sessão inteira: 0 erros e 0 avisos. Um tropeço de roteiro, não de código: no
item 15 a primeira vez abriu a prévia do "Treino guiado" (o último botão da lista); refeito
escolhendo o treino pelo id.

### O que esta rodada NÃO cobre

- **A abertura apaga a dica da primeira pergunta.** O painel mostra uma mensagem por vez, e
  a dica só aparece enquanto não há mensagem. Quando o defensor abre com texto, a dica da
  Pergunta 1 some até o próximo lance — o mesmo que já acontece depois de toda resposta do
  defensor. Não medido com uma dica escrita.
- **A derivação não reparte o texto.** Os treinos que "Criar treino daqui" faz continuam
  com a narração da defesa dentro do feedback (no das pretas, "O rei preto desce para d2").
  Com uma defesa só isso é verdade; quem acrescenta a segunda defesa precisa mover a frase,
  como no item 3. Não há aviso automático disso.
- **A régua avisa e não bloqueia**, e só dentro da janela. A lista de problemas da aula não
  a mostra; o que a publicação v2 faz com ela é da fatia 7.
- **O texto não entra na impressão digital das dependências** — é autoria, não fonte. A
  6D decide o que "refazer a partir da aula" faz com ele.
- Nenhum teste de uso com uma pessoa; o Playwright não mede hesitação.

**Os artefatos e o navegador.** O ensaio criou `content/rascunhos/lessons/N0-LADDER.json` e
`.editor/v2/N0-LADDER.json`; os dois foram apagados depois de o Playwright ir para
`about:blank`, e a ausência foi conferida. SHA-256 de `.editor/v2/N1-KPK.json` antes e
depois: `4be602ca…b822`.

### O próximo ponto exato

Parada 6D — propriedade (§16.5).

---

## Fatia 6 — propriedade do treino (parada 6D, 13/9/2026)

Fecha §16.5 sem refazer as paradas 6A, 6B e 6C. Fecha também os três itens de §28 que
ficaram deliberadamente esperando esta parada: respostas completas, defensor e treino
dos dois lados, e propriedade com refazer e diff.

### O contrato que ficou no documento

- Treino novo nasce **derivado** de análise e receita versionada. A impressão digital
  inclui a versão do derivador, o início da análise, os nós e lances usados, comentários,
  narrações relevantes, lado, objetivo original e ponto de início. Título e texto próprio
  de defesa ficam fora: são autoria do treino, não entrada da receita.
- O primeiro ajuste em resposta, posição, objetivo, dica, desenho, feedback ou catálogo
  materializa FEN, histórico UCI e referência histórica da posição inicial e de cada
  pergunta. O treino vira **personalizado**. Trocar só o título conserva a derivação.
- Personalizado e **independente** jogam pela cópia. Independente encerra a dependência
  operacional, mas conserva análise, capítulo, ponto, receita e hash como origem
  histórica. Por isso uma exclusão destrutiva não o lista como dependente.
- Propriedade e fonte são eixos separados. Qualquer comando que muda a aula recalcula a
  fonte relevante como **atual**, **alterada** ou **removida**, sem reescrever a cópia.
- **Refazer a partir da aula** compara posição, objetivo, perguntas, respostas e
  feedbacks, dicas e desenhos, textos das defesas, explicação e término. O botão aplica
  exatamente o estado comparado, recusa se treino ou aula mudaram enquanto a janela
  estava aberta, grava antes um snapshot integral no servidor e entra como uma ação no
  Desfazer.
- Decisão desta rodada para o ponto que ficou aberto na 6C: refazer **substitui também o
  texto próprio de cada defesa**. Ele aparece no diff antes da confirmação e no snapshot
  anterior; não entra na impressão digital da fonte.
- Se a fonte sumiu, refazer fica desabilitado e explica o motivo. Havendo outro capítulo,
  a lista começa vazia: o professor precisa escolhê-lo; não há escolha automática. IDs de
  perguntas são conservados pelo par `analiseId/nodeId` quando esse ponto de origem
  continua o mesmo.

Compatibilidade: rascunhos anteriores à 6D, que podiam estar personalizados sem a nova
cópia, continuam legíveis e dependentes da aula. A próxima edição material que ainda
consiga resolver a fonte cria a cópia completa.

### Código e provas automáticas

`lib/editor-v2/propriedade-treino.ts` concentra impressão digital, materialização,
estado da fonte, independência, diff, preparo e aplicação segura do refazer.
`DialogoPropriedadeTreino.tsx` apresenta o contrato em português. O executor comum de
comandos atualiza fontes depois de qualquer edição, e o runtime e a autoria resolvem a
posição pela cópia quando ela é a autoridade. A exclusão com impacto agora consegue
materializar também um treino. `guardarSnapshotAntesDeRefazerV2` grava o documento
inteiro, atomicamente, e conserva os 20 snapshots mais recentes por aula.

Foram acrescentados **15 testes de §16.5**. Eles cobrem os cinco gatilhos pedidos,
título sem personalização, alteração relevante/irrelevante/remoção da fonte, autoria
intocada pela máquina, jogo e edição pela cópia, independência, diff dos textos das
defesas, IDs estáveis, fonte nova, comparação vencida por mudança no treino ou na aula,
snapshot integral com retenção e renovação seletiva da posição copiada. A suíte completa
ficou em **1.082/1.082**.

### O ensaio pelo Playwright — 13/9/2026

Em `/editor/v2/finais/N0-LADDER`, logado. A janela física foi configurada em
**911×512**; a emulação do zoom de 0,667 foi conferida em `innerWidth = 1366` e
`innerHeight = 768`. Cliques, teclado e o arrasto do tabuleiro foram do Playwright.

| Item | Resultado medido |
|---|---|
| 1 | fonte inicial **atual**; a comparação do treino derivado mostrou 2 grupos diferentes do conteúdo v1 adaptado |
| 2 | feedback próprio salvo → cartão **personalizado · fonte atual**; no disco, cópia com FEN/histórico para as 5 perguntas |
| 3 | comparação mostrou o feedback próprio antes e a geração da aula depois; Refazer habilitado |
| 4 | Refazer → **derivado · atual**; snapshot anterior integral criado; os 5 IDs continuaram `n1…n5` |
| 5 | um Desfazer restaurou **personalizado** e o feedback; comentário relevante na aula mudou só a fonte para **alterada** |
| 6 | janela mostrou aviso **Fonte: alterada**, 2 linhas de diff e a garantia de que a cópia não seria sobrescrita |
| 7 | Tornar independente → **independente · alterada**; no disco ficaram origem histórica e 5 posições copiadas |
| 8 | segundo roteiro: capítulo substituto duplicado; feedback e texto próprio da defesa salvos; excluir a análise original listou só a introdução como dependente, não o treino personalizado |
| 9 | depois da exclusão: **personalizado · fonte removida**; na prévia, arrasto real g2→g4 executou a resposta e mostrou “Feedback próprio…” + “Texto próprio da defesa…” |
| 10 | propriedade removida abriu sem fonte escolhida e com Refazer desabilitado; após escolher “Fonte substituta 6D”, habilitou e mostrou 5 grupos de diff, inclusive **Textos próprios das defesas** |
| 11 | Refazer pela fonte nova → **derivado · atual**; snapshot guardou personalizado/removida, feedback e texto da defesa |
| 12 | um Desfazer restaurou **personalizado · removida**; Refazer voltou a **derivado · atual** |

Console da sessão inteira: **0 erros e 0 avisos**. O ensaio encontrou antes do fechamento
que a fonte removida vinha pré-selecionada; corrigido, repetido e medido no item 10.

### Os sete portões

`typecheck`, lint, **1.082 testes**, build, conteúdo (18 posições, 3 aulas, 38 consultas
de tablebase do cache e 0 pela rede), **42/42 mutações vermelhas** e
`npm run repertorio:compilar -- --check` sem escrita.

### O que esta rodada NÃO cobre

- A tela especial de aula sem nenhum capítulo mostra apenas as portas para adicionar ou
  importar capítulo. Um treino personalizado/independente continua no arquivo e no fluxo,
  mas volta a aparecer na tela só depois que existir um capítulo. É uma dívida de
  usabilidade da porta de aula vazia; não houve perda de dados no ensaio.
- Snapshots desta ação já são duráveis e têm retenção, mas a interface geral para listar
  e restaurar snapshots pertence à publicação/recuperação de §20.
- Certificação e julgamento de linha autoral continuam nos itens próprios de §17/§20;
  fechar propriedade não os marcou no checklist.
- Nenhum teste de uso com uma pessoa. O Playwright prova o comportamento e o gesto do
  mouse, não mede compreensão ou hesitação.

**Os artefatos.** O ensaio usou apenas N0-LADDER. O perfil isolado do Playwright e os
snapshots do ensaio foram apagados. `content/rascunhos/lessons/N0-LADDER.json` e
`.editor/v2/N0-LADDER.json` foram apagados e tiveram a ausência conferida. SHA-256 de
`.editor/v2/N1-KPK.json` antes e depois: `4be602ca…b822`.

### O próximo ponto exato

Fatia 7, **publicação v2 (§20)**: gate autoral único, comparação do que será publicado,
publicação atômica com snapshot/rollback, progresso por revisão e migração explícita.

---

## Fatia 7 — publicação v2 (§20), em andamento desde 13/9/2026

Plano executado de uma vez, por decisão do Doug: paradas 7A → 7F, um commit por parada,
a bateria do Playwright só no fim (7F). Esta seção cresce a cada parada.

### Parada 7A — o contrato puro

**Três defeitos achados no mapeamento, antes de codar:**

1. **O adaptador v1 perdia desenho, pausa e resumo.** `adaptar-v1.ts` criava a narração sem
   os `arrows`/`highlights` do passo do roteiro, sem o `espera` e sem o `technique.summary`.
   Os testes contavam narrações (13) e passavam; o validador dizia 0 problemas. Converter a
   N0-LADDER apagaria todos os desenhos do roteiro dela.
2. **O salvamento recusava qualquer erro**, inclusive teto e posição sem proveniência —
   contra `limites.ts` ("erro impede publicar, não salvar") e contra o plano §7.
3. **O desenho por nó não representa duas falas da mesma posição que apontam coisas
   diferentes.** A N0-LADDER tem duas na posição inicial e três no mate.

E dois que só a comparação lance a lance mostrou:

4. **O treino v2 jogava a aula de empate como vitória**: `treino-jogavel.ts` fixava
   `goal: "win"`. Na N0-MATING-MATERIAL o aluno leria "joga a vitória fora".
5. **O final certificado perdia a tablebase no aluno**: todo lance fora da linha ouvia "não
   faz parte da linha treinada", onde o v1 diz "ainda ganha, mas não é o caminho" ou "joga a
   vitória fora". Na N0-LADDER, 115 lances legais recebiam outra frase.

**O contrato que ficou:**

- `narracao.desenhos` (ausente = o desenho do nó; `{}` = esta fala não desenha) e
  `narracao.esperaMs`; `capitulo.resumo`. O adaptador põe o desenho da **primeira** fala no
  nó — é o que o editor mostra e edita — e só as falas seguintes que desenham diferente
  guardam o seu. A tela ainda não edita o desenho por fala: preservado e tocado.
- `certificacao.resultado` (`win`/`draw`) e `certificacao.evidencias` (por pergunta: FEN e
  `winningMoves`). O adaptador as traz do v1 como **herdada-v1**, nunca confirmada. O treino
  só é julgado como final certificado quando **toda** pergunta tem evidência da própria FEN.
- O rascunho guarda pendência editorial (tetos, lance ilegal, proveniência, certificação,
  fonte de treino ausente) e recusa só o que impede montar o documento. A lista é do que
  **passa**: código novo nasce recusado até alguém decidir que é pendência.
- `equivalencia-v1.ts`: compara o que o **aluno** recebe — introdução quadro a quadro,
  capítulo pela prévia (fala, lance, desenho, espera, pausa), treino pelo juiz **para cada
  lance legal** de cada pergunta, respostas do defensor, prática e ordem das etapas.
- `avaliacao.ts`: `assessmentRevision` = `ar_` + SHA-256 do JSON canônico. Prática: FEN,
  lado, objetivo, motor, versão do juiz. Treino: perfil, lado, FEN inicial, defesa inicial,
  política, término, resultado, e as perguntas pela FEN com respostas, julgamento, efeito,
  defesas na ordem (a rotação depende dela) e presença de dica. Fora: título, feedback,
  texto de defesa, desenho, narração, texto da dica, ordem das respostas e do fluxo.
- `pacote.ts`: aula + posições embutidas + revisões + manifesto (hash de cada parte e
  versão dos juízes); `publicationId` = `pub-` + 16 hex do hash canônico do manifesto, sem
  data. `problemasDoPacoteV2` recalcula tudo e não confia no nome.
- `hash.ts` ganhou `jsonCanonico`/`hashCanonico`: a identidade que vai ao banco não pode
  depender da ordem das chaves, e `hashDoConteudo` depende (e diz isso por escrito).

**O número da parada — divergências pedagógicas, em memória:**

| Aula | Antes | Depois |
|---|---|---|
| N0-LADDER | **15** (resumo, 4 desenhos, 5 esperas, 5 perguntas com frase trocada em 19–30 lances cada) | **0** |
| N0-MATING-MATERIAL | **10** (resumo, 5 desenhos, 3 esperas, objetivo empate → vitória) | **0** |
| N1-KPK | **16** (resumo, 7 desenhos, 3 esperas, 5 perguntas com frase trocada) | **0** |

**Testes, antes e depois:**

```
ANTES   equivalencia-v1 + rascunhos: tests 9, pass 5, fail 4
          ✖ N0-LADDER 15 · N0-MATING-MATERIAL 10 · N1-KPK 16 divergências
          ✖ rascunho com teto estourado… grava e reabre
            [POSICAO_SEM_PROVENIENCIA] …; [LIMITE_BYTES] a aula ocupa 2049 KB e o limite é 2048 KB
        avaliacao + pacote (módulos vazios): tests 25, pass 0, fail 25
DEPOIS  tests 9, pass 9 · tests 25, pass 25
```

Os 25: forma e estabilidade da revisão; oito coisas que **não** a mudam (título, feedback,
texto de defesa, desenho, dica escrita, narração, ordem do fluxo e das respostas); treze
campos do treino e cinco da prática que **a mudam**; id estável com as chaves embaralhadas
em todos os níveis; só as posições usadas; um ponto final a mais muda o id; e um byte
adulterado detectado na aula, numa posição embutida, no id e numa revisão.

**Os sete portões:** tipos, lint, **1.114 testes** (eram 1.082), build, conteúdo (18
posições, 3 aulas, 38 consultas do cache e 0 pela rede), **42/42 mutações** e repertório
`--check` sem escrita.

**O que a 7A não cobre:** a tela não edita desenho nem espera por narração; nenhuma regra
de publicação existe ainda (7B); o rascunho real `.editor/v2/N1-KPK.json` não foi aberto.

### Parada 7B — Conferir

- `lib/editor-v2/conferencia.ts`: `problemasParaPublicarV2` usa a régua do rascunho e sobe a
  altura. **Promove a erro** quatro avisos que o próprio código dizia "quando a publicação v2
  existir, esta passa a impedir": `PROVENIENCIA_CADUCA`, `PROVENIENCIA_DIVERGE`,
  `FEN_IMPORTADA_SEM_REVISAO`, `REVISAO_PENDENTE`. **Acrescenta**: `CERTIFICACAO_PENDENTE`
  (herdada, pendente ou indisponível), `CERTIFICACAO_CADUCA` (alvo mudou, pergunta sem
  evidência, ou evidência que o cache desmente), `CERTIFICACAO_REFUTADA` (resposta aceita que a
  tablebase diz perder), `PRATICA_AUSENTE` e `PRATICAS_MULTIPLAS` (esta fatia aceita uma
  prática, obrigatória) e `AVALIACAO_REVISAO_DIVERGE`. A régua de voz (`VOZ_CARACTERES`,
  `VOZ_PALAVRAS`, `VOZ_PROIBIDA`) colhe título, introdução, resumo, narrações, treino,
  mensagens de reserva do final certificado e prática — **sempre aviso**.
- `lib/editor-v2/gate.ts`: a trava é a do v1 (uma conferência por vez no repositório). A
  **passada A** renova só `treino.certificacao` (resultado, evidência por pergunta, alvo) e
  grava por `gravarDocumentoV2` com `baseHash`. A **passada B** relê o disco sem rede e prova
  que o documento é o que A gravou e que, sem a certificação, é o que A leu. O verde vai para
  `.editor/gate/v2/<AULA>.json` com o hash do **manifesto** (aula, cada posição, alvo de cada
  certificação, entrada do cache de cada posição certificada, versões dos juízes e da
  conferência). `podePublicarV2` recalcula tudo e compara.
- `lib/editor-v2/publicacoes.ts`: o lugar e a leitura de `content/aulas-v2/<AULA>/`
  (`ativa.json` + `publicacoes/<id>.json`).
- `scripts/validate-content.ts` ganhou `checkAulasV2()`: todo pacote guardado conferido por
  inteiro (`PACOTE_ADULTERADO`), ponteiro (`PONTEIRO_V2_INVALIDO`, `PONTEIRO_SEM_PACOTE`) e as
  regras de publicação sobre o ativo, só com o cache. O v2 publicado passa a ir para o CI e
  para o teste de mutações.
- `scripts/fixture-aula-v2.ts` gera `content/fixtures/aulas-v2/N0-FIXTURE-V2` (a N0-LADDER com
  outro id, certificação renovada pelo cache, data fixa; `--check` confere que é reprodutível).
  `scripts/mutation-check.ts` instala a fixture e ganhou **12 mutações** com um ajudante que
  ressela o pacote (revisões, manifesto, id, ponteiro) — sem isso toda mutação ficaria
  vermelha só por "pacote adulterado".
- Tela: action `conferirAulaV2Acao`; botão **Conferir** no cabeçalho, habilitado só com a aula
  salva; o resultado entra no `PainelDeProblemas` com contagens, "pode publicar" e "Ir para o
  problema", e vira "a aula mudou depois disso — confira de novo" no primeiro lápis.

**Dois defeitos achados rodando, e o que eles ensinam:**

1. **O pacote acusaria a própria proveniência como caduca.** A primeira versão guardava as
   posições com as chaves em ordem alfabética, e `hashDaPosicao` depende da ordem. Conserto:
   aula e posições na ordem do schema; a identidade continua canônica. A primeira guarda
   passava **mesmo com o defeito**, porque o leitor normaliza a ordem; ela foi reescrita para
   conferir também as posições como gravadas, e aí sim: **antes ✖, depois ✔**.
2. **O estrago da `CERTIFICACAO_REFUTADA` não existia.** Nas perguntas 1 a 4 da N0-LADDER
   **todo lance legal ainda ganha** (20/20, 23/23, 23/23, 23/23); só a 5 tem um que perde
   (`g4b4`, que afoga). O teste unitário procurava na pergunta 1, não achava, e punha
   `undefined` — que a regra "pegava". A mutação fez o mesmo e **passou batido** (vermelha por
   `PACOTE_ADULTERADO`, não pela regra): **53 de 54** na primeira rodada. Os dois estragos
   agora procuram a pergunta que tem lance perdedor e exigem um lance de verdade. Foi o teste
   de mutações pegando um teste falso, que é para isso que ele existe.

**Testes, antes e depois** (antes = os mesmos testes contra a régua do rascunho sem regras
novas e um gate que não confere):

```
ANTES   conferencia + gate: tests 19, pass 1, fail 18
          (o verde é a guarda "no rascunho as promovidas continuam aviso")
DEPOIS  tests 19, pass 19
```

Os 19: a N0-LADDER conferida pode publicar; toda regra da lista tem um estrago; cada uma das
dez regras **ligada acusa e desligada deixa passar**; promovidas continuam aviso no
rascunho; voz avisa e não impede; erros antes dos avisos; conferir renova a herdada, fica
verde, 0 consultas pela rede e acende o Publicar; **treino personalizado sai com o documento
byte a byte igual fora da certificação**; mudar um campo da posição em `content/positions/`
apaga o Publicar, desfazer a mudança o reacende, editar o título o apaga; conferência
vermelha não acende.

**Número da parada — mutações: 42/42 → 54/54 vermelhas**, com os dois controles verdes (a
segunda rodada, com o estrago corrigido).

### Parada 7C — Publicar atômico

- `lib/editor-v2/publicar.ts`: transação em `.editor/v2/publicacao/<AULA>/` com as fases
  **candidato → validado → instalado → ativado**, cada uma registrada **depois** de feita. O
  candidato é validado **relido do disco**. A instalação e a troca do ponteiro usam `rename`
  com até 5 tentativas curtas contra `EPERM`/`EBUSY` (antivírus no Windows).
  `recuperarTransacaoV2` roda ao abrir a aula, antes de conferir e antes de publicar: até
  "instalado" apaga o candidato e o pacote que **esta** transação instalou e ninguém ativou;
  em "ativado" só limpa. Mesmo conteúdo cai no mesmo arquivo; bytes diferentes sob o mesmo id
  são recusados. Snapshot `antes-de-publicar` do documento, com a retenção de 20.
- `reativarPublicacaoV2` (rollback: só troca o ponteiro) e `desativarV2` (o aluno volta ao v1;
  nenhuma publicação é apagada). O `podePublicar` do v1 recusa aula com ponteiro v2.
- `lib/editor-v2/impacto-publicacao.ts`: avaliação por avaliação (nova, mudou, igual,
  removida), nível pela trilha, prática antes e depois, e as frases de professor. A action
  soma a contagem de alunos com progresso na aula (`finais_progresso`), e diz que faltou quando
  o banco não responde.
- Tela: `prepararPublicacaoV2Acao` → janela **Publicar** com o impacto; o hash do impacto
  volta no clique e o servidor recusa se ele mudou. O botão **Publicar** só aparece com uma
  conferência verde para o documento que está na tela. **Mais opções** → publicações
  guardadas, reativar com confirmação na própria linha, desativar o v2.

**Testes, antes e depois** (antes = recuperação desligada e sem a trava do v1):

```
ANTES   publicar.test.ts: tests 10, pass 3, fail 7
          ✖ instala sem resto de transação · ✖ interrompida em candidato/validado/instalado/ativado
          ✖ bytes diferentes sob o mesmo id · ✖ reativar/desativar e v1 recusado
DEPOIS  tests 10, pass 10
```

Para cada fase: uma publicação ativa antes, a aula editada e conferida, a segunda publicação
**interrompida depois daquela fase**, recuperação, e então: até "instalado" o ponteiro continua
na primeira e só ela está em disco (nenhum órfão); em "ativado" o ponteiro está na segunda
com `anterior` na primeira; todo pacote apontado passa em `problemasDoPacoteV2`; e a
publicação seguinte corre normalmente.

**Os sete portões da 7B e da 7C** (um commit só para as duas: a tela e as actions das duas
moram nos mesmos arquivos): tipos, lint, **1.144 testes**, build, conteúdo (18 posições, 3
aulas, 38 do cache e 0 pela rede), **54/54 mutações** e repertório `--check` sem escrita.

**O que a 7B e a 7C não cobrem:** exceção do professor a `CERTIFICACAO_REFUTADA` (o v1 tem;
o v2 ainda não lê `excecoes` nessa regra); o impacto não conta alunos por revisão — a tabela
por revisão nasce na 7E; a tela de publicações não mostra data nem diff entre duas
publicações; o lock é de repositório (uma conferência ou publicação por vez, v1 ou v2).

### Parada 7D — o aluno segue o fluxo

- **Um player só** (decisão do Doug). `LessonPlayer` aceita `bundle` (v1, caminho de sempre)
  ou `aulaV2`; o ramo v2 usa o mesmo cabeçalho, a mesma trilha (`TrilhaDaAula`, extraída sem
  mudar o v1) e os mesmos quatro componentes de etapa, na ordem do `fluxo`.
- `lib/editor-v2/fluxo-do-aluno.ts`: introdução → `IntroStage` com a FEN de cada quadro
  resolvida; capítulo → `ObjectiveStage` pela tradução da prévia (fala, lance, pausa extra,
  pausa manual, desenho por fala e o retorno das comparações); treino → `TreeStage` por
  `treinoJogavel`; prática → `PracticeStage`. Ao navegador vão só as etapas — **comentário
  privado da análise não atravessa** (teste).
- `ObjectiveStage` ganhou `autoria` (desenho com cor) e `relogio` opcionais; `null` no relógio
  é a pausa manual, e aparece **Continuar** para o aluno andar.
- `lib/editor-v2/ganchos-do-treino.ts`: o montador das entradas `v2` do `TreeStage` saiu de
  `PreviaDoTreino.tsx` para servir à prévia e ao aluno. **A árvore da rotação do defensor é
  `guided` nas duas e no servidor**, a mesma da prévia aprovada na 6C; na aula do aluno a
  `treeKey` é o id da etapa, e a rotação não depende dela.
- Store: `StageKey`/`TreeKey`/`PracticeKey` aceitam texto (os literais v1 continuam), selo por
  chave de prática, `tentativaId` (`crypto.randomUUID`) em cada tentativa nova, e `treeHelp`
  registra a dica vista uma vez por pergunta. O `TreeStage` chama `treeHelp` quando a dica está
  na tela.
- `lib/finais/conteudo-v2.ts` + `conteudo.ts`: `lerPacoteDoAluno` devolve v1 ou v2 — **a v2
  ativa vence a v1 do mesmo id**; `idsDeAula`, `indiceDeAulas`, `aulasPublicadas` e
  `aulasComPratica` incluem as v2 ativas sem duplicar. Pacote ativo adulterado **lança** em vez
  de cair calado para a v1.
- Rota `/finais/[aula]` e `AulaNoNavegador` recebem a união; `generateStaticParams` sem
  duplicar. Guias lidos antes: Next 16.3, `params` é Promise, `dynamicParams = false`,
  `./content/**` já rastreia `content/aulas-v2`.

```
ANTES   fluxo-do-aluno + store-v2 (módulo ausente, store sem os campos): tests 5, pass 0, fail 5
DEPOIS  fluxo-do-aluno (4) + store-v2 (4) + store v1 (18): tests 26, pass 26
```

**Número da parada:** `next build` com **3 rotas estáticas** em `/finais/[aula]`, sem
duplicata; o `.nft.json` da rota leva `content/**` (6 arquivos de aula, 36 de posição, 76 de
cache). `content/aulas-v2` ainda **0** arquivos, porque nada foi publicado — remedido na 7F.

### Parada 7E — progresso por revisão

- `supabase/migrations/0010_aulas_v2.sql` (aditiva): em `tentativas_aula`, `tentativa_id`
  (índice único), `publication_id`, `entidade_id`, `assessment_revision`, `tentativa_numero`,
  `politica_defensor` e `ajuda`, com um `check` de coerência (as identidades v2 andam juntas;
  treino só em linha v2); etapa aceita `treino`. Tabela `avaliacoes_progresso` (a escada por
  aluno, aula, avaliação e revisão, com `origem` jogada|migrada-v1; RLS de leitura do próprio
  ou professor). Tabela `tentativas_v2_sem_snapshot` (só professor lê). `progresso_aula`
  recriada sem contar treino.
- **Aplicada com `npm run db:migrar` em 13/9/2026, 17:37 UTC**, com o Doug avisado na hora.
  `0010_aulas_v2.sql` está em `migrations_aplicadas`; antes das provas o banco tinha 16 linhas
  em `tentativas_aula`, 7 em `finais_progresso` e 0 nas duas tabelas novas.
- `lib/finais/rejulgar.ts`: `rejulgarPartidaDe({fen, goal, lado}, lances)` extraída sem mudar a
  conta; os wrappers v1 intactos (7 testes antigos verdes). `lib/finais/rejulgar-v2.ts`:
  prática pela posição, objetivo e lado do pacote; treino lance a lance na ordem do
  `TreeStage.play`, com `escolherResposta(chaveDoDefensor("guided", pergunta), tentativa)`.
- `lib/finais/gravar-v2.ts` (banco injetável): forma → **snapshot pelo `publicationId`
  enviado** (sem ele, guarda à parte e responde "reabrir") → etapa no fluxo daquela publicação →
  revisão igual à do snapshot → rejulgamento → linha idempotente por `tentativa_id` (a
  política do defensor vem do snapshot, não do navegador) → só a prática da **revisão ativa**
  move a escada; aba antiga grava como `historico`; treino é `registro`.
  `gravar-v2-banco.ts` liga ao Supabase com a chave de serviço; `registrarEtapaV2` na action.
- `lib/finais/progresso.ts`: aula v2 ativa lê a escada **só da revisão ativa** da prática, e
  ignora a de `finais_progresso` (que é da tarefa v1).

```
ANTES   gravar-v2 + rejulgar-v2 (módulos ausentes): os dois arquivos falham ao carregar
DEPOIS  tests 11 (6 gravar-v2 + 5 rejulgar-v2), pass 11 — e os 7 de rejulgar.ts verdes
```

Os puros: linha certa aceita; lance fora da linha no meio continua a tentativa; ilegal,
depois do fim, inacabado e vazio recusados; **com duas defesas, a mesma lista vale em
exatamente uma das tentativas 1 e 2**; teto de lances encerra como fracasso; retry não
duplica nem sobe degrau; aba antiga sem domínio; sem snapshot guarda e manda reabrir; revisão
trocada, etapa de outro tipo e id malformado recusados.

**No banco de verdade** (`npm run db:finais:v2`, script novo, contas de teste criadas e
apagadas): **18/18** — 1 linha com publicação e revisão e 1 degrau; o retry devolve o mesmo
veredito e continua 1 linha, 1 degrau e 1 tentativa na escada; a aba antiga grava com a
publicação antiga e 0 escada para a revisão velha; o treino grava `deterministica` e
`ajuda: true` e a view conta 2 práticas, não o treino; sem snapshot, 1 linha guardada à parte
e nenhuma julgada; o Beto lê 0 linhas da Ana. **`npm run db:rls`: 52/52**, com a seção 12 nova
(o aluno não grava a própria escada v2, cada um lê a sua, e nem o dono lê a tentativa sem
snapshot).

**Declarado, e anterior a esta fatia:** `npm run db:finais` **já falhava antes da 7E** — o
próprio cabeçalho dele diz que perdeu o alvo quando o corpus foi refeito em 8/9 (as partidas
escritas ali são de um KRK que não existe mais: "lance ilegal no lance 1: e1e2"). Não foi
consertado nesta fatia; a prova v2 ficou num script próprio para não se afogar nesse vermelho.

**Os sete portões da 7D e da 7E** (um commit só: a casca do aluno liga as duas): tipos, lint,
**1.166 testes**, build (3 rotas estáticas), conteúdo (38 do cache, 0 pela rede),
**54/54 mutações** e repertório `--check`.

**O que a 7D e a 7E não cobrem:** a cor do desenho da **introdução** não chega ao aluno (o
`IntroStage` lê a forma curta; a do capítulo e a do treino chegam); o painel do professor não
mostra as tentativas de treino nem `tentativas_v2_sem_snapshot`; o domínio por treino não
existe (fora da fatia, por decisão); a contagem de alunos no impacto ainda é por aula
(`finais_progresso`), não por revisão; `db:finais` (v1) segue quebrado desde antes.

### Parada 7F — o piloto N0-LADDER, e o roteiro no Playwright

- `lib/editor-v2/migrar-v1.ts`: `prepararMigracaoV1` (diff pedagógico, ids que ficam
  permanentes, SHA-256 do arquivo v1) e `guardarSnapshotAntesDeMigrarV1` (o arquivo v1 **em
  texto** e o documento anterior; retenção de 20). O comando `CONVERTER_V1` marca
  `origem.convertidaEm` e entra no Desfazer. Tela: botão **Converter para o formato novo**
  (só enquanto há o que converter) e `DialogoConverterV1` com o diff antes do botão.
- `scripts/migrar-progresso-v1.ts <AULA> [--aplicar]`: copia `finais_progresso` para
  `avaliacoes_progresso` com `origem migrada-v1` **só se** a revisão da prática v1 adaptada é
  igual à da prática na publicação ativa; rodar de novo não copia nada.

```
ANTES   migrar-v1.test.ts (módulo ausente): o arquivo falha ao carregar
DEPOIS  tests 3, pass 3 — 0 divergências e 10 posições, 13 narrações, 5 perguntas contadas;
        converter / desfazer / refazer / não converter duas vezes; snapshot com o v1 byte a byte
```

**O roteiro, rodado em 13/9/2026** em `http://localhost:3000/editor/v2/finais/N0-LADDER`,
com o Doug entrando pela tela de login (o PIN dele não foi digitado pelo agente):

| Item | Resultado medido |
|---|---|
| medida | **a armadilha do zoom não se repetiu**: hoje `devicePixelRatio` 1, `setViewportSize(911, 512)` deu 911×512; o roteiro rodou em `1366×768` conferido em `innerWidth`/`innerHeight` |
| 1 | SHA-256 antes: v1 `943151286d67…03c3`, `.editor/v2/N1-KPK.json` `4be602ca…b822` |
| 2 | "Converter para o formato novo": **0 diferenças**, "ficam permanentes: 1 capítulo, 13 narrações, 10 posições, 1 treino com 5 perguntas, 1 prática e 4 etapas", aula antiga conferida por `943151286d67…`; converter → botão some, `convertidaEm` no disco e snapshot `antes-de-migrar` |
| 3 | Desfazer → botão volta e `convertidaEm` some do disco; Refazer → volta; SHA v1 igual |
| 4 | antes de conferir **não existe** botão Publicar; Conferir em **2,4 s**: "0 problemas impedem publicar, 0 avisos. Pode publicar." e o Publicar aparece |
| 5 | nome do capítulo editado → Publicar some e o painel diz "a aula mudou depois disso — confira de novo"; Desfazer → o documento conferido e o Publicar voltam |
| 6 | impacto: "É a primeira publicação v2 desta aula… nível 1… Prática: avaliação nova — o domínio passa a depender dela… Treino: avaliação nova… 1 aluno(s) têm progresso"; Publicar → `pub-64ffac2c7bb1e700` (27 KB) e `ativa.json` gravados, nenhuma transação sobrando, foco em "Mais opções" |
| 7 | aluno de teste criado pelo agente, noutra sessão: a aula abre em v2 (4 etapas, resumo da técnica no capítulo); treino jogado por **arrasto real** até "Xeque-mate…"; o banco ganhou **1 linha**: `treino`, sucesso, `publication_id pub-64ffac2c7bb1e700`, tentativa 1, `deterministica`, `ajuda: true`. Console do aluno: 0 erros e 0 avisos |
| 8 | na prévia do editor, g2→g3 respondeu **"Esse lance ainda ganha, mas não é o caminho da aula…"** (o juiz certificado da 7A na tela) e a linha foi até o mate; o banco continuou com 2 linhas da aula e 0 escadas v2 |
| 9 | "Mais opções": a publicação ativa listada, "Desativar o v2 desta aula"; Esc devolve o foco. **Reativar a anterior e a aba antiga não foram exercitados na tela** (há uma publicação só) — cobertos pelos testes da 7C e pelo `db:finais:v2` |
| 10 | console do editor na sessão inteira: **0 erros e 0 avisos**; SHA-256 depois: iguais aos do item 1 |
| extra | `migrar-progresso-v1.ts`: prática v1 e v2 com a mesma revisão `ar_1f8b45f1d98d…` → **1 linha copiada** com `migrada-v1`; a segunda rodada copia 0 |
| extra | depois de publicar, `next build`: continuam **3 rotas estáticas**; o `.nft.json` de `/finais/[aula]` agora leva `content/aulas-v2/N0-LADDER/ativa.json` e o pacote; o HTML estático da N0-LADDER traz a publicação e nenhum "comentario" |

**O defeito que o roteiro achou, consertado na mesma sessão:** a prévia do treino dizia "a
prévia ainda não consulta a tablebase para lances fora da linha" enquanto já julgava pela
evidência (item 8). `TreinoJogavel` ganhou `certificado`, e a frase depende dele. Teste:
**antes ✖** (a marca não existia), **depois ✔**.

**Artefatos.** Ficam, de propósito: `content/aulas-v2/N0-LADDER/` (o piloto publicado, a
versionar), `.editor/v2/N0-LADDER.json` (o documento convertido, fonte da próxima publicação),
os snapshots e o estado do gate em `.editor/`. Apagados: o rascunho v1
`content/rascunhos/lessons/N0-LADDER.json` que a abertura da página criou (byte a byte igual
ao publicado) e a conta de aluno de teste. `.editor/v2/N1-KPK.json` não foi aberto.

**Os portões finais:** tipos, lint, **1.169 testes**, build, conteúdo (com a N0-LADDER v2
publicada conferida; 38 do cache, 0 pela rede), **54/54 mutações** com os dois controles
verdes (o controle agora inclui a N0-LADDER v2 real) e repertório `--check`;
`db:rls` **52/52** e `db:finais:v2` **18/18** no estado final.

### O que a fatia 7 NÃO cobre — registrado, sem reduzir §20 nem §28

- **O título da aula não é editável no cabeçalho do v2** (§5.3 pede); o item 5 usou o nome
  do capítulo.
- **A prática não foi jogada na tela** pelo aluno de teste (o Stockfish defende de verdade);
  a gravação da prática v2 está provada no banco (`db:finais:v2`) e nos testes puros.
- **Reativar pela tela e aba antiga na tela** (item 9 do roteiro), cortes previstos no plano.
- A cor do desenho da introdução no aluno; editar desenho e pausa por narração na tela; o
  título editável; a exceção do professor à `CERTIFICACAO_REFUTADA`; o impacto por revisão;
  o painel do professor para tentativas de treino e sem snapshot.
- Mais de uma prática, prática opcional e domínio por treino (fora da fatia por decisão);
  migração em massa; N0-MATING-MATERIAL e N1-KPK continuam v1.
- `npm run db:finais` (v1) segue quebrado desde 8/9, anterior a esta fatia.
- **Publicar localmente não é deploy**: a N0-LADDER v2 chega ao aluno do site só depois de
  commit, push e deploy — e isso é do Doug.

### O próximo ponto exato

Fatia 8 de §27: **repertório (§21) e aulas extras (§22)**.

---

## Fatia 8 — repertório (§21) e aulas extras (§22), fechada em 13/9/2026

Plano executado de uma vez, como a fatia 7: paradas 8A → 8F, um commit por parada, o roteiro
do Playwright só no fim (8F). O escritor do repertório é um **emendador** (só o jogo editado é
reescrito; o resto sai byte a byte), a tela reaproveita o painel do v2 por uma casca em memória,
a persistência é sempre PGN, e as aulas extras entram na trilha por dados.

### Parada 8A — compilador puro e `--check` honesto

**O defeito:** `npm run repertorio:compilar -- --check` compilava os onze PGN e saía verde
**sem abrir `public/repertorio/`**. O JSON publicado carregava **1.099** quebras `\r\n` dentro
dos comentários (medido em 13/9/2026; o mapeamento tinha estimado 64 contando outra coisa) —
resto de uma compilação feita quando os PGN ainda eram CRLF no Windows. Os PGN são LF desde o
`.gitattributes`; o derivado nunca foi refeito, e nenhum dos sete portões via.

- `lib/repertorio/compilar.ts`: `compilarRepertorio(fontes, notas)` devolve problemas, avisos,
  placar, resumo por arquivo, linhas e `saida` (caminho → os bytes exatos de cada JSON e do
  `index.json`). `diferencasDoCompilado` diz arquivo **desatualizado**, **faltando** e
  **sobrando**. As notas entram por parâmetro: o editor compila candidatos em que uma abertura
  pode nascer ou morrer.
- `lib/repertorio/compilar-em-disco.ts`: ler fontes, ler compilado, escrever compilado (e apagar
  o JSON de abertura que saiu). Não é transação — a do editor é a da 8C.
- `scripts/compilar-repertorio.ts` virou linha de comando fina, com `--origem`/`--destino`; o
  `--check` falha com "compilado desatualizado" e a lista.
- `public/repertorio/` recompilado.

```
ANTES   compilar.test.ts: tests 5, pass 4, fail 1
          ✖ o compilado em public/repertorio/ é byte a byte o que a fonte produz
            + 11 × 'public/repertorio/<cor>/<abertura>.json: desatualizado'
        --check antigo: "(--check: nada foi escrito.)", saída 0
DEPOIS  tests 5, pass 5 — e o --check novo: "o compilado em disco bate com a fonte"
```

**Número da parada:** `\r\n` escapado nos JSON **1.099 → 0**; a diferença de cada um dos 11 JSON
é **só** essa (conferido trocando `\r\n` por `\n` no texto antigo: 11 de 11 idênticos ao novo);
`index.json` sem mudança, **27 ids** iguais antes e depois, incluídos os do Avançado; SHA-256 dos
11 `.pgn` iguais (0 alterados).

**Os sete portões:** tipos, lint, **1.174 testes**, build, conteúdo (38 do cache, 0 pela rede),
**54/54 mutações** e repertório `--check` — agora comparando com o disco.

### Parada 8B — leitor com intervalos, adaptador e escritor emendador

**Medido no corpus antes de escrever** (13/9/2026): os `;` só aparecem no preâmbulo; os jogos são
separados por uma linha em branco; **311** comentários têm quebra de linha dentro (1.109 quebras);
**10** blocos `[%plano]` dentro de comentário (as outras 29 menções a `[%plano]` são prosa do
preâmbulo); **6** NAGs escritos `$n` (`$2 $2 $4 $5 $5 $6`) e **1** símbolo colado (`!`);
**77** variações; **3** comentários logo depois de `)`; **0** comentário no início de variação;
**0** `%cal`/`%csl`; **0** aspas escapadas. Daí as quatro decisões do escritor: guardar a forma de
cada NAG, não colapsar espaço em comentário, deixar o `[%plano]` dentro do texto e recusar o que o
leitor não relê (aspas em tag, `}` em comentário).

- `lib/repertorio/pgn.ts`: a varredura guarda o trecho de cada token; `lerPgnsComIntervalos`
  devolve o preâmbulo e `{partida, inicio, fim}` de cada jogo. **O preâmbulo deixa de ser a
  `intro` do jogo 1** (em `lerPgns` ele era, e ninguém via porque `expandir` não lê a intro), e um
  bloco só de tags conta como jogo (a abertura nova nasce assim). `lerPgns` intacto.
- `lib/repertorio/editor/adaptar.ts`: `cascaDoArquivo` (uma `AulaV2` em memória, uma análise e um
  capítulo por jogo, ids `analise-j<k>`/`no-j<k>-<n>` determinísticos, tags em `origemPgn`),
  `analiseDoJogo`, `partidaDaAnalise` (a árvore do leitor sem passar por texto — é o que a
  conferência instantânea da tela usa) e `separarDesenhos`/`juntarDesenhos` (só `%cal`/`%csl` de
  cor conhecida saem do texto; o espaço só muda na emenda).
- `lib/repertorio/editor/escrever.ts`: `escreverArquivo(original, casca, tocados)` copia preâmbulo,
  jogos intactos e separadores byte a byte e reescreve só os tocados; `escreverJogo` escreve tags na
  ordem, comentário verbatim, NAG na forma do arquivo (NAG novo: símbolo colado para os seis,
  `$n` para o resto), número de lance nunca sozinho no fim da linha, e recusa tag com aspas,
  quebra em tag e `}` em comentário.

```
ANTES   escrever.test.ts: os módulos adaptar.ts/escrever.ts e lerPgnsComIntervalos não existiam —
        o arquivo falha ao carregar
DEPOIS  tests 11, pass 11 (e os 29 de pgn.test.ts continuam verdes)
```

Os 11: 23 jogos abrem sem problema; **(a)** sem edição os 11 arquivos saem byte a byte; **(b)** os
23 jogos forçados a reescrever expandem igual (linhas, ids, avisos, problemas) e a compilação dos
11 reescritos é byte a byte a de hoje; **(c)** as contagens acima, feitas por expressão regular no
texto e não pelo leitor, são as mesmas antes e depois, o preâmbulo é igual e nenhum `) {` sobra;
`$5` continua `$5` e `!?` continua `!?`; aspas em tag e `}` recusados; editar um comentário da
Siciliana muda só o trecho daquele jogo; `%cal`/`%csl` vão e voltam; D13 registrado (comentário no
início de variação é fundido no lance que ela substitui, e o escritor o devolve depois do lance —
não ocorre nos 11).

**Número da parada:** **11/11** arquivos byte a byte sem edição; **23/23** jogos com expansão
idêntica depois de reescritos.

### Parada 8C — Aplicar transacional, impacto e cache por data de modificação

- `trocarArquivo` (rename com 5 tentativas contra `EPERM`/`EBUSY`) saiu de
  `lib/editor-v2/publicar.ts` para `lib/editor/rascunhos.ts`; a publicação v2 usa a mesma.
- `lib/repertorio/editor/aplicar.ts`: transação em `.editor/repertorio/transacao/` com as fases
  **candidato → validado → fonte-trocada → compilado**, cada uma registrada depois de feita. O
  candidato é validado **relido do disco**, com as outras 10 fontes também do disco. A recuperação
  descarta até "validado" — **salvo** quando o hash da fonte em disco já é o do candidato (o
  processo morreu entre o `rename` e o registro), caso em que termina — e depois disso termina
  recompilando das fontes. Trava única do repositório. `prepararAplicacao` compila o candidato em
  memória, recusa arquivo sem nenhuma linha e devolve impacto, hash do impacto (que inclui o hash
  da fonte e do candidato) e os ids que morrem.
- `lib/repertorio/editor/impacto.ts` (puro): ids que nascem e morrem, nível trocado, texto mudado,
  ordem, Base e Avançado antes e depois, e **re-tranca** — qualquer id do Base que não existia antes.
  O teste pegou um erro de raciocínio **meu**, não do código: esticar uma linha do Base também
  re-tranca o Avançado (id novo, progresso zero), mesmo com o Base do mesmo tamanho. A frase foi
  corrigida para dizer isso.
- `lib/repertorio/editor/rascunho.ts`: o rascunho em PGN em `.editor/repertorio/<arquivo>.pgn`, com
  `baseHash` (a primeira edição parte do hash da fonte) e o nome do arquivo conferido por
  `^(brancas|pretas)-[a-z0-9-]+$` antes de virar caminho.
- `lib/repertorio/progresso-que-morre.ts`: registros e alunos de `repertorio_progresso` nos ids que
  morrem, pela chave de serviço; `null` se o banco não responde.
- **D4 consertado:** `lib/repertorio/leitor-do-banco.ts` guarda cada JSON pela data de modificação
  e pelo tamanho; `banco.ts` virou a casca `server-only` dele. Aplicar no `next dev` passa a chegar
  ao aluno sem reiniciar.

```
ANTES   aplicar.test.ts com a recuperação desligada: tests 9, pass 3, fail 6
          ✖ aplicar sem interrupção · ✖ interrompida depois de candidato/validado/fonte-trocada/compilado
          ✖ entre a troca da fonte e o registro da fase
        impacto.test.ts e leitor-do-banco.test.ts: módulos ausentes, os arquivos falham ao carregar
DEPOIS  aplicar 9/9 · impacto 5/5 · leitor-do-banco 3/3
```

Os testes rodam numa pasta temporária com a cópia dos 11 `.pgn` e do compilado: aplicar a frase
nova no 2.c3 da Alapin troca a fonte e só `brancas/alapin.json` (o índice não muda); para cada uma
das quatro fases, interrompida → recuperada → `compiladoCoerente` vazio, nenhuma transação
sobrando, fonte nova só a partir de "fonte-trocada", e a aplicação seguinte corre; candidato com
lance mudo reprovado sem tocar fonte nem compilado; hash de impacto trocado, editor desligado e
`../fora` recusados; rascunho com `baseHash` e conflito. O impacto nas linhas reais da Escocesa:
sem edição nada muda; esticar mata 1 id e cria 1; resposta nova do adversário cria 1 linha e
re-tranca; comentário mantém os ids; trocar o nível do jogo Avançado muda o nível linha a linha.
O leitor do banco relê `alapin.json` e `index.json` reescritos e não guarda leitura que falhou.

**Número da parada:** **4/4** interrupções recuperadas (e a quinta, entre o `rename` e o registro);
compilar os 11 em memória **mediana 66,6 ms, p95 89,7 ms** (25 rodadas, Node, este notebook).

**Os sete portões da 8B e da 8C** (rodados uma vez sobre as duas, como na 7B+7C; dois commits):
tipos, lint, **1.202 testes**, build, conteúdo (38 do cache, 0 pela rede), **54/54 mutações** com os
dois controles verdes e repertório `--check`.

### Parada 8D — a tela do repertório e a abertura nova

Guias lidos antes das rotas: `dynamic-routes.md` (params é Promise) e `server-actions.md` ("render-time
gating is not a security boundary" — toda action chama `exigirEditor()`).

- `/editor` ganhou **Repertório de aberturas** (§5.1: distinguir repertório). `/editor/repertorio`
  lista os `.pgn` com linhas, Base e Avançado da compilação de agora, marca "com rascunho", mostra
  as aberturas que só existem como rascunho e tem **Nova abertura** (cor, nome, endereço derivado e
  ajustável, nível, fonte; Cancelar não chama o servidor).
- `/editor/repertorio/[arquivo]` confere `^(brancas|pretas)-[a-z0-9-]+$` antes de montar caminho e
  recupera transação interrompida antes de abrir. `app/editor/repertorio/acoes.ts`: salvar rascunho
  (com `baseHash` e teto de 1 MB), descartar, preparar aplicação (impacto + contagem de
  `repertorio_progresso` nos ids que morrem), aplicar (apaga o rascunho depois), criar abertura nova.
- `components/editor-repertorio/EditorDeRepertorio.tsx`: jogos do arquivo à esquerda; tabuleiro,
  os seis símbolos (cada um diz o efeito: alternativa aceita, erro nomeado, erro do adversário, só
  anota), comentário com as quebras do autor e, **na ponta da linha em lance nosso**, os campos do
  `[%plano]`; à direita o `PainelDeLances` do v2 (com um filtro novo que tira as ações de
  capítulo e treino) e a conferência com "Ir até a linha". Jogar avisa **linha nova** (ramo do
  adversário), **continuação** ou **alternativa ou erro** (ramo nosso). Excluir a partir daqui
  mostra os ids que morrem antes de confirmar. **Mais opções**: Nome, Nível e Fonte pelo comando
  novo `EDITAR_TAG_PGN` (a ordem das tags fica; vazio não apaga); Cor e Abertura travadas com o
  motivo. Desfazer/Refazer, Ctrl+Z/Ctrl+Y fora de campo, setas na árvore, autosave do PGN em 600 ms,
  conflito com **Baixar minha cópia**. Aplicar só com rascunho salvo e zero erros.
- `lib/repertorio/editor/sessao.ts` (puro): `classificarLance`, `efeitoDoSimbolo`, `conferirCasca`
  (as regras do compilador por jogo, com o lance para onde levar), `planoDoComentario` /
  `comentarioComPlano`, `pgnDaAberturaNova` e `slugDaAbertura`.

```
ANTES   sessao.test.ts: módulo ausente, o arquivo falha ao carregar
DEPOIS  tests 9, pass 9
```

Os 9, na Escocesa real e pelos comandos do v2: os 11 arquivos conferem sem erro na tela; lance novo
no adversário é "linha nova", a conferência acusa a ponta no lance novo, e com a nossa resposta
nasce **uma** linha com o id previsto e "sem comentário" leva ao lance mudo; lance nosso ao lado é
"alternativa ou erro"; excluir um ramo mata exatamente os ids que o impacto mostra; comentário não
muda id; Mais opções preserva a ordem das tags e reescreve só aquele jogo; o `[%plano]` em campos
vai e volta (inclusive os blocos reais da Caro-Kann); a abertura nova gera só as tags e recusa aspas;
e **por dados**: numa pasta temporária o último jogo da Siciliana vira `pretas-siciliana-teste`,
aplicado — o índice passa a **12** e o leitor do banco acha a abertura e as linhas dela.

**Dois defeitos achados rodando a tela (Playwright, `next dev`), consertados na mesma sessão:**

1. **Desfazer não voltava a caixa de comentário.** O documento voltava (o rascunho em disco ficou
   byte a byte igual à fonte), mas a caixa guardava o texto novo, porque o estado local só nascia na
   montagem. Conserto: a caixa remonta quando o comentário do documento muda. Medido antes: depois
   de Desfazer, `inputValue` ≠ original; depois: Desfazer e Refazer devolvem os dois textos.
2. **Editar comentário na Siciliana passava da meta de §24.** A cada comentário confirmado o
   escritor relia o arquivo original inteiro e a conferência reexpandia os 6 jogos. Conserto: o
   escritor aceita os intervalos já lidos, e a conferência guarda o resultado por jogo pela
   identidade do objeto (os comandos são imutáveis: jogo intocado é o mesmo objeto). E o
   tabuleiro encolheu de 34 rem para 27 rem, porque a página rolava na vertical.

**Número da parada** (1366×768 conferido: `innerWidth` 1366, `innerHeight` 768, `devicePixelRatio`
1; `next dev`, Siciliana, 24 lances):

| Medida | Antes | Depois |
|---|---|---|
| selecionar lance, p95 (40 cliques até o quadro seguinte) | 24,1 ms | **18,0 ms** |
| confirmar comentário, p95 (20 → 30 edições) | **132,8 ms** (acima de 100) | **39,3 ms** |
| altura da página | 957 px (rolava) | **768 px** |
| rolagem horizontal | não | **não** |

Tocando o tabuleiro por clique do Playwright (1.e4 → e7-e5 na Alapin): "Linha nova…" e a
conferência com 3 erros (ponta no adversário, último lance sem comentário, 1 lance nosso de 12);
Ctrl+Z → "nenhum erro" e o rascunho igual à fonte. Console: **0 erros, 0 avisos**. O rascunho das
medidas foi apagado; `content/` e `public/` intocados. O navegador do Playwright já estava com a
sessão do professor, e o login não precisou ser digitado.

**Os sete portões:** tipos, lint, **1.211 testes**, build (com `ƒ /editor/repertorio` e
`ƒ /editor/repertorio/[arquivo]`), conteúdo, **54/54 mutações** e repertório `--check`.

### Parada 8E — aulas extras na trilha por dados, portão e impacto real

- **Trilha (D10):** `AulaDaTrilha.extra`; `extrasDaTrilha` (só `EX-` com nível 1–5 e classe,
  ordem a partir de 1000, por nível e id, sem colidir com as 49); `trilhaCompleta(extras)`;
  `aulaDaTrilha(id, extras)` e `aulasAbertas(publicadas, extras)` com padrão vazio.
  `lib/finais/trilha-em-disco.ts` (pasta injetável): `extrasPublicadas` e `publicadasEmDisco`;
  `aulasExtras()` em `conteudo.ts`. `extras` atravessa `aulasDoNivel`, `fechamentoDoNivel`,
  `proximoPasso`, `montarMapa`, `proximaAcao` e `somarFinais`; `estadoParaONivel` o preenche, e
  com isso a prova de nível e a action que a encerra também contam a extra.
- **Telas:** `/finais` mostra a extra na classe dela com a marca "extra · nível N"; `/painel`,
  `/trilha`, `/professor` e `/professor/[aluno]` passam as extras; `/finais/[aula]` as conhece.
- **Conferência:** `EXTRA_SEM_NIVEL` e `EXTRA_SEM_CLASSE` (erro), `NIVEL_DIVERGE` (erro: aula das
  49 declarando nível diferente do da trilha) e `AULA_FORA_DA_TRILHA` (aviso — a `N0-FIXTURE-V2`
  cai nele, e por isso é aviso). Problema de `metadados.*` ganhou destino "Mais opções": o botão
  **Ir para o problema** abre a janela com os campos.
- **Mais opções** do Editor v2 ganhou **Dados da aula** (nível e classe) pelo comando novo
  `EDITAR_METADADOS` (entra no Desfazer; mesmo valor não entra).
- **Impacto (D5):** `impactoDaPublicacaoV2(anterior, novo, curso)` diz `lugar` (curso, extra,
  fora) e `fechamento` antes e depois pela própria `fechamentoDoNivel`; `publicar.ts` lê o retrato
  do curso do disco no preparo e no clique, então o hash do impacto só muda se o curso mudou. As
  frases: "Aula extra: entra na conta do nível 2: para fechar o nível, antes 1 aula de finais,
  depois 2 aulas (o nível declara 4; publicadas no nível: 1 → 2)", "já conta…", "sai da conta do
  nível X", "não está na trilha do curso", "não tem nível e classe declarados".
- **Contagem de alunos (D6):** alunos distintos de `finais_progresso` ∪ `avaliacoes_progresso`.
- **Formulário e modelo (D7):** aula do curso pede **série do identificador** (N0–N5), com o
  aviso "não é o nível"; extra pede **Nível 1–5** e **Classe**, e `prepararNovaAula` recusa sem um
  dos dois apontando o campo; `metadados.nivel` agora é `min(1)`; o comentário que dizia
  "N1-KPK é nível 1" foi corrigido (é 2).
- **D8:** `aulaDoOnde` e a busca da exceção no validador aceitam `EX-`. **E um defeito que não
  estava no mapeamento:** na linha do validador, o `\b` da expressão era um **caractere de controle
  literal** (backspace, 0x08) — a expressão nunca casava, e a exceção nunca era procurada pela aula
  nomeada no `where`. Varridos todos os `.ts`/`.tsx`: era o único. `validate:content` continuou
  verde com o conserto.
- **D9:** `/editor` e a bancada de `/finais` levam `EX-` ao Editor v2, `/editor/finais/EX-…`
  redireciona para lá, e o índice distingue "aula extra · nível N, classe C — entra na trilha ao
  publicar" de "fora da trilha".
- **Fixture:** `scripts/fixture-aula-v2.ts` gera as duas (`--extra` só a extra; `--check` confere
  as duas) — `EX-FIXTURE-V2` é a N0-LADDER com nível 1 e classe E (`pub-55947670bbcd7bd0`); a
  `N0-FIXTURE-V2` saiu byte a byte igual. **3 mutações** novas: extra sem nível, extra sem classe e
  a N0-LADDER real declarando nível 3.

```
ANTES   (testes novos contra conferencia.ts, trilha.ts, nivel.ts e nova-aula.ts do commit 8D)
        conferencia + nova-aula + trilha-extras: tests 28, pass 21, fail 7
          ✖ toda regra da lista tem um estrago · ✖ EXTRA_SEM_NIVEL · ✖ EXTRA_SEM_CLASSE
          ✖ NIVEL_DIVERGE · ✖ AULA_FORA_DA_TRILHA · ✖ a extra declara nível e classe
          ✖ trilha-extras.test.ts (as funções não existiam: falha ao carregar)
DEPOIS  conferencia 23/23 · nova-aula 9/9 · trilha-extras 5/5 · impacto-publicacao 5/5
```

Os de trilha e nível: extras válidas entram e as inválidas ficam fora; a extra publicada abre e
soma na classe; **no nível 2, exigidas 1 → 2** com a extra (o nível 1 não muda); sem a extra o
próximo passo do nível 2 é o repertório, com ela é a aula extra, e o mapa a lista; em disco a
fixture é lida como extra e a trilha passa de **49 para 50**. Os de impacto: extra nova (1 → 2 e
"passa a precisar de mais 1 aula"), republicação ("já conta"), mudança de nível, fora da trilha
(fixture e extra sem nível), aula do curso já publicada em v1 ("já conta").

**Um teste antigo mudou, e o motivo é o D7:** `rascunhos.test.ts` gravava uma extra com
`nivel: 0`, que o modelo agora recusa; passou a nível 1. Nenhum documento real usa nível 0: "Nova
aula" só escrevia nível em extra, e não há extra em `.editor/v2/` (o `N1-KPK.json` não foi aberto).

**Número da parada:** mutações **54/54 → 57/57** vermelhas, com os dois controles verdes (a cópia
intacta, agora com a `EX-FIXTURE-V2` instalada, passa); `trilhaCompleta` **49 → 50** com a fixture.

**Os sete portões:** tipos, lint, **1.226 testes**, build, conteúdo (38 do cache, 0 pela rede),
**57/57 mutações** e repertório `--check`.

### Parada 8F — sobras da fatia 7, o roteiro no Playwright, e limpeza

- **D12:** comando `RENOMEAR_AULA` (vazio ou igual não muda nada nem entra no histórico) e o título
  da aula editável no cabeçalho do Editor v2 (Enter confirma, Esc volta).
- **D11:** `publicacoesDaAulaV2` devolve a ativa primeiro, a anterior em seguida e marca
  `anterior`; a lista diz "ativa — é a que o aluno recebe" e "a anterior"; reativar avisa o editor,
  que apaga a conferência verde da tela e diz "confira de novo antes de publicar"; o botão de
  confirmar mostra "Reativando…" enquanto a troca acontece.

```
ANTES   renomear-e-publicacoes.test.ts contra comandos.ts e publicar.ts da 8E: tests 2, pass 0, fail 2
DEPOIS  tests 2, pass 2
```

**O roteiro, rodado em 13/9/2026** em `http://localhost:3000` (`next dev`), com o navegador do
Playwright já na sessão do professor e o aluno de teste numa segunda sessão. Medida conferida:
`innerWidth` 1366, `innerHeight` 768, `devicePixelRatio` 1.

| Item | Resultado medido |
|---|---|
| preparo | `git status` só com a 8F; **29** SHA-256 de antes (`N1-KPK.json` `4be602ca…`, 3 aulas v1, 11 `.pgn`, 12 JSON, `content/aulas-v2/N0-LADDER`); aluno de teste criado; `.editor/v2/EX-ENSAIO.json` gerado por script (N0-LADDER adaptada, nível 2, classe D) |
| 1 | login: a sessão do professor já estava aberta no navegador — o PIN não foi digitado |
| 2 | `/editor`: "Repertório de aberturas" e "EX-ENSAIO · aula extra · nível 2, classe D — entra na trilha ao publicar"; `/editor/repertorio`: **11** aberturas, **27** linhas = `index.json` |
| 3 | Alapin, 2.c3: frase acrescentada → "salvo · rascunho" e `.editor/repertorio/brancas-alapin.pgn` |
| 4 | 1.e4 → e7-e5 no tabuleiro: "Linha nova…", conferência com 3 erros (ponta no adversário, último lance sem comentário, 1 lance nosso de 12); Ctrl+Z → "nenhum erro". p95 de selecionar: 18 ms (medido na 8D) |
| 5 | progresso do aluno de teste semeado na `brancas-alapin-5eb647e6`; a linha esticada (12…Rb8 13.a4 comentado) → impacto "1 linha deixa de existir… **2 registros de 2 alunos**… 1 linha nova… Entra no Base uma linha que ninguém aprendeu ainda…"; **Cancelar** não mudou nada. Os 2: o aluno de teste e a conta `professorteste`, que tem 9 tentativas nessa linha desde 9/9 — a conta está certa |
| 6 | desfeito o esticamento, **Aplicar** a frase: só `brancas-alapin.pgn` e `brancas/alapin.json` mudam (o JSON só no comentário "2"), preâmbulo igual, `--check` verde, pasta da transação vazia, os outros **27** SHAs iguais |
| 7 | aluno de teste em `/aberturas/brancas/alapin`: **a frase nova aparece sem reiniciar o `dev`** (D4 provado na tela) |
| 8 | "+ Nova abertura": Cancelar fecha sem criar; "Defesa Holandesa de Ensaio" → `pretas-defesa-holandesa-de-ensaio.pgn` só com as tags. Aplicação real não feita: não há semente válida (sequência repetida vale no banco inteiro); a abertura nova por dados fica provada pelo teste da 8D (índice 12) |
| 9 | `/editor/v2/nova`: curso pede "Série do identificador" (N0–N5, "não é o nível"); extra pede Nível 1–5 e Classe; criar sem classe é recusado com a frase; Cancelar e a recusa não criaram arquivo |
| 10 | EX-ENSAIO: Conferir "0 problemas… Pode publicar"; impacto **"Aula extra: entra na conta do nível 2: para fechar o nível, antes 1 aula de finais, depois 2 aulas (o nível declara 4; publicadas no nível: 1 → 2)"** e "Quem ainda não fechou o nível 2 passa a precisar de mais 1 aula de finais"; publicada `pub-9c52e7a466af9bfd` |
| 11 | nível tirado em Mais opções → Conferir: "1 problema impede publicar" com `EXTRA_SEM_NIVEL`, **Ir para o problema** abre Mais opções; Desfazer → "Pode publicar" |
| 12 | aluno: `/finais` mostra "Ensaio de aula extra · extra · nível 2" na classe D e "0 de **4** publicadas" (eram 3); `/trilha` a lista no nível 2; `/finais/EX-ENSAIO` abre; `/professor` conta "0 de 4 · E 0/2 · D 0/2". `/painel` mostra o nível 1, porque o aluno de teste está no nível 1 — a exigência do nível 2 aparece na trilha e no impacto, não no cartão dele |
| 13 | título renomeado no cabeçalho → Conferir → Publicar (`pub-a4bfc630ebcf3ce5`, impacto "já conta… a exigência continua 2 aulas") → Mais opções lista **2**, a ativa primeiro e "a anterior" → Reativar a anterior → o editor diz "A publicação pub-9c52… voltou a ser a que o aluno recebe… confira de novo" e esconde o Publicar; o aluno vê o título anterior |
| 14 | console do aluno: **0 erros**, 1 aviso de imagem LCP em `/entrar` (anterior à fatia); console do professor: **0 avisos e 1 erro** `net::ERR_INSUFFICIENT_RESOURCES` no instante do item 6. **Não reproduziu**: uma segunda aplicação inteira com escuta de console e de requisição falha deu 0 e 0; a primeira coincidiu com o `dev` recompilando a página |

**Cinco defeitos achados rodando, consertados e reconferidos na mesma sessão:**

1. **Abertura nova dizia "passa nas regras" e habilitava Aplicar** (item 8). Uma casca só de
   cabeçalho não gera linha, e a conferência ficava vazia. Agora é erro com a lista do que falta
   (12 lances nossos, roque, peças menores fora, comentário), e Aplicar fica travado. Teste:
   `sessao.test.ts` **antes 8/9, depois 9/9**; na tela, "1 erro(s)" e Aplicar desabilitado.
2. **Aula `EX-` abria no editor com o pacote de posições vazio** (item 10): uma extra montada sobre
   uma posição do curso acusava "a posição não está no pacote desta aula" e o tabuleiro não montava,
   enquanto o Conferir do servidor dava verde. A página passa as posições que o documento referencia.
   Na tela: o problema some e o tabuleiro monta.
3. **"Os alunos deixam de receber a versão antiga"** na primeira publicação de uma extra, que não
   tem versão antiga (item 10). Teste: `impacto-publicacao.test.ts` **antes 4/5, depois 5/5**.
4. **"— em os dados da aula"** no painel de problemas (item 11). `emOnde` contrai também `os`/`as`.
   Teste: `diagnostico-visual.test.ts` **antes 10/11, depois 11/11**.
5. **Confirmar a reativação ficava ~1 s sem retorno** (item 13): parecia que o clique não pegou.
   Estado "Reativando…" com o botão desabilitado.

**Limpeza e prova final:** `git checkout` do `.pgn` da Alapin e recompilado; apagados
`.editor/repertorio/` (rascunho da holandesa e a pasta de transação), `.editor/v2/EX-ENSAIO.json`,
`content/aulas-v2/EX-ENSAIO/`, `.editor/gate/v2/EX-ENSAIO.json`, snapshots e transação da
EX-ENSAIO, os scripts do roteiro e o `content/rascunhos/lessons/N0-LADDER.json` que o `dev` criou
ao pré-carregar o link "Abrir v2" do índice (byte a byte igual ao publicado); conta do aluno de
teste apagada (o progresso semeado vai junto). **29/29 SHA-256 iguais aos de antes**;
`content/aulas-v2/N0-LADDER/` presente. `EX-FIXTURE-V2` fica, versionada.

**Os portões finais** (sobre a 8F, com o conteúdo limpo): tipos, lint, **1.228 testes**, build,
conteúdo (38 do cache, 0 pela rede), **57/57 mutações** com os controles verdes, repertório
`--check`, **`db:rls` 52/52** e **`db:finais:v2` 18/18**. A fatia 8 não mudou schema do banco.

**§28:** marcado "Repertório editado pela fonte PGN e compilação coerente" — o PGN é a fonte, a
tela edita pela casca e grava PGN, Aplicar é transação recuperável (4/4 interrupções) com impacto
em ids e progresso, os 11 arquivos saem byte a byte sem edição e o roteiro aplicou uma edição real
até o aluno. "Nova aula e aula extra pela tela" **continua desmarcado**: a extra pede nível e
classe e publica com o efeito real no nível, mas a EX-ENSAIO do roteiro nasceu por script, porque a
prática ainda não se cria pela tela (§17.1).

### O que a fatia 8 NÃO cobre — registrado, sem reduzir §21, §22 nem §28

- **O jogo reescrito reflui as quebras de linha entre lances.** A semântica é provada idêntica
  (8B), mas o diff da Alapin mostrou 7 trechos em que o autor quebrava a linha antes de um número de
  lance e o escritor junta. Preservar o espaço original entre tokens intocados é o próximo passo do
  emendador.
- ~~"N registros de N alunos" conta contas, não só alunos~~ — **resolvido no mesmo dia, por decisão
  do Doug**: ver "só contas de aluno no impacto", logo abaixo.
- Desenho do repertório **na tela do aluno** (`LinhaSchema.desenhos`), e o botão direito no editor
  do repertório (o escritor já preserva `%cal`/`%csl`).
- Recuperação no IndexedDB para o repertório (há rascunho em disco com `baseHash`).
- Formulário de `notas.json`, botão commit/push e importar estudo no repertório (opcionais em §21).
- Aplicar uma abertura nova **pela tela**, com linha completa (provado só no teste, por falta de
  semente que não repita sequência).
- Data em cada publicação v2 e diff entre publicações; contar quem ainda não fechou o nível.
- Criar uma extra **com prática** pela tela (§17.1 é de outra fatia; a EX-ENSAIO nasceu por script).
- Abrir `/editor` faz o `next dev` pré-carregar "Abrir v2" e criar o rascunho v1 da aula como
  efeito colateral de um GET (comportamento anterior à fatia).
- Pendências antigas da fatia 7 que não são desta (desenho/pausa por narração, cor da introdução,
  exceção a `CERTIFICACAO_REFUTADA`, várias práticas, `db:finais` v1 quebrado).
- **Push, merge e deploy**: só quando o Doug pedir. O repertório e a trilha mudaram em `content/`,
  `public/` e no código; nada disso chega ao site sem commit, push e deploy.

### Só contas de aluno no impacto — 13/9/2026, decisão do Doug

O item 5 do roteiro mostrou "2 registros de 2 alunos", e um dos dois era a conta `professorteste`.
O Doug decidiu: **o impacto conta só alunos**.

- `lib/curso/so-alunos.ts` (puro): `contarSoAlunos(linhas, papelPorConta)` conta só as linhas cuja
  conta tem `perfis.papel = 'aluno'`; conta sem papel conhecido não entra.
- Usado nas duas contagens do servidor: `contarProgressoQueMorre` (Aplicar no repertório) e
  `alunosComProgresso` (Publicar aula v2), com uma consulta a `perfis` pelas contas das linhas.

```
ANTES   so-alunos.test.ts: módulo ausente, o arquivo falha ao carregar (tests 1, fail 1)
DEPOIS  tests 3, pass 3
```

**No banco de verdade**, na linha `brancas-alapin-5eb647e6` (onde, depois de apagada a conta do aluno
de teste, só resta a `professorteste`): **1 de 1 → 0 registros de 0 alunos**.

### O próximo ponto exato

Fatia 9 de §27: **worker Stockfish do professor (§23)** — feita logo abaixo.

---

## Fatia 9 — Stockfish do professor (§23 e §23.1), fechada em 13/9/2026

Plano executado de uma vez, paradas 9A → 9F, com o roteiro do Playwright no fim. Em 13/9 o Doug
ampliou §23 olhando Lichess e Chess.com — linhas, profundidade, liga/desliga, seta opcional, os
dois editores, sempre desligado ao abrir, e **o aluno não vê motor nem barra, nem na prévia (por
agora)**. A decisão entrou como §23.1 da especificação e numa frase de §15 do plano; "clicar numa
linha para virar variante" ficou registrado como posterior, junto do Opening Explorer.

### Parada 9A — o motor em fábrica, com um worker por instância

- `lib/engine/stockfish.ts`: o estado que morava solto no módulo (worker, carimbo de pedido, fila
  de `readyok`, `MultiPV`) foi embrulhado em `criarMotor(build, { criarWorker, medir,
  intervaloMinimoMs })`. O aluno é `const motorDoAluno = criarMotor(ENGINE_BUILD)`, e
  `acquireEngine`, `releaseEngine`, `subscribeEngineStatus`, `getEngineStatus`,
  `readEngineTimings` e `isAborted` continuam com a mesma assinatura: `useEngine` e `PracticeStage`
  não mudaram uma linha.
- `analisarContinuo({ fen, multiPv, profundidade }, aoAtualizar)`: o mesmo funil do `analyse`
  (`cancel` → `whenReady` → `whenIdle` → carimbo), `go depth` com teto e nunca `infinite`. Entrega a
  cada profundidade em que **todas** as linhas pedidas chegaram, no máximo 4 por segundo (a adiada
  é sempre a mais funda), e a última, a do `bestmove`, marcada `final`. O teto de tempo não é erro:
  manda `stop` sem trocar o carimbo, e o `bestmove` forçado fecha com o que havia.
- Só o motor do aluno grava as marcas `engine:*` do `performance`: a análise do professor
  misturaria números no `readEngineTimings`.

```
ANTES   stockfish.test.ts: "does not provide an export named 'criarMotor'" — tests 1, fail 1
DEPOIS  stockfish.test.ts 6/6 · uci.test.ts e manifest.test.ts continuam 22/22
```

Os 6, com um worker falso que responde `uciok`/`readyok` sozinho: duas instâncias (o `bestMove` do
aluno em voo e a análise do professor não trocam `stop` nem `MultiPV`); posição nova cancela a
anterior e nenhuma atualização da posição velha chega; atualização só com as duas linhas do
MultiPV 2, e `lowerbound` não conta; ritmo (dez profundidades seguidas dão 1 entrega agora e 1
adiada, a da profundidade 10); `dispose` manda `quit` por último e encerra o worker; as exportações
do aluno continuam lá.

### Parada 9B — as contas da faixa, puras

`lib/engine/avaliacao-do-professor.ts`: `avaliacaoParaBrancas` (reaproveita o `paraBrancas` de
`lib/repertorio/motor.ts`, sem copiar; o mate troca de sinal junto), `formatarAvaliacao` (`+0,5`,
`−1,2`, `#5`, `−#3`, e por extenso para o leitor de tela), `alturaDaBarra` (curva de chances do
Lichess, ±1000 cp, só o mate encosta no fim), `pvEmSanDaFen` (numeração do sexto campo da FEN e
`3…a6` com as pretas na vez — as reticências do painel de lances, e não `3...`, para as duas colunas
falarem igual; lance ilegal corta a linha), `resultadoTerminal`/`estadoTerminal` (texto do
`readOutcome`), `contaPecas` e `linhasEsperadas` (as pedidas ou os lances legais, o que for menor —
senão uma posição com um lance só esperaria a segunda linha para sempre).

```
ANTES   avaliacao-do-professor.test.ts: módulo ausente, o arquivo falha ao carregar
        (e, escrito o módulo, 6/7: "vantagem das brancas de 0,5 peões" — plural errado)
DEPOIS  8/8 (o oitavo, da barra no fim de partida, nasceu na 9D; ver abaixo)
```

### Parada 9C — hook, componentes e o Editor v2

- `lib/engine/useMotorDoProfessor.ts`: cria a instância só na primeira vez que liga; espera 120 ms
  de posição parada e cancela a análise anterior na hora; pausa com `pausado` ou `document.hidden`;
  `dispose()` ao desmontar; descarta atualização de outra FEN (segunda defesa, depois do carimbo).
  Desligar só para a busca — o worker fica até sair da tela, para o `L` seguinte não baixar 7 MB.
  Profundidade: `PROFUNDIDADE_DO_PROFESSOR = 22`.
- `components/motor-do-professor/`: `BarraDeAvaliacao` (vão sempre reservado, acompanha a
  orientação, `aria-hidden` porque o número está por extenso na faixa), `FaixaDoMotor`
  (interruptor e seta com `aria-pressed`, menu `⋯` com `menuitemradio` 1/2/3, Esc devolve o foco),
  `LinhasDoMotor`, `AjudaDeAtalhos` (o `(?)`, popover com `role="dialog"`) e
  `useControlesDoMotor` (os três estados sem memória, a tecla `L` com a guarda das setas — fora de
  campo de texto e sem janela aberta — e a forma da seta memorizada pelo lance).
- Pincel novo `motor` em `ChessBoard.tsx` (cinza, opacidade 0,6) e o token `--color-pincel-motor`;
  a seta vai pelo canal automático (`shapes`), que no editor estava vazio, e nunca pelo `desenhavel`.
- `EditorV2.tsx`: barra à esquerda do tabuleiro, faixa e linhas no topo da coluna direita, `shapes`
  no tabuleiro, `pausado = janelaAberta` (a prévia inclusa).
- **Guarda "só editor"** (`lib/engine/so-editor.test.ts`): falha se `components/motor-do-professor/`
  ou `useMotorDoProfessor` forem importados fora de `components/editor-v2/`,
  `components/editor-repertorio/` e `app/editor/`, ou pela prévia; e segue os imports a partir de
  toda `page.tsx`/`layout.tsx` fora de `app/editor/`. Provada com duas mutações temporárias,
  desfeitas em seguida: importar a barra em `Previa.tsx` e o hook em `components/lesson/Comentario.tsx`
  → **2/2 vermelhos**, com o caminho `app/finais/[aula]/page.tsx → AulaNoNavegador.tsx →
  LessonPlayer.tsx → IntroStage.tsx → Comentario.tsx → useMotorDoProfessor.ts`; restaurado → 2/2.

### Parada 9D — a organização da tela, medida

- A legenda das setas do teclado foi para o `(?)` ao lado de "Lances e variantes" (com a tecla L);
  a legenda do botão direito foi para o `(?)` ao lado de "Apagar desenhos desta posição"; a frase de
  instrução da paleta só aparece com Seta ou Casa na mão (a região `role="status"` fica montada,
  vazia, para o leitor de tela não perder o primeiro anúncio).
- **A regra de aceite foi aplicada inteira, os dois recuos.** Medido na N0-LADDER:

| Situação (1366×768 de CSS) | Lista de lances | Lances inteiros |
|---|---|---|
| desligado, bloco de edição a 50% | 160 px | **4** (abaixo do alvo) |
| desligado, bloco a **40%** (1º recuo) | 217 px | 6 |
| ligado, 2 linhas abertas, bloco a 40% | 153 px | **4** (abaixo do alvo) |
| ligado, **linhas recolhidas em 1 com "+1"** (2º recuo) | 175 px | **5** |

  O menu `⋯` continua escolhendo quantas linhas o motor calcula; a tela mostra a melhor e o "+N"
  abre as outras (abertas em 2, a lista volta a 4 — escolha do professor, na sessão).
- **Barra no fim de partida** (achado olhando a medida): numa posição de mate a barra ficava vazia,
  igual à do motor desligado. `resultadoTerminal` devolve a barra — 100 ou 0 para quem deu mate, 50
  no empate. Teste: `avaliacao-do-professor.test.ts` **antes** falha ao carregar
  (`resultadoTerminal` não existia), **depois 8/8**.

Geometria final, conferida `innerWidth` 1366 e `innerHeight` 768 (neste trecho com
`devicePixelRatio` 0,9 — ver "a medida e o zoom" abaixo):

| Medida | Desligado | Ligado |
|---|---|---|
| tabuleiro | 545 px | **545 px** |
| barra | 14 × 545 px | 14 × 545 px |
| lances inteiros na lista | 6 | 5 |
| página | 1366 × 768, sem rolagem | igual |
| botões cobertos (`elementFromPoint` no centro de cada visível) | 0 de 44 (cabeçalho 8, paleta 7) | 0 de 44 |
| faixa | 32 px, sem transbordar | 32 px, sem transbordar |

O detector de sobreposição acusou primeiro 12 pares e depois 4 botões "cobertos" na coluna de
capítulos: eram os itens de um `<details>` **fechado**, que o Chromium mantém com posição e sem
pintar, e botões rolados para fora das colunas com rolagem própria. A medida final recorta cada
botão pelos ancestrais com rolagem e ignora `details` fechado.

### Parada 9E — o repertório

`EditorDeRepertorio.tsx`: a mesma faixa e as mesmas linhas no topo da coluna direita, a barra ao
lado do tabuleiro e a seta pelo `shapes`, com o hook antes do retorno antecipado do componente. O
invólucro passou de `max-w-[27rem]` para `max-w-[28.25rem]` (27 + barra 0,875 + vão 0,375): o
tabuleiro continua com os 27 rem que a 8D mediu. `pausado` = as janelas desta tela.

Medido na Alapin (1366×768 de CSS): tabuleiro **432 px ligado e desligado**, barra 14 × 432, página
1366 × 768 sem rolagem, 0 botões cobertos (19 desligado, 22 ligado).

### Parada 9F — o roteiro no Playwright

Rodado em 13/9/2026 em `http://localhost:3000` (`next dev`), com o navegador do Playwright já na
sessão do professor. Um contador instalado antes da página (`addInitScript`) embrulhou `Worker`
para contar criações, encerramentos e cada comando enviado.

| Item | Resultado medido |
|---|---|
| preparo | **887** SHA-256 de `.editor/v2`, `content/lessons`, `content/aulas-v2`, `content/repertorio` e `public/repertorio`; `N1-KPK.json` `4be602ca…b822` |
| 1 | N0-LADDER abre com "Motor desligado · tecla L liga", barra reservada e **0 workers** |
| 2 | `L` → 1 worker (`uci`, `MultiPV 2`, `position`, `go depth 22`); "carregando…" → prof 17 → prof 22 em ~1 s; **#10 brancas**, barra 100%, `1.Rg5 Kf3 2.R5g4 Ke2 3.Kg2 Ke3` |
| 3 | `↗` → uma linha na camada automática com o pincel `lab(21% …)` a 0,6, diferente dos quatro pincéis do professor; `L` desliga: camada vazia, barra vazia; religar reaproveita o worker (continua 1). `.editor/v2/N0-LADDER.json` com o mesmo hash (`753ce4e5…`) |
| 4 | 6 × `→` em 240 ms: 7 `stop` e **um só** `position` + `go`, o da última posição (Kb1); a faixa só mostrou linhas dela (`+6,8 4.R2g3` → `#2 4.Rf4 Kc1 5.Rf1#`) |
| 5 | `⋯` abre com o foco no item marcado; **3 linhas** → `MultiPV 3` e três linhas; Esc fecha e devolve o foco; **1 linha** → `MultiPV 1`, sem "+N" |
| 6 | fim da linha: "**Xeque-mate.**", barra 100%, nenhum comando ao motor; Tg4–b4 jogado por clique no tabuleiro (variante) → "**Rei afogado — empate.**", barra 50%, nenhum comando; Ctrl+Z tira a variante e volta a "salvo" com o rascunho de **hash igual** |
| 7 | com 2 torres e 2 reis: "final de até 7 peças: quem julga é a tablebase"; na Alapin (32 peças) a nota não aparece |
| 8 | abrir a prévia manda `stop`, a faixa atrás diz "pausado", **0** `go` em 2 s; fechar devolve o foco a "Pré-visualizar" e retoma (`position` + `go depth 22`). "Mais opções" do repertório pausa igual, e o `L` fica bloqueado com ela aberta |
| 9 | sair para `/editor` (navegação do próprio Next): `stop`, `quit` e **worker encerrado na hora** (0 → 1); idem no repertório |
| 10 | geometria da 9D, na tabela acima |
| 11 | repertório: 0 workers ao abrir; `+0,4 brancas`, prof 22, `1.e4 e5 2.Nf3 Nf6…`; pretas na vez → `1…e6 2.Nc3 d5…` com a avaliação ainda do lado das brancas; da abertura 1.e4 c5 à profundidade 22 em **3,4 s**; seta, pausa e saída como acima |
| 12 | console do professor: **1 erro**, `net::ERR_INSUFFICIENT_RESOURCES` numa requisição para `/editor/repertorio/brancas-alapin`, o mesmo da 8F. **Não reproduziu**: 24 trocas, seta e 3 linhas com escuta de requisição falha deram 0 falhas e 0 erros, e os arquivos do motor foram baixados uma vez só, sem nenhum POST |
| 13 | p95 da troca de posição com o motor analisando (40 trocas, até o quadro seguinte): N0-LADDER **mediana 30,6 ms, p95 32,1 ms**, máx. 38,9; Alapin **mediana 21,1 ms, p95 33,6 ms**, máx. 40,3, nenhuma acima de 100 ms |
| 14 | prévia com o motor ligado atrás: **0** elementos do motor, 0 setas cinza, nenhum texto do motor. Aluno de teste (criado e apagado por `scripts/aluno-de-teste.ts`) numa segunda sessão: `/finais/N0-LADDER` e `/aberturas/brancas/alapin` com **0** elementos, 0 textos, 0 setas e **0 workers**; `/editor/v2/…` o manda a `/painel`. Console do aluno: só o aviso de imagem LCP anterior à fatia |
| aba escondida | trazer outra aba para a frente **não** escondeu a página neste navegador (`document.hidden` continuou falso). Provado com o sinal simulado (`document.hidden` = verdadeiro + `visibilitychange`): `stop` e "pausado"; de volta, `position` + `go`. Prova o manipulador, não o sinal real do navegador |

**Três ocorrências da sessão que não são defeitos do código, registradas para ninguém tropeçar:**

1. **A medida e o zoom.** No meio do roteiro o navegador passou de `devicePixelRatio` 1 para 0,9
   (`innerWidth` 1517). As medidas feitas nesse intervalo foram descartadas; `Control+0` não
   voltou, e `setViewportSize(1230, 692)` deu de novo 1366×768 de CSS. A geometria final é dessa
   medida.
2. **Uma variante apareceu sozinha no rascunho do repertório.** Às 22:00:05, 14 s depois de começar
   uma rodada em que o script só apertou `→` uma vez e ficou lendo a faixa, o rascunho
   `.editor/repertorio/brancas-alapin.pgn` foi gravado com `(1... e5 2. Nf3 f6 3. Nxe5 fxe5 4. Qh5+
   Ke7 5. Qxe5+ Kf7 6. Bc4+ Kg6)` — a armadilha da Damiano, lance a lance. Nenhuma outra sessão
   gravou arquivo naquele minuto; o motor não tem caminho de escrita; a reprodução com o mesmo
   roteiro não criou nada (nenhum POST). A hipótese mais provável é mão humana na janela visível do
   Playwright, que também explicaria o zoom. **O arquivo não foi apagado** e foi levado ao Doug.
   Nada publicado mudou: 887/887 hashes iguais.
3. O máximo de **1.021 ms** numa troca de posição, na rodada da variante, não se repetiu na rodada
   limpa (máx. 40,3 ms).

**Acabamento visual depois do roteiro.** Uma captura com o motor ligado e outra desligado foram
descritas por um subagente, e cinco ajustes de classe entraram: a barra desligada ganhou borda
tracejada (com fundo escuro ela parecia a trilha de rolagem da coluna), a marca do meio passou do
âmbar para cinza, o vão barra–tabuleiro de 6 para 4 px (o repertório passou a `max-w-[28.125rem]`),
o "+N" ficou mais legível e a nota da tablebase alinhou com os lances. O cinza da seta perdeu o
pingo de azul (`oklch(30% 0 0)`), que puxava para as casas do tabuleiro. **Remedido depois:** Editor
v2 com tabuleiro de 547 px ligado e desligado, 6 e 5 lances inteiros, 0 botões cobertos, sem
rolagem; repertório com 432 px nos dois estados.

**Limpeza e prova final:** o aluno de teste foi apagado; `content/rascunhos/lessons/N0-LADDER.json`,
criado às 21:43 pelo pré-carregamento do `next dev` e byte a byte igual ao publicado, foi apagado;
**886 dos 887 SHA-256 iguais**, `N1-KPK.json` `4be602ca…b822` intocado. O que mudou foi
`.editor/v2/N0-LADDER.json` (`753ce4e5…` → `85582ac7…`, 21.655 → 26.254 bytes): ganhou **25 lances
de variante**, cujos ids carregam a hora em que nasceram — entre **22:09:45 e 22:30:17**, um a um. A
última ação desta sessão no navegador foi às 22:11:38, deixando a página em `about:blank`, e nenhum
script do roteiro clicou no tabuleiro fora do item 6 (desfeito, com hash conferido às 21:56). É
autoria de outra pessoa na N0-LADDER, preservada sem ser aberta no editor; o mesmo vale para o
rascunho `.editor/repertorio/brancas-alapin.pgn` (ocorrência 2 acima). Os dois foram levados ao Doug. **O Doug confirmou que foi ele e pediu para desfazer (14/9/2026):** a N0-LADDER voltou ao snapshot `antes-de-publicar-pub-64ffac2c7bb1e700` (hash `753ce4e5…`, o mesmo de antes do roteiro) e o rascunho da Alapin foi apagado; **887/887 SHA-256 iguais** aos de antes. Cópia das duas versões desfeitas ficou fora do repositório, no rascunho da sessão.

**§28:** marcado "Barra e linhas Stockfish isoladas do motor do aluno" — worker próprio provado por
teste com duas instâncias e pelo contador de workers na tela, invisível ao aluno provado pela guarda
de imports e pela conta de aluno de teste, com o roteiro de 14 itens; sem teste com uma pessoa, que
fica para a fatia 10.

### O que a fatia 9 NÃO cobre — registrado, sem reduzir §23 nem §28

- **Teste humano**: fica para a sessão final da fatia 10 (ritmo de rodada longa). O motor não tem
  arrasto novo; o `(?)` e os botões são clique.
- Clicar numa linha do motor para virar variante (posterior, §23.1), e o Opening Explorer.
- A pausa por aba escondida está provada só com o sinal simulado.
- Com 2 ou 3 linhas **abertas**, a lista cai para 4 lances inteiros em 1366×768; por isso abrem
  recolhidas.
- A tecla `L` com o menu `•••` de um lance aberto ainda liga/desliga o motor (o menu não conta como
  janela aberta).
- Profundidade 22 medida em duas posições (duas torres: ~1 s; 1.e4 c5: 3,4 s); não medida num
  meio-jogo pesado nem em celular — o editor é desktop.
- A 375 px o editor não foi olhado nesta fatia (a dívida da rolagem lateral é anterior).

---

## Fatia 10 — desempenho, acessibilidade e teste de uso final, em andamento desde 14/9/2026

Plano aprovado pelo Doug em 14/9, ampliado por ele: além de §24 e §25, a fatia constrói as três
telas que faltavam para uma aula nascer inteira pela tela (**proveniência** §19.1, **prática**
§17.1, **introdução** §7.1), a **ordem das etapas** (§18), **importar do Lichess por link** (§13.2)
com os modos do estudo, **atalhos** num registro único (`x` vira o tabuleiro), e **ensaios de
navegador guardados no repositório** (`npm run e2e`). Paradas 10A → 10I, um commit por parada.

**Pedido do Doug no meio da 10A (14/9):** o ensaio "aula do zero" passa a ser a **recriação, à mão e
pela tela, do estudo dele "Mate de Dama e Rei"** (`lichess.org/study/hf09xMzS`, 9 capítulos) —
introdução, aulas guiadas com as variantes, os treinos com as respostas diferentes (inclusive o erro
do afogamento) e a prática livre —, comparada no fim com a mesma aula importada do Lichess. A
exportação de 13/9 (11.245 bytes, SHA-256 `9cdd5898…f274`) virou fixture em
`e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn`.

### Parada 10A — a estrutura dos ensaios e a linha de base

- `playwright.config.ts`: `testDir: "e2e"`, `workers: 1`, `trace: "retain-on-failure"`, `pt-BR`,
  `webServer` com o `next dev` que já estiver na porta 3000; perfis `editor-1366` (todos os
  ensaios) e `editor-1280`, `editor-1920`, `aluno-375` (só `layout.spec`). Instalados
  `@playwright/test@1.62.1` (a mesma versão do `playwright` que já havia) e `axe-core@4.13.0`.
  Guia lido antes: `01-app/02-guides/testing/playwright.md`.
- `e2e/preparo/`:
  - `protecao.ts` — impressão digital SHA-256 de `content/**`, `.editor/repertorio/**`,
    `public/repertorio/**`, `.editor/v2/N0-LADDER.json` e `.editor/v2/N1-KPK.json`; a lista dos
    lugares em que um ensaio pode escrever, sempre com `EX-E2E-` no nome. O rascunho v1 que o
    `next dev` cria ao pré-carregar `/editor` fica fora da comparação, com o motivo escrito.
  - `global-setup.ts` — **recusa** rodar se houver resto `EX-E2E-…`; grava a impressão; cria
    `professore2e` (PIN **sorteado a cada rodada**, só na memória) e `alunoteste`; entra pela tela
    de login real e guarda as duas sessões em `.editor/e2e/` (fora do Git); copia a aula de fixture
    `EX-FIXTURE-V2` para `.editor/v2/EX-E2E-BASE.json`.
  - `limpeza.ts`, `global-teardown.ts` e `npm run e2e:limpar` — apagam só `EX-E2E-…` e as duas
    contas, refazem o SHA-256 e **falham** se um arquivo protegido mudou, surgiu ou sumiu (a N1-KPK
    também pelo nome).
  - `fixtures.ts` — o `test` de todos os ensaios: erro de console reprova; **a rota do editor de
    qualquer aula `N…` é bloqueada na rede** (nenhum ensaio abre N0-LADDER ou N1-KPK, nem por
    pré-carregamento); `aluno` numa sessão separada; `conferirTamanho` antes de medir (memória do
    zoom).
  - `tabuleiro.ts` — `jogar`, `jogarLinha`, `desenharSeta`, `acenderCasa` por `page.mouse` (evento
    confiável, que o chessground aceita). Prova clique-clique e botão direito; **não** prova arrasto.
  - `medidas.ts` — largura da página e culpados, axe (só sérias e críticas), lances inteiros
    visíveis, botões cobertos (a régua da 9D).
- Scripts: `e2e`, `e2e:base`, `e2e:layout`, `e2e:a11y`, `e2e:desempenho`, `e2e:limpar`.
- `e2e/editor/fumaca.spec.ts` — professor abre a `EX-E2E-BASE`, joga um lance novo por clique, o
  arquivo em disco ganha o lance, Ctrl+Z tira; o aluno abre `/painel`. **Verde em 5,6 s.**

**Dois tropeços do próprio ensaio, na primeira rodada:** o rótulo "✓ salvo" casava com o texto
"não são alterados" do cabeçalho (seletor trocado por um exato); e o ensaio lia "salvo" antes de o
autosave (600 ms) trocar o estado — a prova passou a ser o arquivo em disco, e só depois o rótulo.

**A limpeza provada:** nas quatro rodadas, **972 de 972** arquivos protegidos iguais, 1 resto
apagado (a aula base) e as duas contas apagadas.

**A linha de base** (`npm run e2e:base`, `.editor/e2e/linha-de-base.json`, 14/9/2026, antes de
qualquer conserto; `innerWidth` conferido, `devicePixelRatio` 1):

| Tela | Largura do conteúdo | Axe (sérias/críticas) | Outras |
|---|---|---|---|
| Editor 1366×768 | 1366 (0 a mais) | `color-contrast` ×3 | **6** lances inteiros, **0 de 50** botões cobertos |
| Editor 375 px | **865** (490 a mais — a dívida registrada era 600) | — | culpado: a fileira de botões do cabeçalho (`div.flex.items-center.gap-2`, sem quebra) |
| Aluno 375: `/painel` | 375 | `color-contrast` ×2 | — |
| Aluno 375: `/trilha`, `/finais`, `/finais/N0-LADDER`, `/tatica` | 375 | 0 | — |
| Aluno 375: `/aberturas` | 375 | `color-contrast` ×5 | — |
| `/entrar` 375, sem sessão | 375 | `color-contrast` ×2 | — |

**Os sete portões:** tipos, lint, **1.247 testes**, build, conteúdo (38 do cache, 0 pela rede),
**57/57 mutações** e repertório `--check`.

### Parada 10B — proveniência (§19.1) e o seletor do acervo

- **Modelo, mudança aditiva** (`modelo.ts`): `inicio {tipo: "fen"}` ganhou `revisao?` —
  `origem` (obra, estudo-lichess, partida, autoria-propria, desconhecida; **o único campo
  obrigatório**, decisão do Doug), autor, obra, página, link, licença e nota opcionais, `fenRevisada`,
  `revisadoEm`, `professor`, `mostrarCredito` e `direitoDosTextos`. `FEN_IMPORTADA_SEM_REVISAO` passou
  a olhar a revisão: ausente, ou com `fenRevisada` diferente da FEN de agora (mensagem com o antes e o
  depois). `ORIGEM_DESCONHECIDA` é aviso novo, nunca promovido nem resolvível. Trocar a posição
  inicial (`trocar-posicao.ts`) conserva a revisão com a FEN antiga — é isso que a torna caduca.
- **Uma decisão minha, contra a letra do plano:** o plano fala em `hashDaFen`. Guardei a própria FEN
  (`fenRevisada`): o comando roda no navegador, onde `node:crypto` não existe, e a FEN é menor que o
  hash e igualmente exata.
- `lib/editor-v2/proveniencia.ts`: `prepararRevisaoDaFen` (recusa sem origem e link sem `http`, com o
  campo), `aplicarRevisaoDaFen` (recusa se a FEN mudou com a janela aberta; a mesma revisão não é
  edição), `estadoDaProveniencia`, `linhaDeCredito` ("Posição: Dvoretsky, Manual de Finais, p. 12") e
  `creditosDaAula`. Comando `REGISTRAR_PROVENIENCIA`, com Desfazer.
- **Regra de publicação nova** `TEXTO_SEM_DIREITO_DECLARADO` (§12.3): narração de capítulo cuja posição
  veio de obra, estudo ou partida só publica com a marca "os textos são meus ou tenho direito". O
  comentário da árvore não conta — ele é privado e não atravessa. Estrago no teste e **mutação nova**.
- **Tela:** `DialogoProveniencia.tsx` sobre o `Dialogo` comum (tabuleiro pequeno, FEN, a origem em
  rádio com "✓", detalhes opcionais recolhidos, crédito ao aluno com a prévia da linha, e a marca do
  direito só para terceiros). Abre por **Ir para o problema** (o destino ganhou `janela`, que também
  leva à autoria do treino e, na 10C, à prática) e pelo `•••` do capítulo ("De onde veio a posição…");
  capítulo sem revisão mostra ⚑ na lista. A página passa o nome do professor.
- **Crédito ao aluno:** `AulaDoAlunoV2.creditos` leva só as frases; o `LessonPlayer` as mostra,
  discretas, na última etapa. A revisão inteira fica no pacote.
- **Acervo:** `lib/editor-v2/acervo.ts` e `SeletorDoAcervo.tsx` (grupo de rádio com miniatura,
  resultado esperado, estado, peças, busca sem acento, escolha marcada por borda, fundo e "✓"). A
  página calcula o hash de cada posição no servidor. **Porta nova** "Posição do acervo" em Adicionar
  capítulo: a análise nasce `inicio {tipo: "posicao"}` e a posição entra uma vez só no registro de
  proveniência. O editor passou a conhecer as posições do acervo além das da aula.
- Adiantado da 10E, sem tela ainda: `lib/editor-v2/lichess-url.ts` com os três endereços conferidos na
  especificação oficial (`lichess-org/api`, 14/9): `/game/export/{id}`,
  `/api/study/{id}/{capitulo}.pgn` e `/api/study/{id}.pgn`, com `orientation=true&clocks=false`.
  Recusa host que não é `lichess.org` (inclusive `lichess.org.evil`, usuário e senha, porta),
  redirecionamento para fora, mais de 2 MB, 20 s e cancelamento. 3 testes.

```
ANTES   proveniencia.test.ts: o módulo não existia — falha ao carregar (1 fail)
        conferencia.test.ts: tests 20, pass 18, fail 2
          ✖ toda regra da lista tem um estrago · ✖ TEXTO_SEM_DIREITO_DECLARADO impede publicar
DEPOIS  proveniencia 5/5 · conferencia 20/20 · acervo 2/2 · diagnostico-visual 11/11 · lichess-url 3/3
```

Um teste antigo mudou de propósito: `diagnostico-visual.test.ts` afirmava "o piloto ainda não navega
até um treino" — agora navega (abre a autoria).

**O ensaio `e2e/editor/proveniencia.spec.ts`, verde em 5,3 s:** capítulo por FEN colada → a lista de
problemas mostra **1** "ainda não passou por revisão de proveniência" e o capítulo ganha ⚑ → **Ir para o
problema** abre a janela → Registrar sem origem é recusado com a frase → Autoria própria → **0** avisos,
e o disco tem `origem autoria-propria`, `fenRevisada` e `professor "Professor de Ensaio"` → o `•••`
reabre com "Revisada em … por Professor de Ensaio" → Ctrl+Z traz o aviso de volta, Ctrl+Y tira →
"Posição do acervo" com a busca "cook" cria o capítulo com `inicio posicao` e o registro, sem aviso.

**Número da parada:** `FEN_IMPORTADA_SEM_REVISAO` **1 → 0** na aula de ensaio; mutações **57 → 58**.

**Os sete portões:** tipos, lint, **1.258 testes**, build, conteúdo (38 do cache, 0 pela rede),
**58/58 mutações** e repertório `--check`. Limpeza do ensaio: 972/972 iguais.

### Parada 10C — a prática pela tela (§17.1)

- `lib/editor-v2/pratica.ts`: `prepararPratica` (título, posição de até 7 peças, lado que não perde,
  objetivo compatível com o resultado esperado — vencer numa posição de empate é recusado —, força
  0–20 e 50–5000 ms; ids decididos no clique e mantidos na edição), comandos `ADICIONAR_PRATICA` (no
  **fim** do fluxo, recusa a segunda prática), `EDITAR_PRATICA` e `EXCLUIR_PRATICA`, e
  `mudancasDeAvaliacao` (posição, lado, objetivo, adversário — o título não entra, igual à conta de
  `avaliacao.ts`). Padrão do adversário: o da N0-LADDER, força 20 e 300 ms.
- **Não inventei campo que o runtime não joga.** Ajuda permitida na prática, limite de lances
  configurável, várias práticas e prática opcional ficam **abertos** em §17.1 e §28.
- `lib/editor-v2/acervo-em-disco.ts` + action `adicionarAoAcervoV2Acao`: "Adicionar ao acervo" grava
  `content/positions/<série>/pos-<aula>-<n>.json` como **candidate**, com os 9 campos de proveniência
  que o `validate:content` exige e a obra do registro (`posicoes-do-preparatorio` para autoria própria,
  `lichess-open-database` para partida, escolhida da lista para obra e estudo). O resultado vem do
  **cache** da tablebase, sem rede; sem cache, o professor declara e a tela avisa para rodar o
  `validate:content`. Até 7 peças; origem desconhecida recusada (o acervo exige obra); a mesma FEN é
  reaproveitada em vez de duplicada.
- `DialogoPratica.tsx`: título, posição (do acervo, com as de mais de 7 peças desabilitadas e o motivo;
  ou de um capítulo desta aula, com a origem já registrada nele), lado, objetivo, computador, os três
  fatos fixos em texto, e o aviso **"Mudar adversário cria uma nova versão da avaliação"** antes de
  salvar. `PreviaDaPratica.tsx`: o `PracticeStage` do aluno sob um id próprio da store, sem gravar; o
  motor do professor pausa atrás. Cartão **Prática** na coluna esquerda; "Ir para o problema" da
  `PRATICA_AUSENTE` abre a janela.
- A limpeza dos ensaios passou a apagar também `pos-ex-e2e-*` do acervo (e a pasta `EX` vazia).

```
ANTES   pratica.test.ts: os módulos não existiam — falha ao carregar
DEPOIS  pratica.test.ts 4/4 (criar/editar/excluir com Desfazer; título não muda a revisão e o
        adversário muda; as recusas com campo; adicionar ao acervo numa pasta temporária)
```

**O ensaio `e2e/editor/pratica.spec.ts`, verde em 16,1 s:** renomear não avisa nada; força 10 mostra o
aviso de versão nova; salvar; excluir com a confirmação → **Conferir: 1** "não tem prática contra o
computador" → capítulo com a FEN da prática livre do estudo (`8/8/8/8/4k3/8/8/3QK3 w`) e origem
"autoria própria" → **Ir para o problema** abre a prática nova → "De um capítulo desta aula" →
"Adicionar ao acervo e usar" cria `pos-ex-e2e-base-1` com "brancas ganham" **vindo do cache** → a
prévia joga Dd4 e o rei preto sai de e4 (o Stockfish respondeu) → Criar → **Conferir: 0**.

**Número da parada:** `PRATICA_AUSENTE` **1 → 0**.

**Os sete portões:** tipos, lint, **1.265 testes**, build, conteúdo (38 do cache, 0 pela rede),
**58/58 mutações** e repertório `--check`. `db:rls` e `db:finais:v2` não rodaram nesta parada: nada no
banco nem na gravação mudou; ficam para a 10G, com a prática jogada pelo aluno.

### Parada 10D — introdução (§7.1) e ordem das etapas (§18)

- **Modelo, aditivo:** o quadro ganhou `titulo?` e `lance?` (o lance que levou à posição, para o
  aluno ver de onde a peça saiu).
- `lib/editor-v2/introducao.ts`: comandos `ADICIONAR_INTRODUCAO` (entra no **começo** do fluxo),
  `EXCLUIR_INTRODUCAO`, `RENOMEAR_INTRODUCAO`, `ADICIONAR_QUADRO` (também duplica), `EXCLUIR_QUADRO`
  (recusa o último: "use Excluir introdução"), `EDITAR_QUADRO` (esvaziar o texto não apaga),
  `DEFINIR_POSICAO_DO_QUADRO` (referência a um lance do capítulo ou FEN própria), 
  `DEFINIR_DESENHOS_DO_QUADRO` e `MOVER_QUADRO`; `quadroDepoisDoLance` ("inserir lance"). **A FEN
  escrita igual à posição inicial de um capítulo é recusada com o nome dele** — a referência é a
  fonte única —, e os contadores de lance não fazem outra posição.
- `lib/editor-v2/fluxo.ts`: `MOVER_ETAPA`, `EXCLUIR_TREINO`, `indiceAntesDaPratica` e `etapasNaOrdem`
  com a frase do lugar ("depois do capítulo «X»"). **Capítulo novo e capítulo importado sem lugar
  escolhido passam a entrar antes da prática** (`novo-capitulo.ts`, `importar-pgn.ts`); antes caíam
  depois dela. Um teste antigo de `novo-capitulo.test.ts` afirmava o fim do fluxo e foi atualizado
  com o motivo.
- `passosDaIntroducao` saiu de `etapasDoAlunoV2`: a aula publicada e a prévia usam a mesma função. O
  `IntroStage` do aluno mostra o título do quadro, marca o lance e anuncia "Quadro X de Y" ao leitor
  de tela.
- **Tela:** `EditorDeIntroducao.tsx` em tela cheia — quadros à esquerda (↑ ↓, duplicar, excluir,
  quadro novo com texto), tabuleiro no centro (botão direito desenha; **jogar uma peça cria o quadro
  seguinte**), título, texto e posição à direita; ← e → trocam de quadro fora dos campos; a recusa
  aparece na própria tela cheia. `PreviaDaIntroducao.tsx` com o `IntroStage`. `OrdemDaAula.tsx` com
  ↑ ↓ e o aviso "a prática não é a última etapa". Na coluna esquerda, o cartão **Introdução · N
  quadros** (ou "+ Criar introdução") e **Ordem da aula · N etapas…**; cada treino ganhou **Excluir
  treino…** com confirmação. "Ir para o problema" de um quadro abre o editor da introdução nele.
- O impacto de excluir capítulo ou cortar lance referenciado por quadro já existia (`impacto.ts`,
  "virar FEN" ou remover); não foi refeito.

```
ANTES   introducao.test.ts: os módulos introducao.ts e fluxo.ts não existiam — falha ao carregar
        novo-capitulo.test.ts com a regra nova: 1 falha ("no fim" esperava capítulo por último)
DEPOIS  introducao 3/3 · novo-capitulo, importar-pgn e fluxo-do-aluno verdes (38/38 nos quatro)
```

**Os ensaios, verdes na primeira rodada:**

- `e2e/editor/introducao.spec.ts` (8,2 s): na introdução de 3 quadros da aula base, → troca de quadro;
  título "Diagnóstico" gravado; quadro novo e duplicado (5); desenho g2→g6 pelo botão direito gravado
  no quadro; **Tg1–a1 jogado no tabuleiro cria o quadro 4 de 6** com `lance g1a1` e a FEN
  `8/8/8/8/8/4k3/6R1/R6K b - - 1 1`; a FEN igual à do capítulo é recusada com "posição inicial do
  capítulo «Uma fileira de cada vez»"; excluir → 5, Ctrl+Z → 6; a prévia mostra o título no
  `IntroStage`; recarregar mantém os 6 quadros.
- `e2e/editor/fluxo.spec.ts` (7,5 s): 4 etapas; subir a prática grava `…pratica, treino` e mostra o
  aviso; Ctrl+Z volta e o aviso some; fechar devolve o foco ao botão; capítulo "no fim da aula" entra
  como `…treino, capitulo, pratica`; excluir o treino deixa `introducao, capitulo, capitulo, pratica`.

**Os sete portões:** tipos, lint, **1.268 testes**, build, conteúdo, **58/58 mutações** e repertório `--check`.

**Número da parada (10D):** `introducao.spec` e `fluxo.spec` verdes; ordem do aluno = `fluxo` (a mesma função
`passosDaIntroducao` e o `etapasDoAlunoV2` na ordem do fluxo, provados em `fluxo-do-aluno.test.ts`).

### Parada 10E — importar do Lichess por link (§13.2) e os modos do estudo

**A fixture foi trocada.** A exportação de 13/9 (11.245 bytes) não tinha `ChapterMode`, `Orientation`
nem as variantes dos treinos: o Doug mexeu no estudo depois. A de hoje, baixada pelo próprio leitor de
endereço (`/api/study/hf09xMzS.pgn?orientation=true&clocks=false`), tem **11.691 bytes**, SHA-256
`e498a948…40b2`, e é a que o plano descreveu: `ChapterMode "gamebook"` em 04–07, `Qg6??` em 02, 03 e 06,
e Qg6#/Qh3#/Qh4# mais Qg7+ no 07.

- **O leitor do estudo** (`lerPgnsDoEstudo`, em `lib/repertorio/pgn.ts`): `lerPgns` só fecha um jogo
  quando viu lance, e engolia os capítulos só de texto — **6 jogos em vez de 9**. A função nova fecha o
  jogo em qualquer corpo; `lerPgns` ficou intacta, porque o compilador do repertório depende dela.
- `lib/editor-v2/importar-estudo.ts`: `lerEstudo` (destino sugerido por capítulo com a pista, lado por
  `Orientation`/"Aluno", as perdas — dicas e desvios da lição interativa, modo "praticar contra o
  computador", texto da prática sem lugar —, autor e link do estudo), `planejarEstudo` (tudo com ids,
  sem tocar na aula) e `aplicarPlanoDoEstudo`, pelo comando **`IMPORTAR_ESTUDO`** (um Desfazer). O
  treino nasce pela derivação de sempre (`prepararTreinosDaqui`) num rascunho, fica **independente**, e
  ganha as variantes do lance do aluno: `#`/`!`/`!!` → correta; `?`/`??`/`?!` → **erro nomeado no
  catálogo**; sem símbolo → erro **marcado para revisar**. O texto do lance do defensor vira o texto da
  defesa. A análise do treino fica na aula, sem capítulo, com a proveniência. O quadro da introdução
  guarda os parágrafos e aponta o capítulo que tem a mesma posição. Importar o mesmo estudo de novo é
  recusado ("parece já ter sido importado").
- `buscarPgnDoLichessAcao` (servidor, autenticada) e a tela: campo **Endereço do Lichess** com Buscar e
  Cancelar no `PainelDeImportacao`; a quinta porta de Adicionar capítulo leva até ele. Estudo detectado →
  `PainelDoEstudo.tsx`: um seletor **Vira** por capítulo, proveniência pré-preenchida (estudo do Lichess,
  autor, obra, link, crédito, direito dos textos), obra do registro e resultado declarado da prática, o
  resumo "a aula ganha…" e os avisos antes do botão. A prática entra no acervo pelo servidor antes do
  comando.

**Um defeito achado rodando, consertado:** trocar o seletor **Vira** derrubava a página ("This page
couldn't load"): o valor era lido de `e.currentTarget` dentro da função de atualização do estado, que o
React roda depois do evento. Reproduzido no navegador com a exceção capturada
(`Cannot read properties of null (reading 'value')`); lido antes de chamar o estado, o ensaio passou.

```
ANTES   importar-estudo.test.ts: os módulos não existiam — falha ao carregar
        com o módulo e lerPgns: "as pistas": 6 !== 9 capítulos
DEPOIS  importar-estudo.test.ts 3/3
```

**Os ensaios** (`e2e/editor/importar-estudo.spec.ts`): pelo **arquivo**, os 9 seletores vêm com
`introducao, introducao, capitulo, capitulo, treino, treino, treino, treino, pratica`; "a aula ganha 2
quadros, 2 capítulos, 4 treinos e 1 prática"; o aviso "Qg7+ não tem símbolo"; importar → fluxo
`introducao, capitulo×2, treino×4, pratica`, quadro com parágrafos, mates `g4g6 g4h3 g4h4`, prática em
`pos-ex-e2e-lichess-1` (resultado **declarado**: a posição não está no cache da tablebase); importar de
novo → "parece já ter sido importado"; **Conferir: "0 problemas impedem publicar, 12 avisos. Pode
publicar."** (os avisos são da régua de voz: textos longos do estudo). Pelo **link real** (`@rede`), os
mesmos 9 destinos; endereço de outro site recusado sem busca.

**Um achado para o Doug no texto do estudo:** o quadro 1 diz "usar sua dama para criar uma e prender o
rei" — parece faltar "caixa".

**Número da parada:** estudo `hf09xMzS`: **9/9** capítulos no destino certo (2 quadros, 2 capítulos, 4
treinos, 1 prática), **2/2** `Qg6??` nos capítulos (e o do treino 06 como erro nomeado), **3/3** mates do
treino 07, perdas listadas, Conferir sem erro.

**Outra sessão no mesmo repositório (15/9, 09:20):** a sessão `preparatorio-olesc-e0` estava editando
`lib/repertorio/{arvore,linhas,passada,editor/impacto}.ts`, `app/globals.css` e `ChessBoard.tsx`, e o
`passada.test.ts` dela em andamento quebrava o typecheck do repositório. Combinei com ela por mensagem;
nada dela foi tocado nem commitado. Os portões da 10E rodaram numa **cópia isolada** (`git worktree`
em `../olesc-portoes`, com o último commit e só os arquivos da 10E) e o commit saiu de lá.

**Os sete portões (na cópia isolada):** tipos, lint, **1.271 testes**, build, conteúdo (38 do cache, 0
pela rede), **58/58 mutações** e repertório `--check`.

### Parada 10F — atalhos, acessibilidade e layout

- **Tabela única** (`lib/atalhos/tabela.ts`): cada atalho com teclas, escopo (tabuleiro, editor,
  repertório, introdução do editor, etapas do aluno, passada, janela) e a frase da ajuda;
  `conflitosDaTabela` (nenhuma tecla repetida no escopo, e `x`/`?` do tabuleiro sem colisão com nada).
- **Despachante** (`lib/atalhos/registro.ts`, puro): um ouvinte só, **pilha de camadas** — cada janela
  modal empilha a sua, e os atalhos de baixo ficam mudos; campo de texto engole a tecla, menos o Esc; o
  Desfazer do documento vale com janela aberta, como valia.
- **Tela** (`components/atalhos/Atalhos.tsx`): `useAtalho`, `useCamadaDeJanela`, `VistaDoTabuleiro`
  (**`x` vira só a vista** — um contexto que o `ChessBoard` lê; não muda a aula, não entra no Desfazer e
  não muda o lado do aluno na prática ou no treino), `useTeclasDoTabuleiro` e a ajuda **`?`** gerada da
  tabela, que também preenche o `(?)` da lista de lances.
- **O que passou para o registro:** Ctrl+Z/Ctrl+Y, setas/Home/End e Esc do desenho no `EditorV2`; o `L`
  do motor (`useControlesDoMotor`, nos dois editores); ← → da tela cheia da introdução; Esc de todas as
  janelas (`foco.ts`); o menu `•••` do lance, que agora é uma camada — **o `L` com o menu aberto deixou
  de ligar o motor** (aberto desde a fatia 9) e o Esc devolve o foco ao `•••`. `x` e `?` valem no editor,
  nas quatro prévias, na introdução, no player do aluno (v1 e v2) e na tática.
- **Não passou (cortes registrados):** as setas do `EditorDeRepertorio` e da introdução do aluno
  (`IntroStage`) continuam com o ouvinte próprio; a **passada do repertório** está só na tabela — o
  arquivo estava sendo editado pela outra sessão. Espaço = Continuar no capítulo do aluno não foi feito.
- **Foco:** `usePrisaoDeFoco` virou o contrato único — Esc pela camada, Tab preso (inclusive vindo de
  fora da janela) e **o foco volta sozinho** a quem abriu. As prisões copiadas do `DialogoNovoCapitulo`,
  do `PainelDeImportacao` e do `DialogoTrocarPosicao` saíram. `PromotionPicker`: foco na dama, setas
  entre as peças e Esc cancela.
- **Cor não é o único sinal:** capítulo selecionado com "▸" e negrito; lance selecionado com negrito e
  anel. A escolha na janela da origem, da prática e do acervo já tinha "✓".
- **Contraste:** o verde de seleção era usado **sólido** (`bg-metodo-superficie` com texto verde-claro)
  em 37 lugares do editor, contra o próprio sistema de cores ("a superfície é o mesmo tom com alfa");
  passou a `/25`. No aluno, os números de `/aberturas` e a falta dos selos em `/painel` passaram de
  `tinta-muda` para `tinta-fraca` — carregam informação. O campo de arquivo da importação ganhou rótulo.
- **Layout:** o cabeçalho do editor quebra linha; o player v2 do aluno mostra **"Etapa X de Y · nome"** e
  **← Etapa anterior**.
- **Uma correção pedida pela outra sessão:** a orientação do `ChessBoard` virou
  `useOrientacaoDaVista(orientacaoPedida)` com o mesmo nome `orientation`, e o efeito da seta dela
  (`setaQueEnsina`) usa a orientação já virada. Commit só do meu trecho.

```
ANTES   tabela.test.ts: os módulos não existiam — falha ao carregar
DEPOIS  tabela.test.ts 3/3 (sem conflitos; tecla do evento; despachante com campo, janela e Esc)
```

**Os ensaios** (`atalhos.spec`, `layout.spec @layout` nos quatro perfis, `acessibilidade.spec @a11y`):

| Medida | Linha de base (10A) | Agora |
|---|---|---|
| editor a 375 px | **865** px de conteúdo | **375** (0 a mais) |
| axe sérias/críticas — editor | `color-contrast` ×3 | **0** |
| axe — janelas (Adicionar capítulo, Importar, Prática, Ordem, Introdução, Pré-visualizar, Atalhos) | não medido | **0** (1 crítico achado e consertado: campo de arquivo sem rótulo) |
| axe — `/painel`, `/aberturas`, `/entrar` | 2, 5, 2 | **0, 0, 0** |
| axe — `/trilha`, `/finais`, `/finais/N0-LADDER`, `/tatica` | 0 | 0 |
| lances inteiros visíveis | 6 (1366×768) | 6 (1366×768), 5 (1280×720), 9 (1920×1080) |
| botões cobertos | 0 de 50 | 0 de 51 · 0 de 40 · 0 de 64 |
| aluno a 375 px, as 7 telas e as 4 etapas da N0-LADDER pela trilha | — | 0 px a mais em todas |

`atalhos.spec`: `x` vira e desvira com o arquivo em disco **igual**; `?` lista as descrições da tabela;
`L` liga e desliga; "l" digitado no comentário não liga; com o menu `•••` aberto o `L` fica mudo e o Esc
devolve o foco; → anda na lista; 30 × Tab dentro da janela não saem dela; com a janela aberta as setas
não mudam o lance; Esc fecha e o foco volta a "+ Adicionar capítulo". No aluno: `x`, `?`, "Etapa 2 de 4"
e "← Etapa anterior".

**A rodada inteira (`--project=editor-1366`, 22 ensaios) e um achado do próprio ensaio:** a prática
"falhou" na rodada completa porque a importação do estudo, antes dela, já tinha posto a mesma FEN no
acervo — e o editor, certo, reaproveitou `pos-ex-e2e-lichess-1` em vez de criar outra. O ensaio passou a
aceitar a posição reaproveitada. Na mesma rodada **a limpeza acusou diferença**: eram os PGN e JSON do
repertório que a outra sessão estava gravando naquele minuto — a proteção por SHA-256 funcionando, não
um estrago do ensaio. Rodando de novo, 972/972 iguais.

**Número da parada:** 0 conflitos na tabela; axe **3+2+5+2 → 0**; editor a 375 px **865 → 375**; foco preso
e devolvido nas janelas ensaiadas (Adicionar capítulo pelo teclado; as outras pelo contrato único).

**Os sete portões (na cópia isolada, sem os arquivos da outra sessão):** tipos, lint, **1.274 testes**,
build, conteúdo (38 do cache, 0 pela rede), **58/58 mutações** e repertório `--check`. Do
`ChessBoard.tsx`, só o trecho da orientação entrou no commit.

### Parada 10G — os ensaios grandes e o desempenho

**Um defeito de produto achado ao preparar a aula do zero, consertado:** num capítulo criado do zero,
os lances jogados entravam na análise e o **percurso do capítulo ficava vazio para sempre**
(`ADICIONAR_LANCE` não estendia `capitulo.caminho`). O capítulo não tinha lance para narrar ("este lance
é de uma variante fora do capítulo"), nem para "Criar treino daqui", e a prévia não mostrava nada. As
aulas convertidas do v1 e as importadas já nascem com percurso, e por isso nenhuma rodada anterior viu.
Agora o comando recebe o capítulo aberto e, quando o lance sai do **fim** do percurso e é a primeira
continuação daquela posição, o percurso ganha o lance; variante e continuação no meio não mudam nada.

```
ANTES   percurso-do-capitulo.test.ts: caminho [] (esperado ["n-1","n-2"]) — tests 1, fail 1
DEPOIS  tests 1, pass 1 (e as 403 provas de lib/editor-v2 verdes)
```

**`aula-do-lichess.spec.ts`, verde (56 s):** o estudo importado, conferido ("Pode publicar"), publicado,
e o aluno de teste faz as 8 etapas: introdução com ← →, os capítulos, o treino 04 (Dd5, a defesa Rf6, De4),
o 05, o **06 com Dg6?? recusado com "Afogamento…"** e a linha até Dg7#, o **07 com Dg7+ recusado ("tente de
novo") e Dh4# aceito com "Parabéns"**, e a **prática contra o Stockfish do navegador até o mate em 19
meios-lances** (os lances do aluno escolhidos pelo Stockfish em Node). No banco, **5 tentativas** — 4 de
treino e a prática, todas com sucesso e com `publication_id pub-bc3be7234b93946a`.

**Um comportamento do `next dev`, não do site:** `/finais/[aula]` tem `dynamicParams = false`, e o `dev`
guarda a lista de aulas da primeira compilação da rota. Uma aula publicada **depois** dá 404 até a rota
recompilar. O ensaio toca a data do arquivo da rota (sem mudar um byte). No teste humano: se a aula
recém-publicada der 404, reiniciar o `npm run dev` resolve. No site a lista sai do build.

### Parada 10G, continuação de 14/9/2026 — a aula do zero, dois defeitos e o desempenho

**Os quatro portões que faltavam sobre `bbc7c05`**, rodados na cópia isolada: `build` ✓,
`validate:content` ✓, `validate:mutations` **58/58 vermelhas**, `repertorio:compilar --check` ✓ ("o
compilado em disco bate com a fonte").

**`e2e/editor/aula-do-zero.spec.ts`, verde.** O estudo "Mate de Dama e Rei" recriado à mão pela tela na
`EX-E2E-ZERO`, sem importar nada (o PGN da fixture é só a folha de dados: lances, textos e cores):

- **Nova aula** extra, nível 1, classe E, e título trocado depois;
- **capítulo 02** com a posição **montada peça por peça** (clique na paleta e na casa), e o **03** por FEN,
  cada um com os lances, os `!`, as setas e casas nas quatro cores (botão direito com Shift/Alt), as
  narrações (a de abertura na posição inicial) e as variantes `Qg6??` com o comentário;
- a origem registrada pelo `•••` ("Autoria própria");
- os **treinos 04–07**, cada um num capítulo de rascunho → "Criar treino daqui" (lugar "no fim") →
  autoria com o texto de abertura, o feedback de cada resposta, o texto do defensor, o **erro do
  afogamento** (`g5g6`), os mates `Qh3#`/`Qh4#` como corretas e `Qg7+` como erro → o rascunho excluído
  ("Tornar independente");
- a **introdução** com os quadros 00 e 01 (ligados à posição inicial do capítulo 03), e um quadro de
  sobra com título, duplicar, "↑ Antes", seta, lance inserido e três exclusões;
- a **prática** "De um capítulo desta aula" → Adicionar ao acervo;
- **Ordem da aula** (subir e descer um treino), **Ctrl+Z ×5 / Ctrl+Y ×5** com o arquivo byte a byte igual
  ao de antes, **recarregar**, prévia de capítulo e de treino com `x` e `?`, **Conferir** ("Pode
  publicar") e **Publicar**.

Depois o aluno faz as 8 etapas: introdução com ←/→, os dois capítulos, os treinos (com o "Afogamento…"
recusado no 06, e `Qg7+` recusado e `Qh4#` aceito no 07) e a prática **até o mate** com o Stockfish em
Node. No banco, **5 tentativas** com `publication_id`. O professor leva 1,3–1,5 min; o aluno, 49 s.

**A comparação com a importação** (`EX-E2E-LICHESS`, na mesma rodada) passa: as mesmas etapas, os textos
e as posições da introdução, as posições, os lances e as variantes dos capítulos, as narrações, os
treinos (posição de cada pergunta, respostas aceitas com julgamento e término, defesas, feedback e texto
de abertura) e a prática. **Uma diferença fica como pendência:** a importação junta os parágrafos de
**1 narração** numa linha só (o leitor de PGN normaliza os espaços do comentário); a tela guarda as
quebras. O ensaio compara o texto sem as quebras e imprime a contagem.

**Dois defeitos de produto que a aula do zero achou, consertados com teste antes/depois:**

1. **O clique caía na casa errada depois que algo acima do tabuleiro mudava de altura.** O chessground
   guarda o `getBoundingClientRect` do tabuleiro e só o esquece em rolagem, resize ou mudança de tamanho
   do próprio tabuleiro. O aviso de proveniência sumia ao "Registrar revisão", o tabuleiro subia, e o
   clique virava outra casa: o lance não entrava (medido: props do React certas, estado do chessground
   limpo, `mousedown` confiável chegando ao `cg-board`, e mesmo assim nada selecionado). Conserto em
   `components/board/ChessBoard.tsx`: um ouvinte de captura esquece o retângulo antes de cada toque.
   Pegaria o professor com o mouse do mesmo jeito.
   ```
   e2e/editor/tabuleiro-deslocado.spec.ts   SEM o conserto: 9 lances (esperado 10) ✖   COM: ✔
   ```
2. **O texto de abertura do treino não tinha campo.** O treino importado do Lichess nasce com
   `introducao`, que vence o objetivo na tela do aluno (`treino-jogavel.ts`): corrigir o "Objetivo" não
   mudava o que o aluno lia. A janela de autoria ganhou "Texto de abertura" (vazio: o aluno lê o
   objetivo), aparado e retirado quando vazio.
   ```
   lib/editor-v2/autoria-treino.test.ts   ANTES: tests 13, pass 12, fail 1   DEPOIS: tests 13, pass 13
   ```

**`e2e/editor/repertorio.spec.ts`, verde (4–5 s):** comentar, desfazer, `x` e descartar o rascunho na
`pretas-colle`, com os arquivos protegidos iguais antes e depois.

**Todos os ensaios de tela, menos o de desempenho (`npx playwright test --grep-invert @desempenho`):
39 passaram, 25 pulados de propósito (cada perfil de tela só roda o layout dele), 0 falhas, em 5,2 min;
limpeza com 981 arquivos iguais.**

#### O desempenho (§24), medido e acelerado — parcial

`e2e/desempenho.spec.ts` rodou pela primeira vez e **as seis metas reprovaram**. O editor só existe em
`next dev`, então o número de `dev` é o que o professor sente. Máquina: Intel i3-1215U, 8 núcleos, com
outras sessões ligadas. O ensaio ganhou a divisão servidor/tela da abertura e deixou de ser serial (uma
meta reprovada não impede as outras medidas).

Um perfil em Node deu as causas, com arquivo e custo na árvore de 1.000 nós:

| Conta | Custo | Quando rodava |
|---|---|---|
| `acoesDoLance` de todas as linhas (`PainelDeLances.tsx`) | 100 ms | a cada render do painel, **inclusive a cada seta** |
| `problemasDaAulaV2` — o rejogo da legalidade (`modelo.ts`) | 114 ms | a cada edição, até comentário e desenho |
| `mapaDaAnalise` — o rejogo de posição/SAN (`arvore.ts`) | 111 ms | idem |

Consertos: as ações só são calculadas para o menu aberto; as linhas e a lista inteira são memorizadas, e
o lance selecionado chega às linhas por uma loja pequena (`useSyncExternalStore`), para trocar de lance
redesenhar só as duas linhas afetadas; e os dois rejogos ficam guardados pela **assinatura dos lances**
(`assinaturaDosLancesV2`: `uci` e `filhos` de cada nó). Comentário e desenho não os refazem; mudar um
lance, mesmo no próprio objeto, refaz. Em Node, com os lances iguais: **114 → 2,2 ms** e
**111 → 0,3 ms**. Testes novos em `modelo.test.ts` (o guardado não esconde lance ilegal novo; o mapa é o
mesmo objeto depois de um comentário e é refeito quando um lance muda) — antes, 41 testes com 1 falha;
depois, 41/41; e as 407 provas de `lib/editor-v2` verdes.

| Medida (p95 nas interações) | Antes | Depois | Meta |
|---|---|---|---|
| Abrir a árvore de 1.000 nós (mediana) | 3.953 ms (servidor 1.712 + tela 2.217) | **2.031 ms** (805 + 997) | ≤ 2.000 ✖ por 31 ms |
| Abrir a linha de 500 (mediana) | 2.961 ms | **1.948 ms** | ≤ 2.000 ✔ |
| Navegar por tecla | 655 ms | **124 ms** (mediana 97) | ≤ 100 ✖ |
| Confirmar comentário | 1.082 ms | **135 ms** | ≤ 100 ✖ |
| Ctrl+Z | 795 ms | **116 ms** (mediana 73) | ≤ 100 ✖ |
| Desenhar seta | 1.419 ms | **149 ms** | ≤ 100 ✖ |

**O que sobra** (~100 ms) é o render geral do `EditorV2` no React de desenvolvimento, e varia ~20% entre
rodadas; nada mais cresce com o tamanho da árvore. Um perfil de CPU no navegador mostrou o `jsxDEV` das
1.000 linhas (resolvido pela lista memorizada) e o `focus`/rolagem da lista. **Decisão para o Doug:**
perseguir os últimos 20–50 ms (dividir o `EditorV2`, virtualizar a lista) ou aceitar e registrar o limite.
§28 "limites e metas de desempenho comprovados" **não** é marcado.

### Parada 10H — o estado, as doze perguntas e o §28 com evidência (14/9/2026)

**Os quatro portões que a sessão dos símbolos não rodou**, sobre `61906c7` puro na cópia isolada
`../olesc-portoes` (nenhum arquivo rastreado modificado): `typecheck` ✓, `npm test` **1.293/1.293** (a
trava `marcas-das-fontes.test.ts` verde: 28 marcas em lance do adversário cortado e 347 em ramos fora do
repertório, impressas, sem reprovar), `validate:content` ✓ (38 do cache, 0 pela rede) e
`repertorio:compilar --check` ✓. Esta parada só mexe em documentos.

**"Estado de hoje, em vinte linhas"** reescrito no topo com a fatia 10.

#### As doze perguntas essenciais do plano, com a evidência que existe

"Sim" só com prova executada; "em parte" diz qual metade falta. As que dependem de gesto ou de tempo
real foram para o **bloco G** do roteiro humano (itens 40–44).

| # | Pergunta | Resposta | Evidência | O que falta |
|---|---|---|---|---|
| 1 | Desfazer tudo volta à abertura? | **em parte** | `aula-do-zero.spec`: Ctrl+Z ×5 / Ctrl+Y ×5 com o arquivo byte a byte igual | o botão **Desfazer tudo** nunca foi exercido (usa `window.confirm`; ver "o que esta rodada NÃO cobre" das sete fatias) → item 40 |
| 2 | Recarregar ou fechar a aba perde algo? | **em parte** | recarregar depois do "✓ salvo" mantém tudo (`aula-do-zero.spec`, `introducao.spec`, trocar posição); a cópia no IndexedDB sobreviveu ao reload no ensaio de 10/9 | fechar a aba **antes** do autosave de 600 ms nunca ensaiado → item 41 |
| 3 | Duas abas brigam? | **não brigam — provado em 10/9** | duas abas do mesmo hash: B recebe conflito sem sobrescrever A, abre o disco só depois do ACK do IndexedDB, e a cópia baixada tem a edição de B; `rascunhos.test.ts` | nunca repetido depois das fatias 1–10 e sem ensaio guardado → item 42 |
| 4 | A mensagem diz como corrigir, em português, sem id? | **em parte** | `diagnostico-visual.test.ts` 11/11 ("nenhum mostra id"); recusas com o campo nas regras de proveniência e prática | nenhuma varredura das regras novas de 10B–10E; "diz como corrigir" não é conferido por teste |
| 5 | Ir para o problema leva ao lugar certo nos tipos novos? | **em parte** | prática e proveniência abrem a janela certa (`pratica.spec`, `proveniencia.spec`) | quadro da introdução e treino só em teste unitário do destino, sem ensaio de tela |
| 6 | Prévia igual ao publicado? | **em parte** | a mesma função serve os dois (`passosDaIntroducao`, `etapasDoAlunoV2`; `fluxo-do-aluno.test.ts`); a comparação importação × aula do zero bate etapa a etapa | nenhum ensaio compara a prévia com a aula publicada; a prévia "aula inteira" encadeia só capítulos |
| 7 | Aula de 1.000 lances continua ágil? | **em parte — não cumpre a meta** | `desempenho.spec`: 116–149 ms de p95 nas interações (meta 100) e 2.031 ms para abrir (meta 2.000), em `next dev` num i3-1215U | decisão do Doug: perseguir ou registrar o limite |
| 8 | Botão coberto ou fora da tela em 1280×720? | **não, na tela principal** | `layout.spec` perfil `editor-1280`: 0 de 40 botões cobertos, 5 lances inteiros | janelas, prévias e tela cheia da introdução não medidas a 1280 |
| 9 | A aula inteira sem mouse? | **em parte** | `atalhos.spec`: Tab preso, Esc devolve o foco, setas na lista; menu do capítulo pelo teclado | nenhum ensaio da aula inteira pelo teclado → item 44 |
| 10 | Aluno no celular passa por todas as etapas? | **em parte** | `layout.spec` `aluno-375`: 7 telas e as 4 etapas da N0-LADDER com 0 px a mais | treino e prática **jogados** a 375 px nunca; celular de verdade é o item 28 |
| 11 | Republicar só texto preserva o progresso? | **em parte** | `avaliacao.test.ts`: título, feedback e narração não mudam a revisão da avaliação; a escada lê a revisão ativa; `db:finais:v2` 18/18 | nenhum ensaio republica com aluno que já tem progresso → item 43 |
| 12 | Importar o mesmo estudo duas vezes? | **sim, avisa e recusa** | `importar-estudo.test.ts` e `importar-estudo.spec`: "parece já ter sido importado" | só pelo arquivo; pelo link a repetição não foi ensaiada |

#### §28 — marcados nesta parada, e por quê

Seis itens passam a `[x]`, cada um com o caminho inteiro provado:

| Item | Evidência |
|---|---|
| Montar e editar posição completa | montador com os três arrastos em **teste humano aprovado** (11/9); trocar a posição inicial com poda, 17 avisos, Desfazer/Refazer e recarga no navegador |
| Renomear, reordenar e excluir capítulo com impacto | reordenar com **teste humano 10/10** (11/9); renomear e excluir com dependentes listados nas rodadas das sete fatias e da 6D |
| Reprodução, pausa, repetição e três velocidades | testes do relógio (4) e **teste humano de 12/9** nas duas metades da regra da velocidade |
| Comparação com retorno à posição de escolha | o caso de aceite de rei e peão (6 testes contra a regra do jogo) e **teste humano de 12/9** |
| Vários treinos por capítulo e por aula | treino dos dois lados (6A); 4 treinos na mesma aula na `aula-do-zero` e na importação, jogados pelo aluno |
| Fluxo completo de introdução, capítulos, treinos e práticas | `aula-do-zero.spec` e `aula-do-lichess.spec`: aula publicada, o aluno faz as 8 etapas na ordem do fluxo, 5 tentativas com `publication_id` |

Os quatro últimos, como os três de treino marcados na 6D, estão sem teste com uma pessoa; a 10I cobre.

#### §28 — continuam desmarcados, com o que falta

| Item | Falta |
|---|---|
| Nova aula e aula extra | aula do **curso** (série N) criada pela tela; item 1 do roteiro |
| Introdução e quadros completos | cor do desenho da introdução no aluno; narração e pausa por quadro |
| Cinco portas | porta URL a partir de Adicionar capítulo sem ensaio de tela |
| Referenciar e duplicar independente | "Duplicar como independente" só em teste unitário |
| Variantes | promover e substituir sem ensaio de tela; **reordenar variantes irmãs sem nenhuma evidência** |
| Menu de contexto e `•••` | abrir o menu pelo **botão direito** nunca exercido |
| Comentário, símbolo, desenho e narração | desenho e pausa **por narração** não editáveis na tela |
| Importar PGN e URL | URL de partida e de capítulo só no teste do endereço; Cancelar e tempo esgotado sem ensaio |
| Exportar | "PGN da variante" e pacote v2 nunca vistos na tela; restaurar o pacote |
| Prévia real | a prévia "aula inteira" não mostra introdução, treino e prática |
| Final certificado e linha autoral | exceção do professor a `CERTIFICACAO_REFUTADA` |
| Práticas avaliativas | várias práticas, prática opcional, ajuda e limite de lances |
| Metadados, proveniência e exceções | **exceções sem tela** |
| Problemas corrigíveis pela tela | destino de quadro e de treino sem ensaio de tela |
| Limites e metas de desempenho | 5 de 6 metas acima do alvo (acima) |
| Acessibilidade e teste humano final | a 10I; a meta de ≥ 90% sem ajuda sem medida |

**Uma observação sobre um item já marcado, para o Doug decidir:** "Publicação atômica, snapshots e
recuperação" foi marcado na fatia 7 pelas fases da publicação e pelo snapshot anterior (§20.1). A tela para
**listar e restaurar** snapshots (§6.3) não existe — a 6D registrou que ela "pertence à publicação". Não
desmarquei; se §28 incluir §6.3 nesse item, ele volta a aberto.

#### A decisão do desempenho, para o Doug

As medidas estão na tabela da 10G. Duas saídas:

- **Perseguir os 20–50 ms:** dividir o `EditorV2.tsx` (1.781 linhas) para uma seta ou comentário não
  redesenhar a tela inteira, e virtualizar a lista. Estimativa: um dia, mexendo no componente central
  a quatro dias do prazo, com risco de regressão nos ensaios de tela.
- **Registrar o limite:** o plano §17 chama 100 ms e 2 s de "alvos iniciais de engenharia" e manda "rever os
  limites" se o corpus não cumprir. O que sobra é o React de desenvolvimento, nada mais cresce com a
  árvore, e a maior aula de hoje tem 50 nós (`.editor/v2/N1-KPK.json`; a N0-LADDER, 10), contados em 14/9. O item de §28 continua desmarcado, com o número.

**Decidido pelo Doug em 14/9: registrar o limite.** Nada muda no código agora. No teste humano (item 45 do
roteiro) ele anda na árvore de 1.000 nós: se sentir atraso, a divisão do `EditorV2` entra **depois de
18/09**; se não sentir, o alvo passa a ser o medido e o item de §28 é revisto com esse número. Até lá, o
item continua desmarcado.

**Atualização de 14/9, mesmo dia:** o Doug tirou a árvore de 1.000 nós do teste humano — nenhum estudo do
site chega perto. O critério passa a ser a pergunta 21 do roteiro novo (a aula real, importada do estudo
dele, pareceu lenta?); a medida de 1.000 nós continua no ensaio automático como margem.

### Mudar o modo de uma parte depois de importar (15/9/2026, pedido do Doug)

**O pedido:** "importei os capítulos, escolhi o que cada um é — apresentação, aula, treino, prática — e
depois de confirmar não tem como mudar. Se marquei sem querer um capítulo como apresentação, quero
poder transformá-lo em treino guiado." Conferido no código: **não existia**. O modo só era escolhido na
janela do estudo (`PainelDoEstudo`, seletor **Vira**), e cada escolha vira uma estrutura diferente
(quadro de introdução, capítulo, treino, prática) sem comando que leve de uma à outra. Pior: um capítulo
**com lances** marcado como introdução **perdia os lances** na importação — o quadro guardava só texto e
posição.

**As duas decisões do Doug (15/9):** (1) **"Mudar para…" no `•••` de cada parte**, e não reabrir a janela
do estudo; (2) **guardar o possível** — o que não cabe na parte nova sai, listado antes de confirmar, e o
Desfazer devolve.

**Parada 1 — introdução ↔ capítulo ↔ treino (entregue):**

- `lib/editor-v2/mudar-modo.ts`: **o capítulo é a ponte** — toda mudança é "a parte vira capítulo" e
  depois "o capítulo vira o destino" (treino → introdução passa por capítulo). A conta é determinística e
  roda duas vezes: na janela, para mostrar **Sai / Fica / Para revisar**, e no comando **`MUDAR_MODO`**
  (um Desfazer).
  - **capítulo → treino:** a mesma derivação de "Criar treino daqui", independente, e completada como na
    importação (`completarTreino`, agora exportada): variante com `!`/`!!`/mate → correta, com `?`/`??`/`?!`
    → erro nomeado no catálogo, sem símbolo → erro marcado para revisar. A narração vira feedback, texto
    da defesa e objetivo. O treino fica **no lugar do capítulo** no fluxo. Treinos derivados que
    acompanhavam o capítulo viram independentes antes (senão ficariam com fonte removida e não publicariam).
  - **treino → capítulo:** a linha principal da análise do treino; feedback, textos das defesas,
    introdução e explicação final viram narração em cada lance; volta o **id do capítulo de origem** quando
    está livre; os erros nomeados que só aquele treino usava saem do catálogo.
  - **capítulo/treino → introdução:** um quadro que aponta para a posição inicial, no fim da introdução
    que existe (ou uma nova, no lugar da etapa). **A análise fica na aula**, sem capítulo.
  - **quadro → capítulo:** se a análise do quadro não é mostrada por nenhum capítulo, os lances guardados
    **voltam**; se é de outro capítulo (o quadro só emprestou a posição), nasce um capítulo de **posição
    parada**, sem roubar os lances do vizinho. O texto vira narração com pausa manual. **quadro → treino**
    sem lances é recusado com o motivo.
- `importar-estudo.ts`: capítulo com lances que vira introdução **guarda a análise** e o quadro aponta
  para ela.
- Tela: `DialogoMudarModo.tsx`; "Mudar para…" no `•••` do capítulo (`ListaDeCapitulos`), no `•••` do
  treino e em "Mudar este quadro para…" no editor da introdução. Opção impossível fica desabilitada com o
  motivo. Depois de mudar, o capítulo abre, o treino recebe o foco, o quadro abre na introdução.

**Evidência:** `mudar-modo.test.ts` **6/6** sobre o estudo real `hf09xMzS` — importar 03 como introdução
guarda os lances e "Mudar para capítulo" os traz; capítulo → treino (Qg6?? vira erro, treino jogável) →
capítulo (mesmo id, mesmo caminho, mesmo lugar, catálogo de volta ao tamanho); capítulo → introdução →
capítulo; quadro 00 → capítulo parado e treino recusado; treino 07 → introdução → treino (os 3 mates
voltam); Desfazer devolve o mesmo objeto e recusa não muda nada — **zero problemas de severidade erro**
em cada estado. `importar-estudo.test.ts` 3/3 intacto. **Ensaio no navegador** (`e2e/editor/mudar-modo.spec.ts`,
1366×768): capítulo → treino pelo `•••`, treino → capítulo pelo menu do treino (volta o mesmo capítulo
no mesmo lugar), quadro → treino desabilitado com motivo e → capítulo aceito, Ctrl+Z devolve o quadro —
**1 passed**; limpeza "984 arquivos conferidos, todos iguais". Foto da janela descrita por subagente:
nada cortado, rodapé visível sem rolar.

**Os sete portões**, na cópia isolada `../olesc-portoes-00` (duas outras sessões abertas no repositório):
`typecheck` ✓, `lint` ✓, `npm test` **1.312/1.312**, `build` ✓, `validate:content` ✓ (18 posições, 3
aulas), `validate:mutations` **58/58**, `repertorio:compilar --check` ✓.

**Parada 2 — prática (aberta):** entrar e sair do modo prática. Depende do acervo (a posição precisa
entrar pelo servidor, com resultado) e da regra de uma prática por aula, obrigatória para publicar.
**Não cobre ainda:** teste humano do Doug; "Mudar para…" pelo botão direito (o `•••` é o caminho).

### As travas de 15/9 — o currículo mais flexível, alinhado no código (15/9/2026, decisão do Doug)

**O pedido:** das 21 travas do currículo de finais, o Doug marcou quais caem, quais afrouxam e quais ficam
(tabela no topo de `docs/TRILHA-FINAIS.md`). A lista de 50 aulas não muda. Plano executado em quatro blocos
contínuos, sem commit (o Doug pede quando quiser).

**Bloco 0 — documentos.** `TRILHA-FINAIS.md` (tabela das travas no topo; notas em §1, §2, §3, §4, §5, §10, §12,
§13; §14.5 **corrigida**: a posição da aula 1 é o Diagram 38 do Silman, `6k1/8/5NK1/4N3/8/8/8/8 b`, e não uma
posição do Doug; §14.7 regras 2, 5, 7 e 8), `VOZ-DO-CURSO.md` (15 palavras proibidas; saíram objetivo, método,
avaliação, teoria, estrutura), `SOURCE-CORPUS.md` (topo, §1.1, §3.4), `/revisar-aula` (LEMBRE-SE, procedência
como aviso, várias posições), rascunho `.editor/v2/EX-O-QUE-DA-MATE-AULA-PILOTO.json` (16 × "GUARDE ISTO" →
"LEMBRE-SE", cópia anterior no scratchpad), plano e especificação do Editor v2 (§9, §10, §13; §4, §17, §17.1, §19.1,
§23, §23.1, §28). Pacote global **v3.2** em Downloads (subagente): v3.1 em `Historico/v3.1/`, 50 aulas, PGNs só com
"GUARDE ISTO:" → "LEMBRE-SE:" (9 trocas, símbolos de lance na mesma sequência), e a nota "o site foi alinhado em
15/09/2026". Busca nos documentos: nenhuma regra antiga afirmada como vigente — o que sobra é registro com nota.

**Bloco 1 — fonte, peças e voz.** `validate-content.ts` sem `FONTE_NAO_DIDATICA`, `FONTE_DIDATICA_DIVERGE`,
`FONTE_DIDATICA_DOMINA` e `TETO_DE_CITACAO`; sem limite de 7 peças na prática (`pratica.ts`), no acervo
(`acervo-em-disco.ts`), na importação de estudo e no seletor; sem a nota "até 7 peças" do motor do professor;
`nivelDaOrdem` e os tamanhos 6/6/6/16/15 fora da trilha e dos testes (fica: nível 1–5 e lista em ordem de nível).
**Número:** `npm test` 1.308/1.310 — as 2 falhas eram testes da conferência que usavam "método" como palavra
proibida, reescritos no Bloco 2.

**Bloco 2 — tablebase fora.**
- `modelo.ts`: `treino.resultado` (vitória ou empate, **declarado**); `resultadoDoTreinoV2` lê o declarado ou, na aula
  antiga, o da certificação. `certificacao` fica só para leitura; saíram `CERTIFICACAO_SEM_APROVACAO`,
  `CERTIFICACAO_SEM_PROVENIENCIA` e a exigência de certificação no final certificado.
- `conferencia.ts`: saíram `CERTIFICACAO_PENDENTE/CADUCA/REFUTADA`. `gate.ts`: **uma passada só**, sem tablebase e sem
  escrita no documento; manifesto = aula + posições + juízes; `VERSAO_CONFERENCIA_V2` = 2.
- `treino-jogavel.ts`: o `goal` vem do resultado declarado; a evidência antiga (`temEvidenciaCongelada`) continua
  julgando onde existe. `avaliacao.ts`: a revisão lê o mesmo valor — **a N0-LADDER publicada tem as duas revisões
  gravadas iguais às recalculadas** (treino `ar_0e70ba4e…`, prática `ar_1f8b45f1…`).
- `adaptar-v1.ts` grava `resultado: guided.goal`; refazer treino preserva o resultado; trocar a posição não reabre mais
  certificação (e as janelas não dizem mais "a certificação é reaberta").
- `validate-content.ts`: nenhum import de tablebase; `RESULTADO_ERRADO`, `METODO_NAO_GANHA`, `VEREDITO_ERRADO`,
  `DEFENSOR_FROUXO`, `ALTERNATIVA_NAO_GANHA`, `WINNING_MOVES_DESATUALIZADO`, `ALTERNATIVAS_DESATUALIZADAS`, as regras de
  DTM e `TERMINAL_NAO_SEGURA/FORA_DO_OBJETIVO/LONGE_DEMAIS` saíram; `winningMoves` e `methodAlternatives` congelados (a
  derivação copia a lista do arquivo pela FEN). `--refresh-cache` aceito e sem efeito; `--prune-cache` saiu. Gate v1 do
  editor e CI sem `--refresh-cache`.
- Telas: «Editar treino» ganhou **"O treino cobra: Vencer / Segurar o empate"**; "Vitória certificada" só aparece na
  aula antiga que já a usa; o resultado da posição que entra no acervo é sempre escolhido pelo professor; o painel do
  aluno não diz mais "certificada pela tablebase".
**Números:** `npm test` 1.314/1.314; `validate:content` **verde com `content/tablebase-cache` fora do lugar** (19
posições, 3 aulas; pasta devolvida em seguida); `--write` não mudou nenhum arquivo de aula.

**Bloco 3 — formato da aula.**
- Schema v1: saíram "uma posição por aula" e "quatro etapas ou `etapasAusentes`" (a declaração que o arquivo desmente
  continua recusada). Tocador v1: a aula **só com apresentação** não quebra mais (`posicaoDaApresentacao`; antes era
  um `!` sobre `undefined`), e o "assisti" aparece na última etapa quando não há objetivo.
- Procedência (trava 7): `PROVENIENCIA_CADUCA/DIVERGE` e `FEN_IMPORTADA_SEM_REVISAO` não são mais promovidas;
  `TEXTO_SEM_DIREITO_DECLARADO`, `PROVENIENCIA_INCOMPLETA`, `OBRA_NAO_REGISTRADA`, `POSICAO_NAO_PUBLICAVEL`,
  `REGIME_INTEGRAL_VENCIDO` e `DIVIDA_DESATUALIZADA` viraram **aviso** (`avisar()` no validador). "De onde veio" é
  opcional na janela de proveniência, na prática e no acervo (sem origem = desconhecida, com aviso).
- Práticas (trava 9): saíram `PRATICA_AUSENTE`, `PRATICAS_MULTIPLAS` e os bloqueios do editor ("+ Criar prática" fica
  sempre) e da importação de estudo (vários capítulos de prática, cada um com o seu resultado). `juntarEscadas`
  (`lib/finais/escada.ts`): aprendida só quando todas estão; revisão vence com qualquer uma e diz qual
  (`praticaParaRevisar`); `progresso.ts` lê todas as práticas da revisão ativa; o cartão abre
  `?revisao=1&pratica=<id>`; a aula v2 sem prática ganha o "assisti" no fim do fluxo.
- `DialogoCriarTreino` não promete mais edição "na próxima parada".
**Número:** `npm test` 1.319/1.319 (novos: duas práticas — vencer só uma 3× não aprende, vencer as duas aprende,
revisão pela que venceu; aula só com apresentação e etapas com posições diferentes aceitas; origem vazia vira
desconhecida; régua com "objetivo" passa e com "roteiro" é apontada; as 9 travas da conferência que caíram publicam).

**Bloco 4 — portões** (na pasta principal; nenhuma outra sessão aberta):
- `npm run lint` ✓ **no código do projeto** — o lint completo acusa 12 erros em
  `content/repertorio/rascunhos-anotados/fonte-plichta/` (arquivos de 15/9 08:29, ignorados pelo git, **de outra
  sessão ou do Doug**, não desta); fora dessa pasta, 0 problemas.
- `typecheck` ✓ · `npm test` **1.319/1.319** · `build` ✓ · `repertorio:compilar --check` ✓.
- `validate:content` ✓ **sem `content/tablebase-cache`** (19 posições, 3 aulas; a pasta voltou intacta).
- `validate:mutations` **34/34**, com os dois controles verdes. Saíram 23 mutações: as 22 dos 21 códigos que caíram ou
  viraram aviso, e a de `SCHEMA_AULA` "aula publicada sem uma das quatro etapas" — ela foi a única que **passou
  batido** na primeira rodada (34/35), exatamente porque a trava 8 caiu. Fixtures v2 regeneradas
  (`N0-FIXTURE-V2` `pub-3be3f0b6…`, `EX-FIXTURE-V2` `pub-88c0dd0d…`), porque o adaptador passou a gravar o resultado.
- **Ensaios de navegador** (1366×768): primeira rodada 5/11 — as 6 falhas eram ensaios presos à regra antiga
  (id fixo da fixture, o seletor novo de resultado contado como mais uma lista, "Resolver" na lista de avisos que
  começa fechada, o Desfazer da origem) ou instabilidade (abaixo); corrigidos, 7/7. **Ensaio novo
  `aula-sem-pratica.spec.ts`**: importa o estudo com a prática "Fora", publica, e o aluno fecha a aula pelo "assisti"
  no fim do fluxo, com a linha em `aula_lida`. Rodada final: 14/16 + `publicar-visivel` reescrito 2/2 (o texto de
  terceiros sem declaração agora **publica com aviso**) + `aula-do-zero` sozinha 2/2. Limpeza: 987 arquivos, todos
  iguais; SHA-256 da `.editor/v2/N1-KPK.json` igual antes e depois (`4be602ca…`).

**Dois defeitos achados rodando, e consertados:**
1. **O "assisti" da aula v2 não gravava nada.** `marcarLeitura` conferia a aula com `lerAula`, que só lê
   `content/lessons/` (v1). Conserto: `lerPacoteDoAluno` (v1 ou v2). Prova: com a linha antiga o ensaio novo falha em
   `leituraDoAluno` (esperado `true`, recebido `false`); com o conserto, passa.
2. **Aviso de `key` do React** ao renderizar o `<Leitura>` vindo do servidor dentro do tocador v2 (o guarda de
   console do ensaio reprovou). Conserto: `key="leitura"` na página. O texto do controle virou "Assisti à aula até o
   fim." — o antigo dizia "Li o objetivo… não tem tabuleiro", falso numa aula v2 com treinos.

**Instabilidade aberta, não mascarada:** a prática da `aula-do-zero` ficou "inacabada" em 2 de 3 rodadas **em lote**
(parou esperando a resposta do computador aos 13 e aos 29 meios-lances) e deu mate nas 2 rodadas **sozinha** (35 e 23
meios-lances). A mesma posição deu mate na `aula-do-lichess` nas mesmas rodadas, e o tocador de prática não foi mexido
aqui. Não aumentei o prazo do ensaio: pela lição (d) da 10G, lance que "não entra" pode ser defeito do tabuleiro, e
isso precisa de medida antes de conserto.

**O que ficou de fora, declarado:**
- **Sem a tablebase, erro não nomeado não aparece como erro** para o aluno: o treino novo só aponta os erros que o
  professor nomeou. A qualidade depende do catálogo de erros.
- A dívida de licença deixou de bloquear; o inventário continua sendo gerado, mas nada impede publicar com ele velho.
- A mecânica de exceção do professor (`excecoes`) ficou no código sem nenhum código que ela ainda possa perdoar.
- `content/tablebase-cache/` e `scripts/tablebase.ts` continuam no repositório como consulta; nada os lê nos portões.
- "Revisão abrindo a segunda prática" só tem teste de função pura (`juntarEscadas`, `proximaAcao`); não há ensaio de
  navegador com duas práticas vencendo em dias diferentes. Nada desta rodada teve teste humano.
- Sem commit: o Doug pede. Ao commitar, os arquivos do Plichta (lint) não entram — não são desta rodada.

### O teste de uso das travas de 15/9 — consertos (15/9/2026, noite)

**O pedido:** consertar o que o teste de uso do commit `ac2cfd1` achou, com as decisões do Doug. O Doug pediu no
meio da rodada para não parar: as escolhas de texto e de saída abaixo foram do agente, e estão declaradas. Sem commit.

**Textos (itens 1 a 5).**
1. **Tablebase na tela.** Varredura de `app/`, `components/` e `lib/`: das ~185 menções, só duas eram texto que o aluno
   lê. Painel, Conquistas (`selos.ts`): "Cada aula é certificada pela tablebase, em três dias diferentes." → "Conta
   quando você vence a prática em três dias diferentes — ou assiste até o fim à aula sem prática." `/trilha`
   (`mapa.ts`): "Aulas aprendidas — três passadas em dias distintos, cada uma certificada pela tablebase." (tinha
   ainda "passadas", palavra proibida) → "Aulas aprendidas — a prática vencida em três dias diferentes, ou a aula sem
   prática assistida até o fim." Comentários com a mesma promessa: `mapa.test.ts`, `app/trilha/page.tsx`,
   `Nivel.tsx` (2), `Tarefas.tsx`, `mapa.ts`, `tarefas/estado.ts`, e `acervo.ts` ("só aceita até 7"). O resto é nome
   interno, registro histórico ou regra da aula v1; as telas que sobram ("Vitória (aula antiga)", "Aula antiga: lances
   fora da linha…") dizem a verdade.
2. **Concordância.** A frase saiu do `PainelDeProblemas` para `resumoDaConferencia` (`lib/editor-v2/frases.ts`).
3. **Pergunta antes de publicar.** `oQueAAulaInteiraTem(fluxo)` conta as etapas: "O capítulo, os 2 treinos e a
   prática", "…e as 2 práticas", sem prática não a cita; aula vazia, "A aula inteira".
4. **«Editar treino» sem nome acessível: não reproduzido.** A janela usa o casco `Dialogo` (`aria-labelledby` no
   título). Medido pelo cartão e pelo `•••`: `dialog "Editar treino — Treino guiado"`, também no `ariaSnapshot` (a
   leitura do Playwright MCP). O ensaio novo guarda isso. O que o teste provavelmente viu é o item 6.
5. **"SEM PROGRESSO: 11 DE 50" depois do mate.** É o contador da regra dos 50 lances (`PARTIDA.semProgresso`,
   `lib/lesson/falas.ts:128`; o grep não achou porque a classe `rotulo` põe em maiúsculas), desenhado em
   `PracticeStage.tsx` **sempre**, desde 8/9 (`f71c450`). "11" eram os lances desde a última captura ou lance de
   peão. Conserto: só aparece com a partida em jogo.

```
lib/editor-v2/frases.test.ts   ANTES: ✖ "Pode publicar. 1 aviso, que não impedem." ≠ "… que não impede."  (pass 1, fail 1)
                               DEPOIS: tests 3, pass 3
aula-do-lichess.spec           o contador está na tela antes do 1.º lance e some depois do mate (mate em 11 meios-lances)
```

**Publicar (item 6).** Dentro da janela o botão **já** nascia desligado: segurando as ações de servidor no ensaio,
`disabled: true` durante o cálculo e 1,5 s depois, e ligado só com o impacto na tela. O que ficava ligado era o
**Publicar da barra**, atrás do véu, com o mesmo nome — na árvore de acessibilidade, um "Publicar" ligado ao lado de
"Calculando o impacto…". Conserto: a barra desliga enquanto a pergunta ou a janela de publicar estão abertas; o da
janela ganhou o título "Espere o cálculo do impacto". Fechar devolve o foco à barra (conferido).

```
e2e/editor/travas-15-9.spec.ts  ANTES: ✖ "nenhum Publicar ligado enquanto calcula" Expected 0, Received 1
                                DEPOIS: ✔ (e o da janela liga com o impacto, e o foco volta à barra)
```

**Aviso treino × resultado da posição (item 7).** `TREINO_RESULTADO_DIVERGE`, **aviso**, em `REGRAS_PUBLICACAO_V2`.
De onde vem o resultado da posição (decisão do agente, pedida ao Doug e delegada):
- **acervo** — a posição de `content/positions/` com a mesma FEN, sem contadores, de onde o treino começa
  (`fenInicialDoTreino`). Pela FEN e não pelo `positionId`: o treino que começa no meio da linha só é comparado se
  aquela posição exata está no acervo, e a FEN colada que coincide com uma do acervo também é. O resultado é lido do
  lado do aluno: vitória dele, empate, ou perdida (que diverge de vencer e de empatar);
- **certificação antiga** (`certificacao.resultado`), só quando o professor declarou outro resultado;
- **motor do professor, não:** roda no navegador, e a conferência roda no servidor sem tablebase.
- **FEN colada fora do acervo e sem certificação: sem aviso** — não há com o que comparar; a decisão é só do professor.

Mensagem do caso real (EX-E2E-BASE, treino trocado para "Segurar o empate"): "o treino «Treino guiado» cobra segurar o
empate, e no acervo, a posição onde ele começa dá vitória das brancas; e a certificação antiga guarda vitória — a aula
publica assim; se não era isso, troque em «Editar treino»", com **Resolver** abrindo a janela do treino. O cartão do
treino mostra "Brancas · vencer · N perguntas" / "Brancas · empate · N perguntas".

```
lib/editor-v2/conferencia.test.ts  ANTES: ✖ 5 de 28 (regra sem estrago, caso real, só acervo, posição perdida)
                                   DEPOIS: tests 28, pass 28 (inclui igual não avisa e FEN colada sem aviso)
travas-15-9.spec (navegador)       cartão "Brancas · vencer" → salva empate → "Brancas · empate"; Publicar confere,
                                   "Pode publicar", publica ("Publicada neste computador"), um aviso com as duas fontes
```

**Portões** (cópia isolada `../olesc-portoes-00` no `ac2cfd1` + os arquivos desta rodada; o `next dev` da pasta
principal ficou ligado): `lint` ✓ (sem os arquivos do Plichta, que não estão na cópia) · `typecheck` ✓ ·
`npm test` **1.328/1.328** (eram 1.319: +3 de frases, +6 da conferência) · `build` ✓ · `validate:content` ✓ (19 posições,
3 aulas) · `validate:mutations` **34/34**, com os dois controles verdes · `repertorio:compilar --check` ✓.

**Ensaios de navegador** (pasta principal, contas de teste, só `EX-E2E-*`): `travas-15-9`, `aula-do-lichess`, `publicar-visivel`,
`aula-como-aluno`, `aula-sem-pratica` e `pratica`. Primeira rodada **10/11**, com os portões rodando ao mesmo tempo
na outra cópia: `pratica.spec` gravou "Prática contra o computador" em vez de "Vença sem afogar"; sozinho passou
(44,9 s), e a rodada repetida com a máquina livre deu **11/11** — carga, não esta mudança, que não toca a janela da
prática. Limpeza: 987 arquivos iguais, 21 restos apagados, contas de ensaio apagadas. SHA-256 da
`.editor/v2/N1-KPK.json` `4be602ca…` antes e depois.

**Fora, declarado:**
- A prática tem o mesmo risco (objetivo × resultado do acervo) e **não** ganhou aviso — o pedido era o treino.
- O item 4 não foi reproduzido; se o Doug viu a janela sem nome por outro caminho, falta saber qual.
- `publicar-visivel.spec.ts` e `aula-do-lichess.spec.ts` foram ajustados (concordância; contador dos 50 lances).
- Nada disto teve teste humano.

### O próximo ponto exato (14/9/2026 — retomar daqui)

**Commits da fatia 10:** `795d2d9` (10A), `e567599` (10B), `dce1fe6` (10C), `28a1b3e` (10D), `7290a3c`
(10E), `ef6c351` (10F), `bbc7c05` (10G parcial) e o commit desta continuação (10G). Nada foi enviado ao
servidor (push é do Doug).

**Portões do commit da 10G, na cópia isolada `../olesc-portoes-e6`:** `typecheck` ✓, `lint` ✓, `npm test`
**1.279/1.279**, `build` ✓, `validate:content` ✓, `validate:mutations` **58/58**, `repertorio:compilar
--check` ✓, `db:rls` **52/52** ("A RLS segura"), `db:finais:v2` **18/18**. A primeira rodada das mutações
deu 57/58: o processo da mutação 49 **quebrou** (0xC0000409, sem memória — 1,07 GB de RAM livre e 2,3 GB
de memória virtual com cinco sessões ligadas e o disco a 97%); a segunda deu 58/58, com a 49 pega pela
regra certa (`TEXTO_SEM_DIREITO_DECLARADO`).

**O que falta, na ordem:**

1. ~~**10H**~~ — feita em 14/9 (ver "Parada 10H" acima), commit só de documentos.
2. ~~Decisão do desempenho~~ — o Doug decidiu em 14/9 **registrar o limite** e julgar pelo item 45.
3. **10I:** o teste humano do Doug pelo roteiro abaixo, **reescrito em 14/9** a pedido dele: 48 itens em seis
   partes (trazer o estudo, mexer numa aula pronta, criar do zero, quando dá errado, teclado, veredito), com
   comparação ao Lichess nos itens ⚖️. As perguntas essenciais 1, 2, 3, 7, 9 e 11 continuam dentro dele.
   **A árvore de 1.000 lances saiu do teste humano** (o Doug: nenhum estudo do site chega perto; o estudo
   dele tem 64 meios-lances) — a `EX-E2E-ARVORE` não é gravada; a medida fica só no ensaio automático.
4. Pendências abertas: a importação perde as quebras de parágrafo de um comentário (1 narração); a
   prática não tem campo de texto para o aluno (o "OBJETIVO: VENCER" do estudo não tem onde entrar).

**Duas sessões, duas cópias.** A sessão `preparatorio-olesc-f3` (tabuleiro estilo Chess.com, marcas das
fontes, regra dos símbolos) commitou até `61906c7`; os quatro portões que ela não rodou passaram na 10H.
Ela usava `../olesc-portoes`. Esta continuação usou
`../olesc-portoes-e6` (worktree nova, `node_modules` copiado). No `ChessBoard.tsx` cada commit leva só o
próprio trecho: o desta é `esquecerRetangulo`; o dela é `setaQueEnsina`/`setAutoShapes`. Quem commitar
depois atualiza a branch e roda os portões de novo.
O jeito: copiar para a cópia só os arquivos da fatia, rodar os sete portões lá, commitar lá (`git
-C ../olesc-portoes-e6 commit`), e na pasta principal `git update-ref refs/heads/modo-editor <novo>
<antigo>` seguido de `git reset` (sem `--hard`: só o índice volta, os arquivos de trabalho ficam).

**Lições de método desta rodada, para não repetir:** (a) ensaio que lê texto do `Comentario` do aluno
precisa de `.last()` (há cópia invisível para a animação); (b) quem roda dois `playwright test` ao mesmo
tempo quebra o preparo e a limpeza (as contas são as mesmas); (c) a limpeza por SHA-256 acusa gravação da
outra sessão em `content/repertorio` — se acusar, conferir `git status` antes de suspeitar do ensaio;
(d) lance que "não entra" no ensaio pode ser defeito do tabuleiro: medir props, estado do chessground e
`elementsFromPoint` antes de enfeitar o ensaio com repetições — a repetição escondia o defeito e ainda
clicava na casa errada; (e) `getByLabel` num `<label>` com `<textarea>` dentro inclui o texto do campo no
nome: usar `getByRole("textbox", { name, exact: true })`; (f) o perfil de CPU do navegador feito com
localizadores do Playwright mede o Playwright (`visitNode`, `getElementLabels`), não o editor.

## O teste final antes de fechar a branch (15/9/2026, noite)

**O pedido:** o Doug quer saber se a branch `modo-editor` pode ser fechada (prazo 18/09/2026) e se o
Editor v2 está pronto — arquitetura, funções e tela. O uso real dele é **importar do Lichess, por link
ou PGN**; essa é a função que tinha de estar perfeita. O roteiro inteiro foi executado pelo agente, sem
paradas: portões, suíte de navegador, importação, funções do §28 e tela comparada ao Lichess. Cada
defeito de funcionamento foi consertado na hora, com teste que falha antes e passa depois. **Sem commit.**

### O ambiente quase reprovou a rodada

Com quatro sessões do Claude abertas e **575 MB de RAM livre** (máquina de 7,9 GB), o `next dev` foi
paginado para o disco e parou de responder no meio da suíte: **36 falhas** que não eram do editor
(`ERR_TOO_MANY_REDIRECTS`, abrir a árvore de 1.000 nós em 6.387 ms). O Doug liberou 7,4 GB de disco
(cache do npm, navegadores antigos do Playwright, a cópia `../olesc-portoes`) e fechou sessões; com
~1,5 GB livres a suíte passou. Fica a regra: **medir a RAM antes de rodar a suíte**. O agente não pode
reiniciar o servidor nem apagar cache — o classificador de permissões recusa, e com razão; quem roda
esses comandos é o Doug.

### Bloco 1 — portões

`typecheck` ✓ · `lint` ✓ (os 12 erros que apareceram são do script local `content/repertorio/
rascunhos-anotados/fonte-plichta/converter.cjs`, que o git ignora; sem ele, limpo) · `npm test`
**1.328/1.328** no começo da rodada e **1.336/1.336** no fim (8 testes novos) · `build` ✓ ·
`validate:content` ✓ · `validate:mutations` **34/34** · `repertorio:compilar --check` ✓ · `db:rls`
**52/52** · `db:finais:v2` **18/18**.

### Bloco 2 — a suíte de navegador, duas vezes

Primeira passada **51 passados, 4 falhas** (13,1 min); segunda **51 e 4** (38,1 min, máquina carregada).
Das falhas, **3 são as metas de desempenho**, vermelhas pelo limite que o Doug registrou em 14/9 (abrir
a árvore de 1.000 nós: 3.676–4.709 ms de mediana contra a meta de 2.000; com a máquina livre em 14/9
eram 2.031). A quarta era **defeito do ensaio**, não do editor: `tabuleiro-deslocado.spec.ts` lia um
pacote de publicação pelo id escrito à mão (`pub-55947670…`), e a fixture foi republicada. Agora lê a
publicação ativa.

```
ANTES  tabuleiro-deslocado.spec  ENOENT … publicacoes\pub-55947670bbcd7bd0.json
DEPOIS 1 passed (18,6 s)
```

Na segunda passada, `atalhos.spec` também falhou (o tabuleiro não carregou em 15 s) depois de o ensaio
de desempenho pendurar 25 min; sozinho, **3/3**. Carga, não defeito. A limpeza fechou as duas passadas
com "987 arquivos conferidos, todos iguais".

### Bloco 3 — importar do Lichess: seis defeitos, todos consertados

**Contagem independente das fontes** (tokenizador próprio, sem passar pelo importador): a Francesa tem
**65 NAGs** (`$1`×31, `$4`×6, `$5`×8, `$6`×8, `$14`×4, `$36`×6, `$40`×2), 626 lances, 5 setas, 13 casas,
168 comentários, 41 variantes; o estudo de mate de dama tem **32 símbolos** (29 `!`, 3 `??`), 45 setas,
17 casas. Correção ao roteiro: os "47 sufixos" da Francesa estão **dentro do texto dos comentários**
("3.Bd3!" escrito na frase), não nos lances.

**O que passou:** importar o estudo inteiro por link, por arquivo e colado; link de capítulo; link de
partida (com `/black` e `#ply`); recusa de host falso sem nenhum pedido de rede; Cancelar durante a
busca sem tocar na aula; PGN de 21 jogos com seleção, contador e teto; recusas de Chess960, FEN
impossível e lance impossível; um Ctrl+Z desfaz a importação inteira; F5 preserva; exportar e
reimportar dá texto byte a byte igual; a página pública do Lichess bate com o editor nos nomes, na
ordem, nas setas e nas casas dos capítulos 02 e 03; a aula publicada é jogada pelo aluno e as
tentativas chegam ao banco.

**Os seis defeitos, com a causa e a prova:**

| # | O que estava errado | Causa | Antes → depois |
|---|---|---|---|
| D1 | Um segundo estudo, ou um capítulo avulso por link, era recusado com "parece já ter sido importado" — falso | o id do capítulo saía do número de ordem (`importar-pgn.ts`, `comoId(titulo, "jogo-N")`), e "02 - …" colidia | 3 testes: "a aula já tem uma parte chamada analise-jogo-3" → 27/27 passam; na tela, o 2º PGN entra |
| D2 | Buscar o mesmo endereço duas vezes travava a janela em "lendo o arquivo…" e oferecia o estudo como 6 jogos soltos | `PainelDeImportacao.tsx`: o texto igual não dispara o efeito que lê | ensaio `@rede`: "na 2ª busca: esperado 9, recebido 0" → 9/9 |
| D3 | Jogo sem lances sumia, ou emprestava FEN e comentário ao jogo seguinte | `lerPgns` só fecha o jogo depois de ver lance | `[A, C]` → `[A, B, C, D]`, com `JOGO_SEM_LANCES` à vista |
| D4 | A recusa ao importar fechava a janela e perdia o PGN colado | `EditorV2.tsx`: `fecharImportacao()` mesmo na recusa | alerta não aparecia → aparece, e o texto fica |
| D5 | **Os símbolos não chegavam ao aluno** (0 de 32) | o passo do aluno não levava `nags` (`previa.ts`, `fluxo-do-aluno.ts`) e o tabuleiro não os desenhava | `undefined` → `[3, 14]`, inclusive pelo pacote publicado; o círculo `!` aparece na tela do aluno |
| D6 | Os parágrafos do professor colavam numa linha só na tela do aluno | `Comentario.tsx` desenhava com `white-space: normal` | `normal` → `pre-wrap`, **só nas aulas v2** |

Dois outros, achados na conferência de biblioteca e consertados antes: a importação colava os parágrafos
do comentário (`importar-pgn.ts`, `separarComentario`) e a exportação juntava dois símbolos do mesmo
lance num terceiro (`$1 $2` saía `!?`, `escrever-pgn.ts`).

**Por que o D6 não valeu para todo mundo:** o mesmo balão serve o repertório, que vem de PGN quebrado a
80 colunas — 11 quebras só na Alapin, 27 na Caro-Kann, 41 na Escandinava, todas no meio da frase. A
quebra passou a aparecer só onde o texto é do professor (aula v2), por uma opção do componente.

### Bloco 4 — as funções do §28

**Passaram, com evidência de tela nesta rodada:** Desfazer tudo (com a confirmação e o Cancelar que não
muda nada); recuperação por F5 antes do "✓ salvo"; **duas abas em conflito**, com "Baixar minha cópia"
e "Abrir versão do disco" provadas nos dois sentidos; tornar principal, substituir e excluir com
impacto e Desfazer exato; menu do botão direito **igual** ao `•••` (11 ações no lance, 7 na posição
inicial); as portas de Adicionar capítulo; duplicar como independente (0 ids repetidos, o original
intocado por SHA); comentário × narração independentes; símbolo exclusivo; as quatro cores e apagar os
desenhos da posição; exportações (variante, linha, capítulo, aula, pacote) com o texto de perdas;
prévia de capítulo e "daqui"; práticas nenhuma/uma/várias; proveniência inteira com Ctrl+Z e F5; motor
do professor (L, 1–3 linhas, seta, pausa com janela e com prévia, nada gravado no arquivo); teclado
puro do índice até o "✓ salvo", com Tab preso no modal e Esc devolvendo o foco; nova aula vazia e
Cancelar que não cria arquivo; erro nomeado, treino dos dois lados e "refazer com diff" com um Ctrl+Z.

**Quatro defeitos, dois consertados aqui:**

| # | O que estava errado | Causa | Antes → depois |
|---|---|---|---|
| D7 | A promoção virava dama sem perguntar | `EditorV2.tsx` fixava `"q"` | "Escolha a peça da promoção" não existia → janela com foco na dama, Esc desiste sem gravar, cavalo gravado |
| D8 | O lance novo criava variante sem avisar | `EditorV2.tsx`, `ADICIONAR_LANCE` sem recado | nenhum aviso → "Nasceu uma variante: 1.Re2…" |
| D9 | **Aula acima de 1 MB não salvava** ("Não foi possível salvar"), embora o editor deixe crescer até 2 MB | `next.config.ts` não declarava `experimental.serverActions.bodySizeLimit`, e o padrão do Next 16.3 é 1 MB | teste novo reprovava → `bodySizeLimit: "4mb"`, 10/10 |
| D10 | O quadro da introdução marcado para revisão não tinha "Já reli" na própria janela | `EditorDeIntroducao.tsx` não tratava `quadro.revisao` | o aviso não existia → aviso + "Já reli", e a conferência para de acusar sem recarregar |

**Ficou sem conserto, por decisão declarada:** o lance ilegal é recusado em silêncio pelo tabuleiro
(o chessground não avisa quando a casa não é destino legal, e explicar exige mudar o componente); e
fechar a aba antes do "✓ salvo" perde a edição (o conserto natural — o navegador perguntar ao fechar —
dispara também em cada recarga dos ensaios e pode travá-los; §6.3 fala em recuperação "por aba").

**Um defeito a mais, achado de raspão e consertado (D11):** recarregar a página **logo depois** de
importar deixava a aula vazia — nem no disco, nem oferecida para recuperar. A gravação espera 600 ms
(a espera que serve para a digitação) e a cópia de recuperação vai para o banco do navegador de forma
assíncrona; recarregar antes cancelava as duas. Agora a importação grava **sem espera**.

```
ANTES  recarregar-depois-de-importar.spec  {"recuperar":0,"capitulosNaTela":0,"noDisco":0}
DEPOIS {"recuperar":0,"capitulosNaTela":2,"noDisco":2} — 1 passed
```

### Bloco 5 — a tela, medida contra o editor de estudos do Lichess

Mesma aula (o estudo do Doug importado), mesmo método, `conferirTamanho` antes de cada medida.

| medida | 1366×768 editor | Lichess | 1366×630 (janela real) editor | Lichess | 1920×1080 editor | Lichess |
|---|---|---|---|---|---|---|
| tabuleiro | **564 px** | 571 | **564 px** | 454 | **564 px** | 835 |
| % da altura útil | 73,4% | 74,4% | 89,5% | 72,1% | 52,2% | 77,3% |
| margem vazia esq/dir | 55/59 | 14/13 | 55/59 | 71/71 | **332/336** | 158/158 |
| lances inteiros à vista | **4 de 16** | 16 de 31 | **1 de 16** | 12 de 31 | 9 de 16 | 26 de 31 |
| rolagem horizontal | 0 | 0 | 0 | 0 | 0 | 0 |
| tela vazia | 51,0% | 47,8% | 45,5% | 52,9% | **72,5%** | 52,4% |
| controles visíveis | 77 | 38 | 56 | 38 | 90 | 38 |

**O diagnóstico, num número:** o tabuleiro tem **564 px nas três telas**. Ele é preso pela largura
(`minmax(20rem,38rem)` dentro de um `max-w-7xl`), e a altura da janela não entra na conta; o Lichess faz
o contrário (454 → 571 → 835 px, sempre 72–77% da altura). A 1920 sobram 668 px de margem morta e a tela
fica 72,5% vazia. Na janela real do Doug (630 px úteis) acontece o oposto: o tabuleiro ocupa 89,5% da
altura, a paleta de desenho inteira (12 controles) cai para fora da tela, e a lista de lances mostra
**1 lance**.

**Acabamento, o que está limpo:** axe sem nenhuma violação (inclusive contraste); 30 de 30 elementos
alcançados por Tab com anel de foco; 0 botões cobertos nos três tamanhos; prosa fixa de interface com
345 caracteres — a limpeza de 14/9 pegou. O cabeçalho tem 6 controles, menos que o Lichess. Falta
esqueleto de carregamento (hoje é tela branca por 0,6–1,3 s).

**Proposta de ajuste (para o Doug decidir; nada foi implementado):** 1) tabuleiro limitado pela
**altura** da coluna, não pela largura — a 1920 vai de 564 para ~930 px, a 768 ganha ~36 px, e a 630
encolhe para ~480 px, devolvendo a paleta à tela; 2) soltar o `max-w-7xl` (devolve 640 px a 1920);
3) comentário fora da linha do lance (de 4 para ~10 lances à vista a 768, de 1 para ~5 a 630);
4) "Fala/Nota" em gaveta (mais ~200 px para a lista); 5) cortar o `•••` por lance (16 botões a menos).
As três primeiras mexem em poucas linhas; as duas últimas mexem na arquitetura da tela.

### O que a especificação pede e a tela ainda não tem

Nada disto foi implementado nesta rodada; é a lista para o Doug decidir, separada pelo que bloqueia.

**Não bloqueia fechar a branch (pode ir depois de 18/09):**
- **Reordenar variantes irmãs** (§11.3): só existe "Tornar principal".
- **Desenho e pausa por narração**: o modelo guarda o campo, a tela não o edita.
- **Restaurar o pacote v2** (§14 promete "trazer de volta ao editor"): não há tela; e o pacote sai sem
  as posições do acervo.
- **Prática (§17.1)**: obrigatoriedade, limite de lances, ajuda permitida e efeito no domínio não
  existem nem na janela nem no schema.
- **Metadados (§19.1)**: só nível e classe são editáveis; critério de domínio, estado editorial, fonte
  didática, justificativa de etapa ausente e catálogo de erros não têm tela. **Exceção do professor**
  (§19.1) não tem tela nenhuma.
- **Dica sob demanda** (§16.3): hoje a dica aparece sozinha, sem o aluno pedir.
- **Lance ilegal sem explicação**: o tabuleiro recusa em silêncio (mexer nisso é mexer no chessground).
- **Fechar a aba antes do "✓ salvo"** perde a edição daquele instante; o conserto natural (o navegador
  perguntar ao fechar) dispara também em cada recarga dos ensaios.
- **Esqueleto de carregamento**: hoje a tela fica branca por 0,6–1,3 s.
- **Ajustes de tela** do Bloco 5 (o tabuleiro preso pela largura).

### Números finais

- **Portões:** 9/9 — `typecheck`, `lint` (limpo fora do script ignorado do Plichta), `npm test`
  **1.337/1.337**, `build`, `validate:content` (19 posições, 3 aulas), `validate:mutations` **34/34**,
  `repertorio:compilar --check`, `db:rls` **52/52**, `db:finais:v2` **18/18**.
- **Suíte de navegador, depois dos consertos:** **57 passados, 2 falhas** em 9,0 min. As duas: a meta de
  desempenho das interações (p95 112 ms contra 100 — o limite registrado em 14/9) e a prática contra o
  motor da `aula-do-zero`, que **sozinha passa** ("mate em 23 meios-lances"); foi carga. Com a máquina
  livre, abrir a árvore de 1.000 lances caiu para **1.994 ms**, dentro da meta de 2.000 pela primeira vez.
- **Importação:** 65 de 65 NAGs da Francesa e 32 de 32 símbolos do estudo chegam ao editor, à exportação
  **e ao aluno**; 9 de 9 capítulos no destino certo; ida e volta byte a byte.
- **Proteção:** `.editor/v2/N1-KPK.json` com o mesmo SHA-256 `4be602ca…` do começo; `content/` com o
  mesmo `34a42e9f…`; todas as rodadas fecharam com "987 arquivos conferidos, todos iguais".

---

## O modo de cada capítulo pelo nome, na importação do estudo (16/9/2026, pedido do Doug)

**O pedido:** "quando eu importar um estudo direto do Lichess, quero que o editor saiba sozinho se o capítulo é
introdução, aula, treino ou prática, e preencha — mas que eu possa mudar depois."

**O que já existia (10E e 15/9):** o seletor **Vira** por capítulo já vinha com uma sugestão, e o "Mudar para…"
já trocava o modo depois de importar. Mas a sugestão só olhava pistas técnicas (lição interativa → treino,
adversário "Engine" → prática, sem lances → introdução) e **nunca lia o nome**, que é onde o Doug escreve o modo:
"00 - Introdução da aula", "01 - AULA DIAGNÓSTICO", "02 - AULA EXPLICADA", "04 - TREINO GUIADO 1", "08 - PRÁTICA
LIVRE". O 01, sem lances, chegava como **introdução**, contra o nome.

**O que mudou (`lib/editor-v2/importar-estudo.ts`):**

- `destinoPeloNome`: introdução/apresentação/introduction → introdução; aula/lição/explicação/lesson → capítulo;
  treino/exercício/training/exercise → treino; prática/pratique/practice → prática. Sem acento e sem diferença de
  maiúscula; com duas palavras no nome, **manda a primeira**. "Capítulo" não conta: é o nome genérico que qualquer
  estudo usa.
- **O nome vence as pistas.** Quando o nome pede o impossível (um "Treino" sem lances), a pista técnica fica, e a
  frase diz por quê ("o nome diz «treino», mas um treino sem lances não tem o que cobrar: …"). Quando o nome
  vence uma pista diferente, a frase mostra as duas ("o nome diz «aula»; sem o nome, seria treino (é uma lição
  interativa no Lichess)").
- **Capítulo de posição parada na importação:** um capítulo sem lances, com posição válida, pode virar capítulo
  (antes só introdução, prática ou fora). O texto vai para o comentário da posição e para uma narração com
  **pausa manual** — o aluno lê a pergunta e clica em Continuar, o mesmo arranjo do "Mudar para capítulo" num
  quadro. A análise guarda a origem do PGN, então importar o mesmo estudo de novo continua recusado.
- `PainelDoEstudo.tsx`: a frase do topo diz de onde vem o preenchimento e que tudo pode ser mudado.

**Os ensaios que escolhiam a sugestão antiga** (`aula-do-lichess.spec`, `mudar-modo.spec`, `mudar-modo.test`)
agora escolhem "introdução" para o 01 **explicitamente**: eles testam o aluno e a mudança de modo sobre aquele
arranjo, não a sugestão. O arranjo novo tem teste próprio.

```
ANTES   importar-estudo.test.ts: 3 falhas — sugestões ["introducao","introducao","capitulo",…] (esperado o 01
        como capitulo); os nomes do estudo sintético ignorados; a aula importada com 7 etapas em vez de 8
DEPOIS  importar-estudo.test.ts 6/6 · mudar-modo.test.ts 7/7 (1 novo: o 01 parado → introdução → capítulo, sem erro)
```

**Evidência:** estudo `hf09xMzS` com **9/9** sugestões pelo nome (`introducao, capitulo×3, treino×4, pratica`);
importado como sugerido → fluxo `introducao, capitulo×3, treino×4`, **zero problemas de severidade erro**, e a
prévia do aluno dá ao 01 **um passo, sem lance, com pausa manual** e a pergunta. Estudo sintético de 9 capítulos
(sem acento, em inglês, duas palavras, nome impossível, sem palavra) → 9/9. **Navegador, 1366×768:**
`importar-estudo.spec` (seletores `introducao, capitulo, capitulo, capitulo, treino×4, pratica`; "a aula ganha 1
quadro(s) de introdução, 3 capítulo(s), 4 treino(s) e 1 prática(s)"; Conferir: "Pode publicar. 7 avisos") e
`mudar-modo.spec` — **2 passed**; limpeza "989 arquivos conferidos, todos iguais".

**Portões:** `typecheck` ✓, `lint` nos arquivos tocados ✓, `npm test` **1.341/1.341**. **Não rodaram:** `build`,
`validate:content`, `validate:mutations`, `repertorio:compilar --check`, a suíte de navegador inteira e o
`aula-do-lichess.spec` (que só ganhou a escolha explícita do 01) — a máquina estava com **727 MB livres** e duas
outras sessões abertas, abaixo do 1 GB em que o `next dev` trava. Rodar antes do commit.

**Portões completos, antes do commit (16/9, casa limpa do plano do curso de abertura):** `typecheck` ✓,
`lint` ✓ (depois de excluir `content/repertorio/rascunhos-anotados/` — rascunho `.gitignore`d que nunca foi
lintado antes; ver `eslint.config.mjs`), `npm test` **1.341/1.341**, `build` ✓, `validate:content` ✓ (19
posições, 3 aulas, 27 obras), `validate:mutations` ✓ (34/34 mutações plantadas ficaram vermelhas),
`repertorio:compilar -- --check` ✓ (27 linhas em 11 arquivos, compilado bate com a fonte). Todos verdes.
RAM livre variou entre 0,68 GB e 1,4 GB durante a rodada; nenhum portão travou.

**Não cobre:** "Mudar para…" **de e para prática** continua sendo a parada 2, aberta — hoje uma prática importada
por engano só sai excluindo e importando de novo. Teste humano do Doug com um estudo novo dele.

---

## Piloto 0 do curso de abertura — a Francesa 3.Bd3 v1.5 no editor atual (16/9/2026)

Sem código novo, na branch `curso-abertura`, para ver o estudo v1.5 cru antes da F0. Plano em
`~/.claude/plans/vamos-reestruturar-o-modo-fuzzy-hejlsberg.md`. O Doug entrou como professor; o resto foi pelo
Playwright (viewport 1517×641, `devicePixelRatio` 0,9). RAM livre 1,24 GB ao subir o `next dev`.

| Caminho | Contagem na busca | Aula criada | Etapas em `/editor/v2/assistir` |
|---|---|---|---|
| Link `lichess.org/study/qq2xorDl` | "38 capítulos" | `EX-P0-FRANCESA-V15-LICHESS` | **38 de 38** — 36 capítulos + 2 treinos (E20, E21 pelo nome) |
| Arquivo `..._v1.5.pgn` (Downloads) | "38 capítulos" | `EX-P0-FRANCESA-V15-PGN` | **38 de 38** — 38 capítulos; 973 de 4.000 lances |

Nenhum limite recusou nada; nenhuma prática, logo nada gravado em `content/positions/EX/`. Rascunhos só em
`.editor/v2/` (ignorado pelo git). "Os textos são meus" ficou desmarcado — a declaração é do Doug.

**O que a P0 mostrou, para as fatias:**
- **O PGN local não é lido como estudo.** Não tem `[ChapterName]`: o código está em `[White]` ("A00") e o título
  em `[Black]`. A tela abre a importação de 38 jogos sem o "Vira" por capítulo, e os 38 ficam com o mesmo título
  (o `[Event]`), cada um com "origem da posição a revisar". É o que a F2 prevê (`codigoDoCapitulo` lê
  `White`/`Black` e sintetiza `ChapterName`).
- **Pelo link, o nome decide bem:** só E20 e E21 viraram treino; os 16 "Move Trainer" viraram capítulo narrado
  (a F2 os tira da narração). O E20 trouxe dois "REVISAR": c5 e dxe4 sem símbolo entraram como erro.
- **O capítulo 00 perde o código no título** ("Conhecendo a Francesa…", sem "00 -"); os demais o mantêm.
- **A busca preencheu "Pretas embaixo"** (o `Orientation "black"` do export); troquei à mão para brancas.
- **Aula extra exige classe de finais** (E/D/C/B) para criar — usei E. Curso de abertura não tem classe: a F1
  (`AB-`, `metadados.abertura`) precisa não pedir isso.
- **Marcadores crus na fala:** o player mostra "[OBJETIVO] Entender a ideia…" literalmente; o texto da página traz
  essa fala duas vezes — não confirmei se as duas estão visíveis.
- Sem erros no console ao abrir `/assistir`.

---

## F0 do curso de abertura — o contrato escrito (16/9/2026)

Só documentação, na `curso-abertura`. Nenhum código mudou; nenhum portão de código foi rodado (não se aplica).

| O que | Onde |
|---|---|
| **§13.3 "Curso de abertura"**: decisões 1–14 e regras globais 15–18 (numeração do plano), identidade `AB-`, leitura do estudo (código por `ChapterName` ou `White`/`Black`, papel de cada capítulo, parada), marcadores, molde da aula, mapa das 5 aulas da v1.5, relatório da importação, critérios de aceite | `docs/EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md` |
| **§18.1**: etapa `treinador` (feita = cada linha do bloco uma vez), parada em 3 etapas sem confete, progressão por vez (`aula_concluida`, 1ª/2ª/3ª vez, retomar) | idem |
| **§21, emenda**: PGN do repertório gerado a partir do estudo; régua sem tamanho nos 11; `categoria`/`ordem` | idem |
| §4 (vocabulário: curso de abertura, parada; fluxo com move trainer) e §28 (item novo no checklist, aberto) | idem |
| **§15, emenda** (fonte autoral = estudo, `.pgn` gerado, `AB-`, `aula_concluida` aditiva) | `docs/EDITOR-V2-PLANO-FINAL.md` |
| Aviso datado no topo; §2.7 substituída; §4 régua revogada; §5 caminho de abertura com curso | `docs/REPERTORIO.md` |
| Plano versionado, com os achados da P0 no Modelo e no Leitor | `docs/CURSO-DE-ABERTURA-PLANO.md` |
| Fixture do export do Lichess (`/api/study/qq2xorDl.pgn?orientation=true&clocks=false`, o mesmo endereço do importador; 48.201 bytes, 38 capítulos, 38 `ChapterName`, 38 `Orientation "black"`) | `e2e/fixtures/lichess-francesa-v15-qq2xorDl.pgn` |
| Fixture do PGN local (cópia byte a byte do arquivo em Downloads, conferida com `cmp`; 41.392 bytes, 38 jogos) | `e2e/fixtures/francesa-v15-pgn-local.pgn` |

**Achados da P0 que viraram contrato:** aula `AB-` não pede classe de finais; orientação vem da cor do curso;
o leitor aceita `White`/`Black` como código/título e não perde o `00`; marcador nunca aparece cru; irmão sem
símbolo sai no relatório e não vira erro.

**Decididas pelo Doug no mesmo dia (16/9), depois da F0** — registradas na spec §18.1 e §21:
1. **Prosa do estudo no Git público: pode.** As fixtures e o futuro `rascunhos/estudo-brancas-francesa.pgn` ficam
   no repositório, mesmo citando o curso do Grigoryan (o estudo já é público no Lichess).
2. **Linha que é o começo de outra fica** (E22A ⊂ E22B): não conta como repetida. A F2b ajusta a regra se ela barrar.
3. **Aulas não se trancam entre si:** todas abertas; a trilha só sugere a ordem.
4. **Aberturas sem estudo mantêm a ordem do arquivo** no move trainer, como hoje.

**Parada da F0:** o Doug lê a §13.3. Próxima fatia: F1 (schema `AB-`).

---

## F1–F7 do curso de abertura — a rodada longa (16–17/9/2026)

Pedido do Doug: "fazer tudo de uma vez e testar no final". Branch `curso-abertura`. Tudo o que está abaixo foi
rodado; o que **não** foi rodado está na última subseção.

### O que foi feito, por fatia

| Fatia | Entrega | Onde |
|---|---|---|
| F1 | Id `AB-<COR>-<ABERTURA>-<BLOCO>` no `aulaIdV2Schema`; `dominioDaAulaV2`/`aberturaDoId`; `metadados.abertura`; `fluxo.tipo "treinador"` + `treinadores` (opcional, sem `default` — o hash das publicações de finais não muda: `fixture-aula-v2 --check` igual); narração com `rotulo`; treino com `papel: "parada"`. Regras novas: `TREINADOR_FORA_DE_ABERTURA`, `FLUXO_SEM_TREINADOR`, `TREINADOR_FORA_DO_FLUXO` (rascunho); `ABERTURA_DIVERGE` e `TREINADOR_LINHA_AUSENTE` (publicação, lendo `public/repertorio/index.json`). `AULA_FORA_DA_TRILHA` não fala de `AB-`. `/finais`, `indiceDeAulas`, progresso de finais e `lerPacoteDoAluno` ignoram `AB-` (a rota `/finais/AB-…` sai de `generateStaticParams` e dá 404). Índice do editor ganhou "Cursos de abertura" e "Importar curso de abertura". | `lib/editor-v2/dominio.ts`, `modelo.ts`, `conferencia.ts`, `lib/finais/`, `app/editor/page.tsx` |
| F2 | Leitor puro do estudo: código por `ChapterName` ou `White`/`Black` (o `00` não se perde), papel de cada capítulo, ramos que ensinam (alternativa a lance do adversário, com texto), paradas, marcadores com rótulo, linhas do move trainer com categoria e ordem, comentário do repertório por lance, avisos (orientação, pergunta no lance nosso, parada sem resposta, capítulo vazio, marcador desconhecido, frase de bastidor, lance mudo). | `lib/editor-v2/curso-de-abertura.ts` |
| F2b | **Régua de tamanho removida dos 11 repertórios** (teto, piso de 12, roque/peças fora, `fechamentosAbertos` no `validarBanco`, aviso `acima-da-profundidade`); `[%plano]` segue valendo quando existe. `LinhaSchema` com `categoria` e `ordem` opcionais; tags `[Categoria]`, `[Ordem]`, `[Linha]` no compilador. `proximaLinha`: nunca-vista pela menor `ordem`, vencidas desempatam por ordem. Gerador do PGN (um jogo por linha distinta; comentário = primeiro do estudo sem marcadores; símbolos juntados de todos os capítulos; irmãos nossos marcados viram variação). `french-with-bd3.pgn` apagado dos rascunhos e excluído no `fontes.json`. Seletor de linhas agrupa por categoria. | `lib/repertorio/linhas.ts`, `arvore.ts`, `compilar.ts`, `treino.ts`, `gerar-do-estudo.ts` |
| F3 | Planejador → 5 `AulaV2`: capítulo por trecho entre paradas; ramo ancorado na raiz da mesma análise ("Voltamos a…" da prévia); parada = treino independente de uma questão (`correta` + `alternativa` para `!`/`!?` + erro nomeado para `?`/`?!`); revisão F23 = introdução com um quadro por trecho; treino guiado = árvore das linhas do bloco numa análise própria (até 4 defesas por posição, rotação determinística); move trainer com os ids de linha. Ids determinísticos pelo código. | `lib/editor-v2/planejar-curso.ts` |
| F4 | Player: etapa `treinador` (`TreinadorDaAula`, reusa `Passada`: 1ª vez da linha assistida → treino → valendo; grava por `registrarTreino`); parada sem confete (`TreeStage semConfete`); rótulo da fala acima dela; link de voltar configurável. `Passada`, `FitaDeLances`, `OQueFalta` foram para `components/repertorio/` (`Treino` e `SeletorDeLinha` ficam na rota, que é deles). Prévia do professor e "Assistir a publicada" recebem as linhas do move trainer. | `components/lesson/LessonPlayer.tsx`, `components/repertorio/` |
| F5 | Progressão por vez: migração **0015 `aula_rodada`** (uma linha por passada: etapas feitas, início, conclusão; RLS de leitura; só o servidor escreve) — **aplicada no Supabase em 17/9** (aditiva, liberada até 18/9; `db:rls` "A RLS segura"). Regra pura `lib/aberturas/rodada.ts`; servidor `rodada-banco.ts` confere a etapa no fluxo, tentativa com sucesso **nesta rodada** no treino e passada de cada linha no move trainer. Player: abas trancadas até a primeira pendente (1ª e 2ª vez), **Pular** só na explicação da 2ª vez, tela "Ir ao move trainer / Fazer a aula inteira" da 3ª vez, retomar na primeira pendente, faixa "Aula concluída". | `supabase/migrations/0015_aula_rodada.sql`, `lib/aberturas/`, `app/aberturas/aulas/acoes.ts` |
| F6 | Tela `/editor/v2/curso-de-abertura`: abertura do repertório + nome, link/arquivo/colado → **Ler** (tabela das 5 aulas com etapas, paradas, ramos, linhas e situação nova/igual/muda; capítulo por capítulo; avisos "O que corrigir no Lichess"); **Criar/Substituir as aulas** (cópia de segurança em `.editor/v2/snapshots/<ID>/` antes de substituir); **Aplicar o PGN do repertório** (só compila → mostra nascem/morrem/progresso que zera → confirmação → transação do editor do repertório + estudo cru em `content/repertorio/rascunhos/estudo-<cor>-<abertura>.pgn`). | `app/editor/v2/curso-de-abertura/`, `components/editor-v2/ImportarCursoDeAbertura.tsx`, `lib/editor-v2/importar-curso.ts` |
| F7 | Rota do aluno `/aberturas/[cor]/[abertura]/aulas/[bloco]` (dinâmica: abre a rodada no servidor); faixa "Aulas" na mesma linha do cabeçalho da abertura (`lib/aberturas/curso.ts`, por dados); frases da janela Publicar para `AB-`. | `app/aberturas/[cor]/[abertura]/` |

### Números medidos (testes que rodam no `npm test`)

- **Leitor, nas duas fixtures:** 38 capítulos → 5 aulas; 27 perguntas (A 2, B 9, C 4, E+F 12), **25 paradas jogáveis** (B03 e
  C13 não têm lance nosso depois da pergunta); 16 capítulos de move trainer → **19 linhas, 12 completas**; ramos B08 4 (ordem
  dos CASO 2–5), B09 1, C12 2, C13 2, **E20 7** (a spec dizia 8 — recontado à mão no PGN: 7 variações; spec e plano
  corrigidos); 4 lances mudos: **1.e4, 11.Nf3, 12.Qxf3, 11.a3**; B09 aceita 5.dxc5 e 5.Nf3; só o Lichess perde o
  `[RESUMO]` final de B09 e C12; o arquivo local traz as tags `Model*` da D17; nenhum símbolo perdido na leitura.
- **Gerador:** do estudo como está, a compilação reprova **só** os 4 mudos; com eles comentados, 19 linhas compilam na
  ordem E22A→E22P, com categoria, `5.c3!` com alternativas `d4c5`/`g1f3`, e `marcas-das-fontes` estudo → gerado sem
  nada faltando nem irmão cortado.
- **Planejador:** 5 aulas válidas, sem problema de rascunho nem de limite; paradas por aula [2, 8, 3, 0, 12], ramos
  [0, 5, 4, 0, 8], linhas do move trainer [2, 8, 9, 0, 19]; D só com o capítulo; A/B/C/E+F terminam em treino guiado +
  move trainer; F23 antes do treino guiado; nenhum marcador cru em fala; planejar 2× = idêntico; com o PGN gerado
  compilado, as 5 aulas **podem publicar** (zero erro).
- **Importar:** criar → 5 "nova"; reimportar igual → 5 "igual", nada regravado; mudar a pergunta da B05A → B e E+F
  "muda" (o texto do 5...Qxg2 também é fala da defesa no treino guiado da E+F), cópia de segurança existe e é a antiga;
  aplicar o PGN numa cópia do repositório: **nascem 19, morre `brancas-francesa-05eae3b2`**, `compiladoCoerente` vazio,
  as linhas das aulas estão no índice, e a trava dos símbolos passa com o estudo cru nos rascunhos.
- **Rodada:** 1ª vez abre só até a primeira pendente e não pula; 2ª pula só explicação (partida modelo pula); 3ª não
  trava e conclui com o move trainer; aula sem move trainer continua pedindo tudo.

### Portões (17/9, na pasta principal, com o `next dev` do Doug ligado — o build usa `.next/`, o dev `.next/dev`)

`typecheck` ✓ · `lint` ✓ · `test` **1580/1580** ✓ · `build` ✓ · `validate:content` ✓ · `validate:mutations`
**36 de 36** vermelhas (as 2 novas: `ABERTURA_DIVERGE` e `TREINADOR_LINHA_AUSENTE`, na fixture nova
`AB-BRANCAS-ALAPIN-A`, cujo move trainer aponta para a linha compilada da Alapin) ✓ · `repertorio:compilar -- --check` ✓.

### O que NÃO foi feito ainda (e por quê)

- **O repertório da Francesa não foi trocado nem as aulas da Francesa publicadas.** O estudo no Lichess continua igual à
  fixture (conferido em 17/9 baixando de novo): os 4 lances mudos reprovam o PGN gerado, e sem ele o move trainer das
  aulas A/B/C/E+F não publica (`TREINADOR_LINHA_AUSENTE`). É o Doug quem escreve esses 4 comentários.
- **Ensaio de navegador:** feito em 17/9 — ver "Ensaio do curso de abertura no navegador" logo abaixo.
- Pendências do estudo que o leitor **não** detecta sozinho e continuam só na lista da §13.3.8: `[PROXIMO]` apontando
  errado (E20, E21, C13), "Regra N" diferente entre C13 e E22O, "Golpe 4/5" não são táticas, "Ndb5" no E22N.

---

## Ensaio do curso de abertura no navegador (17/9/2026, madrugada)

Playwright do MCP no `next dev` do Doug (porta 3000, viewport 1517 e 1366×768, zoom 0,9), RAM livre 1,6 GB. Sem
imagem: tudo medido pelo texto da página e pelo banco.

**Professor — `/editor/v2/curso-de-abertura`, arquivo `francesa-v15-pgn-local.pgn`:** a tabela deu A 9 etapas/2
paradas/2 linhas, B 32/8/5 ramos/8, C 16/3/4/9, D 1, E+F 35/12/8/19 — igual aos testes. 22 avisos em "O que corrigir no
Lichess". O PGN do repertório recusado com **12 itens** (os 4 mudos repetidos por linha). *Defeito achado e consertado:*
os problemas chegavam num parágrafo só (o compilador junta tudo numa mensagem); a action agora quebra por linha.
**Criar as aulas** → as 5 `AB-BRANCAS-FRANCESA-*` criadas em `.editor/v2/` (fora do Git; ficam para o piloto do Doug).
Índice do editor mostra "Cursos de abertura" com as 5. O editor abre a aula B sem erro de console.

**Prévia do professor, aula B (`/editor/v2/assistir/AB-BRANCAS-FRANCESA-B`):** 32 etapas, abas "Sua vez — B04",
"… — depois de 4.e5" etc. Na parada B05A a pergunta aparece; 1.Nf3 errado não passa; **6.Be4 → "Isso: 6.Be4."** e o
botão "Ver a técnica". O capítulo seguinte mostra o rótulo **PUNIÇÃO** acima da fala. Etapa 31 é o treino guiado
("Jogue as linhas da aula…"); a 32, o move trainer, avisa que as 8 linhas não estão no compilado (o PGN não foi aplicado).

**Aluno — aula de ensaio `AB-BRANCAS-ALAPIN-E2E`** (a aula A da Francesa com o move trainer trocado para a linha
compilada `brancas-alapin-5eb647e6`), gravada e publicada por script com a conferência verde, conta `alunoteste`:

1. `/aberturas/brancas/alapin` mostra a faixa **Aulas: E2E**; a aula abre com "← Alapin 2.c3".
2. **1ª vez:** abas 2–9 desabilitadas; sem Pular; o botão de seguir só aparece no fim do capítulo; a aba seguinte abre
   depois. Paradas A00 (3.Bd3) e A01 (4.Bxe4) com "Isso: …". Treino guiado jogado até 11.O-O-O ("PRONTO."). Move trainer:
   a linha abriu **assistida** (seta → "Treinar sem a seta" → "Valendo" → "Terminar o move trainer"). Faixa "Aula
   concluída!". **No banco:** rodada 1 com 9/9 etapas e `concluida_em`; `tentativas_aula` das 3 etapas de treino com
   sucesso; `repertorio_progresso` da linha com 1 tentativa, 1 acerto.
3. **2ª vez** (recarregar): abas trancadas até a primeira pendente; **Pular** no capítulo 1 e no 2; **nenhum Pular na
   parada** (etapa 3).
4. **Retomar:** recarregar no meio abriu na **etapa 3**, a primeira pendente.
5. **3ª vez** (a rodada 2 foi marcada concluída direto no banco, para não jogar tudo de novo): tela "Esta é a sua 3ª vez
   nesta aula" com **Ir ao move trainer** / **Fazer a aula inteira**; o atalho abriu a etapa 9 já no valendo.
6. `/finais/AB-BRANCAS-ALAPIN-E2E` = **404**; `/finais` não cita a aula. Em 375 px, a aula e a página da abertura sem
   rolagem horizontal (400 ≤ 416).

**Limpeza conferida:** apagados `content/aulas-v2/AB-BRANCAS-ALAPIN-E2E`, o rascunho, a conferência, a transação e o
snapshot; no banco, as 3 rodadas, as 3 tentativas e a linha da Alapin do `alunoteste`. `git status` só com a correção da
action. **Zero erro de console** em todo o ensaio.

**Achado de experiência, não consertado:** dentro do move trainer da aula a trilha das etapas não aparece (a `Passada`
tem painel próprio); o aluno volta por "← Etapa anterior". Decisão de gosto — fica para o Doug ver na tela.

### Roteiro numerado para o teste do Doug (piloto final)

Antes: **escrever no Lichess os 4 comentários** que faltam no estudo `qq2xorDl` — 1.e4 (capítulo 00), 11.Nf3 (B05B),
12.Qxf3 e 11.a3 (C12). O resto da lista "O que corrigir no Lichess" é opcional para o piloto.

1. `/editor/v2/curso-de-abertura` → Francesa 3.Bd3 → colar `https://lichess.org/study/qq2xorDl` → **Buscar** → **Ler o
   estudo**. Esperado: a seção 3 diz "nascem 19; morrem 1" (a linha escrita à mão `brancas-francesa-05eae3b2`).
2. **Substituir as aulas** (as 5 já existem como rascunho; cada uma ganha cópia de segurança).
3. **Aplicar o PGN do repertório** → **Sim, aplicar**. Esperado: "✓ brancas-francesa.pgn aplicado".
4. No editor, abrir cada aula `AB-BRANCAS-FRANCESA-*` → Conferir → Publicar (a aula D não depende do passo 3).
5. Entrar como `alunoteste` (PIN 112233) → `/aberturas/brancas/francesa` → faixa **Aulas** → **B**.
6. Fazer a aula B inteira: paradas (B05A = 6.Be4), ramos do B08 com "Voltamos a…", B09 aceitando 5.dxc5, treino guiado,
   move trainer (E22C → E22I, cada linha uma vez).
7. Reabrir a aula B: 2ª vez, com Pular só nos capítulos. Concluir de novo.
8. Reabrir: 3ª vez, "Ir ao move trainer".
9. Abrir a aula D: só a partida; na 2ª vez, Pular livre.
10. Commit do que o passo 3 mudou (`content/repertorio/`, `public/repertorio/`, `content/aulas-v2/AB-*`) só com o Doug.

> **17/9/2026:** o "Antes" acima caiu. O comentário deixou de ser obrigatório (entrada seguinte), e o PGN gerado
> compila com o estudo como está.

---

## Comentário opcional no move trainer — regra global (17/9/2026)

**Decisão do Doug:** "não é necessário comentar em todo lance no Move Trainer, pois é a última etapa — nem aviso;
quero que seja global". Eu tinha proposto rebaixar a erro para aviso; o Doug recusou o aviso também.

**Medido antes da mudança:** o estudo `qq2xorDl` baixado de novo em 17/9 ainda tinha os 4 lances nossos sem
comentário (1.e4, 11.Nf3, 12.Qxf3, 11.a3) e o impacto do PGN recusava com 20 itens. Os rascunhos das 5 aulas saíram
"muda" contra o plano novo.

**O que mudou:**

| Onde | Antes | Agora |
|---|---|---|
| `lib/repertorio/linhas.ts` (`conferirRegras`) | erro no último lance sem comentário e em todo lance nosso sem comentário | nenhuma regra de comentário |
| `lib/repertorio/editor/sessao.ts` | "Ir até a linha" levava ao lance mudo; texto da linha vazia citava régua velha | vai ao fim da linha; texto só pede linha que termine em lance nosso |
| `lib/editor-v2/curso-de-abertura.ts` | aviso `LANCE_MUDO` + `lancesMudos` | apagados |
| `lib/repertorio/banco.test.ts` | exigia comentário nos 351 lances nossos publicados | conta os 351, não exige |
| `lib/repertorio/estudo-francesa-de-teste.ts` | comentava os 4 mudos para os testes | apagado; os testes usam a fixture como está |
| testes de `compilar`, `aplicar`, `sessao`, `gerar-do-estudo`, `importar-curso`, `planejar-curso`, `curso-de-abertura` | provavam a recusa | provam que compila; "não compila" agora usa lance ilegal |
| `AGENTS.md` | — | seção "Comentário de lance no move trainer é opcional" |
| `REVISAO-FONTES` §1/§23.8, `REPERTORIO` (16/9), plano do curso (12 e lista), spec (12, lista, §21), plano final, `MODO-EDITOR-PLANO` | "todo lance nosso comentado" | marcado como revogado em 17/9 |

As telas já tratavam a falta (conferido no código): `Comentario` do `Treino` devolve nada sem texto,
`TreinadorDaAula` só mostra a caixa com texto, `Passada` não trava para ler quando o comentário é nulo.

**Teste que falha antes e passa depois** (`linhas.test.ts`, "comentário é opcional…", rodado com o `linhas.ts` antigo
por `git stash` e depois com o novo):

```
ANTES:  ✖ comentário é opcional: lance nosso sem texto, no meio ou no fim, passa (Doug, 17/9/2026)
DEPOIS: ✔ comentário é opcional: lance nosso sem texto, no meio ou no fim, passa (Doug, 17/9/2026)
        linhas.test.ts: tests 25, pass 25
```

Portões depois da mudança (17/9, `next dev` do Doug ligado, RAM livre 1,07 GB): `typecheck` ✓ 22 s · `lint` ✓ 79 s ·
`test` **1578/1578** ✓ 32 s (eram 1580: dois pares de testes da regra antiga viraram um cada) · `build` ✓ 35 s ·
`validate:content` ✓ 2 s · `validate:mutations` **36 de 36** ✓ 61 s · `repertorio --check` ✓ 1 s. Total 4 min 10 s.

### Pergunta de reflexão (17/9/2026, mesma sessão)

**Decisão do Doug**, vendo "C13: a [PERGUNTA] está antes do primeiro lance" em "O que corrigir no Lichess": "é um
capítulo só para o aluno pensar… quero que exista isso na regra: um capítulo de reflexão, introdução para o próximo".

O planejador **já** mantinha a pergunta sem lance como fala com rótulo "Pergunta" e pausa manual
(`narracoesDoNo`, `planejar-curso.ts`); só o leitor a tratava como defeito. Agora `[PERGUNTA]` sem lance nosso para
jogar — antes do 1º lance (C13) ou no fim do capítulo (B03) — é **pergunta de reflexão**: fala com pausa, sem parada,
sem aviso. Saíram `PERGUNTA_ANTES_DO_PRIMEIRO_LANCE` e `PARADA_SEM_RESPOSTA`; `PERGUNTA_NO_LANCE_NOSSO` só avisa quando
há lance para jogar (fica o B05B). Regra escrita na spec (§13.3 item 6, tabela, "Parada", lista da v1.5) e no plano do
curso. Avisos do estudo: 23 → 19 (lance mudo) → **16**.

```
planejar-curso.test.ts "pergunta de reflexão…"
ANTES:  ✖ AssertionError: @C13 — 'PERGUNTA_ANTES_DO_PRIMEIRO_LANCE@C13'
DEPOIS: ✔ (C13 e B03 sem aviso; as duas perguntas chegam ao aluno com pausa "manual"; B05B continua avisando)
```

### Piloto: PGN aplicado e as 5 aulas publicadas (17/9/2026)

1. **Tela `/editor/v2/curso-de-abertura`** (Playwright, 1517 px, zoom 0,9): link `qq2xorDl` → Buscar (47.498 caracteres)
   → Ler: A 9/2/0/2, B 32/8/5/8, C 16/3/4/9, D 1, E+F 35/12/8/19; as 5 "muda — cópia de segurança antes";
   "Nascem 19; morrem 1", zera `brancas-francesa-05eae3b2`.
2. **Substituir as aulas** → 5 × "substituída, com cópia de segurança".
3. **Aplicar o PGN** → "Sim, aplicar" → "✓ brancas-francesa.pgn aplicado, e o estudo guardado como rascunho da fonte".
   `repertorio --check` coerente; `marcas-das-fontes` passa (nenhum símbolo perdido). O `banco.test.ts` mudou de
   número de propósito: Base **20 → 38** linhas, lances nossos **351 → 499**, em **45** linhas. O
   `importar-curso.test.ts` passou a usar a Francesa escrita à mão como fixture
   (`e2e/fixtures/repertorio-brancas-francesa-escrita-a-mao.pgn`), para não depender do repositório já aplicado.
4. **Conferir e publicar** (script com `conferirAulaV2` → `prepararPublicacaoV2` → `publicarAulaV2`, as funções da
   tela): as 5 verdes, **0 erros**; avisos de voz A 6, B 11, C 8, D 3, E+F 13 (`VOZ_CARACTERES`, `VOZ_PROIBIDA`,
   `VOZ_PALAVRAS`). Publicações `pub-ae8e8e5c…` (A), `pub-a56295f9…` (B), `pub-a07a70db…` (C), `pub-9f06b8b2…` (D),
   `pub-2d9706c4…` (E+F).
5. **Aluno** (`alunoteste`, contexto separado, 1366×768): `/aberturas/brancas/francesa` com a faixa Aulas A–E+F e
   "linha 1 de 19"; a aula B abre na etapa 1 de 32, abas trancadas, zero erro de console. **Não** fiz a aula como
   aluno — a 1ª vez fica para o Doug.
6. **Prévia do professor, aula B:** etapa 32 = "Move trainer — aula B · linha 1 de 8 — Preparação: dama no centro"
   (E22C), sem o aviso de linhas fora do compilado; etapa 28 (B09), **5.dxc5 → "5.dxc5 também vale, mas a aula
   segue por 5.c3."**

Nada disso tem commit: `content/repertorio/`, `public/repertorio/`, `content/aulas-v2/AB-*` e o código das duas
regras esperam o Doug.

**Portões de novo** (depois da reflexão e do PGN aplicado): 3 vermelhos no `escrever.test.ts`, que supunha 23 jogos
escritos à mão. Medido: 41 jogos; reescrever os 11 arquivos continua sem perder nada (contagens antes = depois); o
arquivo gerado já sai na forma do escritor (reescrita idêntica). Teste ajustado: 41 jogos, gerado ⇒ idêntico, escrito
à mão ⇒ muda, e os números novos (298 comentários com quebra, 1068 quebras, 87 variações, 44 NAGs, 37 símbolos
colados). `npm test` **1579/1579**; typecheck e lint ✓.

### O painel da aula longa (17/9/2026, pedido do Doug no teste)

**O que o Doug viu** na aula B como `alunoteste`: "os comentários do professor não cabem na tela; o painel lateral
fica com a lista de todas as etapas e o painel do professor é empurrado para baixo. Deixar o mais clean possível."

**Causa:** `TrilhaDaAula` (`components/lesson/LessonPlayer.tsx`) desenha um botão por etapa no topo do painel; com
32 etapas de títulos longos a fileira ocupava a altura do painel.

**Feito:** acima de **8 etapas** (as de finais têm até 5; a extra de teste, 8 — ficam iguais) a trilha vira
`TrilhaCompacta`: uma barra fina com um segmento por etapa (feita / atual / adiante) e o botão **"Etapas 3/32"**, que
abre a lista inteira **por cima** do painel (não empurra nada), com as trancadas desabilitadas; fecha ao escolher,
clicando fora, ou com **Esc** numa camada de atalho própria (`useCamadaDeJanela`, como os menus do editor). *Defeito
achado na medida e consertado:* a primeira versão escutava o Esc no `document`, e na prévia "Fazer a aula como
aluno" o Esc também encerrava a aula.

**Medido** (Playwright, sem imagem): na página do aluno, a trilha ocupa **36 px** (y 90–126); o texto do professor
fica em 233–585 e os botões em 597–645, dentro da tela nas três janelas testadas. Na prévia: lista com 32 itens,
512 px; escolher a 20 → "Etapa 20 de 32 · Laboratório", lista fechada; Esc fecha só a lista (sem "Aula
interrompida"); clicar fora fecha. Nenhum e2e usa aula `AB-` (os que citam "Etapas da aula" usam aulas de finais,
≤ 8 etapas); a suíte de navegador **não** foi rodada.

### As 5 aulas da Francesa em ordem pedagógica (17/9/2026, tarde)

**O que o Doug viu** na aula B: "muitos erros — texto vindo antes do lance, ordem pedagógica errada". Autorizou
reescrever para ficar linear e com andaime.

**Medido antes, com o aluno no Playwright:** B03 com a pergunta **depois** do "A seguir"; B04 com 6 lances mudos e a
parada; o Resumo do Laboratório (B08) **antes** dos casos 2–5; B05B com Qxe6+ e ...Qxe6 mudos antes de "Podemos
entregar a dama?"; a dica **na tela de entrada** da parada (entregava a resposta); errar dizia "linha treinada";
depois de acertar, o botão dizia "Ver a técnica"; no C12, o ramo 9...Be7 repetia 19 lances sem "Voltamos a".

**Código (só aulas `AB-`; finais não usam parada e ficam iguais), cada item com teste que falhou antes:**
- `lerComentario` guarda a `sequencia` das falas; a pergunta sai onde foi escrita.
- Com ramos, Resumo e A seguir da linha principal fecham o **último ramo** (`fecharNoUltimoRamo`).
- Parada: dica fora da entrada; lance errado → "Ainda não. Dica: …" (`dicaSoNoErro`, `fluxo-do-aluno.ts`).
- Comparação conta desde a raiz o capítulo que continua depois de uma parada (`percursoParaComparar`, `previa.ts`).
- Treino guiado: só as frases iniciais do comentário (≤ 100 cada, as duas somadas cabem em 200).
- Entre capítulos do curso o botão diz "Continuar". "tentativa" saiu da lista de proibidas (Doug).

**Texto do estudo** (`content/repertorio/rascunhos/estudo-brancas-francesa.pgn`; cópia do anterior no scratchpad da
sessão): fala de contexto antes de cada parada e `[DICA]` própria em todas; B03 mostra as três escolhas como ramos;
B05B vira duas paradas (achar Qxe6+, achar Nxa7#); Laboratório com uma parada por caso; C12 ganha a parada do
11.gxf3 (Qxf3/Nxf3 = "também vale"); frases de bastidor e "iniciativa" saíram; A seguir do C13 e do E20
corrigidos. **Nenhum lance e nenhum símbolo mudou**; nenhuma linha do move trainer morre (19 textos mudam).

**Republicado** (planejar → substituir com cópia → aplicar PGN → conferir → publicar): A 9 etapas/2 paradas, B 44/13,
C 18/4, D 1, E+F 35/12; **0 erros e 0 avisos** nas 5. Aluno (`alunoteste` zerado): aula B jogada da etapa 1 à 43
e aula C até a 14, sem travar. Portões: test 1583/1583, typecheck, lint, validate:content, 36/36 mutações,
`repertorio --check` ✓. **Não rodado:** build depois das mudanças, treino guiado e move trainer inteiros, aulas A,
D e E+F na tela, suíte e2e.

**Pendência que morde:** o estudo do Lichess (`qq2xorDl`) ficou **para trás** do arquivo local. Reimportar pelo link
desfaz tudo isto — importe pelo arquivo, ou leve o PGN local para o Lichess antes.

---

## Rodada do feedback do aluno — Francesa 3.Bd3 (17/9/2026, tarde)

O Doug fez as aulas como `alunoteste` e mandou 12 pontos, mais graus no site todo e uma página de progresso. Plano em
`~/.claude/plans/feedback-1-um-a-reactive-waterfall.md`. Dois donos de arquivo: um subagente (páginas, trava, graus,
`/progresso`, move trainer) e a sessão principal (player da aula, estudo, republicação). Sem commit.

**Decisões do Doug nesta rodada** (mudam a spec §18.1, emendada): trava **dura no servidor, por aula** — as linhas da
aula X abrem ao concluir X, aulas em ordem, professor sempre livre, chave `TRAVA_POR_AULA` (`lib/aberturas/trava.ts`);
linha trancada não conta em "faltam", no portão do Avançado nem no nível 5; cores Chess.com dos seis símbolos; grau
visível por item no site todo; capa no início do capítulo. **Adiado para depois de 18/9:** barrinha de avaliação,
porquê completo nos 38 capítulos + `[CURTO]`, símbolo do lance do adversário no move trainer.

### O que mudou

| # | Pedido | Causa medida | Feito |
|---|---|---|---|
| 1, 9 | Aluno caía direto no move trainer; sem página da abertura | faixa das aulas e `<Treino>` na mesma rota; aulas sem trava | página da abertura (Francesa: linha do tempo A→E+F com as linhas de cada aula; as outras 10: lista das linhas); move trainer em `/aberturas/[cor]/[abertura]/treino`; `gravarTreino` recusa linha de aula não concluída (exceto com rodada aberta da aula dona ou professor); aula trancada redireciona antes de abrir rodada |
| 10 | Progresso do `alunoteste` não aparecia | banco: 4 linhas no degrau 1 (nenhuma aprendida) e 3 rodadas abertas (A 8/9, B 43/44, C 15/18); `/aberturas` só contava aprendidas e ninguém lia `aula_rodada` | cartão com aulas concluídas, em andamento e linhas começadas; `/progresso` |
| 2 | Balão "Leia o comentário" grande; Espaço não andava no capítulo | `CartaoDeComando` `min-h-16`; `aluno-continuar` declarado e nunca ligado | cartão `min-h-12`, ícone 18 px, linha "Aperte Espaço para continuar"; comentário e feedback em `text-base`; Espaço no capítulo (completa → vira página → anda → segue), na capa e no fim do treino, com a guarda do botão focado (`lib/atalhos/foco.ts`) |
| 3 | 1.e4 sem comentário, 2.d4 sem porquê | estudo | 1.e4 e 2.d4 explicados no capítulo 00 |
| 4 | Símbolos todos da mesma cor, parados | capítulo usava `NagOverlay` verde fixo; treino não desenhava | `simboloNaCasa` no capítulo, com animação; NAG → desenho (`simboloDoNag`), tokens `simbolo-interessante` (roxo claro, `!?`) e `simbolo-imprecisao` (amarelo, `?!`); o treino desenha o símbolo do lance do adversário e do acerto do aluno (3.Bd3 → "Ótimo!") |
| 5 | Sem transição | só um `h2` | marcador `[SECAO] Título \| subtítulo` (leitor → `capitulo.secao`/`introducao.secao` → etapa do aluno; fora das falas, dos desconhecidos e do PGN do move trainer); `CapaDeSecao` com "Parte N de M"; capas fixas no treino guiado e no move trainer |
| 6 | Confete + som | peças existiam, faltavam nos fins | `components/Celebracao.tsx` (`useCelebracao`): aula de abertura concluída, fim de linha (aula e página), fim de série de tática e da rodada do rating (70 problemas); `TreeStage`/`PracticeStage` usam o mesmo; treinos intermediários da aula de abertura não festejam |
| 8 | "Tente de novo" infinito no treino guiado | `treino-jogavel.ts` só devolvia `FORA_DA_LINHA` | escada no mesmo lance (`lib/lesson/ajuda-no-erro.ts`): dica → casa acesa → seta + "Rever o capítulo"; do 2º degrau em diante a tentativa grava `ajuda`; no move trainer, a mesma escada na fase treino e "Jogar com a seta" em destaque depois de 2 passadas erradas |
| I | Graus | — | `lib/progresso/grau.ts` (Novato → Mestre): linha = degrau atual; aula de finais = escada; aula de abertura = menor grau das linhas; tática por tema em todos os modos, peso = rating/1000, Especialista e Mestre exigem acerto recente (80%/90% nos últimos 30) e caem; `SeloDoGrau` na página da abertura, fim do valendo ("Subiu para …"), `/finais`, `CartaoDoTema`, `/progresso` |

**Calibração da tática** (acervo medido: 233.897 puzzles): 212 a 7.230 por tema; mediana de rating por tema de 1116 a
1832; "difícil" = quartil de cima do tema (1184–1966). Réguas: Aprendiz 3 pontos, Intermediário 15, Experiente 35 +
70%, Especialista 60 + 80% + 8 difíceis, Mestre 100 + 90% + 20 difíceis. O caminho do tema (39 puzzles a 75%) dá ~40.

### Estudo e republicação

Capas `[SECAO]` em 12 capítulos (00, A00, A01, B03, B04, B08, B09, C10, C13, D17, E20, F23). **Lances e símbolos
idênticos** — impressão digital por capítulo (posição + lance + NAGs) antes = depois nos 38, 979 lances, avisos do
leitor 7 = 7. Republicado pelo caminho da tela, por script: planejar 2× idêntico; repertório nascem 0, morrem 0 (os
19 ids iguais), 19 textos mudam (o 1.e4); as 5 aulas **0 erros e 0 avisos** (a primeira fala de 2.d4 tinha 23 palavras
e foi partida). Uma publicação da aula B falhou uma vez no registro (`publicar.ts:209`) e passou na repetição, "igual".

### Testes que falham antes e passam depois

```
[SECAO]  antes: SyntaxError … does not provide an export named 'secaoDoTexto'; ✖ [SECAO] no capítulo vira a capa…
         depois: curso-de-abertura + planejar-curso 41/41
NAG→cor  antes: SyntaxError … does not provide an export named 'simboloDoNag'   depois: 4/4
Espaço   sem a guarda: ✖ "com o botão focado, o atalho não age"   com a guarda: 1/1 (foco.test.ts)
escada   ajuda-no-erro.test.ts 2/2 (módulo novo); símbolos do treino: planejar-curso 21/21
trava    antes: ERR_MODULE_NOT_FOUND lib\aberturas\trava.ts   depois: 7/7
contagens antes: ✖ linha trancada por aula não conta em nada (45/46)   depois: 46/46
grau     antes: ERR_MODULE_NOT_FOUND grau.ts   depois: 11/11
passada  antes: 41/45 (escada, só-treino, sugere a seta, cartão da leitura)   depois: 45/45
```

### Tela (Playwright, `alunoteste`, 1366×768 de CSS com `devicePixelRatio` 0,75)

- Antes: `/aberturas/brancas/francesa` abria o move trainer; cartão de comando 64 px.
- Depois: cartão 49,7 px. Aula A: capa "Parte 1 de 5 · Conheça a Francesa" → Espaço percorre o capítulo 00 inteiro
  (fala nova de 1.e4 e 2.d4) e chega à parada da etapa 3 sem mouse. Parada com 3 erros: "Ainda não. Dica: …" → "Olhe a
  peça da casa acesa." → "O lance é Bd3. Siga a seta." + seta + "Rever o capítulo". 3.Bd3 → entrada grande "Ótimo!",
  disco azul `rgb(116,155,191)`. Espaço no fim da parada abre a etapa 4.
- `/aberturas`, página da Francesa, `/treino`, `/progresso`, Alapin: 200, sem rolagem horizontal, zero erro de console;
  `/aulas/c` → redireciona. Move trainer da aula A jogado por script (2 linhas, valendo) → "Aula concluída" com o
  canvas do confete → na página, A "Concluída" com as 2 linhas em "Treinar", B vira "a aula de agora" e abre; o
  `/treino` da Francesa serve as 2 linhas.

**Portões** (17/9, `next dev` ligado, RAM livre 1,3 GB): `test` **1613/1613** · `typecheck` ✓ · `lint` ✓ ·
`validate:content` ✓ · `validate:mutations` **36/36** · `repertorio --check` ✓. **Não rodados:** `build` (precisa do
`next dev` desligado), suíte e2e (as rotas novas entraram em `e2e/linha-de-base.spec.ts` sem rodar), aula B inteira
com o treino guiado depois da mudança, celular 375 px das telas da aula.

**Pedidos que chegaram no meio da rodada** (fechados no mesmo dia):

- **Design da `/progresso`** (skill impeccable): escada dos 6 graus com a contagem do aluno em cada um; títulos em
  `rotulo`; nome à esquerda e grau à direita em Finais e Tática (o nome truncava a 375 px); estado vazio clicável
  inteiro; "treinar antes conta como adiantamento" saiu (não é verdade: a escada só sobe no vencimento). Sem rolagem
  horizontal em 375 e 1366; typecheck e lint ✓.
- **Avatar de perfil** (`/perfil`): 20 ilustrações SVG por tokens (`components/avatar/Avatares.tsx`), sem nome visível
  ("fica infantil", Doug); aparece no cabeçalho e no painel; o nome não é editável. Migrações **0016** e **0017**
  aplicadas (coluna `perfis.avatar` com `check` dos 20 ids). **Achado de segurança:** desde a 0001 a RLS deixava o
  aluno fazer `update` na própria linha de `perfis` inteira — medido no banco, a conta de teste virou "Hacker" com
  `papel = professor`. A 0016 tirou a política; o avatar grava por server action que só escreve `avatar`.
  `db:rls` "A RLS segura" com a seção 14 nova (antes da 0016: 5 falhas). `lib/avatar/avatares.test.ts` 5/5.
  Portões depois de tudo: `test` **1618/1618**, typecheck, lint, `validate:content` ✓.
- **Meu perfil, Turma e selos** (decisões do Doug: vitrine só com avatar, nome, nível e selos; página Turma sem
  números; as quatro conquistas que faltavam; selos de repertório por abertura). `/progresso` → `/perfil`. `/turma`
  em ordem alfabética, sem contas de ensaio para alunos; vitrine `/turma/[id]` lida por módulo `server-only` que
  escolhe `id, nome, avatar` (sem rating, tabuleiro, equipe, `usuario`, datas; família rating omitida). Selos novos:
  puzzles resolvidos distintos 100/250/500/1000; pontaria 80 na melhor janela de 100 tentativas; primeira aula de
  abertura e curso inteiro por curso publicado; um selo por abertura do índice (Base toda aprendida **e nenhuma linha
  trancada**), saindo "repertório de brancas/pretas". Migração **0018** aplicada (`selo_conquistado` com
  `visto_em`, `selo_inicio`, view `puzzles_do_aluno`): selo gravado não some; primeira avaliação silenciosa; selo
  novo com aviso e confete uma vez. Relatório do professor com avatar, selos com data, graus e aulas de abertura.
  `db:rls` "A RLS segura" (seção 15); `selos:ciclo` view = TypeScript. Portões: `test` **1642/1642**, typecheck,
  lint, `validate:mutations` 36/36, `repertorio --check` ✓.

**Fechada a mesma noite:** a brecha do "Base inteiro" — o Doug decidiu por pop-up "exigir as aulas".
`baseCompleto` (`lib/repertorio/treino.ts`) ganhou o crivo "nenhuma linha do Base trancada", no mesmo
padrão do selo por abertura; vale para o selo, o portão do Avançado e o nível 5, todos pela mesma
função. `faltamNoBase` e o "faltam N" da tela não mudaram (continuam ignorando a trancada, decisão
de mais cedo na noite). Teste `treino.test.ts` "Base completo exige NENHUMA linha trancada": antes
`baseCompleto(...) === true` com uma linha trancada; depois `false`. Portões: `test` **1643/1643**,
typecheck, lint, `validate:mutations` 36/36.

---

## O teste humano da fatia 10 — o roteiro numerado

> **Atualizado depois da revisão de experiência de 14/9/2026:** a tela foi reorganizada (ver "Revisão de
> experiência" acima). Onde o roteiro cita um botão que mudou de lugar, vale o nome novo: Importar, Exportar,
> Conferir, Nível e publicações, Atalhos e Desfazer tudo estão em **⋯ Mais ações**; "Pré-visualizar" virou
> **Ver como aluno**; comentário e narração são as abas **Nota do professor** e **Fala para o aluno**.

> **Reescrito em 14/9/2026 a pedido do Doug.** O roteiro anterior (45 itens, blocos A–G) conferia
> funções uma a uma. Este responde à pergunta que decide o editor: **um professor de xadrez — o Doug ou
> outro — fica tão confortável aqui quanto no estudo do Lichess, ou mais?** Por isso ele segue as duas
> situações de verdade: **mexer numa aula pronta** e **criar uma aula do zero**. Os gestos que só a mão
> prova, e as perguntas 1, 2, 3, 7, 9 e 11 da Parada 10H, continuam dentro dele.
>
> **A árvore de 1.000 lances saiu do teste humano** (era o item 45). Nenhum estudo do curso chega perto
> disso — a maior aula de hoje tem 50 lances, e o seu estudo do Lichess inteiro, 64 meios-lances nos 9 capítulos. Os 1.000 são
> margem de segurança contra uma partida muito analisada importada de uma vez; essa medida continua no
> ensaio automático (`e2e/desempenho.spec.ts`). O que decide o desempenho passa a ser a pergunta 21:
> **a aula real pareceu lenta em algum momento?**

**Para quem:** o Doug, no computador dele, com o `npm run dev` ligado. **Resolução:** a tela normal do
notebook. **Duração estimada:** 2 h a 2 h 30 — cada parte é um ponto de parada: mande o resultado ao fim
dela, e o que der errado é consertado antes da parte seguinte.

**Como anotar cada item:**

- ✅ fiz sozinho · ⚠️ fiz, mas travei (diga onde) · ❌ não consegui;
- nos itens com **⚖️**, compare com o Lichess numa palavra — **aqui melhor**, **igual** ou **lá melhor** —
  e, se não for "igual", o porquê numa frase;
- anote a hora no começo e no fim de cada parte.

**Preparado pelo agente antes do teste:** `npm run dev` ligado; aluno de teste criado (`alunoteste`, PIN
`112233`); SHA-256 da `.editor/v2/N1-KPK.json` anotado para conferir no fim.

**O Doug prepara:** entrar como professor em `http://localhost:3000/editor`; uma **janela anônima** para o
aluno; no Lichess, abrir o estudo `https://lichess.org/study/hf09xMzS` e **cloná-lo** (as comparações da
Parte 1 mexem no clone, nunca no original).

### Achado no próprio teste, e já feito (14/9/2026)

**Nova aula nascendo de uma importação.** No item 1 o Doug perguntou: "se eu vou importar uma aula, o
nome já está no PGN, ou no link. Por que eu tenho que escrever de novo?". §5.2 mandava criar a aula vazia
e importar lá dentro; o Doug decidiu mudar. Agora **Nova aula** tem duas portas, **Vazia** e **Importando
do Lichess ou de um PGN** (link, arquivo ou texto colado). A segunda lê o PGN antes de criar, mostra
quantos capítulos vieram e preenche o título (`sugestaoDaImportacao` em `lib/editor-v2/nova-aula.ts`:
nome do estudo sem `_` e sem a marca `v1`, depois capítulo, evento, jogadores, arquivo) e a orientação
quando todos os capítulos concordam. Tipo, nível e classe continuam do professor. Criar grava a mesma
aula vazia de sempre e deixa o PGN na aba (`sessionStorage`); o editor abre a janela de importar com ele
lido, uma vez só. A importação em si não mudou.

```
lib/editor-v2/nova-aula.test.ts   ANTES: SyntaxError — o módulo não exporta sugestaoDaImportacao (arquivo reprovado)
                                  DEPOIS: tests 12, pass 12
e2e/editor/nova-aula-importando.spec.ts   1.ª rodada: ✖ "6 capítulos" (o leitor de jogos pula os capítulos
                                  só de texto) → contagem pelo leitor de estudo → ✔ 1 passed (6,4 s)
```

`typecheck` ✓ e `lint` ✓ nos arquivos tocados. `npm test`: **1.295 de 1.296** — a falha é
`pratica.test.ts` ("adicionar ao acervo"), que copia o `content/positions` real e supõe que a FEN
`8/8/8/8/4k3/8/8/3QK3 w - - 0 1` não está no acervo; a importação do Doug em `EX-PROMOCAO-PEAO` gravou
`content/positions/EX/pos-ex-promocao-peao-1.json` com essa FEN. Teste frágil, não defeito desta mudança —
consertado logo depois (ver abaixo). `build`, `validate:content`, `validate:mutations` e
`repertorio --check` **não rodados** (o `next dev` do teste está ligado na mesma pasta); sem commit.

**Fazer a aula inteira como aluno, antes de publicar.** Pedido do Doug depois de publicar a aula importada:
"ao clicar em Publicar, quero a opção de fazer a aula inteira, inclusive os treinos e a prática livre, e
saber quanto tempo demora — não uma prévia, a aula completa; e poder negar". Feito:

- **Publicar** pergunta antes: "Antes de publicar, quer fazer a aula inteira como aluno?" — **Fazer a aula
  inteira**, **Publicar sem fazer** ou Cancelar. Se a mesma versão já foi feita, não pergunta; se a aula
  mudou depois, pergunta e diz a hora e o tempo da vez anterior.
- **Pré-visualizar** ganhou **Fazer a aula inteira como aluno** no topo; "A aula inteira" virou **Assistir aos
  capítulos** (o que ela sempre fez).
- A tela cheia (`AulaComoAluno.tsx`) pede ao servidor a aula **da tela** montada como a publicação montaria
  (`aulaComoAlunoV2Acao`: `montarPacoteV2` + `aulaDoAlunoV2`, sem gravar nada) e a toca no `LessonPlayer`
  do aluno **sem** `onEtapaFeita`: introdução, capítulos, treinos com o defensor e a prática contra o
  Stockfish. Barra com ⏱; `Esc`, "← Sair da aula" e "Terminar e ver o tempo" levam ao **resumo** (tempo
  por etapa, tentativa e situação de cada treino e prática, total), com **Continuar de onde parei**,
  **Voltar ao editor** e, com a conferência verde da mesma versão, **Publicar agora**.
- No player, duas opções que o aluno não passa: `aoSair` (o "← Finais" vira "← Sair da aula") e a camada de
  atalhos (`VistaDoTabuleiro camada`), para `x` e `?` valerem por cima do editor. Isto fecha o buraco
  "a prévia aula inteira só encadeia capítulos" de §28 "Prévia real".

```
lib/editor-v2/aula-como-aluno.test.ts          3/3 (relógio por etapa, formato, resumo)
e2e/editor/aula-como-aluno.spec.ts             1.ª rodada: passos ✔, mas 56 erros "NaN" de seta no console — o
                                               player escondido com display:none atrás do resumo desenhava a
                                               seta com tamanho zero → resumo por cima, player `inert` → ✔ 19 s
                                               (pergunta, 8 etapas, treino 04 jogado, "concluída · 1.ª
                                               tentativa", x, Esc, Continuar, 0 tentativas no banco, Publicar
                                               agora, e o Publicar da mesma versão sem perguntar)
aula-do-lichess.spec (o aluno real até o mate)  ✔ 5 tentativas no banco com publication_id — o aluno não mudou
aula-do-zero, pratica, importar-estudo, atalhos, nova-aula-importando   ✔ (limpeza: 982 arquivos iguais)
npm test                                        1.299/1.299
```

Os ensaios que publicam passaram a responder "Publicar sem fazer" (`abrirPublicar` em `e2e/preparo/aulas.ts`).
**A falha de `pratica.test.ts` foi consertada**: o teste copiava `content/positions/EX/`, que muda com o uso do
editor; agora copia o acervo sem `EX/` (antes 3/4, depois 4/4). Três ensaios (`importar-estudo`, `aula-do-zero`,
`pratica`) esperavam criar `pos-ex-e2e-…-1` e passaram a aceitar a posição do acervo com a mesma FEN — o
acervo não duplica FEN, e a do Doug (`pos-ex-promocao-peao-1`) já existe. Cada rodada de ensaio apaga e o agente
recria o `alunoteste`. Portões `build`, `validate:content`, `validate:mutations` e `repertorio --check` ainda
não rodados; sem commit.

**Casas roxas no player do aluno — decisão do Doug: sem marcas automáticas no formato novo.** O Doug viu
casas roxas "pré-selecionadas de outra aula". Medido no navegador, etapa por etapa: a aula não tem desenho roxo
nenhum; o roxo é o pincel `paleRed`, o **corte** que o player antigo deduz da posição (`teachingShapes`,
`lib/chess/annotations.ts:32`), chamado por `ObjectiveStage.tsx:275` e `TreeStage.tsx:222` — 7 casas no
capítulo, 14 no treino 04 (coluna d e fileira 4 da dama). Foi pedido do Doug nas aulas antigas ("eu não vejo o
corte acontecer"); no formato novo o professor desenha o próprio corte, e a marca da máquina aparecia no
player sem nunca aparecer no editor. Das três saídas (interruptor por aula, tirar do formato novo, deixar), o
Doug escolheu **tirar de todas as aulas do formato novo**, inclusive a N0-LADDER convertida. Conserto:
`marcasAutomaticas` (padrão ligado) em `ObjectiveStage` e `TreeStage`; os quatro chamadores do formato novo
passam `false` (`LessonPlayer` capítulo e treino v2, `Previa`, `PreviaDoTreino`). As 49 aulas antigas (player
v1) não mudam.

```
e2e/editor/aula-como-aluno.spec.ts   ANTES: ✖ "corte roxo no capítulo" Expected 0, Received 7
                                     DEPOIS: ✔ 18,5 s (0 no capítulo e 0 no treino 04)
aula-do-lichess (aluno real até o mate) ✔ · atalhos ✔ · npm test 1.299/1.299
```

**Excluir aula, e os três achados da fila — pedido do Doug, 14/9/2026.** O Doug não gostou da aula
importada e não achou como apagar; pediu o botão e o conserto dos três achados da Parte 0.

1. **Excluir aula…** no índice `/editor`, em toda aula extra (`EX-`). A janela calcula antes o que sai (capítulos,
   treinos, prática, quadros, e as posições do acervo que só esta aula usava) e o que fica (a posição
   compartilhada, com quem a usa). "Mover para a lixeira" leva o rascunho, o registro da conferência e essas
   posições para `.editor/v2/lixeira/<AULA>--<carimbo>/`, com `manifesto.json`; a seção **Lixeira** do
   índice restaura byte a byte. Aula publicada é desativada (as publicações ficam guardadas) e guarda as
   posições. **Aula do curso (série N) não tem o botão, e o servidor recusa** — protege as 49 e a N1-KPK.
   Restaurar recusa sem mexer em nada se o id foi ocupado, e um manifesto adulterado não escreve fora dos
   lugares da lixeira. Regras em `lib/editor-v2/excluir-aula.ts`.
2. **Publicar sempre na tela** (a especificação §5.3 dizia "somente quando permitido", e o botão nem existia
   antes de um Conferir verde). Com a conferência verde desta versão, abre a publicação; sem ela, **confere
   sozinho** — verde, segue para a pergunta de antes de publicar; com problema, o recado "Ainda não dá para
   publicar: N problemas impedem" e a lista. Nada publica sem conferência verde: só o caminho ficou à vista.
3. **A mesma declaração para o estudo inteiro.** A janela "De onde veio esta posição?" oferece, marcado,
   "Registrar o mesmo para as outras N posições que vieram de «obra»" (`posicoesDaMesmaOrigem`: mesma
   origem de terceiro, obra e link). Tudo num Desfazer só (`REGISTRAR_PROVENIENCIAS`).
4. **A lista da conferência se atualiza sozinha.** Com o resultado aberto e a aula mudada, o editor confere
   de novo 0,8 s depois do "✓ salvo"; o cabeçalho diz "A aula mudou depois disso — conferindo de novo…".

```
lib/editor-v2/excluir-aula.test.ts      5/5 (sai/fica, série N recusada, volta byte a byte, id ocupado, manifesto adulterado)
e2e/editor/excluir-aula.spec.ts         ✔ (lixeira, rascunho some do disco, Restaurar devolve igual)
e2e/editor/publicar-visivel.spec.ts     ANTES: ✖✖ (botão Publicar não existe) → DEPOIS: ✔✔
                                        + achados 2 e 3: ANTES ✖ (a caixa "Registrar o mesmo…" não existe)
                                        → DEPOIS ✔ (uma janela, e a lista chega a "Pode publicar" sem clicar em Conferir)
lib/editor-v2/proveniencia.test.ts      ANTES: o módulo não exporta posicoesDaMesmaOrigem → DEPOIS 6/6
npm test                                1.305/1.305
```

**Revisão de experiência — a tela limpa, inspirada no editor do Lichess (14/9/2026).** O Doug achou o editor
"complicado, muitas funções, tela poluída" e pediu uma revisão com Playwright olhando a experiência de um
professor leigo. Método: um passeio automático (`e2e/editor/tour-ux.spec.ts`, `--grep @tour`) por 28 telas de
uma aula real, com foto a 1366×768, contagem de palavras técnicas no texto visível e medidas de layout; as fotos
foram lidas por subagentes (a tela principal, as janelas, e o Lichess medido ao vivo: 35–41 controles visíveis,
uma fileira de ícones sob os lances, ações do lance no clique direito, nenhuma frase de explicação na tela).

O que mudou:

- **Barra do topo com 5 controles:** ↶ ↷ (Desfazer/Refazer), **Ver como aluno** (era Pré-visualizar), **Publicar**
  (o único botão cheio, confere sozinho) e **⋯ Mais ações** (Importar do Lichess ou PGN, Exportar, Conferir sem
  publicar, Nível e publicações, Converter aula antiga, Atalhos do teclado, Desfazer tudo em vermelho). Saíram
  "Editor v2 · piloto" e "Formato novo separado…". Componente novo `Menu.tsx`.
- **Resultado da conferência numa faixa:** "Ainda não dá para publicar: N problemas impedem." ou "Pode publicar.",
  com **Ver lista / Esconder lista** (aberta só quando algo impede) e **Resolver** (era "Ir para o problema"). O
  recado vermelho duplicado sumiu.
- **Coluna da aula:** seções Introdução / Capítulos / Treinos / Prática com "+" no cabeçalho, uma linha por item.
  Treino: a linha abre a edição, **▶** testa, **•••** tem Editar, Testar, Ligação com a aula (era "Propriedade e
  fonte") e Excluir. O campo solto "Nome do capítulo" e o botão "Trocar a posição inicial" foram para o **•••** do
  capítulo (Renomear, com dois cliques no nome também). Saiu "Arraste como um slide…".
- **Paleta de desenho em ícones** (♟ ↗ ◎, bolinhas de cor, 🗑), cada um com nome acessível; motor "desligado".
- **Painel do lance:** o nome do lance, os símbolos só quando há lance, e duas abas — **Fala para o aluno**
  (narração, "Esperar o aluno clicar em Continuar") e **Nota do professor** (comentário, que já aparece na lista
  de lances). O menu do lance esconde as ações impossíveis (fica só "Criar treino daqui" com motivo) e segue a
  ordem de uso.
- **Textos:** Nova aula começa como aula extra, nível 1, e "Critério de domínio" e o código da aula foram para
  **Opções avançadas**; treino diz **adversário** (não "defensor"), "Quando o treino acaba", "Salvar treino";
  prática "Nível do computador", "Posições salvas do curso"; exportar "Este capítulo / Todos os capítulos / Cópia
  completa da aula (backup)"; índice "Suas aulas…", "Aulas novas", "Abrir"; mensagens de origem sem
  "proveniência" nem FEN; "Tirar esta aula dos alunos" no lugar de "Desativar o v2".

```
passeio @tour (28 telas)        palavras técnicas visíveis 127 → 32 · alvos de clique < 24 px 190 → 26
                                tela principal: 5 → 1 ("D4", casa do tabuleiro num comentário: falso positivo)
                                autoria do treino: 9 → 0 · índice 6 → 0 · Nova aula 12 → 1
npm test                        1.305/1.305 (proveniencia.test e escrever-pgn.test ajustados às frases novas)
todos os ensaios de navegador   44 passaram, 25 pulados de propósito, 0 falhas (7,4 min); limpeza 982 iguais
```

Uma segunda revisão por foto, depois da primeira rodada, achou e fez consertar: o resultado da conferência
passou a flutuar no canto em vez de empurrar o tabuleiro (e a lista viva some enquanto ele está aberto, para
não repetir a frase); os nomes da coluna da aula ocupam até 2 linhas; o menu do lance abre em posição fixa,
virando para cima quando não cabe (antes saía cortado dentro da lista); "Editar treino" ficou com um tabuleiro
só, sem o código da posição; a caixa "Esperar o aluno" e as bolinhas de cor escuras ficaram visíveis.
Portões `build`, `validate:content`, `validate:mutations` e `repertorio --check` **não rodados**; sem commit.

O "controles sem nome" do passeio subiu, mas é defeito do medidor: conta os itens de menus `•••` fechados.

**Virar o tabuleiro e o lado do aluno num capítulo que já existe — pedido do Doug, 14/9/2026.** Depois de
importar o estudo, o Doug não achou como virar o tabuleiro nem como mudar a posição de um capítulo. A posição
já existia ("•••" do capítulo → Trocar a posição inicial…). Faltavam duas coisas:

1. **Botão "Virar tabuleiro" (⇅)** na barra de desenho, o que §10.2 pedia e só existia na tecla `x`. É o mesmo
   `x` (`useVirarTabuleiro` em `Atalhos.tsx`): vira só a vista do professor, não grava e não entra no Desfazer,
   com `aria-pressed` enquanto virado.
2. **"O aluno vê com as pretas/brancas embaixo"** no "•••" do capítulo, com "Hoje: … embaixo" logo abaixo. Um
   clique grava `capitulo.orientacao` pelo comando novo `DEFINIR_ORIENTACAO_CAPITULO`, e o Ctrl+Z desfaz. A
   orientação só se escolhia ao criar o capítulo, e o capítulo importado ficava com a do estudo. Repetir a
   mesma orientação devolve a mesma aula e fica fora do Desfazer (§6.1).

```
lib/editor-v2/capitulo.test.ts   ANTES: tests 13, pass 12, fail 1 (o comando não existia: "análise inexistente")
                                 DEPOIS: tests 13, pass 13
e2e/editor/atalhos.spec.ts       teste novo "o botão Virar tabuleiro…": vira e desvira com o arquivo igual; o •••
  (editor-1366, com o x antigo)  grava "black" no arquivo e o Ctrl+Z devolve "white" → 2 passed (15,8 s);
                                 limpeza 982 iguais; alunoteste recriado depois (PIN 112233)
```

**Portões, na cópia isolada `../olesc-portoes`, sobre `be2b0f4` com todas as mudanças sem commit desta data**
(revisão de experiência, excluir aula, aula como aluno, nova aula importando e este pedido; fora do commit
ficaram o rascunho v1 `content/rascunhos/lessons/N0-LADDER.json`, recriado por teste como em `15b390c`, e a
posição `content/positions/EX/pos-ex-promocao-peao-1.json` da importação do Doug): `typecheck` ✓, `lint` ✓,
`npm test` **1.306/1.306**, `build` ✓, `validate:content` ✓ (18 posições, 3 aulas), `validate:mutations`
**58/58** e `repertorio:compilar --check` ✓. Os ensaios de navegador das outras mudanças são os
registrados acima. Esta rodada só repetiu `atalhos.spec` (editor).

### O que ainda não existe — se fizer falta, anote, mas não procure

- arrastar uma variante para cima ou para baixo entre as irmãs (só existe **Tornar linha principal**);
- desenho próprio de cada narração;
- a tela da exceção do professor ao juiz externo;
- a lista de versões antigas para restaurar (o **Desfazer tudo** existe);
- a importação junta numa linha os parágrafos de uma narração; a prática não tem texto para o aluno;
- clicar numa linha do motor para virar variante, e o Opening Explorer (posteriores).

### Parte 0 — Trazer o que você já tem (≈ 15 min)

1. Em `/editor`, **Nova aula** → **Importando do Lichess ou de um PGN** → cole o link do seu estudo →
   **Buscar no Lichess**. Aparece "9 capítulos", e o título veio preenchido do estudo? Ajuste o título,
   escolha **Aula extra**, nível 1, classe E → **Criar aula e importar**.
2. A aula abre **já** na janela de importar, com os 9 capítulos. A sugestão do que cada um vira
   (introdução, capítulo, treino, prática) faz sentido?
3. Os avisos do que **não vem** do Lichess batem com o que você escreveu lá?
4. Marque "os textos são meus" → **Importar o estudo**. Passe pelos capítulos com o estudo ao lado:
   lances, variantes, comentários, símbolos e setas vieram iguais? ⚖️ **O que ficou diferente?**

### Parte 1 — Mexer numa aula pronta (≈ 45 min)

A aula é a que acabou de chegar. Faça **cada edição aqui e a mesma no clone do Lichess**, e compare.

5. ⚖️ **Achar e corrigir.** No capítulo dos lances, vá a um lance do meio pelas setas ← → e reescreva a **Nota do professor**.
6. ⚖️ **Trocar um lance.** Jogue outro lance no lugar, **arrastando** a peça. Nasceu uma variante, e a
   linha antiga continua lá? Agora, **botão direito** no lance novo → **Tornar linha principal**.
7. ⚖️ **Apagar e se arrepender.** Botão direito na linha que ficou de lado → **Excluir a partir daqui**.
   A janela diz o que se perde? Confirme, e **Ctrl+Z** traz de volta? (No Lichess não há desfazer.)
8. ⚖️ **Símbolo.** Marque **!** num lance e depois **!?**. Fica só um? Ele aparece ao lado do lance e no
   canto da casa de destino?
9. ⚖️ **Desenho.** Com o botão direito: seta verde; **Shift** vermelha; **Alt** azul; **Shift+Alt**
   amarela; clique direito acende casa. Depois faça o mesmo pela **paleta** de botões. Por fim
   **Apagar desenhos desta posição** — sumiu só desta posição?
10. **Comentário e narração.** Num lance importado com texto, a caixa de narração logo abaixo veio
    preenchida? Mude **só a narração** — o comentário continuou igual? Ligue **Esperar o aluno clicar em Continuar**.
11. ⚖️ **Organizar capítulos.** Renomeie um capítulo (dois cliques no nome, ou **•••** → Renomear); **arraste** para outra posição; no **•••**, **Mover
    para cima**; **Duplicar como independente**; e **Excluir capítulo…** a cópia. Cada coisa fez o que o
    nome diz?
12. ⚖️ **••• do capítulo → Trocar a posição inicial…** (mude uma peça de casa). A janela mostra o que
    continua valendo e o que se perde, **antes** de aplicar? Aplique e desfaça com Ctrl+Z. (O Lichess não
    tem.)
13. ⚖️ **Mudar um treino.** Abra o treino do afogamento → **Editar treino**: acrescente uma segunda
    resposta certa **ou** reescreva o texto do erro Dg6. **▶ (Testar)**, **arrastando** as peças:
    o texto novo aparece? (A lição interativa do Lichess aceita um lance certo só.)
14. **Assistir.** Num lance do capítulo, **Ver como aluno → Daqui em diante**. Teste pausar, voltar, repetir e as
    velocidades 0,5× 1× 2×. Ao fechar, você voltou ao mesmo lugar?
15. ⚖️ **Comparar.** Na variante Dg6??, botão direito → **Mostrar esta variante como capítulo**. Em **Ver como aluno
    → Assistir aos capítulos**, a aula mostra a linha certa, **volta ao ponto de escolha** e mostra a errada? (É o que no Lichess você
    teve de escrever em prosa: "Compare com P1.03".)
16. ⚖️ **Motor.** **L** liga; as linhas e a seta aparecem? Troque de aba do navegador por 10 s: ao voltar,
    ele tinha pausado e retoma?
17. ⚖️ **Levar para fora.** **⋯ Mais ações → Exportar… → Este capítulo** → copie e cole num capítulo novo do clone no
    Lichess (PGN). Os lances, os comentários, os símbolos e as setas chegaram lá?
18. **Publicar** (confere sozinho) → a pergunta "Antes de publicar, quer fazer a aula inteira como aluno?" →
    **Fazer a aula inteira**. Faça tudo, treinos e prática. O resumo mostra o tempo de cada etapa, e ele
    parece certo? **Publicar agora**: o que a tela diz antes de publicar dá para entender sem ajuda?
19. **Como aluno** (janela anônima, `alunoteste`): faça a aula inteira — introdução, capítulos, os treinos
    (no do afogamento tente Dg6: aparece o **seu** texto novo?) e a prática até o mate. "Etapa X de Y"
    aparece, e **← Etapa anterior** volta? **x** vira o tabuleiro e **?** mostra os atalhos no treino?
20. **Republicar só texto.** De volta ao editor, mude **só uma narração** → Conferir → Publicar. A tela
    diz que o progresso continua? No aluno, os treinos seguem feitos? (pergunta 11)
21. **Pareceu lento em algum momento** nesta parte? Em quê? (pergunta 7 — decide se o desempenho é
    consertado depois de 18/09)

### Parte 2 — Criar uma aula do zero (≈ 45 min)

Uma aula curta **sua**, do jeito que você daria amanhã. Sugestão: a da oposição do rei e peão, a que no
Lichess precisou de dois capítulos e uma frase "compare com". Anote a hora de início e de fim.

22. **Nova aula** → aula extra, com o título que quiser.
23. ⚖️ **Adicionar capítulo → Montar posição.** Arraste as peças da paleta; arraste uma **para fora** —
    ela some e a janela continua aberta? Escolha quem joga.
24. ⚖️ **Jogar a linha** arrastando as peças. Cada lance aparece na lista?
25. **Narrar só onde importa.** **+ Escrever fala para o aluno** nos lances que pedem texto, e nenhum texto nos
    outros. Na prévia do capítulo, os lances sem texto correm sozinhos e ele para nos que têm?
26. ⚖️ **O erro que se ensina.** Volte ao ponto de escolha, jogue o lance errado (nasce a variante), marque
    **?** ou **??**, comente e desenhe uma seta.
27. ⚖️ **A comparação** (item 15, agora na sua aula): **Mostrar esta variante como capítulo**, e em
    **Ver como aluno → Assistir aos capítulos** a aula volta ao ponto de escolha.
28. **De onde veio a posição.** Na lista de problemas, **Ir para o problema** → **Autoria própria** →
    Registrar. O aviso sumiu?
29. **Introdução.** **Criar introdução** com 2 quadros ligados à posição do capítulo → **Pré-visualizar a introdução**.
30. ⚖️ **Treino.** No capítulo, **Criar treino daqui** → **Editar treino**: duas respostas certas, um erro
    conhecido com texto próprio e uma dica. **▶ (Testar)**: teste o erro e a dica.
31. **Prática.** **+ Criar prática** → "De um capítulo desta aula".
32. **Ordem da aula.** Mude a ordem das etapas com ↑ ↓ e deixe como quer.
33. **Conferir → Publicar**, e o aluno faz a aula. **Quanto tempo levou a Parte 2, e quanto levaria no
    Lichess** (sem o treino com dois lances certos, que lá não existe)?

### Parte 3 — Quando dá errado (≈ 15 min)

Na aula da Parte 2.

34. **Ctrl+Z** cinco vezes e **Ctrl+Y** cinco vezes. Voltou tudo?
35. **⋯ Mais ações → Desfazer tudo…** → confirme. A aula voltou a como estava ao abrir o editor, e um Ctrl+Z traz tudo de
    volta? (pergunta 1)
36. Com "✓ salvo", recarregue (F5). Nada se perdeu?
37. Escreva um comentário e **feche a aba em menos de 1 segundo**, antes do "✓ salvo". Reabra: o editor
    oferece a cópia preservada neste navegador? (pergunta 2)
38. Abra a mesma aula em **duas abas** e mude uma coisa em cada. A segunda avisa conflito, sem apagar a
    mudança da primeira? (pergunta 3)

### Parte 4 — Teclado (≈ 10 min)

39. **x** vira e desvira o tabuleiro sem mudar a aula? **?** abre os atalhos e **Esc** fecha? Com o **•••**
    de um lance aberto, **L** não faz nada?
40. ← → ↑ ↓ **Home** **End** andam na lista de lances?
41. Em **Adicionar capítulo**, **Tab** várias vezes fica dentro da janela? **Esc** fecha e o cursor volta ao
    botão?
42. Refaça os itens 25 a 33 **sem o mouse**, exceto mexer peças e desenhar. Algum passo obrigou a pegar o
    mouse? Qual? (pergunta 9)

### Parte 5 — O veredito (≈ 5 min)

43. De 0 a 10, o conforto para **mexer numa aula pronta** — aqui, e no Lichess.
44. De 0 a 10, o conforto para **criar uma aula do zero** — aqui, e no Lichess.
45. Um professor que nunca viu o editor faria as Partes 1 e 2 sem você explicar? **O que ele não acharia
    sozinho?**
46. O que o Lichess faz melhor e **faz falta aqui**?
47. O que aqui é melhor a ponto de você **não querer voltar** ao Lichess para montar aula?
48. Qual foi o momento **mais irritante** do teste?

**Fora deste roteiro, para depois do deploy:** o aluno no **celular de verdade** passando por todas as
etapas sem rolar para o lado. Pelo `next dev` o celular não serve: o Next bloqueia os arquivos de
desenvolvimento pedidos de outro endereço (`allowedDevOrigins`), e a página pode abrir sem funcionar.

**Depois do teste, o agente:** confere o SHA-256 da N1-KPK; lista as aulas `EX-` criadas e publicadas no
teste e **pergunta ao Doug** quais ficam (a da Parte 2 pode ser conteúdo de verdade); registra aqui as
respostas, a conta de ✅ contra a meta do plano §20 (≥ 90% sem ajuda) e os consertos.


## Como ligar o editor

```bash
echo EDITOR_LOCAL=1 >> .env.local
npm run dev            # e entrar como professor (usuário `doug`)
```

`/editor` lista as aulas. O link "Editar" aparece em `/finais` e em
`/professor`. Sem a variável — ou em build de produção, ou na Vercel — a rota
responde **404**, inclusive para o professor logado.

Trocar o PIN de qualquer conta: `node scripts/trocar-pin.ts <usuario> [pin]`.

`.claude/launch.json` existe só para a ferramenta de navegador do agente subir
esse mesmo `npm run dev` sozinha, em vez de deixar um terminal solto aberto.
Ele não muda nada de quem roda o servidor à mão.

---

## O que o Bloco 1 entregou

**Todos os portões verdes** em 2026-09-10: `typecheck`, `lint`, `npm test`
(712 testes, 40 novos), `validate:content`, `validate:mutations` (39/39
vermelhas), `build`, `repertorio:compilar --check`.

### Arquivos novos

| Arquivo | O que é |
|---|---|
| `lib/editor/local.ts` | A tranca de ambiente (`editorLigado`). Três condições. |
| `lib/editor/acesso.ts` | `exigirEditor()` — `server-only`, 404 + `professorAtual()`. |
| `lib/editor/rascunhos.ts` | A camada de disco: `baseHash`, `.tmp`+`rename`, autosave. |
| `lib/editor/fila.ts` | Fila single-flight de gravação (roda no navegador). |
| `lib/editor/gate.ts` | As duas passadas (A+B), o lock, `podePublicar`, `publicar`. |
| `lib/editor/saida-do-gate.ts` | O leitor do JSONL do gate. |
| `app/editor/acoes.ts` | As Server Actions. Nenhuma `route.ts`. |
| `app/editor/page.tsx` | O índice das aulas. |
| `app/editor/finais/[aula]/page.tsx` | O palco do editor. |
| `components/editor/Editor.tsx` | A casca: status, Conferir, Publicar. |
| `components/editor/Lapis.tsx` | O lapisinho (texto inline). |
| `components/editor/ListaDeDiagramas.tsx` | A coluna de miniaturas. |
| `components/editor/Miniatura.tsx` | Tabuleiro de selo, em glifos Unicode. |
| `scripts/trocar-pin.ts` | Dá PIN novo a conta que já existe. |

### Arquivos tocados

- `scripts/validate-content.ts` — ganhou `--jsonl` (aditivo, ver abaixo).
- `lib/lesson/schema.ts` — ganhou `professor?: { adaptouEm, nota? }`.
- `lib/finais/conteudo.ts` — `pacoteDaAula(lesson)` extraída de `lerPacote`.
- `components/lesson/LessonPlayer.tsx` — `startAt.passo`, `startAt.pausado`,
  `aoAndar`, e o objeto `edicao` (render-props do lápis).
- `components/lesson/IntroStage.tsx`, `ObjectiveStage.tsx` — `passoInicial`,
  `pausadoInicial`, `edicaoDaFala`, `edicaoDaTecnica`.
- `app/finais/page.tsx`, `app/professor/page.tsx` — links "Editar".
- `.gitignore` (`.editor/`), `.env.example`, `README.md`.

### A medida do bloco, cumprida

Fala da N1-KPK trocada pelo editor → conferir (A+B) → publicar. O
`git diff content/` mostrou **1 linha de fala + as 3 linhas do carimbo**, e nada
mais nas outras 543. Passada A verde, passada B verde, 38 posições de tablebase,
**0 pela rede**. Conferência A+B em **0,6 s**; publicação em 0,3 s. (O gate
inteiro roda hoje em 0,28 s — são 3 aulas; isso cresce quando as 49 chegarem.)

Cobertos por teste: duas gravações concorrentes → a mais nova vence; JSON
alterado por fora → recusa com "mudou fora do editor"; processo morto entre o
`.tmp` e o `rename` → o arquivo anterior está inteiro.

---

## Três decisões que **não** estão no plano

Quem continuar precisa saber destas, porque contrariam o que o plano supunha.

### 1. O Zod é juiz, nunca escritor

`lessonSchema.parse()` devolve as chaves **na ordem do schema**, não na ordem do
arquivo. Se o editor salvasse o objeto que o Zod devolve, mudar uma fala
reescreveria as 547 linhas da N1-KPK e o `git diff` deixaria de dizer o que o
professor mudou — que é a medida do bloco.

Por isso a verdade na tela é `cru`: o JSON **cru**, com a ordem de chaves do
arquivo, editado por espalhamento (`{...obj, campo: novo}`, que preserva a
posição de chave existente). O Zod entra só para julgar e para montar o objeto
que o player usa. **Todo bloco seguinte tem de manter isso.**

### 2. `--jsonl` é aditivo, e tem de continuar sendo

`scripts/mutation-check.ts` (linhas 1021-1036) junta stdout e stderr do gate e
procura o formato humano de duas linhas (`✖ [CODIGO] onde` + a mensagem). Se o
`--jsonl` suprimisse a saída humana, as 39 mutações quebrariam. Então os eventos
JSON saem **junto** com o texto, e `lib/editor/saida-do-gate.ts` ignora toda
linha que não seja um objeto JSON com `tipo`.

O `fail()` do gate não tem campo `aula`: a identificação vive dentro da string
`onde`, em cinco formatos. `aulaDoOnde` e `diagramaDoOnde` extraem por padrão,
com teste — em vez de tocar em ~60 pontos de chamada dentro do gate.

### 3. `server-only` ficou fora da camada de disco

O pacote `server-only` só é vazio sob a condição `react-server`, e
`npm test` (`node --test`) roda sem ela. Pôr o marcador em
`lib/editor/rascunhos.ts` trocaria os testes de concorrência e de interrupção
por nenhum teste. Ele mora em `lib/editor/acesso.ts`, por onde toda página e
toda ação passam; e `rascunhos.ts` importa `node:fs`, que é parede própria num
pacote de navegador.

### Um desvio menor

O plano punha o índice `/editor` no Bloco 3. Ele foi feito agora, na forma
mínima (lista as aulas, sem o menu "+ Nova aula"), porque **a N1-KPK não aparece
na bancada de `/finais`** — a bancada só lista o que o aluno *não* enxerga, e a
N1-KPK é publicada e aberta. Sem o índice, a medida do bloco não teria porta de
entrada. O menu "+ Nova aula" continua sendo do Bloco 3.

---

## O que ficou pendente do Bloco 1

Nada disto é código faltando; é verificação que não foi feita.

1. **A rodada de navegador.** Faltava o login de professor quando o bloco
   fechou. A **largura do palco a 1366×768** foi medida em 2026-09-10, junto
   com a rodada do "+", e **falhou** — está na seção daquela rodada, com os
   números e a causa. Continuam de fora: `/editor/finais/N1-KPK` = 404 em
   `next build && next start` e = 404 em `next dev` sem `EDITOR_LOCAL`. O
   mecanismo dos 404 está coberto por `lib/editor/local.test.ts` e por leitura
   de `exigirEditor()`, mas ninguém viu na tela.
2. **A medida de uso** — uma pessoa que nunca viu a tela muda uma fala sem
   instrução. Tempo **e** hesitações. É do Doug, não de um agente.
3. **A miniatura usa glifos Unicode**, não as peças do cburnett. Alcançar as
   peças de verdade exigiria fingir a estrutura do chessground em volta de cada
   casa. A troca é local a `components/editor/Miniatura.tsx`.

---

## O Bloco 2, até onde foi

Dois dos sete itens do bloco estão prontos e commitados. Os outros cinco não
foram começados.

### Pronto — o desenho (commit `add94e7`)

- `autoriaDoDesenho` em `lib/chess/annotations.ts`: o inverso de
  `desenhoDaAutoria`. **A regra que morde:** `desenhoSchema` é
  `.min(1).optional()`, então apagar o último traço tem de **omitir o campo**,
  nunca deixar `arrows: []` — senão o gate recusa a aula que o professor acabou
  de limpar. Tem teste de ida e volta.
- O botão direito desenha nas etapas 1 e 2 (`marcacao` → `desenhavel`). Com o
  editor ligado, o desenho da autoria **muda de camada**: sai da automática e
  entra na do usuário, que é a única em que o botão direito mexe. Os destaques
  deduzidos (corte, peça pendurada) ficam onde estavam.
- `lib/editor/edicoes.ts` — a cirurgia no JSON saiu do componente e ganhou
  teste contra a N1-KPK de verdade. É ela que guarda a promessa do editor
  inteiro, e a pergunta do teste é sempre "quantas linhas mudaram?".

### Pronto — a exceção do professor (commit `e856b08`)

`lib/lesson/excecoes.ts` + o campo `excecoes` no schema + a regra dentro do
`fail()` do gate + a cor amarela dos avisos. Verificado contra o gate de
verdade, não só por teste.

Um furo achado só rodando, e que vale lembrar: **o erro de posição não nomeia
aula nenhuma** (`onde` diz `posição pos-…`), mas a exceção mora no arquivo da
aula. A posição é devolvida à dona pela busca de qual aula a referencia. Sem
isso, a exceção existia e não perdoava nada, em silêncio.

As duas mutações foram plantadas (commit `ea9b177`), e escrevê-las destapou um
defeito na própria suíte: `linhasDoCodigo` casava `[CODIGO]` em qualquer linha e
só *removia* o `✖`, sem exigi-lo. Como os avisos novos usam o mesmo formato
(`▲ [CODIGO] onde`), um aviso passou a servir de prova de que a regra pegou o
estrago — e isso valia para a **suíte inteira**, não só para as duas novas.
Corrigido: o `✖` agora é exigido.

**A lição, para quem acrescentar aviso novo ao gate:** uma mutação que continua
vermelha com a regra desligada não guarda nada. A única maneira de saber é
desligar a regra de propósito e conferir que a suíte cai. Aqui: com a
conferência de hash sabotada, 41 de 41 continuavam vermelhas antes da correção;
depois dela, a suíte cai para 40 de 41, como tem de cair.

### Dois pedidos novos do Doug, já no plano (2026-09-10)

Ele pediu **controle total de edição** e tirou dois itens do "o que fica fora".
Os dois estão escritos no plano, no bloco certo, e **nenhum dos dois foi
implementado**:

1. **Editar a FEN de uma posição publicada, no lugar** (Bloco 3). O plano os
   excluía porque "a proveniência viraria mentira", e a objeção era boa: a
   proveniência diz *diagrama 1.3, página 47 do De la Villa*, e trocada a FEN
   essa frase descreve outro diagrama. A resposta não é proibir — é **arrastar
   a proveniência junto**: o status cai para `candidate`, `fenMethod` e
   `qaApplied` são reabertos, e o gate novo `FEN_SEM_PROVENIENCIA` pega a
   posição `approved` cuja FEN não bate mais com o que foi aprovado (a mesma
   mecânica de caducidade das exceções). A tela mostra antes e depois lado a
   lado e diz quantos alunos já treinaram aquela posição.
2. **Editar as respostas do defensor (`replies`)** — virou o **Bloco 2C**. A
   etapa 3 continua sendo saída: abrir o lápis nela seria escrever num arquivo
   que o `--write` regrava, e a edição sumiria em silêncio na conferência
   seguinte. O caminho é declarar as respostas na **fonte** (um campo novo no
   passo do roteiro) e deixar `derivarTreino` produzir `replies`. A medida do
   bloco é a que protege o que já existe: para as 3 aulas de hoje, `--write`
   não pode mudar um byte.

### Pronto — o "+" que acrescenta diagrama

**A descoberta que decidiu a forma:** um diagrama novo é um **passo sem
`lance`**. O `derivarTreino` pula passo sem lance antes de qualquer conta
(`lib/lesson/derivar-treino.ts:167`), o `montarQuadros` idem
(`lib/lesson/roteiro.ts:58`), e a corrente de legalidade do `superRefine`
também. Então **acrescentar diagrama em qualquer ponto do roteiro não muda um
byte da etapa 3** — e há teste que compara as duas árvores derivadas para
provar. O passo novo com lance quebraria a corrente do ponto de inserção em
diante: o professor pediria um diagrama e receberia a aula recusada. O lance
entra depois, pelo arrastar, e é aí que ele passa a ter consequência.

- `comPassoNovo` e `cabeMaisUmPasso` em `lib/editor/edicoes.ts`. Acrescentar um
  diagrama muda **3 linhas** do arquivo, e o teste afirma as duas metades: tudo
  antes do ponto de inserção é byte a byte igual, e tudo depois também, só
  deslocado.
- Os tetos saíram do schema para constantes exportadas (`MAX_PASSOS_INTRO` = 6,
  `MAX_PASSOS_ROTEIRO` = 24) e o `+` os usa. Um `+` com teto próprio produziria
  um rascunho que o próprio editor recusaria a salvar, e a mensagem que o
  professor leria seria a do Zod.
- Na tela: **o "+" mora no vão entre dois selos**, inclusive no de cima e no de
  baixo — o gesto pedido é "acrescentar um diagrama *aqui*", e "aqui" é um
  lugar. Quase invisível até o ponteiro passar, mas no DOM e recebendo foco
  (um "+" que só existe no `:hover` não existe para quem anda de Tab). No teto
  o vão some e uma frase no pé da coluna explica.
- **A conferência anterior é jogada fora ao acrescentar.** Ela marca diagramas
  por índice (`roteiro[3]` = quarto selo), e um passo no meio empurra os de
  baixo: manter as marcas acenderia a borda vermelha no diagrama errado, que é
  pior que não acender nenhuma.

### Pronto — `TEXTO_DE_MOLDE`, trazido do Bloco 3

O `+` obrigou. Fala vazia não é aula válida (`texto` é `min(1)`), então o passo
novo nasce com `MARCA_DE_MOLDE` (`«escreva aqui»`, exportada de
`lib/lesson/schema.ts`) — e sem portão nada impediria o professor de
acrescentar um diagrama, se distrair e publicar uma aula com um passo que
ninguém escreveu.

A regra vive no `checkLesson` e só na aula **publicada**: carregar a marca é o
estado normal de um rascunho em construção. Ela varre `falasDaAula`, que já
colhe todo texto que o aluno lê e já escreve o índice do passo
(`objective.roteiro[3].fala`) — então o `diagramaDoOnde` acende o sinal de erro
**no selo do diagrama** de graça, sem tocar no gate. (Sinal, e não borda: a
rodada de navegador mostrou que a borda vermelha nunca existiu no código. Ver
logo abaixo.)

Mutação plantada, e **conferida como o doc manda**: com a regra desligada de
propósito, a suíte cai de 42 para 41. Ela guarda de verdade.

### Não começado

- A **barrinha do tabuleiro** (flecha, casa, limpar, virar) e o chip
  "desenho deste diagrama / alvo do treino", para quem não usa botão direito.
- O **lance por arrastar** no diagrama.
- **Arrastar para reordenar** e `espera` como controle de pausa. (O "+" saiu, e
  a lixeira com desfazer também — ver a seção dela, mais abaixo.)
- `criarMotor()` extraído de `stockfish.ts` e a **barra de avaliação** com
  worker próprio.
- **Bloco 2C** — as respostas do defensor pela fonte (ver acima).
(O Bloco 2B e a moldura vermelha saíram desta lista: foram entregues. Ver
"O Bloco 2B, entregue", logo abaixo.)

### A rodada de navegador do "+" (2026-09-10) — feita

Ligado o `EDITOR_LOCAL=1`, `next dev`, logado como professor, em
`/editor/finais/N1-KPK`, etapa 2. **O "+" faz o que promete.**

- **O vão aparece e recebe foco.** Com o ponteiro em cima, a opacidade vai de
  `0` a `1` em 150 ms. Com o foco no selo 3, **um Tab** leva ao botão
  "acrescentar diagrama entre o 3 e o 4", com `:focus-visible` e opacidade 1 —
  a promessa do teclado se cumpre na tela, e não só no DOM.
- **O clique acrescenta.** 13 selos viraram 14, o novo é o 4, já selecionado,
  com `«escreva aqui»`, e a barra disse "salvo agora".
- **O diff é o prometido:** 6 linhas somadas, 0 removidas — as 3 do passo novo e
  as 3 do carimbo `professor.adaptouEm`. As outras 547 linhas, byte a byte. E
  `content/lessons/N1-KPK.json` intocado.
- **O portão pega antes da fala.** Conferir com a marca ainda no lugar acusou
  `TEXTO_DE_MOLDE` **num selo só** — o 4. Os treze antigos, limpos. Escrita a
  fala e conferido de novo: "conferência verde — pode publicar", em ~1,0 s.

Não foi publicado, e o rascunho foi devolvido ao estado inicial.

**O que a rodada ainda não cobre:** a medida de uso do bloco ("pessoa leiga
acrescenta um diagrama com uma flecha, sem instrução") continua sendo do Doug —
o que foi medido aqui é o mecanismo, não a hesitação de quem nunca viu a tela.
E o "+" **não tem gesto contrário**: um diagrama acrescentado por engano só sai
editando o JSON por fora, até a lixeira com desfazer existir.

### O que a rodada destapou — 1: a borda vermelha nunca existiu

Este doc e o comentário de `ListaDeDiagramas.tsx` dizem, os dois, que o selo com
problema "ganha borda vermelha". **O `className` nunca põe borda nenhuma.**
Medido no selo acusado, sem estar selecionado: `border-transparent`, igual ao
selo limpo do lado. A borda do selo é usada só para dizer qual está
**selecionado** (verde, `border-foco`), e um selo com problema que está
selecionado fica verde — o contrário do que se quer.

O aviso chega assim mesmo, por dois sinais menores: a **bolinha** no canto
(`bg-erro`) e o **código em texto** (`text-erro-tinta`). Os dois apareceram.

**Decidida em 10/9/2026** (o Doug delegou a escolha): a moldura fica
**vermelha no selo que tem problema e NÃO está selecionado**; ao selecioná-lo
ela volta a ser verde, e o problema segue avisando pela bolinha e pelo código
em texto — que estão à vista justamente porque o professor foi olhar.

O motivo da escolha, contra as outras duas: é a única que dá o aviso **de
longe** sem inventar desenho novo. "Sempre vermelha" obrigaria a uma terceira
forma para o selo que é os dois ao mesmo tempo (anel duplo, sombra), e "só
bolinha" deixa o professor procurar uma marca de 8 px numa coluna que agora
pode ter 40 selos. **Ainda não implementada** — é uma linha em
`ListaDeDiagramas.tsx:77-81`, que hoje nem chega a perguntar se há problema.

### O que a rodada destapou — 2: o palco não cabe em 1366×768

**A dívida aberta do Bloco 2.** Medido no editor, com a coluna de 13 selos:

| Janela | Documento | Sobra para fora | Tabuleiro cobre a coluna? |
|---|---|---|---|
| 1280 | 1373 px | 93 px | sim |
| **1366** | **1417 px** | **51 px** | **sim, 46 px** |
| 1440 | 1498 px | 58 px | sim |
| 1600 | 1585 px | não | não |

Em 1366 o tabuleiro ocupa x 175→855 e a coluna x 12→221: **sobrepõem-se em
46 px**, e o tabuleiro fica por cima (`document.elementFromPoint(200, 300)`
devolve `cg-board`). Isso come cerca de um quinto de cada selo, justamente do
lado onde mora a fala cortada. E o painel de texto termina em 1417, 51 px além
da janela — barra de rolagem horizontal numa tela que é a mais comum em
notebook.

### Paga em 10/9/2026, e com uma segunda goteira junto

**A causa, com arquivo e linha:** `app/globals.css:536` calcula o tabuleiro como
`calc(100vw - 2.5rem - 2.5rem - var(--aula-painel))`. Essa conta reparte a
largura entre respiro, painel e tabuleiro — e **não sabe que o editor pendurou
mais 224 px de coluna à esquerda**. O palco do aluno está certo; o do editor
herda a conta do aluno.

**O conserto foi outro, e de propósito.** Um `.aula-palco-editor` descontando
16,5rem da mesma conta seria uma cópia à mão das classes do `Editor.tsx`: no dia
em que o `w-56` virasse `w-64`, o CSS voltaria a mentir em silêncio — o mesmo
defeito com outra roupagem. Em vez de recalcular, a coluna do tabuleiro passou a
**perguntar quanto sobra**: `grid-template-columns: minmax(0, max(15rem,
var(--aula-teto))) var(--aula-painel)`. Com tamanho fixo a coluna transborda
quando não cabe; com `minmax(0, …)` ela cresce até o teto **mas só até onde o
espaço deixar**, e o tabuleiro segue junto porque o `clamp` de `.aula-tabuleiro`
já tem `100%` — e esse `100%` é a largura da coluna. Não há número para manter.

Medido depois, em 1366×768, no editor com os 13 selos da N1-KPK:

| | Antes | Depois |
|---|---|---|
| `grid-template-columns` | `680px 522px` | **`525px 522px`** |
| Palco / `<main>` | 1242 dentro de ~1117 | **1087 dentro de 1087** |
| Documento | 1417 px (51 fora) | **1351 px** (a janela menos a barra) |
| Rolagem horizontal | sim | **não** |
| Tabuleiro × coluna | sobrepõem 46 px | **vão de 16 px** (coluna até 236, tabuleiro de 252) |

**Isto não toca no palco do aluno**, e a razão é aritmética: a regra nova só se
afasta da antiga quando o pai é mais estreito do que a conta do `100vw` supõe, e
o único lugar onde isso acontece é o editor. Em 1024 px — a faixa em que o
próprio comentário do arquivo diz que "este painel cobra" — as duas dão o mesmo
tabuleiro de 422 px num pai de 984.

#### A segunda goteira: a página rolava 593 px na vertical

A mesma medida destapou um defeito anterior, que o doc não registrava. A coluna
de selos tem `overflow-y-auto` — ela promete rolar por dentro —, mas nenhum pai
com altura fechada: com `min-h-dvh` a coluna **cresce em vez de rolar**. Medidos
os 13 selos: coluna de **1245 px**, documento de **1361** contra 768 de janela.
É o mesmo defeito do palco, na outra direção — e ele trava o mesmo próximo
passo, porque não se arrasta o selo 1 até o 13 numa coluna que não cabe na tela.

Consertado em `components/editor/Editor.tsx`: `min-h-dvh` → **`h-dvh`** (altura
fechada), `min-h-0` na linha de baixo (sem ele um filho flex nunca encolhe
abaixo do próprio conteúdo) e `overflow-y-auto` no `<main>` — para que uma faixa
de aviso empurre **o painel**, e nunca a página, que arrastaria a coluna junto.
Depois: documento de **1366×768**, rolagem zero nas duas direções, coluna de 652
px rolando por dentro (conteúdo de 1231).

**O que ficou, e não é defeito que se sinta:** o palco pede 680 px de altura
(`100dvh - 5.5rem`, a conta do cabeçalho do **aluno**) onde o editor tem 652, e
o `<main>` rola 94 px para acomodar. Medido botão por botão, **nada fica
cortado**: o último termina em y=475 e o `<main>` vai até 756. Os 94 px são vão
vazio no pé do painel. Consertar de verdade exige uma reserva vertical própria
para o editor — e essa **seria** um número copiado à mão, que é o que este
conserto acabou de evitar. Fica declarado, não pago.

Portões depois das duas mudanças: `typecheck`, `lint`, **742 testes**, `build` —
todos verdes.

## O Bloco 2B, entregue em 10/9/2026

Os três pedidos que o Doug fez depois da rodada do "+". **O levantamento mudou a
forma de um deles**, e essa é a parte que quem continuar precisa saber.

### A descoberta: galeria de posições não é a etapa 2

O pedido foi "quantos diagramas forem necessários", com o exemplo de uma aula do
que dá mate e do que não dá — várias posições diferentes, uma depois da outra.

Isso **não cabe na etapa 2**. Lá os quadros são derivados de UMA posição jogando
o roteiro (`montarQuadros`), e passo sem lance repete o quadro anterior: não
existe "outra posição" na aula assistida.

Cabe na **etapa 1**, e o gate já a trata como o lugar certo. O comentário dele
(`scripts/validate-content.ts:1435`) diz: a apresentação é **"a única FEN do
curso sem arquivo de posição"** — ilustração, ninguém joga nela, pode ter mais de
sete peças de propósito, não vira `content/positions/`, não consulta a tablebase
e não deve proveniência. O único juízo mecânico é `fenProblem` mais
`INTRO_FEN_REDUNDANTE`.

**O que nenhuma máquina cobra, e por isso está escrito na tela do editor:** um
diagrama de apresentação tirado de um LIVRO deixa de ser ilustração e vira
posição, com os nove campos de proveniência.

### O que foi feito, em três paradas

**1. Os tetos.** `MAX_PASSOS_ROTEIRO` 24 → **40**, `MAX_PASSOS_INTRO` 6 → **12**,
e o motivo escrito do segundo mudou junto: os 6 valiam para a apresentação que é
preâmbulo, e o argumento ("sete cliques até a primeira peça andar") não alcança a
galeria, onde cada clique mostra uma posição nova. A frase do pé da coluna passou
a ler a constante em vez de trazer o número escrito à mão.

*Medido na tela, 1366×768:* a apresentação foi de 3 a **12** diagramas pelo "+",
o vão sumiu exatamente no teto, a frase leu "12", e os 12 passos chegaram ao
disco — antes do sétimo o `lessonSchema` recusava.

**2. A moldura vermelha do selo** (a decisão em aberto, resolvida acima).
*Medido:* selo limpo → transparente; selo com problema e não selecionado →
`--color-erro`, byte a byte igual ao token; selo com problema **e** selecionado →
`--color-foco`, com o aviso seguindo pela bolinha e pelo código.

**3. A prévia** — botão "Ver como aluno" na barra, `Esc` para voltar.

Ela **não é um modo novo do player**, e essa é a decisão inteira: o player já
entrega a experiência do aluno quando não recebe nada. Sem `edicao` não há
lápis, sem `startAt` a aula abre na etapa 1 e anda sozinha, sem `marcacao` o
botão direito volta a não desenhar, e sem `onStageDone` nada é gravado como
progresso. A prévia é o editor **parando de passar props**, não uma segunda
implementação da aula para divergir da primeira.

*Medido:* coluna de selos ausente, **zero** glifos de lápis na tela (na edição
são 4), rolagem zero nas duas direções — e uma prova incidental do conserto do
palco: **sem a coluna, o tabuleiro volta sozinho aos 680 px do aluno**
(`680px 522px`). O conserto é adaptativo, não um número fixo.

**A armadilha da prévia, e ela está na tela.** A etapa 3 é derivada pelo
`--write`, que só roda em "Conferir": entre uma edição do roteiro e a
conferência seguinte, o treino do arquivo é o anterior. Quem decide o aviso é
`publicavel.pode`, que já significa "última conferência verde **e** rascunho
intocado desde então". *Medido nos três estados:* sem conferência → avisa;
conferência verde em dia → **não** avisa; uma fala editada depois → avisa de
novo, com a hora da conferência.

**4. A FEN por diagrama da apresentação** — `comFenDoDiagrama` em
`lib/editor/edicoes.ts` e `components/editor/PosicaoDoDiagrama.tsx`.

Duas regras que mordem, as duas com teste:

- **`null` OMITE o campo.** "Mostra a posição da aula" se diz pela ausência de
  `fen`, nunca por `fen` vazia nem por `fen` igual à da aula — essa o gate
  recusa por `INTRO_FEN_REDUNDANTE`. É a mesma regra do desenho, que some em vez
  de virar `arrows: []`.
- **A `fen` entra logo depois da `fala`, e não no fim do objeto.** O
  espalhamento põe a chave nova no fim, e aí a chave anterior tem de ganhar uma
  vírgula: o `git diff` mostra uma linha removida e duas acrescentadas para
  dizer uma coisa só. Depois da `fala` é **inserção pura**.

*Medido no disco:* `diff` do rascunho contra a publicada deu **`31a32`** — uma
linha acrescentada, nenhuma tocada, mais as 3 do carimbo. Voltar à posição da
aula devolveu o arquivo byte a byte.

O juízo é o mesmo dos dois lados: `fenProblem` roda na tela antes de gravar e no
gate depois. *Medido:* FEN com dois reis brancos → "há mais de um rei branco";
a própria posição da aula → o aviso da redundância, com o botão desabilitado.

### Um defeito achado rodando, e consertado

Colar no campo algo que não é FEN devolvia a mensagem **em inglês**: a tabela de
tradução de `lib/chess/fen.ts` procurava o algarismo (`must contain 6 space…`) e
a chess.js escreve **`six`** por extenso. É a mensagem mais frequente do editor,
justamente a que passava crua — e ela também vale para o gate, que usa a mesma
função.

Teste de regressão, com as duas saídas:

```
ANTES   ✖ o texto colado que não é FEN reclama em português
        actual:   'Invalid FEN: must contain six space-delimited fields'
        expected: 'a FEN precisa dos 6 campos'
DEPOIS  ✔ 11 de 11
```

### O que o 2B **não** cobre

- **Não há montador de peças** — a posição entra por FEN colada. O montador é do
  Bloco 3 e entra pela mesma porta: quem grava continua sendo `comFenDoDiagrama`.
- **A prévia não conserta a etapa 3 velha**, ela avisa. Conferir continua sendo
  o que a põe em dia.
- **A medida de uso continua sendo do Doug** — ver "Onde o Doug aprova antes de
  seguir", no plano.

---

## A lixeira com desfazer, entregue em 10/9/2026

O gesto contrário do "+", que era o buraco mais visível do editor: um diagrama
posto por engano só saía editando o JSON à mão. Entrou **antes** do reordenar e
da barrinha de propósito — ele decide, no gesto mais simples, a pergunta que o
reordenar faria duas vezes, e sem ele toda rodada de navegador dos gestos
seguintes deixa entulho no rascunho que só o `git checkout` tira.

### A regra que decide tudo: a corrente de lances

Apagar **inverte** a descoberta que deu forma ao "+". Lá, o passo novo nasce sem
`lance` e por isso não muda um byte da etapa 3. Aqui:

- passo **sem** `lance` sai sempre — é ignorado pela corrente, pelo
  `montarQuadros` e pelo `derivarTreino`;
- passo **com** `lance` no meio **quebra a corrente** do ponto de corte em
  diante: o `superRefine` aplica os lances um atrás do outro e recusa o arquivo;
- passo com `lance` que é o **último com lance** sai: o que sobra é um prefixo
  da mesma corrente, e prefixo de corrente legal é corrente legal.

**Por que a tela pergunta antes, em vez de apagar e ver no que dá:** o rascunho
inválido não chega ao disco — `gravarRascunhoDeAula` julga antes de escrever
(`lib/editor/rascunhos.ts:208`). Uma lixeira que apagasse sem perguntar deixaria
o editor num estado de erro que o professor não pediu.

A decisão foi tomada com o Doug: a lixeira **não some** quando não pode. É o
contrário da regra do vão do "+", e não se contradiz — lá a recusa é global e
explicada por uma frase no pé da coluna; aqui ela é **deste** diagrama e muda de
selo para selo, e um selo sem lixeira ao lado de um selo com lixeira faz o
professor concluir a regra errada. Ela usa `aria-disabled` e não `disabled`: o
desabilitado de verdade sai do Tab e não dispara `title`, escondendo a
explicação de quem mais precisa dela.

### O que foi escrito

- `MIN_PASSOS_INTRO` e `MIN_PASSOS_ROTEIRO` (ambos 2) saíram do `.min(2)` do
  schema e viraram constantes exportadas — o espelho exato da lição dos tetos.
- `podeApagarPasso` e `comPassoRemovido` em `lib/editor/edicoes.ts`. O veredicto
  é um tipo com **motivo** (`piso` ou `corrente`), porque as duas recusas têm
  frases diferentes na tela.
- A lixeira e a linha de desfazer em `ListaDeDiagramas.tsx`; `apagarDiagrama`,
  `desfazerApagar` e o estado do desfazer em `Editor.tsx`.

**`aplicar` foi extraída de `editar`** — é o mesmo caminho sem o `comCarimbo`, e
existe só para o desfazer: desfazer quer dizer "isto não aconteceu", e um
carimbo posto pelo gesto desfeito deixaria três linhas de `git diff` dizendo que
o professor adaptou uma aula que ele não adaptou.

**O desfazer morre por identidade de objeto**, e isso não é economia — é
correção. Um "desfazer" clicado depois de o professor ter escrito outra coisa
devolveria o arquivo de antes e levaria a escrita junto, em silêncio. Toda
edição cria um objeto novo, então `cru === desfazer.depois` responde "nada
aconteceu desde então" sem contador, sem relógio e sem limpar estado em cada uma
das dez funções que editam.

**A linha de desfazer não tem cronômetro**, contra o "por alguns segundos" do
plano. Ela não flutua: ocupa o buraco que o diagrama deixou, numa coluna que
rola por dentro e que acabou de ficar 64 px mais curta. Um cronômetro ali não
protegeria a tela de nada — só marcaria o tempo que o professor tem para
perceber o próprio erro, no único gesto do editor sem outro caminho de volta.
**Isto é uma linha de código**, se um dia a decisão for outra.

### Medido na tela, 1366×768

Rodada em `/editor/finais/N1-KPK`, etapa 2, com os 13 selos.

| O quê | Medido |
|---|---|
| Lixeiras habilitadas | **3** — os selos 1 e 2 (sem lance) e o 13 (último com lance) |
| Lixeiras recusando | **10** — os selos 3 a 12, cada um dizendo quantos lances vêm depois |
| Ordem no DOM | 40 botões: vão, selo, lixeira, vão, selo, lixeira… todos `tabIndex 0` |
| Opacidade em repouso | **0** — invisível até o ponteiro chegar, como o "+" |
| Geometria | lixeira de 22×22 no canto de baixo do selo (x 195→217); o `pr-7` mantém a fala fora dela |
| Rolagem | **zero** nas duas direções — a conta do palco não foi tocada |

**O ciclo inteiro, no disco:**

- apagar o diagrama 2 → o `diff` do rascunho deu **14 linhas removidas** (o
  bloco do passo, inteiro) **+ 3 do carimbo**, 547 → 536. `content/lessons/`
  intocado;
- **desfazer → o arquivo voltou byte a byte**, 547 linhas, sem carimbo novo;
- apagar e depois clicar no "+" → **a linha de desfazer some**, como tem de
  somer;
- na apresentação: 3 diagramas, as 3 lixeiras habilitadas; apagado um, as 2
  restantes passam a recusar com *"a apresentação precisa de pelo menos 2
  diagramas"*.

### Um defeito achado rodando, e consertado

O selo 12 dizia *"os **1 lances** seguintes"*. O plural estava escrito à mão na
interpolação, e o penúltimo diagrama com lance é um caso comum, não uma ponta.
Passou a dizer *"o lance seguinte é jogado a partir dele"*.

### O que esta rodada NÃO cobre

- **O Tab não pôde ser exercido.** O painel do navegador embutido não recebe
  tecla nesta sessão (a tecla não moveu o foco nem com o painel à frente). A
  ordem de foco foi medida pelo DOM — 40 botões na ordem certa, todos
  `tabIndex 0` —, e não pressionando Tab, como na rodada do "+".
- **A medida de uso continua sendo do Doug:** uma pessoa leiga apaga um diagrama
  por engano e volta atrás sem instrução.
- A lixeira **não julga se a aula ainda faz sentido** sem aquele diagrama — só
  se o arquivo continua gravável. Quem julga o resto é o professor, olhando, e
  depois o gate.

Portões, todos verdes: `typecheck`, `lint`, **757 testes** (8 novos),
`validate:content`, `validate:mutations` (**42 de 42** vermelhas), `build`,
`repertorio:compilar --check`.

---

## O arrastar para reordenar, entregue em 10/9/2026

O terceiro gesto da coluna, e o último dela: o "+", a lixeira e agora o arrastar. Com
ele a coluna está completa, e o que sobra do Bloco 2 é tudo tabuleiro.

**O Doug escolheu o arrastar contra a alternativa das setinhas ↑/↓**, com a frase que
decidiu: *"como mudar um slide de lugar quando estamos criando"*. A escolha melhorou o
desenho por um motivo que as setinhas não alcançavam — **o arrasto mostra a regra
enquanto ela vale**, em vez de a explicar depois.

### A regra, e por que ela NÃO é `podeApagarPasso` de novo

> **A ordem dos `lance` não pode mudar.** Nada mais.

O passo sem `lance` é invisível para a corrente (`derivarTreino` o pula antes de
qualquer conta, `derivar-treino.ts:167`; a costura do feedback usa a fala do passo do
**defensor**, que sempre tem lance, `:235`). Logo ele passeia pela etapa inteira sem
mexer num byte da etapa 3 — é a mesma descoberta que deu forma ao "+", lida de um
terceiro jeito. O passo **com** lance só atravessa passos que "só apontam", e para no
primeiro que move peça.

**A dica do Doug era reaproveitar `podeApagarPasso`, e ela dá resposta errada num caso
comum.** Apagar **encurta** a corrente: tirar o último passo com lance é seguro, porque
prefixo de corrente legal é corrente legal. Mover **reordena**: o mesmo último passo,
arrastado para o topo, embaralha a partida. Há teste que põe as duas perguntas no
**mesmo** diagrama — o 13 da N1-KPK — e recebe respostas contrárias, e que depois move
de verdade para provar que o arquivo sai inválido. O piso e o teto também somem:
mover não muda o tamanho da lista.

### Escrito

- `podeMoverPasso` → `Movivel` e `comPassoMovido` em `lib/editor/edicoes.ts`. O
  veredicto devolve **a lista de vãos legais**, e não um sim/não — é ela que a tela
  acende durante o arrasto.
- Os dois vãos que ladeiam o próprio diagrama entram na lista **de propósito**: soltar
  ali é desistir, e um alvo que se apaga debaixo do ponteiro faz o professor achar que
  soltou errado. `comPassoMovido` devolve **o mesmo objeto** nesse caso, e é assim que
  o arrasto desistido não carimba a aula nem manda gravação ao disco.
- Na tela (`ListaDeDiagramas.tsx`): arrasto HTML nativo, **sem biblioteca nova** — a
  rolagem automática ao arrastar o selo 13 até o topo vem de graça no nativo e seria
  escrita à mão num arrasto por ponteiro. O **alvo do solte é o selo inteiro** (metade
  de cima = acima, metade de baixo = abaixo), porque o vão tem 12 px e mirar 12 px com
  um selo pendurado no ponteiro faz o gesto parecer quebrado. O vão vira linha e
  **nunca muda de altura**: uma coluna que reflui move o alvo que a pessoa está mirando.
- O **punho** (seis pontos) é o único sinal de que os selos se arrastam. Ele segue a
  regra da lixeira e não a do vão: **nunca some**, e onde não pode diz o motivo.
- `indiceDepoisDoArrasto` em `Editor.tsx`: o palco segue **o diagrama**, não o número.

### Medido na tela, 1366×768

| O quê | Medido |
|---|---|
| Diagramas que se movem | **3 de 13** na N1-KPK, 6 de 13 na N0-LADDER, **7 de 7** na N0-MATING-MATERIAL |
| Arrastar o selo 1 (só aponta) | 14 vãos acesos de 14 |
| Arrastar o selo 3 (move peça) | **4 acesos, 10 apagados** — os vãos 0 a 3 |
| Soltar em vão proibido | recusado; o navegador nem aceita o solte |
| Paradas de Tab na coluna | **40** — as mesmas da rodada da lixeira; o punho não acrescenta nenhuma |
| Punho | 20×20 px, centrado na altura, 3 px de folga da lixeira |
| Rolagem / palco | zero nas duas direções; `525px 522px`, os números da conta refeita |

**O ciclo no disco**, arrastando o selo 3 para o topo: 24 linhas somadas, 21 removidas
— o bloco de 21 linhas do diagrama **mudou de lugar** —, e as 3 de sobra são o carimbo.
Comparadas linha a linha, fora do carimbo **não há uma única linha diferente**.
`content/lessons/` intocado; o rascunho devolvido byte a byte.

### Dois defeitos achados rodando

1. **O punho estava mudo.** Ele nascera com `pointer-events-none` para não roubar o
   arrasto do selo — e um elemento que o ponteiro nunca toca **nunca dispara `title`**.
   É a mesma armadilha que a lixeira já documentava por outro caminho (`disabled` de
   verdade também não dispara). Era desnecessário: o arrasto começa no `draggable` do
   selo, e um filho não precisa ser transparente ao ponteiro para o pai ser arrastado a
   partir dele. **Quem achou foi o Doug testando**, não a rodada de navegador.
2. **As transições de CSS ficam congeladas no navegador do agente** — o painel não
   pinta e a animação trava no meio. A linha do alvo parecia não acender; forçando cada
   transição a terminar (`getAnimations().forEach(a => a.finish())`) ela sai
   `lab(69.3189 -43.1329 25.7322)`, byte a byte igual ao token `--color-foco`. É a
   segunda vez que este ambiente mente sobre a tela (a primeira foi a borda vermelha).

### O que esta rodada NÃO cobre

- **Não há caminho pelo teclado.** O "+" e a lixeira têm; este não. Decidido com o Doug:
  ele preferiu o arrasto, e um segundo par de botões em cada selo pagaria a
  acessibilidade com a clareza da coluna. **Dívida declarada**, ~meia hora de trabalho.
- **O `espera` como controle de pausa não foi feito.** Era a quarta parada do bloco e
  ficou de fora quando a conversa virou para a arquitetura. A armadilha, para quem
  pegar: **zero tem de OMITIR o campo**, nunca gravar `espera: 0` — é a regra do desenho
  (`arrows: []`) e a da FEN (`null` omite), pela terceira vez.
- O arrasto com o mouse de verdade foi provado **pelo Doug**, não por mim: o navegador
  embutido não dá o ponteiro com precisão. O que eu provei foi a ação, o resultado no
  disco e a geometria.

Portões, todos verdes: `typecheck`, `lint`, **767 testes** (10 novos), `build`,
`validate:content`, `validate:mutations` (**42 de 42** vermelhas),
`repertorio:compilar --check`.

---

## A conversa que mudou o rumo (10/9/2026) — leia antes de continuar o Bloco 2

Depois do arrastar, o Doug abriu uma mudança de arquitetura e **o Bloco 2 está
suspenso no meio**. A proposta está em
[`EDITOR-V2-PROPOSTA.md`](EDITOR-V2-PROPOSTA.md), ao lado deste arquivo, e ela **não
foi aprovada** — ele vai revisá-la com outra ferramenta antes de decidir.

**O defeito que abriu a conversa:** cada passo do roteiro é um selo, e `fala` é
obrigatória. Uma partida de 60 lances viraria 60 selos e exigiria 60 comentários
escritos à mão. Ele quer o modelo do Lichess: os lances correm num painel e o
comentário aparece só onde importa.

**O que ele já decidiu**, e que vale como requisito mesmo que a proposta mude de forma:

1. Um slide novo é **ou** uma posição parada **ou** o começo de uma partida.
2. A etapa 2 corre sozinha e **pára só onde há texto**, com *ver de novo*, *pausar* e
   **mudar a velocidade** (a velocidade existiu no `ExampleStage.tsx`, apagado em
   `aeb5ca1`, e é recuperável).
3. **A etapa 3 deixa de ser saída da máquina.** Ela nasce espelhando a aula e passa a
   ser dele no primeiro toque; quando as duas divergirem, a tela **avisa**, e um botão
   "refazer a partir da aula" que só ele aperta desfaz. Isto contraria a decisão 5 do
   plano vigente e a promessa escrita em `schema.ts:788-808`.
4. **Vários treinos por aula, nos dois níveis** — um capítulo pode ter o seu, e a aula
   pode ter treinos gerais no fim. Isto quebra o array fixo de quatro etapas
   (`store.ts:31`).
5. **Variações desde já**, e **só os seis símbolos de qualidade do lance** (`!`, `?`,
   `!!`, `??`, `!?`, `?!`) — não os 24 do Lichess.
6. **A aula tem de saber comparar dois lances.** Foi o pedido mais concreto dele: numa
   posição de rei e peão, mostrar a linha certa até o empate e **depois** a errada até
   a derrota, na mesma aula.

**A descoberta que decidiu a forma da proposta:** o Doug já mantém o mesmo conteúdo num
estudo do Lichess (*"P1 — Fundamentos: rei e peão contra rei"*, 12 capítulos), e o
comentário que abre o capítulo P1.04 é, escrito por ele:

> *"Compare com P1.03: as peças estão nos mesmos lugares, mas agora as pretas jogam
> primeiro."*

**Ele escreveu com palavras o que a ferramenta não sabia fazer.** O Lichess só tem
capítulos soltos; a comparação, que é o conteúdo da aula, teve de virar prosa apontando
para outra tela. É o buraco que a proposta fecha.

### O que foi medido no Lichess, para não ter de medir de novo

- **Lista de lances:** os lances correm **em linha** e compactos; **um comentário quebra
  a lista em bloco** (`<interrupt>`), e as variações aninham recursivamente. É esse
  desenho que faz 60 lances caberem sem virar 60 telas.
- **Botão direito num lance:** *Transformar em linha principal · Comente sobre este
  lance · Anotar com símbolos · Copiar PGN da variante · Excluir a partir daqui*.
- **Capítulo novo:** cinco portas num diálogo — *Vazio · Editor · URL · FEN · PGN*
  (colar até 64 jogos, ou subir arquivo) — mais Nome, Variante, Orientação e Modo.
- **Modo do capítulo:** *Análise normal · Pratique com o computador · Ocultar próximos
  movimentos · **Lição interativa*** (`gamebook` por dentro). No modo lição o autor
  escreve um comentário por lance e uma **dica sob demanda**. Tem *Preview*.
- **Editar capítulo:** Nome, Orientação, Modo, comentário afixado, e as ações *Remover
  anotações · Limpar variantes · Excluir capítulo*. **Não dá para trocar a posição
  inicial** — reclamação recorrente no fórum deles.
- **Comentário** guarda autor e lance. **Símbolos:** 24, em três famílias. **Etiquetas
  PGN** editáveis. Botão **REC** liga/desliga a gravação.

### As reclamações públicas do editor do Lichess — cinco já resolvidas aqui

| Reclamação | Como este projeto já responde |
|---|---|
| **"A lição interativa só aceita UM lance certo"**; sidelines viram *"Retry"* | `expects[].moves[]` (até 4), `authorAlternatives` com feedback próprio, `methodAlternatives`, e `mistakes` — erros **nomeados** |
| Não dá para trocar a posição inicial de um capítulo | Já planejado (Bloco 3), arrastando a proveniência junto |
| Teto de 64 capítulos e teto de lances | Os tetos são nossos, com motivo escrito |
| O aluno burla a restrição abrindo o explorador pelo atalho | O nosso aluno não tem explorador |
| Não dá para saber se o aluno aprendeu | Escada de repetição espaçada (`lib/finais/escada.ts`) |

Fontes: [issue de coaches](https://github.com/lichess-org/lila/issues/6524),
[lances certos alternativos](https://lichess.org/forum/lichess-feedback/interactive-studies-accepting-multiple-correct-moves),
[teto de capítulos](https://lichess.org/forum/lichess-feedback/chapter-limit-in-studies).

---

## Especificação funcional consolidada — 11/9/2026

Doug pediu que o conhecimento funcional não dependesse da memória dos agentes que
planejaram o editor. Foi criado
[`EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md`](EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md),
com o comportamento esperado por tela, ações, confirmações, estados, segurança,
critérios de aceite, ordem de entrega e checklist mestre do produto completo.

O plano final continua sendo a autoridade de arquitetura, dados e segurança; a nova
especificação é a autoridade de comportamento funcional. `AGENTS.md` e `CLAUDE.md`
agora obrigam agentes Codex/Claude a ler plano, especificação e este diário antes de
trabalhar no v2. A criação do documento não marca funcionalidades como entregues e não
altera código de produto.

---

## Teste humano do arrastar e retorno de autoria — 11/9/2026

Doug testou a reordenação depois de entrar com as próprias credenciais. Os oito
comportamentos passaram sem ajuda: descoberta do arrastar, linha de destino, queda no
lugar esperado, sincronização com tabuleiro/nome, Desfazer, Refazer, operação só por
teclado e persistência depois de `✓ salvo` + recarga. Não encontrou problema visual e
deu **10/10** para a naturalidade.

O mesmo teste revelou três defeitos pequenos, corrigidos na rodada seguinte:

- no desenho livre do editor, as quatro cores agora usam a espessura padrão 10 do
  Lichess; a espessura semântica diferente continua apenas nas marcações pedagógicas;
- `!`, `?`, `!!`, `??`, `!?` e `?!` são escolhas exclusivas e o símbolo atual aparece
  junto ao lance na lista e sobre a peça de destino, como no Lichess; NAGs importados
  fora desses seis continuam preservados;
- a prévia de PGN destaca a linha inteira, escreve `incluído`/`fora`, conta os
  selecionados e oferece `Selecionar todos`/`Desmarcar todos`.

Três itens do retorno são escopo ainda não entregue, e não regressão: criar capítulo
com posição montada à mão, ação explícita/contextual para variante e barra Stockfish.
Doug decidiu os outros dois em seguida: `Desfazer tudo` restaura a aula inteira ao
estado da abertura; comentário importado também inicia, sem decisão anterior, uma
narração temporizada no mesmo lance. Comentário e narração ficam independentes depois
da importação, e a caixa de narração aparece abaixo para editar ou apagar. O símbolo
de qualidade aparece no lance da lista e num selo sobre a casa de destino, conforme a
referência visual do Lichess fornecida por Doug em 11/9/2026.

---

## O próximo passo

> **Esta seção foi reescrita em 13/9/2026.** A versão anterior, de 10/9, dizia que o
> Bloco 2 estava suspenso à espera da proposta v2. Isso não vale mais: o
> [`EDITOR-V2-PLANO-FINAL.md`](EDITOR-V2-PLANO-FINAL.md) foi aprovado e o trabalho segue
> o roteiro de §27 da especificação. Os itens do antigo Bloco 2 foram absorvidos pelas
> fatias: desenho e pausa já entregues (fatias 3 e 5), barra de avaliação na fatia 9.

**O próximo passo é a fatia 7, publicação v2 (§20):** gate autoral único, comparação do
que será publicado, publicação atômica com snapshot/rollback, progresso por revisão e
migração explícita. Depois, na ordem: fatia 8 (repertório e aulas extras), fatia 9
(worker Stockfish) e fatia 10 (desempenho, acessibilidade e teste de uso final). O estado
detalhado está em "Estado de hoje, em vinte linhas", no topo.

Três lições técnicas das rodadas antigas continuam valendo:

- **Ligar `montagem` (e `desenhavel`) exige `key` no `ChessBoard`.** As duas são
  lidas uma vez, com `useState(() => …)` (`ChessBoard.tsx:245` e `:247`), porque
  o chessground decide na criação. Um botão "modo desenho" que só troca a prop
  não vai funcionar.
- **O motor do aluno é um singleton com um pedido em voo**, e
  `bestMove`/`analyse` cancelam o que houver (`lib/engine/stockfish.ts:96-99`).
  A barra de avaliação **precisa** de um worker próprio, senão ela cancela o
  lance do computador na etapa de prática. O corte natural é envolver as linhas
  60-486 numa função `criarMotor(build)`.
- **O navegador embutido escala as coordenadas, e a razão NÃO é constante.** O
  quadro do ponteiro não é o do CSS: na rodada do "+" a razão foi **× 2,91**; na
  do Bloco 2B, **× 8,34** — o painel estava reduzido. Clicar por `ref` erra o
  alvo nas duas. **Calibre a cada sessão**, com dois cliques e um ouvinte de
  `mousedown` lendo `clientX/clientY`, e resolva `CSS = a × quadro + b`.

  Com o painel muito reduzido (1 px de quadro = 8 px de CSS) o clique por
  ponteiro deixa de ser confiável: um botão de 44 px vira 5 px de quadro. O
  caminho que funcionou foi **disparar o clique pelo próprio manipulador da
  página** (`elemento.click()`) e medir a **geometria à parte**
  (`getBoundingClientRect`, `elementFromPoint`, `getComputedStyle`) — a
  geometria não depende do tamanho do painel, então a prova não se perde. Para
  campo de texto, o valor tem de entrar pelo `setter` nativo mais um evento
  `input`, senão o React não vê.

  E a tecla que confirma o lapisinho é `Enter`; `Return` não chega à página.

---

## O bloco de finais para 18/9/2026 — 11 aulas publicadas via script, 17/9/2026

Execução do plano de finais (`docs/COMO-FAZER-UMA-AULA-DE-FINAIS.md`, escrito nesta
rodada). Feito numa cópia isolada, `git worktree` em `../olesc-finais-18-09`, branch
`finais-18-09` a partir de `origin/main` — havia outra sessão editando
`preparatorio-olesc` ao mesmo tempo (ver [[sessao-paralela-e-copia-isolada]]).

**Código, cada mudança com teste que falhava antes e passa depois:**

- `capitulosDasVariantes` (`lib/editor-v2/importar-estudo.ts`) — a variante que perde,
  marcada com símbolo ou comentário, vira sozinha um capítulo "Comparação: …" logo
  depois do capítulo-aula, reaproveitando `prepararMostrarVariante`. Antes da fatia 10E
  a variante ficava invisível para o aluno.
- `[Result "1/2-1/2"]` no cabeçalho do capítulo declara que aquele treino ou prática
  cobra segurar o empate, não a vitória (`resultadoDeclarado` em `importar-estudo.ts`).
- Os lances das comparações e do "Voltamos a…" saem em português (`sanEmPortugues`,
  já existente em `lib/repertorio/treino.ts`, agora usado também em `previa.ts` e
  `importar-estudo.ts`) — decisão do Doug de 17/9: notação sempre em português, em
  todo o site.
- `mudar-modo.ts`: "capítulo → quadro → capítulo" não confundia mais o capítulo
  vizinho com o de comparação da mesma análise (o filtro agora compara o percurso
  inteiro, não só o `analiseId`).
- `scripts/validate-content.ts`: aula v2 **desativada** (sem `ativa.json`, com
  publicações guardadas) parava de ser erro — só pasta vazia é defeito.

**Dois scripts novos**, para publicar sem abrir a tela do editor:

- `scripts/conferir-estudo-finais.ts <pgn>` — Stockfish confere legalidade, o
  resultado de cada posição e cada lance marcado `!`/`??`; é aviso, não trava.
- `scripts/publicar-aula-de-finais.ts <ID> <pgn> [--publicar --substituir --empate N
  --so-conferir]` — o caminho `lerEstudo` → `planejarEstudo` → `executarComando` →
  `conferirAulaV2` → `publicarAulaV2`, com o `--so-conferir` para os subagentes
  reescreverem em paralelo sem gravar nada nem pegar a trava do repositório.

**11 aulas publicadas como v2, com o id da trilha** (a v2 vence a v1 do mesmo id, o
progresso do aluno continua): `N0-MATING-MATERIAL`, `N0-LADDER`, `N0-Q-MATE`,
`N0-R-MATE`, `N0-STALEMATE`, `N1-KING-ACTIVITY`, `N1-SQUARE`,
`N1-DIRECT-OPPOSITION`, `N1-KEY-SQUARES`, `N1-KPK-RANKS`, `N1-ROOK-PAWN`. Cada uma
saiu com a conferência do motor e a do editor em **0 erro, 0 aviso**. A extra
`EX-CAPITULO-0-3-MATE-DE-DAMA-E` foi desativada (a aula 3 a substitui). `N1-KPK`
continua v1.

Nove subagentes (oito Opus, um Fable no par 1/2 e no exemplo-modelo 8) reescreveram
os PGN em paralelo, seguindo o doc-mestre; a thread principal conferiu e publicou uma
aula por vez (a conferência trava o repositório). Erro de xadrez corrigido: na aula 8
(oposição), a "defesa das Pretas" do ChatGPT começava numa posição já perdida — trocada
por uma posição do Silman. Detalhes de cada aula (posições adaptadas, motor antes/depois,
avisos) ficaram nos relatórios dos subagentes; as tabelas de comparação das aulas 1 e 2
(site × ChatGPT) estão no scratchpad da sessão.

**Portões, na cópia isolada:** `typecheck`, `lint`, `test` (1531/1531),
`validate:content` verdes. `build` ainda não rodou (RAM apertada com várias sessões
abertas — ver [[memoria-livre-antes-da-suite]]).

**Pendências, declaradas para o Doug:**

- Ver as quatro etapas no navegador (o Doug testou em `localhost:3001` a partir da
  cópia isolada; falta a confirmação).
- `npm run build`.
- Decisões de símbolo: `1. Qf6?` da aula 5 (afogamento) fica `?` ou vira `??`;
  `3. Re2+?! $1` da aula 2; `?` vs `??` nas torres/dama penduradas da aula 2; tirar o
  prefixo "AULA - " do título na tela; a prática de dois cavalos da aula 1 pode empatar
  só depois de 50 lances ou repetição — longa para uma criança.
- Notação em português: só as telas de finais foram conferidas; o levantamento do
  resto do site (editor, tática, aberturas) foi interrompido.
- Diário, merge em `main` e push ainda por fazer nesta rodada.

Ver [[finais-18-09-estado]], [[aula-de-finais-como-fazer]] e
[[notacao-sempre-em-portugues]].

---

## O grupo de revisores das aulas de finais — 18/9/2026

Cinco revisores no PGN **antes** de publicar, mais as máquinas embaixo deles, mais um aluno
de Playwright que joga a aula **errando de propósito**. Nada commitado nesta rodada; o
`git diff` desfaz qualquer linha.

### O que estava quebrado, e foi o achado que mudou o resto

**Nenhum desenho de treino chegava à tela do aluno.** `lib/editor-v2/treinos.ts` montava cada
pergunta só com `posicao` e `respostas`, e `treino-jogavel.ts:227` lia exatamente
`questao.desenhos` — campo que nunca era preenchido. Todo `[%csl]` escrito num capítulo de
treino ficava preso na análise.

Consequências, e nenhuma é pequena: na prática **todos** os treinos eram "sem ajuda",
inclusive o primeiro; um revisor de desenho, sem isso consertado, acenderia casas que
ninguém vê; e a trava nova de desenho reprovaria as 11 aulas por um defeito que não é delas.

Conserto em `treinos.ts` (`desenhoDaPergunta`), com o desenho entrando também na **receita do
hash** — e em `propriedade-treino.ts`, que tem de dizer exatamente a mesma coisa, senão mexer
num desenho não envelheceria o treino derivado. Teste que falha antes e passa depois:
`treinos.test.ts`, "o desenho do nó da posição chega à pergunta do treino".

**Número:** as 11 aulas republicadas com `--substituir --publicar`, preservando título, obra,
link e autor da publicação anterior. **0 → 22 de 117 perguntas com desenho.** 11 conferências
verdes, 0 erros; nenhuma prática mudou de objetivo.

### A régua do apoio decrescente (passo 0, decisão delegada pelo Doug)

`COMO-FAZER` §1 dizia "treino 2 sem ajuda"; `TRILHA` §14.3 dizia "todo nó do treino aponta o
alvo". **A contradição era de época, não de princípio:** a §14.3 foi escrita quando a aula
tinha **um** treino só, e a razão dela (voz §6.2) continua boa. Com vários treinos, o apoio
cai por degraus:

| Onde | O apoio antes do lance |
|---|---|
| Treino 1 | todo nó aponta o alvo — seta **ou** casa acesa |
| Treino 2 em diante | nenhum alvo apontado |
| Último treino | nenhum alvo, e posição nova |
| Prática real | nada |

"Sem ajuda" é **sem a resposta marcada antes de o aluno mexer**, não aluno sozinho no
silêncio: o apoio *depois* do lance fica em todos. Com a casa acesa ele **reconhece**; sem
ela, **busca** — e é buscar que fixa. Os dois documentos foram ajustados (`TRILHA` §14.3
ganhou a tabela e a nota do cano quebrado; `COMO-FAZER` ganhou a §1.1 e o passo 3.1).

### As máquinas — `lib/editor-v2/regua-de-desenho.ts`

Nove regras, **uma por código**, registradas em `REGRAS_PUBLICACAO_V2`. Todas **avisam e
nenhuma impede**: a régua é nova e as aulas no ar são velhas, e promovê-las a erro travaria a
publicação de tudo por uma dívida que não é de nenhuma aula em particular.

`DESENHO_TREINO_SEM_ALVO`, `DESENHO_TREINO_COM_ALVO`, `DESENHO_ENTREGA_O_LANCE`,
`CASA_CITADA_SEM_DESENHO`, `CASA_ACESA_SEM_CITACAO`, `DESENHO_DEMAIS`,
`VARIANTE_SEM_SIMBOLO`, `LEMBRE_SE_REGRAS`, `QUADRO_1_NAO_PERGUNTA`.

**Duas correções que a medida contra as 11 aulas obrigou, e as duas eram da régua:**

1. **A seta é uma linha, não duas casas.** A primeira versão cobrava a citação das **pontas
   da seta** e devolveu 183 achados do tipo "o 2º passo desenha c2, c8, b1, b8 sem que a fala
   cite" — que são **duas setas de coluna** da escada de torres, com a fala dizendo "a torre
   fecha a coluna b". Exigir que a fala soletre as pontas é o contrário de "uma palavra por
   ideia". O teto passou a valer para a casa **acesa**; a ponta da seta continua confirmando
   a casa citada. **309 → 171 achados.**
2. **A linha-título do `LEMBRE-SE` não é regra.** A conta somava `LEMBRE-SE:` como quarta
   regra, e todas as 11 aulas reprovavam por isso. Dois revisores acharam o defeito no mesmo
   dia. **171 → 160 achados**, e `LEMBRE_SE_REGRAS` foi de 11 para zero.

**Número do bloco: 160 achados, em 11 de 11 aulas** — 104 `CASA_ACESA_SEM_CITACAO`, 34
`DESENHO_DEMAIS`, 11 `CASA_CITADA_SEM_DESENHO`, 8 `DESENHO_TREINO_SEM_ALVO`, 3
`DESENHO_TREINO_COM_ALVO`. Régua nova encontrando dívida velha: vira lista, não conserto às
pressas. A lista inteira está em `.editor/regua-de-desenho-18-09.txt`.

### Os cinco revisores e a assinatura

`.claude/agents/finais-{arquiteto,scaffolding,simbolos,voz,desenho}.md`, orquestrados por
`.claude/skills/revisar-pgn-de-finais/SKILL.md`. Cada um escreve numa camada e só nela.

**O que impede dois revisores de se desfazerem não é boa vontade: é a assinatura.** O
`--so-conferir` sozinho não basta — ele conta só os problemas do julgamento e deixa `PERDA` e
`FORA` apenas impressos. `scripts/assinatura-da-aula.ts` guarda capítulos, FENs, lances,
símbolos, textos, desenhos, questões por treino, problemas, perdas e fora; `--contra X.json
--camada voz` sai com **código 1** e diz o nome do campo quando alguém escreve fora da sua.

**Prova, medida:** um "agente de voz" que troca uma fala (permitido) **e** apaga um `??`
(proibido) → `X FORA DA CAMADA capitulos`, `X FORA DA CAMADA simbolos`, saída 1. Só a troca da
fala → 1 campo, saída 0.

### Os hooks — `.claude/hooks/`

| Quando | O que roda |
|---|---|
| ao salvar um PGN de `content/finais/estudos-aula/` | as máquinas, e a marca de revisão daquele PGN é apagada |
| ao publicar (`--publicar`) | **o portão**: recusa e manda rodar `/revisar-pgn-de-finais` |

O portão compara o **hash** do PGN com o gravado em `.editor/revisao-pgn/<ID>.ok`. Cinco casos
provados: sem marca → recusa; marca certa → passa; PGN mudou depois → recusa; `--so-conferir`
→ passa; `REVISAO_PGN=dispensada` → passa. A dispensa é explícita de propósito: ninguém
dispensa uma revisão sem escrever que dispensou.

### O aluno de Playwright — `.claude/skills/aluno-de-ensaio/`

Abre a aula, **erra de propósito**, e mede o que a tela responde. É o único teste que teria
pego o cano furado: o arquivo estava bom, quem perdia o desenho era a montagem.

**Ele achou um segundo defeito, e nele mesmo:** a aula v2 **não tem abas**. A v1 tinha quatro
("Apresentação · Aula · Treino · Prática real"); a v2 tem um passo a passo com um botão
"Etapas N/M" que abre a lista, e os itens não têm `role="menuitem"` — são `<button>` dentro de
`<li>`. Procurando aba, o script não achava etapa nenhuma em nenhuma das 11 aulas. O
`medir.mjs` tinha o mesmo defeito, e os dois foram consertados.

**O porte do `medir.mjs` para v2** entrou junto: ele lia `stages.objective.roteiro`,
`stages.intro` e `stages.guided`, que são a forma v1, e devolvia "sem apresentação / sem
treino" nas 11 aulas — a `/revisar-aula` estava **cega para o módulo inteiro**. A tradução usa
`pacoteAtivoDoAluno` + `aulaDoAlunoV2`, que é o que o site usa (`conteudo.ts` não serve: abre
com `import "server-only"`).

**Número: 11 aulas jogadas com o mouse, ~220 quesitos, 2 reprovados** — os dois o mesmo caso,
um treino 2+ que ainda acende alvo, agora confirmado na tela e não só no arquivo. Saída em
`.editor/aluno-de-ensaio-18-09.txt`.

### A calibração contra o piloto — o que os cinco acharam na `N0-Q-MATE`

O piloto **não é padrão-ouro**, e calibrar esperando poucos achados seria circular. Os cinco
rodaram **sem editar nada**. O que voltou está na lista de decisões para o Doug, e o resumo é:

- **voz:** 9 elogios vazios em 55 falas, em **seis** grafias (`Certo:`, `Muito bem:`, `Isso:`,
  `Perfeito:`, `Exatamente:`, `Boa:`). Não é ruído de borda, é padrão. Ou as aulas se
  corrigem, ou a `VOZ-DO-CURSO` §2 muda — a régua não se afrouxa para caber numa aula;
- **arquiteto:** o capítulo `01 - AULA - O L e a caixa` talvez deva sair (o `02` é
  superconjunto dele); a prática é a mesma posição do `02`, caractere por caractere; o erro do
  treino 1 (`Dd6+??`, "o rei come a dama") não tem cobertura na aula;
- **scaffolding:** "a caixa" é usada 9 vezes e **nunca é mostrada** — a aula seguinte da
  trilha (`N0-R-MATE`) tem esse quadro, e esta não; a rampa T3 → T4 está invertida;
- **símbolos:** comparado com a fonte `hf09xMzS`, **nenhum símbolo se perdeu**. Esta aula é o
  contraexemplo do incidente de setembro;
- **desenho:** a escada de apoio da aula está inteira e correta; 5 casas acesas são redundantes
  com o `lastMove` do chessground; a rota do rei em 4 setas é uma ideia desenhada quatro vezes.

### A corrida corretiva nas 11 — o que ela fez

**A camada de voz, decidida pelo Doug em 18/9:** tira-se o rótulo de elogio do começo da fala
e mantém-se a frase. **28 falas em 3 das 11 aulas** (N0-LADDER 8, N0-Q-MATE 9, N0-R-MATE 11);
as outras oito já estavam limpas. A assinatura confirmou que só `textos` mudou nas três. Junto
saiu o `"Boa, também funciona."` que `importar-estudo.ts` injetava por código.

**A camada de desenho, um revisor por aula:**

| Aula | Régua antes → depois | O que ele fez |
|---|---|---|
| N0-LADDER | 24 → 5 | 13 casas que eram o destino do próprio lance; 1 alvo tirado do treino 3 |
| N0-MATING-MATERIAL | 18 → 4 | 23 formas em 16 nós; a rede de mate que a fala não conta |
| N0-Q-MATE | 7 → 2 | a rota do rei em 4 setas virou 1; `h7` aceso nas duas variantes de afogamento |
| N0-R-MATE | 13 → 5 | o par de reis acendia **um lance antes** de eles estarem frente a frente |
| N0-STALEMATE | 13 → 4 | **o vermelho estava no afogamento que a aula quer**, em 4 lugares |
| N1-DIRECT-OPPOSITION | 15 → 9 | uma forma só para "frente a frente"; alvo em todo nó do treino 1 |
| N1-KEY-SQUARES | 11 → 9 | 7 dos 9 são o tema: casas-chave **são** um conjunto de casas |
| N1-KING-ACTIVITY | 10 → 1 | 4 pontos viraram 2 relações; alvo em todo nó do treino 1 |
| N1-KPK-RANKS | 9 → 2 | os **dois** treinos que ainda acendiam alvo (o aluno tinha achado um) |
| N1-ROOK-PAWN | 8 → 4 | poda, não acréscimo: a aula já tinha o que a régua pede |
| N1-SQUARE | 32 → 28 | **os 28 são o quadrado** — exceção de tema declarada, decisão do Doug |

**Número: 160 → 73 achados**, e **zero** em `DESENHO_TREINO_SEM_ALVO`,
`DESENHO_TREINO_COM_ALVO`, `DESENHO_ENTREGA_O_LANCE`, `VARIANTE_SEM_SIMBOLO`,
`LEMBRE_SE_REGRAS` e `QUADRO_1_NAO_PERGUNTA`. A escada do apoio está de pé nas 11.

**A trava de camada: 0 de 11 reprovaram.** Nenhum revisor tocou texto, símbolo, lance ou
estrutura — só `[%cal]` e `[%csl]`.

**Republicadas:** 11 conferências verdes, 0 erros. **22 → 27 de 117** perguntas com desenho.

**O aluno de Playwright, depois: 11 aulas, ~220 quesitos, ZERO reprovados.** Antes eram 2.

### Uma terceira correção da régua, e também era minha

**A régua não lia casa em notação portuguesa.** `\b[a-h][1-8]\b` não casa com `Re7`: entre o
`R` e o `e` não há fronteira de palavra. Numa aula que escreve os lances em português — e
todas escrevem, é a regra de 17/9 — ela acusava "casa acesa sem citação" em passos onde a fala
citara a casa. Achado por um revisor, no meio da corrida; consertado em `regua-de-desenho.ts` e
em `medir.mjs`, com teste para `Re7`, `Dg6`, `Txf1`, `exd5` e `d8=D`.

### Um susto, e o que ele ensina sobre rodar revisores em paralelo

Um dos revisores rodou um `git stash` por engano e **reverteu a árvore inteira** no meio da
corrida; ele restaurou tudo, e a conferência depois mostrou o trabalho de todos de pé. Fica a
lição, porque ela vai morder de novo: **revisores em paralelo compartilham o repositório e o
scratchpad.** Os temporários precisam de nome com o id da aula, e o disco precisa ser
reconferido depois de cada agente — dois deles tiveram de reaplicar edições por isso.

Restou um `stash@{0}` no repositório. Ele é inofensivo parado, mas um `git stash pop`
acidental reverteria dois PGN. Apagá-lo é decisão do Doug (`git stash drop`).

### Portões

`typecheck`, `lint`, `test` (**1668, 0 falhas**) e `validate:content` verdes.

### Pendências declaradas

- **Os revisores 1, 2 e 3 (arquiteto, scaffolding, símbolos) rodaram só no piloto**, em modo
  calibração. Nas outras dez, rodou a camada de desenho e a de voz. O que eles acharam no
  piloto está na lista de decisões acima.
- **A seta vermelha do perigo no feedback do treino não tem tela** — `treino-jogavel.ts`
  mostra o feedback só como texto. Fica declarado; não se promete o que não aparece.
- O `medir.mjs` portado **não foi rodado de ponta a ponta** nas duas telas; quem rodou nas 11
  aulas foi o `aluno-de-ensaio`. A tradução v1/v2 dele está conferida nas quatro aulas de
  ensaio, e a navegação pelo menu "Etapas" é a mesma que o aluno usa.
- **Os 73 achados que sobram esperam decisão**, e quase todos são de **fala**, não de desenho:
  49 `CASA_ACESA_SEM_CITACAO` (a casa ensina e a fala não a nomeia), 22 `DESENHO_DEMAIS` (15
  deles são o quadrado da N1-SQUARE) e 2 `CASA_CITADA_SEM_DESENHO` conscientes.
- **Duas decisões de uma vez, que valem para uma aula inteira cada:** o quadrado da N1-SQUARE
  é exceção de tema (amarelo = o quadrado, o pacote de 5 é uma ideia só)? E o vermelho no rei
  matado é convenção da trilha, nas três aulas de mate?
- Commit e push desta rodada ainda por fazer. Nada foi commitado.

---

## Onde cada coisa é escrita

| O quê | Onde | Versionado? |
|---|---|---|
| Rascunho de aula | `content/rascunhos/lessons/<ID>.json` | **sim** — é o que o gate julga |
| Estado do editor (autosave, conferências, lock) | `.editor/` | não (`.gitignore`) |
| Aula publicada | `content/lessons/` | sim — **só o gate escreve ali**, por `--aplicar` |

O editor **nunca** escreve em `content/lessons/`. Quem escreve é
`validate-content.ts --rascunhos --aplicar`, por cópia de bytes, e só quando a
rodada inteira fica verde.

---

## Os portões, antes de qualquer commit

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run validate:content
npm run validate:mutations
npm run repertorio:compilar -- --check
```


## O Doug olhou as 11 aulas na tela — 18/9/2026

Cinco perguntas de decisão, medidas no navegador com a conta de ensaio (`aluno-de-ensaio` e a sonda
`.editor/sondar.mjs`, que amostra o tabuleiro **ao longo da animação** — medir só no fim não serve,
porque no fim a etapa já apagou tudo e sobra o `last-move`). **Nada de imagem:** a decisão saiu de
número e de cor convertida, e o Doug dispensou a folha de contato.

### O achado que não estava na lista: 45 etapas "Comparação"

Ao sondar a `N1-SQUARE` o menu "Etapas" veio assim: `2.AULA - O quadrado do peão`,
**`3.Comparação: 1. Rg2?`**, `4.AULA - Quem joga decide`, **`5.Comparação: 1... Rf5?`**… Cada
variante de aula virava **etapa própria**. Não era do PGN — as variantes estão dentro do capítulo,
em `( … )` — era da montagem: `lib/editor-v2/importar-estudo.ts:299` cria um `CapituloV2` com o
título `Comparação: <lance>`.

**Contado nos pacotes publicados: 45 etapas de comparação nas 11 aulas** (N1-DIRECT-OPPOSITION 8,
N1-ROOK-PAWN 6, N0-LADDER 5, N0-STALEMATE 5, N0-R-MATE 4, N1-KING-ACTIVITY 4, N1-KPK-RANKS 4,
N1-KEY-SQUARES 3, N1-SQUARE 3, N0-Q-MATE 2, N0-MATING-MATERIAL 1).

**Regra global nova do Doug, 18/9:** duas opções da mesma posição ficam na **mesma etapa**, e a
passagem de uma para a outra é um **rewind** — o tabuleiro desfaz os lances para trás, mais rápido
do que os fez, até o ponto onde a linha se abriu, e só então joga a opção 2; automático, sem botão.
"Como se estivesse recapitulando, rewind the tape."

Escrita em `AGENTS.md` (seção própria) e em `COMO-FAZER` §1.2, que **revoga** o "a variante vira
capítulo de comparação sozinha" do §1. Como se confere de fora: o menu "Etapas" de qualquer aula
não pode ter item começando com "Comparação:". **Nada disso foi implementado ainda** — é a próxima
fatia, e ela tem duas pontas: a montagem (`importar-estudo.ts`) e a animação de volta no player v2.

**O Doug adiou a implementação no mesmo dia**, por ter outra prioridade, e pediu que ficasse
registrada para ele não repetir a ideia. A fatia inteira — as duas pontas, os testes que mudam junto,
o critério de aceite e as ferramentas que já existem — está em **`docs/FILA-DO-DOUG.md` §1**, que
nasceu para isso.

### As cinco decisões

| # | Pergunta | O que a medida devolveu | Decisão do Doug |
|---|---|---|---|
| 1 | o apoio decrescente, `N0-Q-MATE` | treino 1: **1** desenho antes do lance; treinos 2, 3, 4 e prática: **0**. Errando no treino 2 o professor dá direção sem entregar a casa | fica como está |
| 2 | o quadrado, `N1-SQUARE` | **5 formas ao mesmo tempo** (`a5`, `a8`, `d8`, `d5` + seta `a5→d8`), **todas amarelas**, formando uma figura só | fica; o defeito é da régua, que conta casa solta e não sabe ler conjunto |
| 3 | o vermelho no rei mateado | as três aulas **discordavam**: LADDER 3 mates em vermelho, Q-MATE 1, R-MATE **nenhum** (o revisor apagara o `Rg8`) | **o vermelho fica**, e volta no `N0-R-MATE` |
| 4 | o "Certo:" que saiu, `N0-R-MATE` | as 11 falas são todas de treino; e **não existe outro sinal de acerto** — `lib/lesson/falas.ts` não tem elogio genérico, só "Pronto." no fim | ficou melhor; mantém |
| 5 | o afogamento, `N0-STALEMATE` | o capítulo `04 - AULA - Perdendo? Procure o afogamento` está **todo em verde** (`Gg8,Gg7,Gg6` → `Gf7,Gf8,Gg8` → `Gh8`); os 5 vermelhos que sobraram estão **todos em linha de erro** | coerente, nada a fazer |

**As cores do tabuleiro, medidas e convertidas de `lab()` para rgb:** vermelho `#570000`
(`--color-pincel-pendurada`, oklch 22%), verde `#006724`, amarelo `#834500`. O vermelho é o mais
escuro dos três, e é assim de propósito — há conta de contraste no `globals.css`.

### O que a decisão 3 obrigou

1. **`Rg8` devolvido** ao mate de `26. Rb8#` em `N0-R-MATE`, `03 - AULA - O mate na borda`;
2. **a régua mudou, e não em silêncio:** `COMO-FAZER` §1 dizia "vermelho = perigo (só no erro)" e
   passou a dizer **duas coisas e só estas duas** — perigo na linha do erro, *ou* o rei que tomou o
   mate;
3. **o revisor de desenho aprendeu:** `.claude/agents/finais-desenho.md` ganhou "o rei mateado em
   vermelho é decisão do Doug — não apague", com o caso de 18/9 nomeado. Sem isso a próxima corrida
   apagaria de novo;
4. **a publicação foi com `REVISAO_PGN=dispensada`, e dita em voz alta** — o portão recusou, e
   rodar os cinco revisores devolveria o problema, porque foi o revisor de desenho quem apagou.
   `pub-9b03f3bbf2624ce0` (antes: `pub-ee4e87448c3c0d17`), conferência VERDE, 0 erros.

**Custo honesto:** devolver o vermelho subiu de 5 para 6 os avisos da aula. O aviso **novo** é um só —
`CASA_ACESA_SEM_CITACAO` em `g8`, porque a fala do mate não nomeia a casa do rei. O `DESENHO_DEMAIS`
daquele passo **já existia** (eram 4 formas, o teto é 3; com o vermelho são 5). Resolve-se com **uma**
frase — "o rei preto em g8 não tem casa" —, que é mudança de fala e não foi pedida.

### Os mates que continuam sem marca, e são decisão a tomar

| Aula | Capítulo | Mate | Marca hoje |
|---|---|---|---|
| N0-Q-MATE | `02 - AULA - Do começo ao mate` | `Dg7#` | só a seta verde `Gf6g7` |
| N0-R-MATE | `07 - TREINO 3 - Do outro lado, até o mate` | `Tg8#` | só a seta verde `Gg8a8` |
| N0-LADDER | treinos 2, 3 e 4 | `Th7#`, `Th8#`, `Th8#` | nenhuma |
| N0-Q-MATE | treino 3 e dois finais do treino 4 | `Dg7#`, `Dh3#`, `Dh4#` | nenhuma |

Com a regra nova, o rei mateado devia estar em vermelho nos oito. **Não foi feito:** pôr os oito é
autoria, não restauração, e o Doug decidiu um caso nomeado. Fica a lista.

## O rewind das comparações — montagem e sequência, 17/9/2026 (noite)

A fatia de `docs/FILA-DO-DOUG.md` §1, pelo plano aprovado pelo Doug
(`~/.claude/plans/vamos-implementar-o-rewind-inherited-duckling.md`). **Decisão dele, 17/9: "na
hora"** — quando a aula chega à posição da escolha, joga o lance que perde até a consequência, a fita
volta até a posição da escolha, a fala diz "Voltamos a…", e a aula segue com o lance certo. Variante
dentro de variante, uma dentro da outra.

### Ponto de parada 1 — a montagem

- **`etapaV2Schema.comparacoes`** (`modelo.ts`), opcional e aditivo: os ids dos capítulos-variante
  que a etapa toca. O capítulo-variante continua no cadastro (o professor edita a fala dele), só perde
  a etapa. O diagnóstico conta a variante listada como "no fluxo" e acusa `COMPARACAO_INVALIDA`
  (id inexistente ou de outra análise).
- **Por que declarado, e não deduzido da árvore:** o curso de abertura usa os mesmos percursos e
  **quer** o ramo como capítulo separado. Só `planejarEstudo` preenche o campo; a abertura não muda.
- **A variante nunca fica sem lugar:** `fluxoSemCapitulos` e `soltarVariantes` (`fluxo.ts`). Quando
  a mãe sai do fluxo — excluída, virou quadro ou treino —, cada variante dela ganha etapa própria logo
  depois, e nada do que o professor escreveu se perde. É o único caminho pelo qual uma etapa de
  variante volta a existir, e só por gesto do professor.
- **O editor** lista as variantes logo abaixo da mãe (`capitulosNaOrdemDaAula`); arrastar converte o
  vão da lista para o vão das etapas, e mover uma variante sozinha é recusado com frase.
- **A trava:** `lib/editor-v2/finais-sem-comparacao.test.ts` monta as 11 aulas em memória, sem banco.

**Número:** etapas "Comparação" nas 11 montagens **45 → 0**; variantes preservadas no cadastro **45 = 45**
(LADDER 5, MATING-MATERIAL 1, Q-MATE 2, R-MATE 4, STALEMATE 5, DIRECT-OPPOSITION 8, KEY-SQUARES 3,
KING-ACTIVITY 4, KPK-RANKS 4, ROOK-PAWN 6, SQUARE 3).

### Ponto de parada 2 — a sequência

- **`passosNaHora`** (`previa.ts`): percorre a linha principal; no ponto de escolha toca a variante
  (só a parte dela, a partir da bifurcação), um **passo de recuo por lance** até a posição da escolha,
  e o passo de retorno "Voltamos a X. A outra escolha: Y." — sem o "Em «título»", e com o símbolo do
  lance que segue. Duas variantes do mesmo ponto tocam em fila, e o retorno da primeira anuncia a
  segunda. A mãe de cada variante é a linha **anterior** na lista com o começo comum mais longo.
- **`recuo: true`** atravessa `PassoDaPrevia` → `PassoDoCapituloDoAlunoV2` → roteiro do player.
  `montarQuadros` guarda o quadro de antes de cada lance e o recuo devolve **exatamente** aquele
  quadro. A régua de desenho ignora o recuo, como já ignorava o retorno.
- **O player** (`ObjectiveStage`): no recuo, relógio de `RECUO.msPorLance` (250 ms), animação de
  `RECUO.animacaoMs` (120 ms; o normal é 1000 e 180), sem som, sem desenho, sem fala. Os dois números
  estão em `lib/lesson/roteiro.ts`, juntos, para o Doug calibrar olhando.

**Número:** nas 11 aulas em memória, **45 de 45** voltas terminam na posição exata da escolha — e mais:
**cada passo**, de ida ou de volta, mostra a FEN do nó dele. Passos de recuo **187 = 187** lances de
variante jogados. **0** lances da linha principal jogados duas vezes (antes, cada comparação refazia a
linha desde o começo).

### O que ainda não foi feito

- **Ponto 3** (republicar a N0-LADDER, medir no navegador, o Doug olhar a velocidade) e **ponto 4**
  (as outras 10, e os papéis: `FILA-DO-DOUG` §1, `COMO-FAZER` §1, `AGENTS.md`).
- `--so-conferir` da N0-LADDER com o código novo: **0 erros, 5 avisos** `CASA_ACESA_SEM_CITACAO`.

## Siciliana no modelo da Francesa — Dragão Acelerado, 18/9/2026 (madrugada)

Plano em `~/.claude/plans/quero-arrumar-as-aberturas-quiet-hamster.md` (decisões do Doug: eu escrevo o estudo, faixa
Lichess 1000–1800, commit só dos arquivos de abertura). Executado direto, sem paradas.

**Passo 0 — leitor para curso das Pretas.** `TITULO_DA_AULA` virou `tituloDaAula(bloco, cor)` e o aviso
`DEFESAS_DEMAIS` usa `adversarioDo(cor)`: num curso das Pretas a aula C é "Quando as Brancas jogam bem". A Francesa
não muda. Teste em `planejar-curso.test.ts` ("curso das Pretas…"): antes ✖ `Mini — aula C: Quando as Pretas jogam
bem`; depois 43/43 no par `planejar-curso` + `curso-de-abertura`. `gerar-do-estudo.ts`: estudo sem link sai como
`estudo local v1.0 — …`, e o preâmbulo manda corrigir o arquivo de `rascunhos/`, não o Lichess.

**Passo 1 — o estudo.** `content/repertorio/rascunhos/estudo-pretas-siciliana.pgn`, 54 capítulos, escrito a partir do
rascunho do ChatGPT (auditado) e das fontes: A (00, A00, A01), B (B02 respostas; B03–B10 oito golpes: Plichta #7, #8,
#10, #11, #4, #5, #1 e o ataque cedo em f7; B11 laboratório com 7 CASOS; B12 quando o golpe não funciona — bispo em
b3), C (C13–C25: troca em c6, linha principal, bispo em b3, Maróczy com 7.Cb5/7.Cb3/8.Cc3 no mesmo capítulo, bispo em
c4 cedo, Alapin, Rossolimo, 2.Cc3, Grande Prêmio/3.Bb5/Fechada, 2.d4 3.Dxd4, Smith-Morra, 2.f4, esqueci a teoria),
D26 Mazi × Mohr 1997 (banco de mestres do Lichess, `oCjpswlb`), E27 encontre o lance, E28A–X move trainer, F29.
Linhas sem fonte têm `[REFERENCIA]` com o número do Stockfish 18 (3.Dh5 e6 +0,93; 3.Df3 Cf6 4.c3 Ce5 +1,24;
3.Bxf7+ +2,52; 4.Cg5 e6 +1,07; 8.Bb3 Cxe4? brancas +2,23; 9.Ce2?? Db4+ +3,64; 9.Cf5?? Dxb2 +3,55; 9.Dd2? Cxe4 +1,01;
4.cxd4 Cxe4 +0,64). Medido no banco 1000–1800: 4.Cg5 é 19% depois de 2.Bc4 Cc6 3.Cf3 Cf6, e 3.Dxd4 é 53% depois de
2.d4 cxd4 — os dois entraram. Smith-Morra recusado com link público (Chess.com e Chessable).
Números: leitor **0 lances ilegais, 0 marcadores desconhecidos**; símbolos do Plichta que estão em posições do
estudo: **0 faltando** (o 9.f3! foi devolvido); 6 avisos `DEFESAS_DEMAIS` do planejador, informativos (mais de 4
respostas das Brancas em 1...c5, 2...Cc6, 4...g6 e 6...Cf6; o treino guiado gira entre 4, o move trainer tem todas).

**Passo 2 — o move trainer.** `pretas-siciliana.pgn` agora é gerado do estudo: 6 → **74 linhas**; **morrem 0** — os
6 ids antigos continuam (as linhas foram copiadas lance a lance, com os irmãos marcados 5...dxc6?! e os cinco do
2.c3). `marcas-das-fontes.test.ts` 3/3.

**Passo 3 — publicado.** `AB-PRETAS-SICILIANA-{A,B,C,D,EF}` pelo caminho de script da tela (planejar 2× idêntico →
gravar → conferir → preparar → publicar). Conferência das 5: **verde, 0 erros, 0 avisos** (três falas passavam de 20
palavras e foram encurtadas). Paradas por aula: A 5, B 35, C 45, D 0, E+F 6; linhas do move trainer: 3, 23, 48, 0,
74. Publicações: A `pub-6ad29473ca03ace0`, B `pub-a47c3415f111cb8b`, C `pub-677fb0ecdbc77d83`, D
`pub-6fe39bdbce9c84ef`, EF `pub-865dbaf2135bb67a`.

**Pendente:** o Doug testar com a mão (arrastar só se prova com a mão); a aula C é longa (13 capítulos, 45 paradas) —
decidir se divide; Escocesa (passo 4) para a `FILA-DO-DOUG.md`.

### Siciliana: o ensaio na Vercel e o corte por raridade (18/9/2026, madrugada)

O Doug pediu Playwright no site publicado. Jogado como `alunoteste` (cliques reais nas casas): a aula A inteira, com
as 3 linhas do move trainer; a B destravou ao concluir a A e foi jogada até a etapa 104 de 105 — todas as paradas
aceitaram o lance certo, zero erro de console ou de rede. Achados: (1) a capa do treino guiado dizia "As **Pretas**
mudam de defesa" num curso das Pretas — `adversarioDaAulaDeAbertura` em `dominio.ts`, teste que falha antes e passa
depois, commit `eabcdb2`; (2) B com **105** etapas e C com **132** (Francesa: 44 e 18).

Decisão do Doug: menos perguntas e cortar por ordem de raridade. Medida a frequência **condicional** na faixa
1000–1800 (o produto das frequências dos lances das Brancas, dados os nossos): os golpes profundos são raríssimos —
B04 roque grande 0,07%, B12 e C15 bispo em b3 0,11%, B07 Be2+Dd2 0,16%, C14 Be2 e roque 0,26%, B05 f3+Bc4 0,27% —
e as anti-sicilianas dominam (bispo em c4 11,9%, Rossolimo 6,4%, 5.Cxc6 4,9%, Alapin 4,8%, 2.f4 4,5%, 3.Dxd4 4,4%).
Saíram os cinco capítulos abaixo de 0,3% (B04, B05, B07, B12, C14) e os trainers deles; o C15 ficou, enxuto e com os
erros do B12, por ser dono de uma das 6 linhas antigas. Perguntas: no máximo 1–2 por capítulo, no lance-chave; ramos
raros deixam de ser narrados mas ficam na árvore (lances e símbolos). Resultado: **A 16, B 49, C 60, D 1, E+F 17
etapas**; conferência verde 0/0 nas cinco; move trainer **74 → 56 linhas** (as 18 que saíram são dos capítulos
cortados; os 6 ids antigos continuam); `marcas-das-fontes` verde; contagens de `banco`, `escrever` e
`notacao-em-portugues` ajustadas. Publicações: B `pub-bf56e6a91a8da82e`, C `pub-918f740b16236d10`, D
`pub-8f5e6a563f077b8d`, EF `pub-609249955ff62e50` (A igual). Aviso que continua: 56 linhas passam da meta de 40 por
abertura do Base.

## O erro do adversário nas armadilhas leva símbolo — 18/9/2026 (manhã)

Pedido do Doug: "falta nas aulas de abertura incluir símbolos de erro e blunder nos golpes e armadilhas, em todas as
aberturas", e depois "coloca o símbolo de imprecisão". Virou regra global em `AGENTS.md` ("O erro do adversário nas
armadilhas leva símbolo").

**Levantamento.** Os símbolos já viajavam do estudo até a aula (campo `nags`) e o player já desenhava os seis no
círculo (`lib/chess/nag-overlay.ts`); faltava o símbolo no estudo. Um script percorreu os três estudos, lance a lance
e variante a variante, e pediu ao Stockfish 18 (`scripts/motor.ts`) a perda de cada lance do adversário: varredura
em profundidade 14, e os candidatos reconferidos em 22. Régua: `?!` 0,5–0,99 peão, `?` 1–2,99, `??` ≥3 ou permite
mate. Aplicado pela posição (FEN + lance), em toda ocorrência; quando a fonte já tinha marcado o lance num capítulo,
valeu a marca da fonte (Siciliana `11.Bxd5` e `13.dxe6` `$4` → `??`; `12.Dxe5`, `9.Bf4`, `10.Bc4+`, `12.Ca4` `$2` →
`?`; `5.c3` `$6` → `?!`, só na posição do Golpe 4 — na Rossolimo o mesmo lance não perde nada).

**Francesa — 30 símbolos:** `3...Cf6?!` (0,71) ×9, `6...Bxb5?!` (0,75) ×6, e o golpe do sacrifício de dama, que não
tinha nenhum: `12...Be8??` (3,77), `14...Rc8?` (1,68), `15...Bxf7??` (permite o mate) ×5 cada.
**Siciliana — 39 símbolos:** `13.c3?` (1,93), `3.Bxf7+?` (2,74), `11.Bxd5??`, `5.exf6?` (1,88), `13.dxe6??`, `3.Dh5?`
(1,15), `4.Cg5?!` (0,95), `4.c3?!` (0,75), `4.cxd4?!` (0,76), `3.Df3?!` (0,68), mais as marcas da fonte copiadas para os
capítulos que as tinham esquecido (`7.f3?!` ×5, `9.Cxc6?` ×3, `10.e6?!`, `14.Bxe5?!`).
**Escocesa:** aplicada pela sessão paralela no gerador dela, com a lista daqui (`6...Ch5?`, `5...Bc5?` só na linha
3...Cf6, `5...b6?!`, `4...Ba5?!`, `6...De7?!`), no commit dela.
Fora do escopo, à espera do Doug: erros em capítulos de defesa normal (`12...Dxd6` 0,78 e `6...De6` 0,98 na
Escocesa; `7...e5` e `10...a6` na Francesa) e nas partidas modelo (`28...Te7` 2,7 na Radjabov; `18.Rb1`, `20.Ra2` na
Mazi × Mohr).

**Republicado.** Antes de tocar no estudo, planejar do estudo atual deu a Siciliana **igual** ao disco, e a Francesa
B, C e E+F diferentes só pela notação em português nas falas (`7.Dxd4`, `9.Cc3`, `11.Cxf3`) — a regra de 17/9, que
veio junto. Etapas, capítulos e treinos iguais nas 10 aulas. Conferência verde e publicadas: Francesa B
`pub-1c7babf235efc4f4`, C `pub-816961f1ba448b43`, EF `pub-c8fe4521f14c440d`; Siciliana B `pub-1fef182250f597dd`,
C `pub-c22fa20051129b84`, D `pub-4a1ecf1c4eea4d50`, EF `pub-cc5ea57eb991faed` (A e D da Francesa e A da Siciliana
iguais). Move trainer: nascem 0, morrem 0.

**A torre em inglês fechou.** A republicação trouxe 9 dos 10 `Rg1` da prosa da Francesa já como `Tg1`; o décimo,
escrito à mão no `[TRAIN]` do estudo ("Nbc3, Rg1 e Bf4"), virou "Cbc3, Tg1 e Bf4". O teste do `R` da prosa em
`notacao-em-portugues.test.ts` passou de "dez torres" para "nenhuma torre em inglês".

**Pendente:** o Doug olhar na tela uma armadilha de cada curso (o círculo do `??` no lance do adversário).

## Escocesa no modelo da Francesa — 18/9/2026 (madrugada e manhã)

Passo 4 do plano `~/.claude/plans/quero-arrumar-as-aberturas-quiet-hamster.md`. O Doug pediu para a Escocesa a mesma
crítica que o ChatGPT fez ao Dragão (menos linhas, uma ideia por capítulo, estrutura da Francesa, escolhas pelo que
se joga no Lichess 1000–1800) e aprovou a estrutura de **35 capítulos**, com os lances só do motor marcados.

**Levantamento** (banco do Lichess 1000–1800, blitz+rápida+clássica; % das partidas do NOSSO aluno depois de 3.d4):
3...exd4 4.Cxd4 Cxd4 5.Dxd4 **35,6%** (5...d6 11,2 · Cf6 8,4 · c5 5,4 · b6 3,5 · Df6 3,3); 4...Bc5 13,1%; 3...d6 10%
(4.Cc3 exd4 transpõe para a espinha; 4...Bg4 26% das respostas, sem fonte); 4...Cf6 8,2%; 3...Cf6 4,3; 3...f6 3,2
(Brancas 62%); 4...Dh4 1,1% com as Brancas fazendo só **43,7%**. Stockfish 18, profundidade 20, nos golpes:
5...Cf6 6.e5 Ch5 7.g4 +3,54; 5...b6 6.Cc3 Bc5 7.Dxg7 +2,28; 3...Cf6 4.dxe5 Cxe4 5.Bc4 Bc5 6.Dd5 +3,31; 4...Bc5
5.Cb3 Bxf2+ 6.Rxf2 +3,05; 3...d6 4.Cc3 Be6 5.d5 +3,69; 5...d6 6.Cc3 Cf6 7.e5?! zera a vantagem (7.Bf4 +0,99).
Partida-modelo do banco de mestres: Radjabov × Tomashevsky, Memorial Tal 2012 (`HLYnhawF`), a Potter lance a lance.

**O estudo.** `content/repertorio/rascunhos/estudo-brancas-escocesa.pgn`, 35 capítulos: A (00, A00, A01), B (B02
respostas; B03–B09 sete golpes; B10 laboratório com 7 CASOS; B11 quando o e5 não funciona), C (C12 montagem contra
5...d6; C13 duas regras contra ...c5/...Df6/...b6; C14 Potter com as três respostas no mesmo capítulo; C15 4...Cf6;
C16 3...d6; C17 raras; C18 esqueci a teoria), D19, E20–E21, E22A–K (11 move trainers), F23. Lances das fontes
(Grigoryan, Krikor, Short & Sweet); o que é só do motor vai em `[REFERENCIA]` com o número. Prosa em notação
portuguesa (a primeira versão tinha `Kxd8`/`Nxe5` nas referências e `notacao-em-portugues` reprovou).
Símbolos: o Krikor marca, pela Philidor, 4.Cc3 $5 $16 e 4.dxe5 $5 depois de 3...Bd6 — `marcas-das-fontes` cobrou os
dois, e eles entraram. Pedido do Doug pela outra sessão (f8): lances do adversário nas armadilhas com ?!/?/?? pela
perda no Stockfish — 6...Ch5?, 5...Bc5? (linha 3...Cf6), 5...b6?!, 4...Ba5?!, 6...De7?!, 4...Be6?? (a marca era nossa).
Depois, a regra da Siciliana: no máximo 1–2 perguntas por capítulo e ramos raros sem narração (B 84 → 62 etapas,
C 51 → 46).

**Números.** Leitor: **0 lances ilegais, 0 marcadores desconhecidos**, 5 avisos `DEFESAS_DEMAIS` informativos;
planejar 2× idêntico. Move trainer **5 → 41 linhas, morrem 0** (as 5 antigas entram lance a lance; a do 3...Cf6 saiu
do Avançado para o Base, e o `[%plano]` do bispo de f1 da linha do 5...d6 saiu, porque o gerador não o escreve).
Conferência das 5 aulas: **verde, 0 erros, 0 avisos**. Etapas: A 15, B 62, C 46, D 1, E+F 33. Publicações finais:
A `pub-ebf4623010f65162`, B `pub-66cdb47c1fb2f093`, C `pub-cac8814f77677025`, D `pub-cb243202ea2e08f5`, EF
`pub-8c10980d12773d8a`. `liberada: true` na vitrine. Testes ajustados pela contagem nova: `banco` (Base 89 → 126,
lances nossos 886 → 1133), `escrever` (91 → 129 jogos e as contagens do corpus), `notacao-em-portugues` (reis 45,
desempate 10 com os nomes novos `Rfe1`/`Kb1`), e `impacto`/`sessao` passaram a usar a Escandinava como amostra de
arquivo escrito à mão (a Escocesa gerada não tem Avançado nem ramo do adversário). Portões: `npm test` 1702/1702,
typecheck, lint, `validate:content`, `validate:mutations` 36/36, `repertorio:compilar -- --check`.

**Playwright, a aula toda, local** (`alunoteste`, 1366 px, `innerWidth` 1366 sem rolagem lateral; os lances arrastados
com o mouse, lidos da árvore do pacote e do repertório compilado): **A** 15/15 etapas e **Aula concluída!**; **B** 62/62,
treinador de lances com as 21 linhas (417 lances nossos) e **Aula concluída!**; **C** 46/46, treino guiado 10 lances,
treinador com 19 linhas (492 lances) e **Aula concluída!**; zero erro de console nas três. D e E+F: a rodada estava em
andamento quando o Doug abriu o plano `~/.claude/plans/ai-est-um-problema-majestic-flame.md` numa sessão paralela.
O servidor local travou uma vez com 0,45 GB livres (laço `/painel` ↔ `/entrar`, a página não via o perfil) e voltou
depois de reiniciado.

**Passagem de bastão (18/9, ~09h):** a Escocesa segue com o plano "Aulas de abertura diretas". Daqui em diante o
`estudo-brancas-escocesa.pgn` é a fonte e se edita direto: o gerador em Python ficou no scratchpad desta sessão e
**não** deve ser rodado de novo. Nada da Escocesa foi commitado (o plano novo faz um commit só, já reorganizado).

**Pendente:** o Doug testar com a mão; o título da aula A diz "A defesa e nossa arma" (é o texto das Brancas, feito
para a Francesa); 41 linhas passam da meta de 40 do Base.

## Aula de abertura direta — 18/9/2026 (tarde)

Plano aprovado pelo Doug: `~/.claude/plans/ai-est-um-problema-majestic-flame.md`. A regra está em `AGENTS.md`,
"Aula de abertura é direta", e vale para todo curso, publicado ou futuro. **Um ponto ficou pela metade:** o
treino guiado ficou sem comentário, mas o "Continuar" do fim dele não mudou. O plano pedia avanço automático
depois do lance certo e, ao mesmo tempo, que o fim pedisse confirmação. No meio do treino já não havia Espaço
(o adversário responde sozinho), e o único Espaço é o do fim, que o plano manda manter.

### O que mudou

- **Montagem** (`planejar-curso.ts`): cada capítulo vira **uma etapa**. Os ramos vão em `comparacoes`, e as
  perguntas no campo novo `etapaV2Schema.paradas` (opcional, sem default: o hash das aulas de finais não
  muda). A ordem da fita vem de `ordemDaFita` (`previa.ts`): a principal até o fim, depois os ramos, do mais
  fundo ao mais raso. O Laboratório toca na ordem dos casos. O Resumo e o A seguir vão para o fim da última
  linha tocada. O diagnóstico ganhou `PARADA_INVALIDA`. Apagar um treino tira ele das `paradas`
  (`fluxoSemTreino`), e a "Ordem da aula" do editor diz "(N perguntas dentro)".
- **Prévia** (`passosPelaFita`, só no domínio abertura; finais seguem com `passosNaHora`): a volta vai do que
  está na tela até o começo comum com a linha seguinte. "A outra escolha: X" aparece só quando a linha se
  separa ali; no Laboratório, indo a um caso mais adiante, a fala diz só "Voltamos a …" e a fita avança. O
  passo da pergunta (`parada: treinoId`) vem depois das falas do nó, e o passo seguinte é o lance-resposta.
  O `percursoParaComparar` saiu.
- **Player**: `ObjectiveStage` ganhou `paradaNoPasso`, `aoParar`, `somNoInicio` e `depressa`. `TreeStage`
  ganhou o modo `embutido` (o mesmo juiz, a mesma escada; no acerto, 800 ms e a narração volta).
  `CapituloDoAlunoV2` alterna os dois na mesma etapa. A tentativa sobe com o id da etapa do capítulo, e
  `fazer()` espera as tentativas pendentes antes de marcar a etapa.
- **Servidor**: `gravar-v2.ts` aceita o treino que está nas `paradas` da etapa. `rodada-banco.ts` exige acerto
  em cada pergunta nesta rodada. `comoPular` (`rodada.ts`): num capítulo com perguntas, o Pular **corre** a
  fala e para em cada pergunta.
- **Estudos**: saíram o mapa (Escocesa B02, Francesa B03, Siciliana B02) e o "Encontre o lance" (E20, E20, E27).
  O `[SECAO]` passou para o capítulo seguinte. O `3...Cxd4 $6 … 5.Dxd4 $16`, que só existia no mapa da
  Escocesa, foi como ramo para o C17 com os dois símbolos. A Siciliana ganhou `8.f3 Db6!` no capítulo (ramo com
  pergunta) e no treinador.
- **Nome**: "Treinador de lances" em todo texto visível. O leitor do estudo aceita os dois prefixos.
- **Página do curso**: as aulas com os tópicos (`AulaDoCurso.topicos`) e, no fim, o bloco "Treinador de lances"
  com o contador e o botão. Nenhuma linha listada quando há curso.
- **Script**: `scripts/publicar-curso-de-abertura.ts <cor> <abertura> "<nome>" [--publicar]` faz ler → gravar →
  aplicar o repertório → Conferir → Publicar, e sem `--publicar` mostra o impacto no repertório.

### Golpe × Imprecisão — Stockfish 18, profundidade 22, fim da linha principal

Registro completo em `content/repertorio/medidas-dos-golpes.json` (48 capítulos das aulas B, C e E+F).

| Curso | Capítulo | Nota | Nome agora |
|---|---|---|---|
| Escocesa | Golpe 1 — cavalo em f6 cedo | +3,61 | Golpe 1 |
| Escocesa | Golpe 2 — ...b6 e ...Bc5? | +2,26 | Golpe 2 |
| Escocesa | Golpe 3 — 3...Cf6? e a dama em d5 | +3,63 | Golpe 3 |
| Escocesa | Golpe 4 — 3...f6? | +1,32 | **Imprecisão 1** |
| Escocesa | Golpe 5 — ...d5?, ...Bb4+?, ...Bd6? | +1,72 | **Imprecisão 2** |
| Escocesa | Golpe 6 — ...Bxf2+? | +3,51 | Golpe 4 |
| Escocesa | Golpe 7 — ...Dh4 | +0,60 | **Imprecisão 3** |
| Francesa | Armadilha principal: ...Qxg2? | +4,14 | Armadilha |
| Francesa | Armadilha avançada: sacrifício de dama | mate | Armadilha |
| Siciliana | Golpe 1 — f3 e Dd2 | +1,91 | Golpe 1 (**decisão do Doug**: perto dos +2) |
| Siciliana | Golpe 2 — Bc4 e roque cedo | 0,00 | **Imprecisão 1** |
| Siciliana | Golpe 3 — 5.Cxc6 e Dd4 | +5,25 | Golpe 2 |
| Siciliana | Golpe 4 — 5.c3 | +0,24 | **Imprecisão 2** |
| Siciliana | Golpe 5 — ataque cedo em f7 | +0,97 | **Imprecisão 3** |

**Exceção (Doug, 18/9/2026, depois da medida):** o Golpe 1 da Siciliana mede +1,91 e fica "Golpe". A
decisão está no registro (`decisaoDoDoug`), e a trava só aceita abaixo de +2 com ela escrita. A Siciliana B
foi republicada (`pub-a0ec9035352682f0`), e o `[GOLPE]` do capítulo voltou.

Os capítulos "Move Trainer — …" e os textos que diziam "golpe" nesses capítulos acompanham ("reconheça cada
erro", "Sete erros, sete respostas"). Nos capítulos que viraram Imprecisão, o rótulo `[GOLPE]` virou `[PUNICAO]`.
A categoria da linha continua "golpe" (`categoriaDoTitulo` lê "Imprecisão" como golpe).

**Símbolos (regra das armadilhas, agora também na Imprecisão):** os lances do adversário desses capítulos já
tinham marca. As duas medidas novas ficaram **sem símbolo**, porque perdem menos de 0,5: `8.f3` da Siciliana
(+0,38 com 8.Bb3 → −0,02; a ameaça de ...Db6 é ...Dxb2, +3,07 se as Brancas passarem) e `8.O-O` (perda de 0,26).

### Números

- **Etapas** (antes → agora): Escocesa 15/62/46/1/33 → **5/11/9/1/4**; Francesa 9/44/18/1/35 → **5/10/6/1/4**;
  Siciliana 16/49/60/1/17 → **5/8/14/1/3**. A tabela do plano bate aula por aula.
- **Perguntas** preservadas: Escocesa 5/17/11/0/4, Francesa 2/13/4/0/3, Siciliana 5/15/16/0/0 (a Siciliana B ganhou
  a do ...Db6). As perguntas da E20/E27 saíram junto com o "Encontre o lance".
- **15 aulas republicadas**, conferência verde, 0 erro, 0 aviso. As D da Escocesa e da Francesa saíram com o
  mesmo conteúdo.
- **Repertório**: nenhuma linha morre. Nasce 1 (Siciliana, ...Db6), e com ela o **Avançado volta a trancar**
  para quem tinha o Base completo (só contas de teste). O comentário mostrado no treinador muda em 36 linhas
  da Escocesa, 9 da Francesa e 53 da Siciliana: sem o mapa, o lance mostra o comentário do próximo capítulo
  em que aparece (ex.: some "A resposta mais comum: trocar os cavalos" de 13 linhas da Escocesa).
- **Portões**: `npm test` 1716/1716, typecheck, lint e validate verdes. Testes que falham antes e passam
  depois: "a fita" (`planejar-curso.test.ts`, o ramo que rejogava o lance da escolha), `comoPular`
  (`rodada.test.ts`) e a pergunta dentro do capítulo (`gravar-v2.test.ts`).

### O que não foi conferido

- **No navegador**: o `next dev` caiu ("Jest worker encountered 2 child process exceptions") com 0,7 GB de RAM
  livre, e toda página com player devolve 500, inclusive a de finais. A página do curso abre. O ensaio
  `tmp-ensaio-abertura.mjs` está pronto para rodar quando o servidor voltar.
- **O arrasto** só se prova com a mão: o Doug joga as perguntas.
- As 11 aulas de finais continuam na fila (`FILA-DO-DOUG.md` §1): falta republicar.

## N0-MATING-MATERIAL refeita fiel ao estudo do Doug — 18/9/2026 (noite)

O Doug reprovou a aula no ar ("horrível"): a introdução mostrava todas as peças enfileiradas no tabuleiro
e dizia "estas dão mate", tudo junto. Pediu a aula parecida com o estudo dele, `suMc7hgW`. A reescrita de
17/9 tinha se afastado do original: cinco quadros de introdução, a ordem trocada (dama primeiro) e só cinco
treinos.

**O que ficou (fiel ao original):** introdução em dois quadros, só com a pergunta (rei e cavalo contra o rei
sozinho: dá para forçar o mate?) e o objetivo. Depois um caso por capítulo, na ordem do Doug: cavalo, bispo,
dama, torre, dois bispos, bispo e cavalo, dois cavalos (o erro `1...Rh8?` com mate e, com a fita voltando,
`1...Rf8!`) e peão. Cada caso fecha com "Guarde isto". O LEMBRE-SE usa "forçam / não forçam o mate", como o
original. Os treinos passaram a ser um por caso (dama, torre, dois bispos, bispo e cavalo, dois cavalos, peão),
mais o da promoção, que cobre o "cavalo e bispo não dão". Os quizzes Sim/Não do original não entram, porque o
player não tem pergunta de múltipla escolha. A prática continua "Segure o empate" com dois cavalos.

**Posições que não estão no original:** TREINO 3 (`7k/8/3BB1K1/8/8/8/8/8 w`, a aula 05 depois de `1...Rh8`),
TREINO 7 (promoção, `7k/5P2/6K1/8/8/8/8/8 w`) e a PRÁTICA (a de antes). O motor confere as três.

**Os cinco revisores** rodaram em série, com a trava de camada verde entre cada dois. O arquiteto e o scaffolding
não mudaram nada. O de símbolos passou a marca de `1.e7+` (TREINO 6) de `?` para `??`, porque o lance joga a
vitória fora (a marca era nossa, não da fonte). O de voz reescreveu 5 falas: o "o mate escapa" dos treinos 2 e 4
era falso (o motor ainda acha mate em 5 e em 19), e o LEMBRE-SE dizia "dois cavalos não dão mate" logo depois
de a aula mostrar um. O de desenho acendeu f7 no erro do TREINO 5.

**Números:** conferidor 19 capítulos, 30 conferências, 0 erro, 0 aviso. `--so-conferir` 0/0. Publicada como
`pub-6106f4e65aef3c53` (antes: `pub-ea2fbddf7aada1e8`), com a conferência verde.

**Para o Doug decidir:** (a) a prática testa só "dois cavalos não forçam"; uma segunda posição (dar mate com a
torre, por exemplo) testaria o resto da frase. (b) No TREINO 1, a casa a8 acesa entrega metade da resposta. É o
apoio do treino 1, e o original repetia a posição da aula. (c) "tira g8" e "fecha g8" aparecem em falas vizinhas;
"tira" é palavra do original.

**Ajuste do Doug, mesma noite:** (1) o TREINO 1 não acende mais a8 (decisão dele; o aviso
`DESENHO_TREINO_SEM_ALVO` fica, declarado). (2) "Dois cavalos não forçam o mate: com a defesa certa, é empate"
reforçado no título do capítulo 07, no mate do erro, no fim da defesa certa, no LEMBRE-SE, no TREINO 5 e na
prática. Publicada `pub-61423f0c18fd49b0` com `REVISAO_PGN=dispensada` (só texto, pedido do Doug; os cinco
revisores não rodaram de novo). `npm test` 1721/1721.

## Progresso e navegação das aulas de finais — 18/9/2026

O contador de `/finais` e os medalhões de `/trilha` confundiam **concluir uma aula** com
**aprendê-la na revisão espaçada**. A primeira vitória era gravada e levava a escada ao degrau 1,
mas a tela continuava em `0/6` até o degrau 3. Agora `ProgressoDaAula.concluida` registra, na leitura,
uma primeira vitória em cada prática ativa; contador, próxima aula e mapa usam conclusão. Graus,
revisões e fechamento do nível continuam usando `aprendeu`, sem reduzir os três dias.

As Server Actions de tentativa invalidam `/finais` e `/trilha`, para a navegação seguinte não
reaproveitar o payload prefetched anterior. O desfecho da última prática ganhou **Aula anterior** e
**Próxima aula**, além de **Voltar às aulas**. A aula `N0-STALEMATE` trocou "tapar" por "cobrir"
no balão do TREINO 1 e foi republicada como `pub-ca8b8581b0e94b4f`; ela também recebeu o rewind já
vigente, reduzindo o menu de 16 para 11 etapas sem itens `Comparação:`.

Evidência curta: `npm run typecheck`; `node --test lib/finais/trilha.test.ts lib/curso/mapa.test.ts`
(35/35); publicação verde da `N0-STALEMATE` (0 erros, 4 avisos de desenho já conhecidos). A chamada
acidental de `npm test -- --runInBand ...` rodou a suíte inteira por causa do script do projeto:
1738/1739; a única falha era a expectativa antiga de `proximaAula`, corrigida e coberta no recorte verde.

# Ritmo de leitura das aulas de abertura — 18/9/2026

As falas dos capítulos de abertura deixaram de usar a régua geral de 45 ms por caractere,
que avançava antes de um aluno conseguir conciliar a leitura com o tabuleiro. Só nas
aberturas, o avanço automático agora espera 80 ms por caractere, com piso de 2,5 s; a
espera autoral continua somada. Finais mantêm o ritmo anterior, e o rewind e o “Pular” das
repetições continuam rápidos. A conta ficou coberta em `lib/lesson/roteiro.test.ts`.

# Prova do nível 1 bloqueada e conclusão celebrada — 18/9/2026

A prova do nível 1 ainda não está pronta e deixou de abrir tanto pelo troféu quanto pela URL
direta. Depois de fechar tática, finais e repertório, o aluno vê no troféu a mensagem de que
terminou o nível 1, deve aguardar o professor liberar a prova e o nível 2, e pode continuar
praticando tática e jogando partidas de treino anotadas. A primeira exibição nesse navegador
solta o confete; visitas seguintes mantêm a orientação sem repetir a festa.

# Variantes visíveis nas aulas de abertura — 18/9/2026

No ponto em que uma linha se divide, o player de abertura agora desenha setas e acende as
casas de destino das alternativas que serão comparadas. Depois do rewind, a fala diz que a
aula está revisitando a outra escolha e o tabuleiro aponta somente o lance que vem a seguir.
Os metadados nascem na fita de `previa.ts`, atravessam o pacote do aluno e viram desenho no
mesmo runtime; a trava de abertura direta confere as duas metades.

# Práticas consecutivas de finais voltam a avançar — 18/9/2026

O `PracticeStage` de uma prática intermediária não recebia `onFinish`: depois da vitória, não
havia botão para chegar à prática seguinte. Isso bloqueava Afogamento entre “Ganhe sem afogar”
e “Perdendo, busque o empate”, e Mate da escada entre “Duas torres” e “Dama e torre”. Agora a
vitória intermediária oferece o avanço; a última prática preserva “Voltar às aulas” e os botões
de aula anterior/próxima. Um teste pontual lê os dois fluxos publicados e o contrato do player.

# Cartão da tática rating virou convite — 18/9/2026

Sem aumentar a estrutura do cartão, a entrada do modo rating ganhou uma ilustração de curva em
alta, borda do método, convite “Aceite o desafio”, a promessa de superar o próprio recorde e a
ação explícita “Jogar agora”. Para quem já jogou, o ícone e o título “Seu desafio” reforçam a
continuidade sem esconder o rating nem a evolução.

# Painel recebe o aluno pelo nome — 18/9/2026

O cabeçalho do painel agora diz “Bem-vindo, [nome]!” e completa com “Vamos treinar e praticar
seu xadrez.”. O avatar, o nível e os atalhos de perfil continuam no mesmo lugar; a mudança dá
identidade e transforma a primeira linha da página em convite para começar.

# Meio-jogo entrou na navegação — 18/9/2026

“Meio-jogo” aparece imediatamente depois de “Partidas” no topo e na gaveta “Mais” do celular.
A rota `/meio-jogo` já existe, preserva cabeçalho e progresso do aluno e mostra apenas “Em breve”
enquanto o conteúdo ainda está sendo preparado.

# Aula B de aberturas: imprecisões e punições — 18/9/2026

O nome global da aula B deixou de tratar toda resposta inferior como erro: agora é “Imprecisões
e punições”. A capa da seção também usa esse nome e “como responder”. Escocesa, Francesa e
Siciliana foram republicadas; os capítulos continuam separados pela medição já registrada:
“Golpe” ou “Armadilha” apenas com vantagem próxima ou superior a +2, e “Imprecisão” abaixo disso.
