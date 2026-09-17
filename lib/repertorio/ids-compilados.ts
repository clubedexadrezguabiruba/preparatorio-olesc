import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Os ids de todas as linhas do repertório compilado, lidos de `public/repertorio/index.json`.
 *
 * Existe para a conferência da aula de abertura (§18.1 do Editor v2): o move trainer da aula só
 * pode apontar para linha que o juiz de `/aberturas` conhece. Sem `server-only` e com a raiz
 * injetável, como `conteudo-v2.ts`: roda no gate do editor, na publicação, no validador de
 * conteúdo e nos testes.
 *
 * Índice ausente é repertório vazio, e não erro: quem precisa da linha acusa a falta dela.
 */
export function idsDoRepertorioCompilado(raiz = process.cwd()): Set<string> {
  const arquivo = path.join(raiz, "public", "repertorio", "index.json");
  if (!existsSync(arquivo)) return new Set();
  const indice = JSON.parse(readFileSync(arquivo, "utf8")) as Array<{ ids?: unknown }>;
  return new Set(indice.flatMap((entrada) => (Array.isArray(entrada.ids) ? entrada.ids.filter((id): id is string => typeof id === "string") : [])));
}
