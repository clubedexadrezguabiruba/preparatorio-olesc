> **Cópia versionada, 16/9/2026.** Original: `~/.claude/plans/vamos-reestruturar-o-modo-fuzzy-hejlsberg.md`.
> O contrato funcional está em `docs/EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md` §13.3, §18.1 e §21; em conflito, a
> especificação vence. O estado de cada fatia fica no diário `docs/MODO-EDITOR-ONDE-PARAMOS.md`.

# Curso de abertura no Lesson Engine — etapas da Estrutura Didática v3.1

*16/9: revisado pelo Fable; atualizado à noite para o estudo v1.5 e as regras globais do Doug.*

## Context

Hoje a abertura é ensinada só pelo move trainer de `/aberturas` (`lib/repertorio/passada.ts`),
separado do Lesson Engine. O Doug quer que o aluno aprenda a abertura em **aulas com o professor**,
seguindo a *Estrutura Didática Global v3.1* (00 → A → B → C → D → E → F). O estudo
**Francesa 3.Bd3 v1.5** é o padrão para todas as aberturas e o piloto: entra pelo Editor v2, pelo
link do Lichess e pelo PGN, e o Doug vê a aula na tela, localmente. Finais não mudam.

## Decisões do Doug (16/9)

**Da aula**
1. Entrega: proposta das etapas + plano em fatias.
2. **O estudo do Lichess é a fonte.** Reimportar substitui, com cópia de segurança e diff antes.
3. Só aberturas. Finais mantêm as etapas de hoje.
4. **Uma aula por bloco**; cada capítulo do estudo = uma etapa da aula do seu bloco.
5. Toda aula de abertura tem **treino guiado** (igual ao de finais) e **move trainer** (igual ao de hoje) —
   **exceto a aula de partida modelo** (regra 18).
6. Cada `[PERGUNTA]` = parada em que o aluno joga o único lance certo (ex.: depois de 5...Qxg2??
   achar 6.Be4!). No E21 o aluno também responde jogando o lance; depois aparece o `[PLANO]`.
7. Move trainer tira as linhas **do estudo**; `content/repertorio/brancas-francesa.pgn` passa a ser gerado.
8. Lance nosso com `!?` + `[REFERENCIA]` (5.dxc5, 5.Nf3, 11.Qxf3, 11.Nxf3) vale como **"também vale"**.
9. Linhas de armadilha também entram em `/aberturas`.
10. **Antes de tudo:** portões + commit dos 53 arquivos na `modo-editor` → merge no `main` + push
    (Vercel publica; até 18/09 só contas de teste) → apagar `modo-editor` (local e GitHub) → remover o
    worktree `olesc-portoes-00` → criar **`curso-abertura`** a partir do `main` (sem worktree).
11. Rascunho antigo do Grigoryan (`french-with-bd3.pgn`) é **aposentado**; o export do estudo vira a
    fonte em `content/repertorio/rascunhos/`, e a trava `marcas-das-fontes` compara estudo → PGN gerado.
12. **Régua de tamanho sai de vez, para todo o repertório:** sem mínimo, sem máximo, sem exigir
    roque/peças fora. Ficam: termina em lance nosso, todo lance nosso comentado, sem linha repetida.
13. Aula B fica uma aula só, mesmo longa — o aluno para e continua de onde parou.
14. **Padrão e piloto: estudo v1.5** — Lichess `qq2xorDl` e
    `C:\Users\Lenovo\Downloads\Francesa_3Bd3_Lichess_FINAL_ESTRUTURA_MOVE_TRAINER_PARTIDA_MODELO_v1.5.pgn`.
    Importar pelos dois caminhos e **ver na tela, localmente**.

**Regras globais — valem para todas as aberturas, sem configuração por aula**
15. **Move trainer treina erros/armadilhas e linhas principais, em progressão:** as linhas novas chegam
    na ordem dos capítulos "Move Trainer" do estudo (arma → esquema → golpes/armadilhas → quando não
    funciona → defesas → linha crítica → desvios → se esquecer → árvore completa). **Ordem sugerida,
    sem trava:** revisão vencida pode entrar no meio.
16. **Progressão da aula por vez:**
    - 1ª vez: todas as etapas, obrigatórias, na ordem.
    - 2ª vez: todas as etapas; botão **Pular** na explicação. Treino guiado (e paradas) e move trainer não se pulam.
    - 3ª vez em diante: o aluno pode ir **direto ao move trainer**.
17. **Move trainer dentro da aula está feito** quando o aluno passou **uma vez por cada linha do bloco**
    (na primeira vez de cada linha, começa no modo assistido). Aprender de verdade (3 acertos espaçados)
    segue nos dias seguintes em `/aberturas`.
18. **Partida modelo é só para assistir:** sem pergunta, sem treino guiado, sem move trainer.

## As etapas — como o aluno aprende

**Molde de toda aula de bloco (A, B, C, E+F):**
```
Aula <bloco>
  capítulo do bloco     ── [OBJETIVO] em cartão → narração, uma fala por ideia
  (ramo do capítulo)    ── variante que ensina algo: "Voltamos a 3.Bd3… agora a outra escolha"
  parada                ── na [PERGUNTA] o aluno joga o lance certo; errou → retorno + dica;
                           acertou → a aula continua da resposta
  … (os outros capítulos do bloco)
  Treino guiado do bloco ── árvore das linhas do bloco; a defesa das Pretas gira a cada tentativa
  Move trainer do bloco  ── as linhas "Move Trainer" do bloco, na ordem do estudo, cada uma uma vez
```
**Aula de partida modelo (D):** só a partida narrada. Nada a responder, nada a treinar.

**Trilha da Francesa 3.Bd3 v1.5 — 5 aulas**

| Aula | Etapas (capítulos) | Paradas | Move trainer (capítulos do estudo) |
|---|---|---|---|
| A — A defesa e nossa arma | 00 · A00 · A01 | 2 | E22A Arma · E22B Esquema base |
| B — Armadilhas e punições | B03 · B04 · B05 · B05A · B05B · B06 · B07 · B08 (CASO 2–5 como ramos) · B09 | 9 | E22C Preparação · E22D–H Golpes 1–5 · E22I Quando não funciona |
| C — Quando as Pretas jogam bem | C10 · C11 · C12 (+ ramos ...Be7, ...Bb4) · C13 | 4 | E22J–K Defesas · E22L Linha mais difícil · E22M–N desvios · E22O Se esquecer |
| D — Partida modelo | D17 MVL x So (79 meios-lances) | — | — (regra 18) |
| E+F — Treino final e revisão | E20 · E21 · F23 Cheat Sheet | 12 | E22A→P, todas na ordem, fechando na E22P Árvore completa |

- O bloco de cada capítulo "Move Trainer" sai da aula que ele copia (o estudo diz: "linhas duplicadas
  dos capítulos didáticos"); o mapa acima foi conferido lance a lance.
- D18 e D19 estão vazias no estudo ("falta partida autorizada") → ficam fora, com aviso.
- F23 fica antes do treino guiado da aula E+F, para o molde terminar sempre em treino.

**O que cada coisa vira no motor (reusando o que existe):**
- Capítulo e ramo → `capitulo` narrado (`ObjectiveStage`), com símbolo no círculo e setas/casas do estudo.
  Ramo = capítulo que começa no lance da bifurcação; o passo "Voltamos a…" é a comparação de
  `lib/editor-v2/previa.ts`.
- Parada → **três etapas do fluxo**: capítulo até a pergunta → treino `linha-autoral` de uma questão
  (`TreeStage`) → capítulo a partir da resposta. Sem confete na parada.
- A parada é o **próximo lance nosso** depois da pergunta. Pergunta escrita no nosso lance (B03 depois
  de 3.Bd3, B05B em 17.Qxe6+, C13 antes do 1º lance) → aviso no relatório.
- Irmão nosso com `!`/`!?` (B09) → "vale, mas a aula segue por 5.c3"; com `?`/`?!`/`??` → erro nomeado.
- F23 → `introducao`, um quadro por trecho marcado e por nota de ramo.
- Capítulos "Move Trainer" (E22A–P) → **não viram capítulo narrado**; viram linhas do banco com
  `categoria` e `ordem`, usadas pela etapa **`treinador`** (reusa o `Treino` de `/aberturas`).
- D17 → `capitulo` narrado; tags `Model*` viram o cabeçalho da partida.

**Marcadores:** [OBJETIVO] → cartão · [PERGUNTA] → parada · [TRAIN] → objetivo do treino (não seleciona
linhas) · [REFERENCIA] → não narrado; lance fica e é "também vale" · [ENTENDER], [PLANO], [MEMORIZAR],
[ARMADILHA], [PUNICAO], [GOLPE], [ERRO COMUM], [NAO FUNCIONA], [TEORIA], [LINHA CRITICA], [DEFESA],
[ESQUEMA], [ATENCAO], [CONEXAO], [COMO USAR], [PARTIDA REAL] → fala própria com rótulo ·
[RESUMO]/[PROXIMO] → fala com pausa manual · [DICA] → novo, opcional (sem ele, a dica é a pergunta) ·
"CASO N —"/"Regra N:" → título do ramo · marcador desconhecido → texto fica, aviso uma vez.

## Pendências do estudo v1.5 (o relatório da importação lista; o Doug corrige no Lichess)
- `Orientation "black"` nos 38 capítulos do export → o importador ignora e usa a cor do curso (brancas).
- Lichess perde o comentário final de **B09** e **C12** (depois da última variante).
- [PERGUNTA] no nosso lance: B03, B05B (17.Qxe6+), C13 (antes do 1º lance).
- [PROXIMO] apontando errado: E20 (cita o treino-relâmpago removido), E21 ("árvore completa" vem só no E22P), C13 (próximo é D17).
- "Regra N" diferente entre C13 e E22O. "Golpe 4/5" não são táticas.
- Lances nossos sem comentário: 1.e4 (00), 11.Nf3 (B05B), 12.Qxf3 e 11.a3 (C12) — reprovam no `/aberturas`.
- Frases de bastidor fora de [REFERENCIA]: "curso atual" ×6, "draft antigo" (B09, C12).
- D18 e D19 vazias. `[RESUMO]` do E22N escreve "Ndb5" (Lichess grava 10.Nb5).

## Implementação

### Modelo (`lib/editor-v2/modelo.ts`)
- Id `AB-<COR>-<ABERTURA>-<BLOCO>` em `aulaIdV2Schema`; `metadados.abertura?: { cor, abertura, bloco }`
  conferido contra o id (como `NIVEL_DIVERGE`). Não reusar `classe`.
- *(Achado da P0.)* Criar/importar aula `AB-` não pede classe de finais nem nível — hoje a aula extra exige.
- `fluxo.tipo: "treinador"` + `treinadores: [{ id, titulo, cor, abertura, linhaIds }]`;
  `TREINADOR_LINHA_AUSENTE` no gate de publicação.
- `dominioDaAulaV2(id)` aplicado em `idsDeAula`/`indiceDeAulas` (`lib/finais/conteudo.ts`),
  `app/finais/[aula]` (404 para `AB-`), `app/editor/page.tsx`, `lib/finais/progresso.ts`.

### Leitor (módulo puro novo `lib/editor-v2/curso-de-abertura.ts`)
- `codigoDoCapitulo`: `ChapterName "B05A - título"` ou `White`/`Black`; sintetiza `ChapterName` antes de
  `importarJogo` (título e id saem do código). *(Achados da P0: o PGN local só tem `White`/`Black` e abre como
  38 jogos de mesmo título; o `00` perde o código no título; marcadores aparecem crus na fala; a orientação
  vem da cor do curso, não do `Orientation "black"` do export.)*
- `papelDoCapitulo`: aula · parada · ramo · **treinador** (código `E22*` ou título "Move Trainer —") ·
  **partida modelo** (bloco D) · revisão (F) · vazio.
- `blocoDoTreinador`: casa a linha do capítulo "Move Trainer" com o capítulo didático de mesma sequência.
- `lerMarcadores`, `segmentarFalas`, `ramosDidaticos`, `paradas`, `mudosDoEstudo`, `avisos` (lista acima).
- Todos os NAGs viajam com o lance; export cru → `content/repertorio/rascunhos/estudo-brancas-francesa.pgn`.

### Repertório (`lib/repertorio/`)
- **Régua sem tamanho** (`linhas.ts`): sai `PROFUNDIDADE_MINIMA`, teto de 14, `fechamentosAbertos` como
  erro; `[%plano]` deixa de ser obrigatório. Testes e mutações dessas regras saem; registrar em
  `docs/REPERTORIO.md`. Vale para os 11 repertórios.
- **`LinhaSchema` ganha `categoria` e `ordem`** (hoje não tem campo de categoria). Categoria vem do
  rótulo do título: arma, esquema, preparacao, golpe, nao-funciona, defesa, linha-critica, desvio,
  se-esquecer, arvore. `EntradaDoIndiceSchema` acompanha.
- **`proximaLinha` (`treino.ts`)**: linha nunca vista sai pela menor `ordem` (hoje, ordem do arquivo);
  desempate das vencidas também por `ordem`. Regra 15.
- **Gerador `gerar-do-estudo.ts`**: uma partida por capítulo "Move Trainer" (preserva a linha curta
  E22A 3.Bd3 como linha própria); comentários sem marcadores e sem [TRAIN]/[PROXIMO]/[REFERENCIA];
  tags `[Categoria] [Ordem] [Fonte "estudo qq2xorDl v1.5"]`; preâmbulo "GERADO — não editar".
  Deduplicar linha idêntica (a E22P repete as pontas). Conferir se o banco aceita linha que é
  prefixo de outra (E22A ⊂ E22B).
- Aplicado por `aplicarRepertorio` + `impactoDoRepertorio` (mostra ids que morrem e nascem).
- `fontes.json`: `french-with-bd3.pgn` → `excluir` com motivo.
- `SeletorDeLinha` agrupa por categoria.

### Planejador (depois da Parada)
- `planejarCursoDeAbertura(texto, {cor, abertura}, positions)` → `{ aulas: AulaV2[], pgn, relatorio }`.
- Reusa `lerPgnsDoEstudo` + `importarJogo`; paradas por `prepararTreinosDaqui` →
  `tornarTreinoIndependente` → `completarTreino` com capítulo temporário `caminho=[resposta]`
  (padrão de `planejarEstudo`); `completarTreino` dá `alternativa` a irmão nosso com `!`/`!?`.
- `treinoDaArvore` para o treino guiado do bloco (defesas girando; máximo 3 por posição no estudo).
- Ids determinísticos pelo código; `guardarSnapshotAntesDeReimportarV2` + resumo do diff.
- `PainelDoEstudo.tsx`: o código vence `destinoPeloNome`; mostra por capítulo aula, papel, ramos, paradas.

### Etapa `treinador` (regra 17)
- `Treino`, `Passada`, `FitaDeLances`, `OQueFalta`, `SeletorDeLinha` saem de
  `app/aberturas/[cor]/[abertura]/` para `components/repertorio/` sem mudar comportamento.
- Na aula: serve as linhas do bloco pela `ordem`; primeira vez da linha em modo assistido (padrão já
  existente: `modoInicial = tentativas === 0 ? "assistido" : "quiz"`); etapa feita quando cada linha
  teve uma passada nesta rodada. Grava por `registrarTreino` (`app/aberturas/acoes.ts`), que já rejulga.

### Progressão por vez (regra 16)
- **Hoje nada registra "o aluno concluiu a aula"** (`aula_lida` tem uma linha por aluno; explicação
  não grava; `tentativas_aula` é por etapa). Migração aditiva nova: `aula_concluida (aluno, aula,
  publication_id, rodada_id, concluida_em)`, gravada no servidor quando a última etapa obrigatória fecha.
- `vez = conclusões anteriores + 1`, lida no navegador (como `leituraDaAula`) ou com rota dinâmica.
- `PlayerDoFluxoV2`, só para aulas `AB-`:
  - **1ª vez:** `TrilhaDaAula` só deixa voltar ou ficar; avançar exige a etapa feita
    (hoje as abas são livres e o rodapé de capítulo já funciona como "pular").
  - **2ª vez:** botão **Pular** em `introducao`/`capitulo`; paradas, treino guiado e `treinador` travados até feitos.
  - **3ª vez+:** tela de entrada "Ir ao move trainer" · "Fazer a aula inteira".
  - **Partida modelo:** conclui ao assistir; a partir da 2ª vez, Pular livre.
- Retomar da etapa onde parou (regra 13): guardar a última etapa feita da rodada.

### Rotas do aluno
- `app/aberturas/[cor]/[abertura]/aulas/[bloco]/page.tsx` → `pacoteAtivoDoAluno` + `aulaDoAlunoV2` + player.
- `PlayerDoFluxoV2` ganha `voltar={{href, rotulo}}` (hoje `/finais` fixo).
- `lib/aberturas/curso.ts` (`aulasDoCurso`); faixa "Aulas do curso" em `app/aberturas/[cor]/[abertura]/page.tsx`.
- Editor: `/editor/v2/finais/[aula]` aceita `AB-`; índice ganha "Cursos de abertura".

## Ver na tela, localmente (regra 14)

**Piloto 0 — hoje, sem código novo** (primeira olhada, estrutura crua):
1. `npm run dev` (`.env.local` já tem `EDITOR_LOCAL=1`); entrar como professor.
2. `/editor/v2/nova` → importar `https://lichess.org/study/qq2xorDl`; repetir colando o PGN v1.5.
3. Ver em `/editor/v2/assistir/<ID>`. Mostra os 38 capítulos com o importador atual (sem blocos, paradas
   ou move trainer). Se o limite do editor recusar 38 capítulos, anotar o número e seguir.

**Piloto final — fim da F7** (estrutura completa):
1. Importar pelo link e pelo PGN → relatório: 5 aulas, pendências da lista acima.
2. Publicar; entrar como `alunoteste` (PIN 112233) e abrir `/aberturas/brancas/francesa/aulas/b`.
3. Fazer 3 vezes a aula B para ver a regra 16 funcionando.

## Antes da primeira fatia — casa limpa

1. Na `modo-editor`: conferir RAM livre (memória: <1 GB trava o `next dev`) e rodar os portões que o
   diário de 16/9 registra como não rodados (`build`, `validate:content`, `validate:mutations`,
   `repertorio:compilar -- --check`), além de `typecheck`, `lint`, `test`.
2. Commitar os 53 arquivos pendentes do Editor v2 (sem o `study-top.png` solto; perguntar ao Doug se
   algum arquivo não é dele) e registrar no diário.
3. `git checkout main && git pull && git merge modo-editor && git push` (sem `--force`; o main do
   GitHub estava só 1 commit atrás em 16/9).
4. `git branch -d modo-editor && git push origin --delete modo-editor`;
   `git worktree remove ../olesc-portoes-00` (estava sem mudanças em 16/9).
5. `git checkout -b curso-abertura` a partir do `main`. Todo o plano acontece nessa branch.
6. Se algum portão falhar no passo 1: parar e mostrar ao Doug antes de commitar.
7. O teste humano 10I do Editor v2 segue depois, sobre o `main`.

## Fatias (cada uma termina com número medido)

Portões: `typecheck`, `lint`, `test`, `build`, `validate:content`, `validate:mutations`,
`repertorio:compilar -- --check`; aula publicada: gate do editor + `db:finais:v2`. Cada fatia atualiza
o diário `docs/MODO-EDITOR-ONDE-PARAMOS.md`.

| Fatia | Entrega | Parada medível |
|---|---|---|
| P0 | Casa limpa (seção acima) + Piloto 0 na tela (sem código) | Doug vê a v1.5 em `/editor/v2/assistir`; nº de capítulos importados anotado |
| F0 | Spec §13.3 "Curso de abertura" com as regras globais 15–18; §18 (etapa `treinador`, parada em 3 etapas, progressão por vez); emenda §21 e plano §15; `docs/REPERTORIO.md`; fixtures v1.5 (export Lichess + PGN local); cópia deste plano em `docs/` | Doug lê a §13.3 |
| F1 | Schema: `AB-`, `metadados.abertura`, `treinadores`/`treinador`, `dominioDaAulaV2` | mutação por regra; `/finais/AB-…` = 404 |
| F2 | Leitor puro | nas 2 fixtures: 38 capítulos → 5 aulas; 27 paradas; 16 capítulos treinador → 19 caminhos distintos, 12 completos; ramos B08 4, B09 1, C12 2, C13 2, E20 8; D18/D19 avisadas; B09/C12 perdidos só no Lichess; 3 perguntas no lance nosso; 4 lances mudos; NAGs preservados |
| F2b | Régua sem tamanho; `categoria`/`ordem`; `proximaLinha` por ordem; gerador do PGN; rascunho aposentado | 11 repertórios compilam; linha nova servida E22A→P; `marcas-das-fontes`: 0 faltando; só os 4 mudos reprovam |
| F3 | Planejador → 5 `AulaV2` | `problemasDaAulaV2` e limites vazios; planejar 2× = idêntico; B09 5.dxc5 = alternativa; D sem treino |
| F4 | Aluno: rota, `voltar`, paradas, etapa `treinador` (feito = cada linha uma vez), sem confete na parada | e2e B05A: erro → dica; Be4 → continua; treinador grava em `repertorio_progresso`; e2e `/aberturas` verde antes e depois |
| F5 | Progressão por vez: `aula_concluida`, travas das abas, Pular, tela da 3ª vez, retomar | e2e com `alunoteste`: 1ª vez sem Pular e sem avançar aba; 2ª com Pular só na explicação; 3ª abre direto no treinador; D pula livre na 2ª |
| F6 | Importar pela tela (link e PGN), painel por código, reimportar com snapshot + diff, PGN gerado + Aplicar | e2e `importar-curso`; `--check` verde; impacto exibido |
| F7 | Rotas `/aberturas/.../aulas/[bloco]`, faixa do curso, publicação; **piloto final na tela** | e2e 1366 + `aluno-375` (`@layout`); Doug faz a aula B 3 vezes localmente; `/revisar-aula` na voz |

## Verificação ponta a ponta
1. Importar `qq2xorDl` pelo link e o PGN v1.5 → 5 aulas, 27 paradas, pendências listadas.
2. Aula B como aluno: B05A erro → dica → Be4; B08 "Voltamos a 3.Bd3…"; B09 5.dxc5 "vale, mas…";
   treino guiado; move trainer serve E22C → E22I na ordem, cada linha uma vez.
3. Repetir a aula: 2ª vez Pular só na explicação; 3ª vez direto ao move trainer.
4. Aula D: só a partida, sem treino; conclui ao assistir.
5. `/aberturas/brancas/francesa`: linhas agrupadas por categoria, novas na ordem do estudo; progresso da aula aparece.
6. `/finais` e `/editor` sem aula `AB-` no lugar errado; `npm test` verde, com `marcas-das-fontes`.

## Riscos
- Prazo de 18/09 da `modo-editor` (teste 10I) disputa atenção com este trabalho.
- Aula B e E+F longas para 11–12 anos (fica uma aula; retomar é obrigatório).
- Travar as abas muda o comportamento do player — limitado a `AB-`, finais intactos.
- Mover `Treino`/`Passada` pode quebrar `/aberturas` — e2e antes e depois.
- Tirar a régua vale para os 11 repertórios: linhas futuras podem ficar curtas demais sem aviso.
- Linha prefixo de outra (E22A ⊂ E22B) pode colidir com "sem linha repetida" — conferir na F2b.
- Id da linha atual da Francesa muda → progresso de contas de teste zera (impacto mostrado antes).
- `notas.json` `francesa-bd3` fica velha; revisar na F6.

## Padrões que assumi (fácil de mudar)
- Dica da parada: `[DICA]`; sem ele, a pergunta.
- Paradas e treino guiado gravam tentativa, como em finais.
- Aula concluída = todas as etapas obrigatórias feitas na rodada; aulas não se trancam entre si.
- F23 antes do treino guiado na aula E+F.
- [REFERENCIA] não é narrado.
- Ordem dos ramos: a do PGN; no B08, a dos "CASO N".
- Régua sem tamanho inclui tirar roque/peças fora.
- Capítulos "Move Trainer" não aparecem como aula narrada; o [OBJETIVO] deles vira o título da linha no treinador.
