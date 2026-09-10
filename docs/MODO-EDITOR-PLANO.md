# Modo editor — aulas de finais e repertório

## Contexto

O Doug (professor, dono do curso) quer editar **tudo** nas aulas de finais e no repertório pela tela, no acesso de professor: texto, posição, flechas, casas, lances, linhas, explicação — criar aula do zero, importar FEN/PGN/estudo do Lichess, criar aulas e linhas além do plano inicial. Hoje a trilha planeja 49 aulas e só 3 existem (`content/lessons/`); o editor é, na prática, a ferramenta que escreve as outras 46 e o que vier depois.

Decisões dele, já tomadas nesta conversa:

- **Edita na máquina dele, em `npm run dev`.** O site publicado (Vercel) tem disco somente leitura; o editor **não existe** em produção.
- **Escopo total** nos finais (texto, flechas, highlights, FEN, lances, aula do zero com template, importar) e no repertório (comentário, lances, criar e apagar linha e abertura).
- **A última palavra é dele, inclusive sobre a tablebase** (o juiz externo de finais de até 7 peças): o erro dela vira aviso que ele pode passar por cima com motivo escrito. Para decidir, ele quer uma **barra de avaliação do Stockfish** no editor, como no Lichess.
- **Aula extra conta para fechar o nível** como qualquer outra (regra que já existe em `lib/curso/nivel.ts:299-312`).
- **Sem botão de commit/push** por agora — quem envia é ele ou o agente.
- **O registro "adaptada pelo professor"** mora no arquivo e aparece só para o professor; o aluno não vê nada diferente (voz do curso: o professor não fala do sistema).

O que já existe e o plano reaproveita (levantado, não suposto):

- O gate `scripts/validate-content.ts` já implementa **metade do modo autor**: `--rascunhos` (lê `content/rascunhos/lessons|positions/`, que espelham o destino), `--write` (regrava derivados só no que o autor abriu), `--aplicar` (promove por cópia de bytes se tudo ficar verde). A pasta `content/rascunhos/` ainda não existe.
- `components/lesson/LessonPlayer.tsx` tem `startAt` e `marcacao` ("B8"), `lib/lesson/store.ts` tem `treeSeek`, `lib/lesson/refs.ts` existe para o preview do autor — nada disso tem página que use.
- `components/board/ChessBoard.tsx` tem `desenhavel` (desenho com botão direito) e `montagem` (montar posição, peças livres) — desligados por padrão.
- `lib/chess/fen.ts:fenProblem` foi escrito "para o montador do modo autor recusar reis colados antes de salvar".
- `lib/lesson/derivar-treino.ts` é puro e diz (linha 33) que "no dia do modo autor, roda no navegador com `pedir` devolvendo `null`".
- `lib/engine/stockfish.ts` tem `acquireEngine`, `Analise`/`AnaliseRequest`; `lib/engine/uci.ts:parseInfo` já lê `cp`/`mate`.
- `content/finais/capitulos.json` tem FEN + linha principal de 175 capítulos dos estudos do Silman (Lichess), com URL de proveniência.
- `lib/repertorio/pgn.ts` lê PGN com variantes (`lerPgns`); `arvore.ts:expandir` e `linhas.ts:validarBanco/conferirRegras/aberturasInchadas/fechamentosAbertos` são puros. **Não existe escritor de PGN.**
- Três trancas de acesso: `proxy.ts` (sessão), `lib/auth/perfil.ts:professorAtual()` (papel), RLS. Toda escrita é Server Action que confere quem pediu na primeira linha (`app/professor/acoes.ts:36`).

> Antes de escrever código: ler os guias em `node_modules/next/dist/docs/` (Next 16.3 tem convenções diferentes; `AGENTS.md` exige).

## A régua de uso: leigo edita sem instrução

Pedido do Doug, literal: *"fácil de utilizar, até para uma pessoa leiga. Um lapisinho fácil de editar, um ícone de mais pra adicionar um novo diagrama, algo baseado no Lichess."* Isso descarta o formulário. O modelo é o **estudo do Lichess**: a aula aparece como o aluno vê, e a edição acontece **em cima dela**.

- **Lapisinho (✎):** passar o mouse (ou tocar) numa fala, no título, no nome da técnica, mostra o lápis; clicar abre o texto no lugar (textarea inline). `Enter`/clicar fora salva; `Esc` cancela. Nenhum nome de campo aparece — a fala está onde o aluno a lê.
- **Mais (+):** entre dois passos, e no fim, um "+" cria um **diagrama novo** (um passo): nasce com a posição corrente do tabuleiro e a fala `«escreva aqui»` já aberta para digitar. Na apresentação o diagrama é posição + fala; na aula assistida é posição + fala + (opcional) o lance, que se marca jogando no tabuleiro.
- **Lista de diagramas** à esquerda, como os capítulos do estudo: miniaturas numeradas dos passos da etapa, arrastar reordena, lixeira apaga (com "desfazer" por alguns segundos). Clicar leva o tabuleiro àquele diagrama.
- **Botão direito desenha, como no Lichess, nos dois módulos** — arrastar com o direito faz a flecha, clicar com o direito acende a casa (o `ChessBoard` já sabe: prop `desenhavel`; `Shift`/`Alt` mudam a cor como no Lichess). **Barrinha sobre o tabuleiro**, ícones só, para quem não usa o botão direito (touchpad): flecha, casa, peças (abre o montador), limpar desenho, virar tabuleiro. Enquanto a flecha está ativa, um rótulo diz onde ela vai cair: "desenho deste diagrama" ou "alvo do treino" (são dois desenhos; a tela escolhe o padrão certo e mostra a troca como um chip, não como um campo).
- **Lance do passo:** arrastar a peça no tabuleiro, no diagrama certo, é o lance. Ilegal não anda. Uma dica em texto curto explica na primeira vez.
- **Um botão "Mais opções"** por aula (classe, orientação, obra, proveniência, erros nomeados, textos de erro, exceção da tablebase) — é o **único** lugar com formulário, e fica escondido até ser pedido. Cada campo com uma frase em português dizendo para que serve.
- **Um status e dois botões, no topo:** "✓ salvo há 3 s" (status; salvar é automático, `Ctrl+S` força), **Conferir**, **Publicar no curso**. O modelo mental é "eu edito → o sistema salva → eu confiro → eu publico". Erros da conferência aparecem **no diagrama** onde estão (borda vermelha na miniatura + frase do gate), não numa lista com códigos.
- **Menu "+ Nova aula"** em `/editor`: "Começar do zero" (molde), "Importar FEN", "Importar PGN", "Importar estudo do Lichess", "Escolher capítulo do livro" (os 175 extraídos).
- **Nada de JSON, id, código de erro ou jargão** na tela padrão. A voz é a de `docs/VOZ-DO-CURSO.md`.
- **Medida de uso, em cada bloco:** uma pessoa que nunca viu a tela (a esposa, um aluno mais velho) faz a tarefa do bloco sem instrução. Dois números entram no relatório: o tempo **e** as hesitações (cliques em coisa errada, recuos) — 40 s certo de primeira é melhor que 35 s com cinco cliques errados.

Na implementação, a tela do editor passa pelo skill `frontend-design`/`impeccable` (direção visual: a do site escuro já existente, ver `docs/LINHA-DE-BASE-DO-REDESENHO.md`), e os ícones seguem os do resto do site.

## As dez decisões

1. **Casca por cima do site, não um segundo site.** A aula editada é renderizada pelo **mesmo** `LessonPlayer` do aluno, com a **edição no lugar** descrita acima (lápis, +, lista de diagramas, barrinha do tabuleiro). O que não cabe no lugar vai para "Mais opções", que é o único formulário.
2. **Só existe em `npm run dev`, e é ligado de propósito**: `lib/editor/local.ts:editorLigado()` = `NODE_ENV === "development" && !VERCEL && EDITOR_LOCAL === "1"` (a chave vai no `.env.local` do Doug, documentada no README e no `.env.example`; custa uma linha e impede que qualquer `next dev` — de um agente, de um teste — abra a porta sem querer). `exigirEditor()` = `notFound()` se desligado, senão `professorAtual()` — o login de professor é a tranca de verdade; o `next dev` não restringe host. Toda página de `app/editor/**` e toda ação de `app/editor/acoes.ts` começam por ela; a camada de disco (`lib/editor/rascunhos.ts`, `server-only`) chama de novo e lança. Teste com `NODE_ENV=production`, com `VERCEL=1` e sem `EDITOR_LOCAL` exigindo `false`. Todo `spawn` do editor: sem shell, argumentos em array, `cwd` fixo na raiz, `process.execPath` como binário.
3. **Toda escrita é Server Action** (`"use server"`, primeira linha `await exigirEditor()`), delegando para `lib/editor/*.ts`. Nenhuma `route.ts`.
4. **O editor nunca escreve em `content/lessons/`.** Escreve em `content/rascunhos/` (que o gate já julga) e o gate promove. Estado de conferência e rascunhos de PGN ficam em `.editor/` (gitignored, fora de `content/` para não virar `RASCUNHO_ORFAO` nem entrar no `mutation-check`).
5. **`stages.guided` continua sendo saída — inclusive as respostas do defensor.** O Doug pediu para editar `replies` (as variantes do defensor) pela tela, e a resposta certa **não** é abrir a etapa 3 ao lápis: ela é regravada inteira pelo `--write`, e o que se escrevesse ali sumiria em silêncio na conferência seguinte. As respostas do defensor passam a ser declaradas na **fonte** — um campo novo no passo do roteiro —, e a derivação as transforma em `replies`. O professor edita onde escreve; a máquina continua escrevendo o que deriva. Ver o **Bloco 2C**. O resto da decisão original vale: A tela não tem lápis em nada da etapa 3 — o lápis ali leva ao diagrama do roteiro de onde a dica sai; a prévia deriva no navegador (`derivarTreino` + ação `lancesDoCache` lendo `content/tablebase-cache/` offline); o arquivo de verdade sai do `--write`.
6. **Aula do zero nasce de um molde** (`lib/editor/molde.ts`) que copia a **forma** da N1-KPK (4 etapas, passo do aluno com bloco `treino`, `practice` skill 20 / 300 ms) e nenhuma palavra. Falas geradas trazem a marca `«escreva aqui»`; gate novo `TEXTO_DE_MOLDE` recusa aula `published` com a marca.
7. **Importar** aceita FEN, PGN (com `[%cal]`/`[%csl]` do Lichess virando flechas/casas), capítulo de `capitulos.json` (offline) e URL de estudo do Lichess — nos dois módulos. Comentários do PGN só viram fala com a caixa "os comentários são meus" (desligada por padrão: a prosa do Silman não entra no repositório).
8. **No repertório a verdade continua sendo o `.pgn`.** Entra `lib/repertorio/escrever-pgn.ts` (o inverso de `lerPgns`), um editor de árvore, conferência **no navegador** (tudo é puro), e "Aplicar" = gravar o `.pgn` + `spawn` de `scripts/compilar-repertorio.ts`.
9. **Aula extra e linha extra são dado, não código.** Aula extra declara `nivel` (1–5) no próprio JSON e entra na trilha do nível; linha extra é ramo no PGN; abertura extra é arquivo novo (o índice nasce da varredura). Orçamento vira aviso com número; correção (lance ilegal, lance mudo, posição sem juiz) continua erro — **exceto a tablebase, ver 10**.
10. **A última palavra é por ponto, não por aula.** O editor mostra uma barra de avaliação do Stockfish na posição corrente (ver "A barra de avaliação"). A aula ganha `excecoes?: [{ codigo, alvo, hash, motivo: texto ≥ 25, em: data }]` (schema + gate): `alvo` é a posição (`positionId`) ou o passo (`roteiro[i]`), `hash` é o da FEN + lance relevante no momento da decisão. O gate rebaixa a **aviso** só o erro cujo `(codigo, alvo, hash)` casa com uma exceção; se a posição ou o lance mudou, o hash não casa, a exceção **caduca** (`EXCECAO_CADUCA`, aviso) e o erro volta a bloquear — o Doug decidiu sobre o que viu, não sobre o que alguém mudar depois. A tela distingue os dois casos ao pedir a exceção: `TABLEBASE_FORA_DE_ALCANCE` é "sem juiz para esta posição"; `RESULTADO_ERRADO`/`METODO_NAO_GANHA` é "o juiz discorda de você — divergência consciente", em destaque, e a bancada do professor mostra "publicada com N exceções" com o motivo de cada uma. A barra do Stockfish é apoio, nunca justificativa automática. Repertório: `[Excecao "motivo"]` por jogo já é por alvo (uma linha).

## Onde cada coisa é escrita

| O quê | Onde | Quem |
|---|---|---|
| Rascunho de aula | `content/rascunhos/lessons/<ID>.json` | `salvarRascunhoDeAula` |
| Rascunho de posição | `content/rascunhos/positions/<N?>/<pos-…>.json` | `salvarRascunhoDePosicao` |
| Aula/posição publicada | `content/lessons/`, `content/positions/` | **só o gate**, por `--aplicar` |
| Log/estado de conferência | `.editor/gate/<id>.json` + `.editor/gate/lock` | `lib/editor/gate.ts` |
| Rascunho de PGN | `.editor/repertorio/<cor>-<abertura>.pgn` | `salvarRascunhoDePgn` |
| PGN revisado | `content/repertorio/<cor>-<abertura>.pgn` | `aplicarPgn` (só com conferência verde) |

Ids vindos da URL/formulário passam por `lessonIdSchema`/`positionIdSchema` antes de `path.join`, e o resultado é conferido com `startsWith(pasta + sep)` como `lerAula` já faz.

**Dois lugares, duas promessas.** `.editor/autosave/<id>.json` guarda **qualquer** estado, inclusive o que o schema recusa — é a recuperação de sessão (fechou a aba no meio da frase, volta onde estava). `content/rascunhos/` só recebe JSON que passa em `lessonSchema`: é o que o player e o gate leem, e os dois foram feitos para conteúdo válido. A tela impede os estados estruturalmente impossíveis (não apaga o último de dois diagramas, não aceita lance ilegal, fala vazia fica no buffer e não vai ao rascunho); as issues de schema que sobrarem marcam o diagrama ou o texto no lugar.

**Contrato de gravação (Bloco 1, antes de qualquer lápis):**
- Cliente: mudança na tela é imediata; gravação com debounce de ~500 ms; **uma gravação em voo por arquivo** (fila single-flight — a próxima espera a anterior voltar). Sem isto, duas gravações concorrentes decidiriam sozinhas quem vence, e a mais velha pode chegar por último.
- Servidor: toda gravação leva `baseHash` (hash dos bytes que a tela abriu ou gravou por último). Se o arquivo no disco tem outro hash, recusa com "o arquivo mudou fora do editor" e a tela oferece recarregar ou sobrescrever — o caso real é um agente editando o mesmo JSON enquanto o editor está aberto.
- Escrita **atômica**: `<arquivo>.tmp`, fecha, `rename` para o destino. Interrupção no meio nunca deixa arquivo truncado.
- Testes: duas gravações concorrentes → a mais nova vence; hash divergente → recusa; simulação de interrupção → o arquivo anterior está inteiro.

## O ciclo na tela (finais)

- **Salvo** — é status ("✓ salvo há 3 s"), não botão; `Ctrl+S` força. Grava pelo contrato acima, remonta o player por `key` com `startAt` (etapa, nó, passo, pausado), devolve issues de schema e de **voz** (`reprovacoes(falasDaAula(lesson), regua)` — hoje só o CI pega); a fala longa demais ganha um contador vermelho no lugar, não uma mensagem.
- **Conferir** — **duas passadas**, porque o gate diz que `--write` julga "com o juiz enfraquecido" (desliga `WINNING_MOVES_DESATUALIZADO`, `ALTERNATIVAS_DESATUALIZADAS`, `RAMO_DESATUALIZADO` enquanto grava — `validate-content.ts:137`): **A** = `--rascunhos --refresh-cache --write` (gera os derivados), **B** = `--rascunhos` (lê limpo o que A gerou). Verde só se A **e** B forem verdes; o hash verde é o dos bytes depois de B. Lock em `.editor/gate/lock`: uma conferência por vez.
- **O gate fala em JSON para o editor.** Ganha a flag `--jsonl`: cada evento numa linha do stdout — `{"tipo":"problema","code","onde","message","aula"}`, `{"tipo":"progresso","texto":"tablebase: 12 posições, 3 pela rede"}`, `{"tipo":"fim","exit"}` — emitidos no mesmo `fail()` que já centraliza os erros; o modo humano do terminal não muda. O editor lê isso, nunca o texto; `lib/editor/saida-do-gate.ts` vira só o leitor de JSONL. A tela marca o **diagrama** (`onde` = `roteiro[3]` → miniatura 3 com borda vermelha e a frase do gate ao clicar). Depois de A, recarrega o rascunho: é ali que a etapa 3 de verdade nasce.
- **Publicar no curso** — habilitado só com última conferência (A+B) verde **e** hash do rascunho igual ao hash verde. Roda `--rascunhos --aplicar` (que julga de novo, limpo). Mostra `git status --porcelain content/`. Não faz commit.

## Aula do zero, importar, posição

- **Nova aula**: menu das aulas da `TRILHA` sem arquivo (46 hoje) **ou** "aula extra": id `EX-<TÍTULO>` gerado do título (validado por `lessonIdSchema`, sem colidir) + `nivel` obrigatório. Molde acima.
- **Posição**: escolher existente **ou** montar (`montagem`, `fenProblem` a cada peça solta, `pieceCount ≤ 7` avisado, quem joga, `expectedResult`) + formulário dos 9 campos de proveniência (obra de `sources.json`; para posição do professor, o slug `posicoes-do-preparatorio` já existe). Nasce `candidate`; o professor marca `approved` no editor (`qaApplied` recebe "aprovada pelo professor no editor em <data>"). **Mudar a FEN de posição publicada é permitido** — o professor tem controle total, e "salvar como nova" seria ele brigando com a ferramenta cada vez que corrigisse uma casa lida errada do livro.

  **Mas o arquivo não pode passar a mentir.** A proveniência diz "diagrama 1.3 da página 47 do De la Villa"; trocada a FEN, essa frase descreve outro diagrama, e este repositório trata proveniência como fato (é dela que sai a dívida de licença). Então mudar a FEN de posição `approved` **arrasta a proveniência junto, na mesma tela**: o status cai para `candidate`, `fenMethod` e `qaApplied` são reabertos para edição já preenchidos com "corrigida pelo professor no editor em <data>", e o professor reaprova. Gate novo, `FEN_SEM_PROVENIENCIA`: posição `approved` cuja FEN não bate com o `hash` guardado em `provenance.qaApplied` — a mesma mecânica de caducidade das exceções (decisão 10). A tela mostra o diagrama de antes e o de depois lado a lado antes de aceitar, porque trocar uma casa sem querer é o erro mais fácil de cometer com um montador.

  **E quem já treinou aquela posição?** O `positionId` não muda, então o progresso dos alunos continua apontando para ela. A tela diz quantos registros de quantos alunos passam a se referir a uma posição diferente daquela que eles jogaram — o mesmo número que o repertório mostra em `progressoQueMorre(ids)`. É aviso, não impedimento.
- **Importar** (finais): FEN → montador; PGN → posição + roteiro (um passo por lance, `%cal/%csl` → `arrows/highlights` via `lib/editor/lichess-setas.ts`); capítulo de `capitulos.json` → posição + linha + URL na proveniência; URL de estudo → **nunca `fetch(urlDigitada)`**: a URL é lida (só `https://lichess.org/study/<id>[/<cap>]`, ids `[A-Za-z0-9]{8}`), e a URL da API `/api/study/<id>/<cap>.pgn` (público, sem chave) é montada internamente; timeout de 10 s, teto de 1 MB e de 500 lances → caso PGN. Corta/avisa quando a linha começa ou termina no defensor. Trabalho humano depois: falas, dica e flecha do alvo, erros nomeados, técnica, classe.
- **Desenho**: botão direito (ou o ícone de flecha/casa na barrinha) escreve no diagrama selecionado, com o chip "desenho deste diagrama / alvo do treino" (são dois desenhos, o schema explica). `lib/chess/annotations.ts:autoriaDoDesenho` é o inverso de `desenhoDaAutoria` (teste de ida e volta).

## Extras na trilha

- **Aula extra tem namespace próprio: `EX-`.** O prefixo `N0`/`N1` é "ID editorial oficial do currículo, nunca renumerar" (`schema.ts:830`) e **não** é o nível — a `N1-KPK` está no nível 2. Uma extra `N2-…` no nível 2 ensinaria a associação que o próprio sistema diz ser falsa. `lessonIdSchema` passa a `^(N[0-9]+|EX)-[A-Z0-9-]+$`; o único consumidor do prefixo fora do schema é o de **posições** (`mutation-check.ts:70`, `pos-…`), que não muda — conferir com grep na hora. A tela nunca deduz nível pelo id.
- `lessonBaseSchema.nivel?: 1..5`, `professor?: { adaptouEm, nota? }`, `excecoes?`.
- Gate: `EXTRA_SEM_NIVEL` (`EX-` published sem `nivel`), `AULA_FORA_DA_TRILHA` (`N…` published que não está na `TRILHA` — hoje cai na bancada em silêncio), `NIVEL_DIVERGE` (aula da TRILHA declarando `nivel` diferente), `TEXTO_DE_MOLDE`. Mutação para cada.
- `lib/finais/conteudo.ts`: `indiceDeAulas()` devolve `nivel`/`class`; `aulasExtras(): AulaDaTrilha[]` (`extra: true`, `ordem` a partir de 50).
- `lib/finais/trilha.ts`: `trilhaCompleta(extras)`, `aulasAbertas(publicadas, extras)`; `lib/curso/nivel.ts`/`mapa.ts`: `aulasDoNivel(n, extras)`. `/finais` e `/trilha` desenham `trilhaCompleta`; cartão extra mostra "extra" no lugar do numeral. Ao publicar, o editor calcula `fechamentoDoNivel(n)` **antes e depois** (a exigência é `min(declaradas, publicadas)`, `nivel.ts:312` — nem sempre sobe) e diz só o que muda: "esta aula entra na conta do nível 2: quem ainda não fechou passava a precisar de 1, passa a precisar de 2" — ou "não muda a exigência do nível".

## Repertório

- `lib/repertorio/escrever-pgn.ts` (puro): preserva o preâmbulo `;` verbatim, tags na ordem, lance nosso com comentário em linha nova, `N...` após variação/comentário, comentários embrulhados a 80 col, `[%plano]` em linhas próprias. Teste: para os 11 PGN reais, `lerPgns(escrever(lerPgns(x)))` estruturalmente igual **e** `expandir` produz o mesmo JSON. **Primeiro commit do bloco reimprime os 11** para os diffs seguintes serem só o que o Doug mudou.
- Tela `app/editor/aberturas/[cor]/[abertura]/`, no modelo da análise do Lichess: `ChessBoard` com `dests`, a árvore de lances com variações ao lado, e o comentário do lance selecionado logo abaixo com o **lápis** (inline). Marca `!`/`?` por dois ícones no lance (a régua de `arvore.ts` explica o efeito num tooltip). `[%plano]` na ponta da linha em campos simples ("qual peça, para onde, por quê"); as tags do jogo (nome, fonte, nível) em "Mais opções". **Jogar um lance no tabuleiro é o "+":** em nó com filho cria variação, e a tela diz o que é (ramo em lance dele = linha nova; em lance nosso = alternativa/erro). Apagar nó mostra **quais ids morrem** e `progressoQueMorre(ids)` → "N registros de M alunos". "Ver como o aluno" abre `Passada` em `modo="assistido"`.
- **Flechas e casas nas linhas do repertório (novo — hoje a linha só tem texto).** No `.pgn`, dentro do comentário do lance, no formato do Lichess: `{ Texto. [%cal Gc6c7,Rb8b1] [%csl Rb8] }` — é o que o Lichess exporta, então PGN importado de lá já vem com desenho. `esquema.ts` ganha `separarDesenho(comentario)` ao lado de `separarPlano` (mesmo mecanismo: tira o bloco do texto), usando o leitor `lib/editor/lichess-setas.ts` do Bloco 4 (que por isso sobe para `lib/chess/lichess-setas.ts`). `LinhaSchema` ganha `desenhos?: Record<índice, { arrows?, highlights? }>`; `expandir` preenche; `escrever-pgn.ts` reimprime. No editor, o botão direito no tabuleiro do lance selecionado escreve o desenho daquele lance. **Na tela do aluno**, `Passada` desenha com `desenhoDaAutoria` no quadro do lance, no canal `shapes` — o mesmo que a aula de finais já usa. Contagem no placar da compilação: "N lances com desenho".
- Conferência instantânea no navegador (`expandir` + `validarBanco` + `aberturasInchadas` + `fechamentosAbertos`) — é **feedback**, não o gate de publicação.
- **Aplicar é transacional.** O servidor repete a validação pura sobre o conjunto candidato inteiro (os 11 PGN com o editado no lugar); `scripts/compilar-repertorio.ts` ganha `--origem <dir> --destino <dir>` (hoje são constantes, linhas 45-46) e compila o candidato em `.editor/repertorio/compilado/`; só com isso verde o `.pgn` definitivo é trocado (`.tmp` + `rename`, com `.bak` do anterior) e a compilação de verdade roda; se ela falhar — o que seria bug do próprio script —, o `.bak` volta. Em nenhum momento `content/repertorio/` fica com um arquivo que o compilador recusou.
- **Bloco 5A vem antes de qualquer tela:** o leitor guarda tags, intro, lances (san, nags, comentário, variações) e resultado — não guarda o preâmbulo `;` (que `recortarJogos` já isola, `pgn.ts:396`). 5A = expor o preâmbulo pelo leitor, definir o que o round-trip preserva, escrever `escrever-pgn.ts`, o teste dos 11 e o commit de reimpressão. 5B = o editor de árvore. Não se começa 5B sem 5A verde. Erros: PGN quebrado, lance ilegal, linha termina no adversário, **lance nosso sem comentário**, `[%plano]` incoerente, sequência duplicada. Avisos: >40 linhas, irmão sem marca, comprimento fora de 12–14 **com** `[Excecao]`, fonte = professor (`[Fonte "Professor Douglas — …"]`, e o placar imprime "N de fonte, M do professor").
- `LinhaSchema` ganha `excecao?`, `adaptacao?` (compilada de `[Adaptacao "data — o que mudou"]`). `banco.ts` chaveia o cache em memória por `mtime` (em `next dev` o processo sobrevive à recompilação).
- **Nova abertura**: cor, slug, nome, nível, fonte → `.editor/repertorio/<cor>-<slug>.pgn`; aplicar grava e compila; aparece em `/aberturas` sem código.
- Importar PGN/estudo no repertório: `lerPgns` → variantes anexadas na árvore com `[Fonte]` preenchida pela origem (URL do estudo); comentários entram só com a caixa marcada.

## A barra de avaliação

O motor de hoje é **um só, com um pedido em voo, e `bestMove`/`analyse` cancelam o que houver** (`lib/engine/stockfish.ts:96-99`); a análise é por profundidade (`go depth`, linha 454). Uma barra pendurada nesse singleton cancelaria o lance do computador na etapa de prática — e vice-versa. Por isso **o editor tem um worker próprio**: `stockfish.ts` extrai a criação do worker numa função (`criarMotor(build)`), o singleton do aluno passa a usá-la sem mudar de comportamento, e `components/editor/BarraDeAvaliacao.tsx` cria o seu na montagem e o encerra ao desmontar. Custa ~7 MB a mais só na máquina do Doug, em `next dev`.

A barra pede `Analise` com profundidade fixa (18, com o teto de tempo que o motor já tem) a cada mudança de FEN do tabuleiro em foco, e desenha a barra vertical ao lado do tabuleiro **sempre do ponto de vista das brancas**, como no Lichess — o sinal nunca muda de significado a cada lance —, com o texto explícito: "Brancas +1,3", "Pretas +2,1", "Mate em 4 para as brancas". Nos finais também mostra, quando o cache tem, o veredito da tablebase ao lado ("tablebase: ganha"). Nunca roda no tabuleiro da etapa de prática. Está nos finais (Bloco 2) e no repertório (Bloco 5). É apoio à decisão do professor, não juiz.

## Blocos entregáveis (cada um com número medido no fim)

**Bloco 1 — a fundação: escrita confiável, o ciclo inteiro, e o lápis (um a dois dias).**
Primeiro os contratos, depois a tela: `lib/editor/local.ts` (`EDITOR_LOCAL`, +teste), `rascunhos.ts` (autosave em `.editor/autosave/`, rascunho válido em `content/rascunhos/`, `baseHash`, `.tmp` + `rename`, +testes de concorrência e interrupção), `gate.ts` (spawn sem shell, lock, duas passadas A+B), `--jsonl` no `validate-content.ts` (emitido no `fail()`; modo humano intocado), `saida-do-gate.ts` (leitor de JSONL); `.editor/` no `.gitignore`; `professor.adaptouEm` no schema. Depois: `app/editor/finais/[aula]/page.tsx`, `Editor.tsx` (fila single-flight de gravação), `components/editor/Lapis.tsx` (texto inline: fala, título, técnica), `ListaDeDiagramas.tsx` (miniaturas, só leitura neste bloco), `app/editor/acoes.ts`; voz ao salvar; `startAt.passo/pausado` em `LessonPlayer`/`IntroStage`/`ObjectiveStage`; link "Editar" na bancada de `/finais` e em `/professor` quando `editorLigado()`.
*Medida:* mudar uma fala da N1-KPK pelo lápis, conferir (A+B verdes; N posições do cache, 0 pela rede), publicar → `git diff content/lessons/N1-KPK.json` mostra **a fala e o carimbo, nada mais**. Duas gravações concorrentes → a mais nova vence; JSON alterado por fora com o editor aberto → "mudou fora do editor"; processo morto no meio da escrita → arquivo anterior inteiro. `next build && next start` → `/editor/finais/N1-KPK` = 404; `next dev` sem `EDITOR_LOCAL` → 404. Largura do palco com a lista de diagramas em 1366×768. **Uso:** uma pessoa leiga muda uma fala sem instrução — tempo e hesitações até o primeiro salvamento.

**Bloco 2 — flechas, casas, lances, diagramas e a barra.**
`marcacao` em `IntroStage`/`ObjectiveStage`; `autoriaDoDesenho`; barrinha do tabuleiro (flecha, casa, limpar, virar) + chip "diagrama / alvo do treino"; lance por arrastar no diagrama (chess.js valida a corrente); o **"+"** entre diagramas, arrastar para reordenar, lixeira com desfazer, `espera` como um controle de "pausa" no diagrama; `criarMotor()` extraído de `stockfish.ts` + `BarraDeAvaliacao` com worker próprio (perspectiva das brancas); `excecoes` por alvo com hash no schema + gate rebaixando a aviso só o erro que casa, `EXCECAO_CADUCA` quando o hash diverge + mutações (exceção que casa passa; exceção com hash velho não protege).
*Medida:* apagar as 15 flechas e 11 lances da N1-KPK e refazê-los pelo editor → `git diff` vazio. Tempo cronometrado de refazer a aula inteira. **Uso:** pessoa leiga acrescenta um diagrama com uma flecha, sem instrução.

**Bloco 2C — as respostas do defensor (`replies`), pela fonte.**
Hoje o roteiro é uma linha só: um lance do aluno, uma resposta do defensor, e a derivação costura os dois. Quando o defensor tem **mais de uma** resposta razoável, o autor precisa de `replies[2..4]` na etapa 3 — e hoje isso é edição do JSON à mão, porque a etapa 3 é saída.

A saída não muda de dono. O que muda é a fonte: `passoTreinoSchema` (ou o passo do roteiro) ganha `respostas?: string[]` — os lances do defensor, em UCI, a partir daquele ponto. `derivarTreino` passa a produzir `replies` quando há mais de uma, e `reply`+`next` quando há uma só (o que mantém byte a byte o que existe hoje). Na tela: no diagrama do passo, o professor joga o lance alternativo do defensor e ele entra como irmão, com o mesmo gesto do "+"; a lista mostra os dois ramos. Erros: resposta ilegal, resposta que repete outra, resposta que sai do objetivo (a tablebase julga, e a exceção da decisão 10 cobre a divergência).

*Medida:* uma aula com duas respostas do defensor num passo passa o gate como rascunho, e `--write` gera `replies` com os dois ramos; apagar a segunda resposta devolve o arquivo ao que era **byte a byte**. Para as 3 aulas de hoje, que não têm resposta alternativa nenhuma, `--write` não muda um byte.

**Bloco 3 — posição, aula do zero, aula extra.**
Montador (ícone de peças na barrinha; paleta de peças ao lado do tabuleiro como no editor de posição do Lichess) + proveniência em "Mais opções" + `candidate→approved` + **FEN de posição publicada editável no lugar**, com a proveniência arrastada junto, o `FEN_SEM_PROVENIENCIA` no gate (+ mutação), o antes-e-depois lado a lado e o número de alunos afetados; `molde.ts` + `TEXTO_DE_MOLDE`; menu "+ Nova aula" em `app/editor/page.tsx` e `app/editor/finais/nova/page.tsx`; `EX-` no `lessonIdSchema`, `nivel`, `EXTRA_SEM_NIVEL`, `AULA_FORA_DA_TRILHA`, `NIVEL_DIVERGE`, `aulasExtras`, `trilhaCompleta`, parâmetros em `nivel.ts`/`mapa.ts`, rótulo "extra", frase de preço calculada por `fechamentoDoNivel` antes/depois. As rotas de `app/editor/**` são dinâmicas (leem o disco por pedido, validam o id no loader); a rota do aluno `/finais/[aula]` continua estática, e a doc local do Next garante que em `next dev` o `generateStaticParams` é reavaliado na navegação — a aula recém-promovida abre sem medição.
*Medida:* uma aula nasce do molde com posição montada e proveniência própria e passa o gate como rascunho (tempo cronometrado do zero ao verde). Uma extra `EX-…` com `nivel: 2` publicada aparece em `/finais` e `/trilha` no nível 2 e `fechamentoDoNivel(2)` exige exatamente o que a tela anunciou.

**Bloco 4 — importar (finais).**
`lichess-setas.ts` (+teste), importador FEN/PGN/capítulo/URL, corte e avisos do roteiro, caixa dos comentários.
*Medida:* capítulo do estudo `yk2b24vS` vira posição + roteiro de K passos com 0 lances ilegais; PGN com 6 setas e 3 casas vira 6 `arrows` e 3 `highlights` nos passos certos; a prosa do estudo não aparece em campo nenhum.

**Bloco 5 — repertório, em duas metades.**
**5A (o escritor, sem tela):** preâmbulo exposto pelo leitor, `escrever-pgn.ts` (+teste de ida e volta dos 11: estrutura igual, `expandir` igual, compilado byte a byte igual), `--origem`/`--destino` no compilador, e o **commit de reimpressão dos 11** — isolado, sem nenhuma edição de conteúdo junto. **5B (o editor), só com 5A verde:** editor de árvore; **flechas e casas por lance** (`separarDesenho`, `desenhos` no schema, botão direito no editor, `Passada` desenhando para o aluno); conferência no navegador; `Passada` como prévia; `[Excecao]`, `[Adaptacao]`, fonte-professor no placar; `progressoQueMorre`; cache por `mtime`; nova abertura; importar PGN/estudo (URL reconstruída, teto, timeout); barra de avaliação; aplicar transacional (validação no servidor → compilar candidato → trocar `.pgn` com `.bak` → compilar).
*Medida:* os 11 reimpressos compilam para `public/repertorio/` **sem um byte de diferença**; uma flecha desenhada com o botão direito num lance da Escocesa aparece na `Passada` do aluno naquele lance e em nenhum outro; editar comentário ou desenho não muda id; mudar lance mostra "N registros de M alunos" antes de salvar; abertura nova aparece em `/aberturas` sem código.

**Bloco 6 — opcional, só se pedido:** botão "Enviar para o site" (commit + push com `git status` visível); formulário de `notas.json`.

## O que fica fora, e por quê

- Campo de `guided` na prancheta (o `--write` apagaria a edição em silêncio).
- `TRILHA` como JSON editável (extras por `nivel` dão a liberdade sem entregar a lista ao formulário).
- Editor para celular; gate próprio de tela (a régua de 390 px é do aluno).
- Afrouxar "todo lance nosso tem comentário" — é a explicação que o Doug pediu.

Não se atualiza o Next junto com isto: o editor nasce na 16.3.0 instalada, lendo `node_modules/next/dist/docs/`; atualizar o framework é outra tarefa.

Riscos declarados: `spawn` do Node a partir de Server Action no Windows (medir no Bloco 1); mudar lance de linha que a turma já treina zera o progresso (o editor mostra o número; OLESC em outubro); cada extra publicada encarece o nível para quem não fechou (regra existente, dita na tela).

## Verificação

- Gates de sempre: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run validate:content`, `npm run validate:mutations`, `npm run repertorio:compilar -- --check`.
- Testes novos: `lib/editor/local.test.ts` (production / VERCEL / sem `EDITOR_LOCAL` → false), `rascunhos.test.ts` (fila single-flight, `baseHash` divergente recusa, `.tmp`+`rename` sobrevive a interrupção), `saida-do-gate.test.ts` (JSONL), teste da exceção por alvo (casa / hash velho não protege), `molde.test.ts`, `lichess-setas.test.ts`, `annotations` ida-e-volta, `escrever-pgn.test.ts` contra os 11 reais, `saida-do-gate.test.ts`, `trilha.test.ts` ("publicada fora da trilha declara nível"), mutações para cada código novo.
- Ponta a ponta (Playwright em `next dev`, logado como professor): editar fala → conferir → publicar → diff mínimo; 404 em `next start`; aula do molde do zero ao verde; extra na trilha; import de capítulo; reimpressão dos 11 PGN sem diff no compilado.
