/**
 * `npm run e2e:limpar` — a limpeza sozinha, para quando uma rodada morreu antes do fim.
 *
 * Apaga os restos `EX-E2E-…` e as contas do ensaio. Se a rodada chegou a gravar a impressão digital
 * de antes, confere também; se não, só limpa.
 */
import { limpar } from "./limpeza.ts";

const { apagados, contas, problemas } = await limpar();
console.log(apagados.length ? `Apagados:\n- ${apagados.join("\n- ")}` : "Nenhum resto do ensaio no disco.");
console.log(contas.length ? `Contas apagadas: ${contas.join(", ")}` : "Nenhuma conta de ensaio existia.");
if (problemas.length) {
  console.error(`\nArquivos protegidos diferentes da impressão de antes:\n- ${problemas.join("\n- ")}`);
  process.exitCode = 1;
}
