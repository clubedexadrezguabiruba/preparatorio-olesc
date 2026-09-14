/**
 * A limpeza, e a prova de que ela não levou nada além do ensaio.
 *
 * Apaga só o que tem `EX-E2E-` no nome e as duas contas, refaz o SHA-256 e **falha** se qualquer
 * arquivo protegido mudou, surgiu ou sumiu. A N1-KPK é conferida também pelo nome, porque é o único
 * arquivo protegido que não está no Git: se ela mudar, não há `git checkout` que a devolva.
 */
import { rmSync } from "node:fs";
import path from "node:path";
import { apagarContasDoEnsaio } from "./contas.ts";
import { PASTA_E2E, apagarRestosDoEnsaio, compararImpressoes, guardarJson, impressaoDigital, lerJson, type Impressao } from "./protecao.ts";

export async function limpar(): Promise<{ apagados: string[]; contas: string[]; problemas: string[] }> {
  const apagados = apagarRestosDoEnsaio();
  const contas = await apagarContasDoEnsaio();
  const antes = lerJson<Impressao>("sha-antes.json");
  const problemas: string[] = [];
  if (antes) {
    const depois = impressaoDigital();
    guardarJson("sha-depois.json", depois);
    const { mudaram, surgiram, sumiram } = compararImpressoes(antes, depois);
    if (mudaram.includes(".editor/v2/N1-KPK.json") || sumiram.includes(".editor/v2/N1-KPK.json")) {
      problemas.push("A N1-KPK MUDOU — é trabalho do Doug fora do Git; pare tudo e avise.");
    }
    if (mudaram.length) problemas.push(`mudaram: ${mudaram.join(", ")}`);
    if (surgiram.length) problemas.push(`surgiram: ${surgiram.join(", ")}`);
    if (sumiram.length) problemas.push(`sumiram: ${sumiram.join(", ")}`);
    console.log(`[e2e] limpeza: ${Object.keys(antes).length} arquivos conferidos, ${problemas.length ? "COM DIFERENÇA" : "todos iguais"}.`);
    // A impressão de antes vale para uma rodada só. Deixada ali, a próxima limpeza avulsa
    // compararia o disco com um retrato velho e acusaria cada commit legítimo do meio.
    if (!problemas.length) rmSync(path.join(PASTA_E2E, "sha-antes.json"), { force: true });
  }
  return { apagados, contas, problemas };
}
