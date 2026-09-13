/**
 * Gera a fixture de aula v2 publicada que o teste de mutações estraga.
 *
 *   node scripts/fixture-aula-v2.ts          # grava content/fixtures/aulas-v2/
 *   node scripts/fixture-aula-v2.ts --check  # só confere que a gravada é a que sairia
 *
 * ## Por que gerada, e não escrita à mão
 *
 * Um pacote tem hashes de tudo e um id que é hash do manifesto: escrito à mão, ele nasceria
 * adulterado, e toda mutação ficaria vermelha por "pacote adulterado" em vez da regra que ela
 * quer provar. A fixture é a N0-LADDER real, adaptada, com a certificação renovada a partir do
 * cache versionado (sem rede) e o id trocado para `N0-FIXTURE-V2` — para não colidir com a
 * N0-LADDER de verdade quando ela for publicada em v2.
 *
 * A data do ponteiro é fixa para a fixture sair byte a byte igual em toda execução.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { adaptarLessonV1 } from "../lib/editor-v2/adaptar-v1.ts";
import { lerPosicoesDoConteudoV2, renovarCertificacoesV2 } from "../lib/editor-v2/gate.ts";
import { montarPacoteV2 } from "../lib/editor-v2/pacote.ts";
import { lessonSchema } from "../lib/lesson/schema.ts";
import { Tablebase } from "./tablebase.ts";

const ID = "N0-FIXTURE-V2";
const destino = path.join("content", "fixtures", "aulas-v2", ID);
const checar = process.argv.includes("--check");

const positions = lerPosicoesDoConteudoV2();
const lesson = lessonSchema.parse(JSON.parse(readFileSync(path.join("content", "lessons", "N0-LADDER.json"), "utf8")));
const tablebase = new Tablebase(path.join("content", "tablebase-cache"), false);
const { aula } = await renovarCertificacoesV2({ ...adaptarLessonV1(lesson, positions), id: ID }, positions, (fen) => tablebase.lookup(fen));
const pacote = montarPacoteV2(aula, positions);
const arquivos: Record<string, string> = {
  [path.join(destino, "ativa.json")]: `${JSON.stringify({ publicationId: pacote.publicationId, anterior: null, ativadaEm: "2026-09-13T00:00:00.000Z" }, null, 2)}\n`,
  [path.join(destino, "publicacoes", `${pacote.publicationId}.json`)]: `${JSON.stringify(pacote, null, 2)}\n`,
};

if (checar) {
  const divergentes = Object.entries(arquivos).filter(([arquivo, texto]) => !existsSync(arquivo) || readFileSync(arquivo, "utf8") !== texto);
  if (divergentes.length) {
    console.error(`a fixture v2 não é a que o gerador produz: ${divergentes.map(([a]) => a).join(", ")} — rode node scripts/fixture-aula-v2.ts`);
    process.exit(1);
  }
  console.log(`fixture v2 conferida: ${pacote.publicationId}`);
} else {
  if (existsSync(path.join(destino, "publicacoes"))) {
    for (const antigo of readdirSync(path.join(destino, "publicacoes"))) rmSync(path.join(destino, "publicacoes", antigo));
  }
  mkdirSync(path.join(destino, "publicacoes"), { recursive: true });
  for (const [arquivo, texto] of Object.entries(arquivos)) writeFileSync(arquivo, texto, "utf8");
  console.log(`fixture v2 gravada: ${destino} (${pacote.publicationId})`);
}
