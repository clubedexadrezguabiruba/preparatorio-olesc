import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/**
 * Põe o que está em `.env.local` dentro de `process.env`.
 *
 * O que já veio do ambiente ganha do arquivo — assim dá para rodar um script
 * com `LICHESS_TOKEN=… node scripts/…` sem editar arquivo nenhum.
 *
 * Este bloco estava copiado em quatro scripts (`aluno-de-teste`,
 * `criar-professor`, `verificar-rls`, `verificar-tatica`). Os dois scripts do
 * repertório usam este; trocar os outros quatro é limpeza para outra tarefa,
 * porque mexer neles agora misturaria diff de refatoração com diff de conteúdo.
 */
export function carregarEnv(arquivos = [".env.local", ".env"]): void {
  for (const arquivo of arquivos) {
    try {
      for (const linha of readFileSync(path.join(RAIZ, arquivo), "utf8").split("\n")) {
        const corte = linha.indexOf("=");
        if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
        const nome = linha.slice(0, corte).trim();
        if (!process.env[nome]) {
          process.env[nome] = linha
            .slice(corte + 1)
            .trim()
            .replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // O arquivo pode não existir; as variáveis podem vir do ambiente.
    }
  }
}
