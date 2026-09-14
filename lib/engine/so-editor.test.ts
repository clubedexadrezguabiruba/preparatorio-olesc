import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";

/**
 * **O aluno nunca vê o motor do professor** (decisão do Doug de 13/09/2026, §23.1).
 *
 * A promessa vive em dois lugares só: as duas telas de editor, que já respondem 404 fora do
 * `EDITOR_LOCAL`, montam os componentes; nenhuma outra tela os alcança. Esta guarda
 * transforma isso em teste, de dois jeitos:
 *
 * 1. **Import direto:** `components/motor-do-professor/` e `useMotorDoProfessor` só podem
 *    ser importados de `components/editor-v2/`, `components/editor-repertorio/`,
 *    `app/editor/` e deles mesmos — e nunca da prévia, que reproduz o que o aluno vê.
 * 2. **Caminho indireto:** partindo de cada `page.tsx`/`layout.tsx` fora de `app/editor/`,
 *    seguindo os imports, nenhum desses módulos pode ser alcançado.
 */

const RAIZ = resolve(import.meta.dirname, "..", "..");
const PASTAS = ["app", "components", "lib"];
const PROIBIDOS = [/^components\/motor-do-professor\//, /^lib\/engine\/useMotorDoProfessor\.ts$/];
const PERMITIDOS = [/^components\/editor-v2\//, /^components\/editor-repertorio\//, /^app\/editor\//, /^components\/motor-do-professor\//, /^lib\/engine\/useMotorDoProfessor\.ts$/];
/** Dentro de uma pasta permitida, mas é o que o aluno vê. */
const PREVIA = [/^components\/editor-v2\/Previa[^/]*\.tsx$/];

function arquivos(pasta: string): string[] {
  const saida: string[] = [];
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (/\.(ts|tsx)$/.test(nome) && !/\.test\.ts$/.test(nome)) saida.push(caminho);
    }
  };
  andar(join(RAIZ, pasta));
  return saida;
}

const rel = (caminho: string) => relative(RAIZ, caminho).replaceAll("\\", "/");

function importsDe(caminho: string): string[] {
  const texto = readFileSync(caminho, "utf8");
  const especificadores = [...texto.matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm)]
    .map((m) => m[1] ?? m[2] ?? m[3]);
  const resolvidos: string[] = [];
  for (const especificador of especificadores) {
    let base: string | null = null;
    if (especificador.startsWith("@/")) base = join(RAIZ, especificador.slice(2));
    else if (especificador.startsWith(".")) base = resolve(dirname(caminho), especificador);
    if (!base) continue;
    const candidatos = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
    const achado = candidatos.find((c) => existsSync(c) && statSync(c).isFile());
    if (achado) resolvidos.push(achado);
  }
  return resolvidos;
}

const todos = PASTAS.flatMap(arquivos);

test("o motor do professor só é importado pelos editores", () => {
  const violacoes: string[] = [];
  for (const arquivo of todos) {
    const origem = rel(arquivo);
    for (const alvo of importsDe(arquivo).map(rel)) {
      if (!PROIBIDOS.some((p) => p.test(alvo))) continue;
      const permitido = PERMITIDOS.some((p) => p.test(origem)) && !PREVIA.some((p) => p.test(origem));
      if (!permitido) violacoes.push(`${origem} → ${alvo}`);
    }
  }
  assert.deepEqual(violacoes, []);
  // A guarda precisa ter o que guardar: os dois editores de fato importam.
  const usados = todos.filter((a) => importsDe(a).map(rel).some((alvo) => PROIBIDOS.some((p) => p.test(alvo)))).map(rel);
  assert.ok(usados.includes("components/editor-v2/EditorV2.tsx"), usados.join(", "));
  assert.ok(usados.includes("components/editor-repertorio/EditorDeRepertorio.tsx"), usados.join(", "));
});

test("nenhuma página fora de app/editor alcança o motor do professor, nem por caminho indireto", () => {
  const paginas = todos.filter((a) => /^app\/(?!editor\/).*(page|layout)\.tsx$/.test(rel(a)) || rel(a) === "app/layout.tsx");
  assert.ok(paginas.length > 5, `páginas achadas: ${paginas.length}`);
  const alcancam: string[] = [];
  for (const pagina of paginas) {
    const vistos = new Set<string>();
    const fila = [pagina];
    const pai = new Map<string, string>();
    while (fila.length) {
      const atual = fila.shift()!;
      if (vistos.has(atual)) continue;
      vistos.add(atual);
      if (PROIBIDOS.some((p) => p.test(rel(atual)))) {
        const caminho = [rel(atual)];
        for (let p = pai.get(atual); p; p = pai.get(p)) caminho.unshift(rel(p));
        alcancam.push(caminho.join(" → "));
        break;
      }
      for (const proximo of importsDe(atual)) {
        if (!vistos.has(proximo)) {
          if (!pai.has(proximo)) pai.set(proximo, atual);
          fila.push(proximo);
        }
      }
    }
  }
  assert.deepEqual(alcancam, []);
});
