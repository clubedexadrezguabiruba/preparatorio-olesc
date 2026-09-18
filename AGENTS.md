<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Editor v2

Antes de planejar ou implementar qualquer trabalho no Editor v2, leia integralmente:

1. `docs/EDITOR-V2-PLANO-FINAL.md` — arquitetura, dados e segurança;
2. `docs/EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md` — todas as funções, interações e
   critérios de aceite;
3. `docs/MODO-EDITOR-ONDE-PARAMOS.md` — estado atual e evidências já executadas.

Não trate o piloto atual como editor concluído. Não reduza o checklist funcional e não
refaça entregas que o diário comprova. Implemente em fatias completas, atualize o diário
e execute os portões do projeto antes de cada commit de código.

## Duas opções ficam no mesmo capítulo, e a fita volta

Regra do Doug, de 18/9/2026, **global** para as aulas de finais — `content/finais/estudos-aula/`,
`content/aulas-v2/`, a importação de estudo (`lib/editor-v2/importar-estudo.ts`) e o player v2 — **e,
desde a mesma data, para as aulas de abertura** (seção "Aula de abertura é direta", abaixo).
**Ela revoga** o "a variante vira capítulo de comparação sozinha" que o
`docs/COMO-FAZER-UMA-AULA-DE-FINAIS.md` §1 mandava fazer até 18/9/2026.

1. **Quando a aula mostra duas escolhas da mesma posição, as duas ficam na MESMA etapa.** "Se a dama
   for para f6, afoga; agora veja o que devia ter feito" é um capítulo só. Nunca criar capítulo novo,
   etapa nova, nem item novo no menu "Etapas" para a opção 2.
2. **A passagem de uma opção para a outra é um rewind.** O tabuleiro desfaz os lances para trás, mais
   rápido do que os fez, até o ponto onde a linha se abriu, e só então joga a opção 2. Automático, no
   fim da opção 1 — sem botão e sem clique do aluno. "Como se estivesse recapitulando, rewind the tape."
3. **Por quê:** o capítulo novo faz a opção 2 parecer assunto novo, e o aluno perde o que a comparação
   ensina — que as duas saem da **mesma** posição. O corte seco de volta tem o mesmo defeito: parece
   outra posição, não a mesma voltando.
4. **Como se confere de fora:** o menu "Etapas" de qualquer aula de finais **não pode ter nenhum item
   começando com "Comparação:"**. Em 18/9/2026 a `N1-SQUARE` tinha três (`Comparação: 1. Rg2?`,
   `Comparação: 1... Rf5?`, `Comparação: 1. a3?`), e era a montagem que os criava — não o PGN.
5. Isto não mexe nas outras regras: os **símbolos** continuam junto do lance (seção abaixo), o
   comentário continua **opcional**, e o apoio dos treinos continua caindo por degraus
   (`COMO-FAZER` §1.1).

**O código está feito** (18/9/2026): a montagem (`comparacoes` na etapa, `importar-estudo.ts`) e a
fita (`passosNaHora` em `lib/editor-v2/previa.ts`, `recuo` no player). A trava é
`lib/editor-v2/finais-sem-comparacao.test.ts`. **Falta republicar as 11 aulas de finais** — está em
`docs/FILA-DO-DOUG.md` §1.

## Aula de abertura é direta

Regra do Doug, de 18/9/2026, **global para todo curso de abertura**: os que estão no ar (Escocesa,
Francesa, Siciliana) e **todo curso novo**. Vale para o estudo (`content/repertorio/rascunhos/estudo-*.pgn`),
o planejador (`lib/editor-v2/planejar-curso.ts`), a prévia (`lib/editor-v2/previa.ts`) e o player v2.
**O menor número possível de telas e balões.**

1. **Sem mapa rápido.** A aula B não abre com um capítulo que lista as respostas do adversário para
   depois explicar cada uma de novo. A aula mostra cada golpe direto: o erro, a punição e o próximo.
2. **A pergunta é jogada na mesma tela do capítulo.** Sem Espaço, sem troca de etapa: o tabuleiro para
   na pergunta, o aluno joga, e a narração segue com o lance-resposta. No modelo, a etapa de capítulo
   leva `paradas` (os treinos `papel: "parada"`); nenhuma etapa aponta para uma parada.
3. **Os ramos de um capítulo ficam na mesma etapa, com rewind** — a regra "Duas opções…" acima. A
   linha principal vai até o fim, a fita volta até o ponto da escolha e toca o ramo; os ramos, do mais
   fundo ao mais raso (`ordemDaFita`). Nenhum item "— se …", "— depois de …" ou "— resumo" no menu.
4. **O Laboratório fica**, no fim da aula B, numa etapa só: os casos na ordem dos números ("CASO N"), a
   fita voltando e avançando até cada um.
5. **Sem "Encontre o lance" nas aulas E+F.** "Encontre o plano", a revisão, o treino guiado e o
   treinador de lances ficam.
6. **Golpe × Imprecisão.** O capítulo só se chama "Golpe" ou "Armadilha" se o Stockfish 18,
   profundidade 22, no fim da linha principal, der **+2 ou mais** para nós (peça, qualidade, dama presa,
   mate). Abaixo de +2, o nome é "Imprecisão". A medida fica em `content/repertorio/medidas-dos-golpes.json`.
   Exceção **só por decisão do Doug**, escrita no capítulo do registro (`decisaoDoDoug`). A primeira foi o
   Golpe 1 da Siciliana, +1,91, em 18/9/2026.
7. **O treino guiado não tem comentário**: nem o texto do acerto nem o da resposta do adversário. O
   aluno já ouviu o porquê na aula; ali ele só joga.
8. **"Pular"** (da 2ª vez em diante) num capítulo com perguntas passa a fala depressa, mas mantém as
   perguntas: o aluno ainda joga os lances (`comoPular`, `lib/aberturas/rodada.ts`).
9. **Página do curso**: as aulas e os tópicos de cada uma; no fim, o bloco "Treinador de lances" com o
   contador e o botão Treinar. As linhas não são listadas. Em todo texto visível, o nome é
   **"Treinador de lances"**, não "move trainer".

**A trava** é `lib/editor-v2/abertura-direta.test.ts`, que roda no `npm test`: monta **todo**
`estudo-<cor>-<abertura>.pgn` (curso novo entra sozinho) e lê as `AB-*` publicadas, e reprova título de
mapa, trecho ou "Encontre o lance" no menu, pergunta ou ramo com etapa própria, pergunta que não é
seguida do lance-resposta, fita que não volta à posição da escolha, e "Golpe" sem +2 medido.

## `docs/FILA-DO-DOUG.md` — o que o Doug quer e ainda não foi feito

Antes de propor trabalho novo nas aulas de finais ou no Editor v2, **leia `docs/FILA-DO-DOUG.md`**. É
a lista do que ele já decidiu fazer e adiou, e do que ficou esperando decisão dele. Serve para ele não
repetir a ideia e para você não redescobrir. Item feito sai de lá e vira seção no
`docs/MODO-EDITOR-ONDE-PARAMOS.md`.

## Comentário de lance no move trainer é opcional

Regra do Doug, de 17/9/2026, **global**: vale para os 11 repertórios (`content/repertorio/`,
`/aberturas`), para o PGN gerado do estudo do curso de abertura e para o editor do repertório.

1. **Nenhum lance precisa de comentário** — nosso ou do adversário, no meio ou no fim da linha.
   O move trainer é a última etapa: o porquê do lance o aluno já ouviu antes dele.
2. **Nem erro, nem aviso.** Não reintroduzir a trava ("todo lance nosso comentado", "o último
   lance está sem comentário") no compilador (`lib/repertorio/linhas.ts`), no leitor do estudo
   (`lib/editor-v2/curso-de-abertura.ts`), em teste de banco ou em script de importação.
3. Sem texto, a tela só não mostra a caixa do comentário. Não inventar texto de preenchimento.
4. Isto não mexe nos **símbolos** (seção abaixo): `!`, `?`, `$n` continuam obrigatoriamente junto
   do lance. E não mexe nas outras regras que continuam: linha termina em lance nosso, sem linha
   repetida, `[%plano]` coerente quando existe.

## Símbolos de lance: sempre vão junto com o lance

Regra do Doug, de 14/9/2026. **Leia antes de importar, revisar ou reescrever qualquer PGN
ou estudo** — fontes do repertório (`npm run repertorio:importar`), a revisão à mão de
`content/repertorio/rascunhos/` para `content/repertorio/<cor>-<abertura>.pgn`, estudos do
Lichess (`npm run finais:extrair`, importação de PGN/estudo do Editor v2), o editor do
repertório, ou um script novo que leia PGN.

1. **Todo símbolo que a fonte deu a um lance vai junto com o lance**: `!!`, `!`, `!?`, `?!`,
   `?`, `??` e os numéricos (`$1`…`$255`, inclusive as avaliações como `$14`, `$16`).
   Nunca descartar, nunca "limpar", nunca trocar por outro. `!` e `$1` são o mesmo
   símbolo; qualquer uma das duas grafias serve.
2. **Reescrever o texto não autoriza tirar a marca.** Foi assim que se perderam em 2026-09:
   o comentário do professor foi redigido do zero e os `$1` ficaram no rascunho.
3. **Cortar um lance marcado é decisão do Doug, nunca silenciosa.** Antes de tirar da
   árvore um lance que a fonte marcou, diga qual lance, qual símbolo e o que muda no treino
   (irmão nosso com `!`/`!?` é "também vale"; com `?`/`?!`, armadilha; lance do adversário
   vira linha nova e precisa fechar a régua do término).
4. **Importador ou script que não souber guardar um símbolo tem de avisar**, com o lance
   nomeado, como o `NAG_DESCONHECIDO` de `lib/editor-v2/importar-pgn.ts` — nunca engolir.

A trava automática é `lib/repertorio/marcas-das-fontes.test.ts`, que roda no `npm test`:
reprova se um lance que está nas fontes e no repertório perdeu o símbolo, ou se um lance
nosso marcado na fonte saiu da árvore. As marcas em lance do adversário cortado e em ramos
fora do repertório não reprovam — o teste imprime quantas são, para a decisão ficar à vista.

## O erro do adversário nas armadilhas leva símbolo

Regra do Doug, de 18/9/2026, **global para todas as aberturas** — as que estão no ar (Francesa,
Siciliana, Escocesa) e **todo curso novo**: o estudo em `content/repertorio/rascunhos/estudo-*.pgn`,
o script que gera um estudo, as aulas `AB-*` e o move trainer que sai delas.

1. **Nos golpes e armadilhas, o lance do adversário que cai neles leva símbolo de erro.** O aluno
   precisa ver que o lance foi ruim, não só a punição que vem depois. Isso vale para o lance que
   abre a armadilha e para os erros do meio de um golpe longo: no sacrifício de dama da Francesa
   eram três (`12...Be8??`, `14...Rc8?`, `15...Bxf7??`).
2. **A régua é a perda medida no Stockfish 18** (`scripts/motor.ts`, profundidade 22), a partir do
   ponto de vista de quem joga o lance:
   - `?!` imprecisão: de 0,5 a 0,99 peão;
   - `?` erro: de 1 a 2,99 peões;
   - `??` blunder: 3 peões ou mais, ou um lance que permite mate.
3. **Mesmo símbolo em toda ocorrência** da mesma posição e do mesmo lance: aula, laboratório,
   treino, "esqueci a teoria" e move trainer. Confira pela posição (FEN), não pelo nome do lance:
   `5.c3` da Siciliana é erro no Golpe 4 e lance normal na Rossolimo.
4. **Se a fonte já marcou o lance, vale a marca da fonte**, mesmo que o motor meça outra coisa
   (Siciliana: `11.Bxd5` e `13.dxe6` são `$4` = `??` na fonte). Trocar a marca da fonte é decisão
   do Doug — regra dos símbolos acima.
5. **Escopo:** golpes, armadilhas, **imprecisões** (desde 18/9/2026: o lance do adversário que só
   perde um pouco também leva `?!`/`?`/`??` pela mesma régua) e os capítulos que repetem essas linhas. Capítulos de defesa
   normal e partidas modelo ficam como estão, até o Doug pedir.
6. **Curso novo de abertura só é publicado depois desta passada.** O player já mostra os seis
   símbolos no círculo da casa de destino (`lib/chess/nag-overlay.ts`); o que falta é o símbolo
   estar no estudo.
