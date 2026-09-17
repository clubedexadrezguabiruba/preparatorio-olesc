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
