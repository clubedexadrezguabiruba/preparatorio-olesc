import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ehFonteDoRepertorio, type FonteDoRepertorio } from "./compilar.ts";

/**
 * O lado de disco de `compilar.ts`: ler as fontes, ler o compilado, escrever o
 * compilado. Separado para a compilação continuar pura — o editor do repertório
 * compila candidatos em memória, e o teste compila pastas temporárias.
 *
 * Não é `server-only`: roda no script de linha de comando, no `npm test` e nas
 * Server Actions do editor.
 */

/** Os `.pgn` de uma pasta (sem descer em `rascunhos/`), em ordem de nome. */
export function lerFontesDoRepertorio(pasta: string): FonteDoRepertorio[] {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((nome) => ehFonteDoRepertorio(nome) && statSync(path.join(pasta, nome)).isFile())
    .sort()
    .map((nome) => ({ nome, texto: readFileSync(path.join(pasta, nome), "utf8") }));
}

/** Todo `.json` de uma pasta compilada, por caminho relativo com `/`. */
export function lerCompilado(pasta: string): Map<string, string> {
  const achados = new Map<string, string>();
  if (!existsSync(pasta)) return achados;
  const andar = (relativo: string): void => {
    for (const nome of readdirSync(path.join(pasta, relativo)).sort()) {
      const filho = relativo === "" ? nome : `${relativo}/${nome}`;
      const absoluto = path.join(pasta, filho);
      if (statSync(absoluto).isDirectory()) andar(filho);
      else if (nome.endsWith(".json")) achados.set(filho, readFileSync(absoluto, "utf8"));
    }
  };
  andar("");
  return achados;
}

/**
 * Grava a saída e apaga o JSON que sobrou de abertura que saiu.
 *
 * **Não é transação.** Uma interrupção no meio deixa a pasta com parte dos
 * arquivos novos; o `--check` acusa na hora e rodar de novo termina o serviço,
 * porque a saída depende só das fontes. A escrita do editor, que precisa trocar
 * fonte e compilado juntos, é a de `lib/repertorio/editor/aplicar.ts`.
 */
export function escreverCompilado(pasta: string, saida: ReadonlyMap<string, string>): void {
  for (const [relativo, texto] of saida) {
    const destino = path.join(pasta, ...relativo.split("/"));
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, texto, "utf8");
  }
  for (const relativo of lerCompilado(pasta).keys()) {
    if (!saida.has(relativo)) rmSync(path.join(pasta, ...relativo.split("/")), { force: true });
  }
}
