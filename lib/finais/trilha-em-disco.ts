import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { idsDeAulasV2Ativas, pacoteAtivoDoAluno } from "./conteudo-v2.ts";
import { extrasDaTrilha, type AulaDaTrilha } from "./trilha.ts";

/**
 * A parte da trilha que mora no disco: as aulas extras publicadas e o conjunto de aulas
 * publicadas — §22 do Editor v2, "entram na trilha por dados".
 *
 * Sem `server-only` e com a pasta injetável, como `conteudo-v2.ts`: a publicação v2 calcula o
 * fechamento do nível antes e depois, e o teste dela roda numa pasta temporária.
 */

/** As extras (`EX-…`) com publicação v2 ativa, na forma da trilha. */
export function extrasPublicadas(contentDir = path.join(process.cwd(), "content")): AulaDaTrilha[] {
  const aulas = idsDeAulasV2Ativas(contentDir)
    .filter((id) => id.startsWith("EX-"))
    .flatMap((id) => {
      const pacote = pacoteAtivoDoAluno(id, contentDir);
      return pacote ? [{ id, titulo: pacote.aula.titulo, metadados: pacote.aula.metadados }] : [];
    });
  return extrasDaTrilha(aulas);
}

/**
 * Os ids que o aluno recebe como publicados: v1 com `status: "published"` em
 * `content/lessons/` e toda aula com publicação v2 ativa. É a mesma regra de
 * `aulasPublicadas()` em `conteudo.ts`, lida de uma pasta que se escolhe.
 */
export function publicadasEmDisco(contentDir = path.join(process.cwd(), "content")): Set<string> {
  const publicadas = new Set<string>(idsDeAulasV2Ativas(contentDir));
  const pasta = path.join(contentDir, "lessons");
  if (!existsSync(pasta)) return publicadas;
  for (const nome of readdirSync(pasta)) {
    const arquivo = path.join(pasta, nome);
    if (!nome.endsWith(".json") || !statSync(arquivo).isFile()) continue;
    try {
      const lido = JSON.parse(readFileSync(arquivo, "utf8")) as { id?: string; status?: string };
      if (lido.status === "published" && typeof lido.id === "string") publicadas.add(lido.id);
    } catch {
      // JSON quebrado é defeito que o gate de conteúdo acusa; aqui ele só não conta.
    }
  }
  return publicadas;
}
