/**
 * Gera as fixtures de aula v2 publicada que o teste de mutações estraga.
 *
 *   node scripts/fixture-aula-v2.ts            # grava as duas em content/fixtures/aulas-v2/
 *   node scripts/fixture-aula-v2.ts --extra    # só a aula extra (EX-FIXTURE-V2)
 *   node scripts/fixture-aula-v2.ts --check    # só confere que as gravadas são as que sairiam
 *
 * ## Por que gerada, e não escrita à mão
 *
 * Um pacote tem hashes de tudo e um id que é hash do manifesto: escrito à mão, ele nasceria
 * adulterado, e toda mutação ficaria vermelha por "pacote adulterado" em vez da regra que ela
 * quer provar. A fixture é a N0-LADDER real, adaptada, com a certificação renovada a partir do
 * cache versionado (sem rede) e o id trocado — para não colidir com a N0-LADDER de verdade.
 *
 * ## As duas
 *
 * - `N0-FIXTURE-V2` (fatia 7): uma aula do curso **fora da trilha**, que é o que a mutação das
 *   regras de publicação precisa — nenhuma regra de trilha a alcança.
 * - `EX-FIXTURE-V2` (fatia 8, §22): a mesma aula como **extra**, com nível 1 e classe E
 *   declarados. É nela que as mutações `EXTRA_SEM_NIVEL` e `EXTRA_SEM_CLASSE` mordem.
 *
 * A data do ponteiro é fixa para a fixture sair byte a byte igual em toda execução.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { adaptarLessonV1 } from "../lib/editor-v2/adaptar-v1.ts";
import { lerPosicoesDoConteudoV2, renovarCertificacoesV2 } from "../lib/editor-v2/gate.ts";
import type { AulaV2 } from "../lib/editor-v2/modelo.ts";
import { montarPacoteV2 } from "../lib/editor-v2/pacote.ts";
import { lessonSchema } from "../lib/lesson/schema.ts";
import { Tablebase } from "./tablebase.ts";

const checar = process.argv.includes("--check");
const soExtra = process.argv.includes("--extra");

const positions = lerPosicoesDoConteudoV2();
const lesson = lessonSchema.parse(JSON.parse(readFileSync(path.join("content", "lessons", "N0-LADDER.json"), "utf8")));
const tablebase = new Tablebase(path.join("content", "tablebase-cache"), false);
const adaptada = adaptarLessonV1(lesson, positions);

const FIXTURES: Array<{ id: string; aula: (base: AulaV2) => AulaV2 }> = [
  { id: "N0-FIXTURE-V2", aula: (base) => ({ ...base, id: "N0-FIXTURE-V2" }) },
  {
    id: "EX-FIXTURE-V2",
    aula: (base) => ({ ...base, id: "EX-FIXTURE-V2", metadados: { ...base.metadados!, nivel: 1, classe: "E" } }),
  },
];

let divergentes: string[] = [];
for (const fixture of FIXTURES.filter((f) => !soExtra || f.id.startsWith("EX-"))) {
  const destino = path.join("content", "fixtures", "aulas-v2", fixture.id);
  const { aula } = await renovarCertificacoesV2(fixture.aula(adaptada), positions, (fen) => tablebase.lookup(fen));
  const pacote = montarPacoteV2(aula, positions);
  const arquivos: Record<string, string> = {
    [path.join(destino, "ativa.json")]: `${JSON.stringify({ publicationId: pacote.publicationId, anterior: null, ativadaEm: "2026-09-13T00:00:00.000Z" }, null, 2)}\n`,
    [path.join(destino, "publicacoes", `${pacote.publicationId}.json`)]: `${JSON.stringify(pacote, null, 2)}\n`,
  };

  if (checar) {
    divergentes = [...divergentes, ...Object.entries(arquivos).filter(([arquivo, texto]) => !existsSync(arquivo) || readFileSync(arquivo, "utf8") !== texto).map(([a]) => a)];
    console.log(`fixture v2 ${fixture.id}: ${pacote.publicationId}`);
  } else {
    if (existsSync(path.join(destino, "publicacoes"))) {
      for (const antigo of readdirSync(path.join(destino, "publicacoes"))) rmSync(path.join(destino, "publicacoes", antigo));
    }
    mkdirSync(path.join(destino, "publicacoes"), { recursive: true });
    for (const [arquivo, texto] of Object.entries(arquivos)) writeFileSync(arquivo, texto, "utf8");
    console.log(`fixture v2 gravada: ${destino} (${pacote.publicationId})`);
  }
}

if (checar && divergentes.length) {
  console.error(`a fixture v2 não é a que o gerador produz: ${divergentes.join(", ")} — rode node scripts/fixture-aula-v2.ts`);
  process.exit(1);
}
