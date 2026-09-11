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
